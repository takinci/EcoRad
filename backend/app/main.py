from __future__ import annotations

import csv
import io
import json
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from .calculations import (
    ai_inference_energy_kwh,
    ai_training_energy_kwh,
    emissions_kgco2e,
    energy_kwh,
    energy_per_scan,
    equivalencies,
    idle_waste_kwh,
)
from .config import get_settings
from .database import get_db
from .models import ActivityLog, AIWorkload, Consumable, Department, EmissionFactor, Equipment, Scenario, WasteRecord
from .seed import seed

settings = get_settings()
app = FastAPI(title="EcoRad API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ActivityInput(BaseModel):
    equipment_id: int
    period: str = "2026-01"
    scans: int = Field(ge=0)
    active_hours: float = Field(ge=0)
    idle_hours: float = Field(ge=0)
    standby_hours: float = Field(ge=0)
    off_hours: float = Field(ge=0)
    avoidable_idle_hours: float = Field(ge=0, default=0)
    confidence: str = Field(default="estimated", pattern="^(measured|estimated|assumed)$")


class DepartmentInput(BaseModel):
    name: str
    profile: str
    region: str
    carbon_intensity: float = Field(ge=0)


class EmissionFactorInput(BaseModel):
    region: str
    kgco2e_per_kwh: float = Field(ge=0)
    source: str = "User editable factor"
    editable_note: str = "User provided value"


class ScenarioInput(BaseModel):
    name: str
    intervention: str
    expected_kwh_savings: float = Field(ge=0)
    expected_kgco2e_savings: float = Field(ge=0)
    assumptions: dict = Field(default_factory=dict)


@app.on_event("startup")
def startup() -> None:
    seed()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "EcoRad"}


@app.get("/api/meta")
def meta(db: Session = Depends(get_db)) -> dict:
    return {
        "profiles": ["Hospital radiology", "Outpatient imaging center", "Research imaging lab", "Teleradiology / informatics-heavy workflow"],
        "intendedUses": ["Estimate annual footprint", "Compare modalities", "Track monthly sustainability KPIs", "Evaluate AI tool impact", "Estimate savings from an intervention"],
        "regions": [r.region for r in db.query(EmissionFactor).order_by(EmissionFactor.region).all()],
        "modalities": [e.name for e in db.query(Equipment).all()],
        "scannerStates": ["active", "idle", "standby", "off"],
        "aiUseCases": ["Triage", "Autonomous reporting support", "Protocol optimization", "Scheduling optimization", "Repeat scan reduction"],
        "cloudProviders": ["Local", "AWS", "Azure", "Google Cloud", "Private cloud", "Hybrid"],
        "metricTypes": ["Energy", "Carbon", "Water", "Consumables", "Waste", "AI net impact"],
        "timePeriods": ["Monthly", "Quarterly", "Annual"],
        "interventions": ["Turn MRI/CT scanners off overnight", "Use standby mode during inactive periods", "Reduce low-value imaging", "Optimize scheduling", "Shorten protocols", "Reduce repeat scans", "Move computation to lower-carbon regions", "Use renewable electricity", "Reduce paper and film printing", "Extend hardware lifetime", "Consolidate servers", "Use smaller or more efficient AI models"],
    }


@app.get("/api/departments")
def departments(db: Session = Depends(get_db)) -> list[dict]:
    return [{"id": d.id, "name": d.name, "profile": d.profile, "region": d.region, "carbonIntensity": d.carbon_intensity} for d in db.query(Department).all()]


@app.post("/api/departments")
def create_department(item: DepartmentInput, db: Session = Depends(get_db)) -> dict:
    dept = Department(name=item.name, profile=item.profile, region=item.region, carbon_intensity=item.carbon_intensity)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {"id": dept.id, "name": dept.name}


@app.get("/api/equipment/{department_id}")
def equipment(department_id: int = 1, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.query(Equipment).filter_by(department_id=department_id).all()
    return [{"id": e.id, "name": e.name, "modality": e.modality.name, "activeKw": e.active_kw, "idleKw": e.idle_kw, "standbyKw": e.standby_kw, "offKw": e.off_kw, "confidence": e.confidence, "citation": e.citation} for e in rows]


def build_dashboard(department_id: int, db: Session) -> dict:
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    logs = db.query(ActivityLog).filter_by(department_id=department_id).all()
    rows = []
    total_kwh = total_co2 = total_scans = idle_waste = embodied_monthly = 0.0
    for log in logs:
        eq = log.equipment
        kwh = energy_kwh(eq.active_kw, log.active_hours) + energy_kwh(eq.idle_kw, log.idle_hours) + energy_kwh(eq.standby_kw, log.standby_hours) + energy_kwh(eq.off_kw, log.off_hours)
        co2 = emissions_kgco2e(kwh, dept.carbon_intensity)
        waste = idle_waste_kwh(eq.idle_kw, log.avoidable_idle_hours)
        embodied = eq.embodied_kgco2e / eq.lifetime_years / 12 if eq.lifetime_years else 0
        rows.append({"equipment": eq.name, "modality": eq.modality.name, "period": log.period, "kwh": round(kwh, 2), "kgco2e": round(co2, 2), "scans": log.scans, "energyPerScan": round(energy_per_scan(kwh, log.scans), 3), "idleWasteKwh": round(waste, 2), "confidence": log.confidence, "whatThisMeans": "Estimated operating energy by scanner state. Replace assumptions with metered values where available."})
        total_kwh += kwh
        total_co2 += co2
        total_scans += log.scans
        idle_waste += waste
        embodied_monthly += embodied
    consumables = db.query(Consumable).filter_by(department_id=department_id).all()
    consumable_co2 = sum(c.quantity * c.kgco2e_per_unit for c in consumables)
    water = sum(c.quantity * c.water_liters_per_unit for c in consumables)
    total_co2 += consumable_co2 + embodied_monthly
    waste_rows = db.query(WasteRecord).filter_by(department_id=department_id).all()
    waste_total = sum(w.kg for w in waste_rows)
    return {
        "department": dept.name,
        "profile": dept.profile,
        "region": dept.region,
        "carbonIntensity": dept.carbon_intensity,
        "totals": {"kwh": round(total_kwh, 2), "mwh": round(total_kwh / 1000, 2), "kgco2e": round(total_co2, 2), "tonnesCo2e": round(total_co2 / 1000, 3), "scans": int(total_scans), "energyPerScan": round(energy_per_scan(total_kwh, int(total_scans)), 3), "idleWasteKwh": round(idle_waste, 2), "embodiedMonthlyKgCo2e": round(embodied_monthly, 2), "waterLiters": round(water, 2), "wasteKg": round(waste_total, 2)},
        "equivalencies": equivalencies(total_kwh, total_co2, water),
        "byEquipment": rows,
        "topOpportunities": sorted(rows, key=lambda x: x["idleWasteKwh"], reverse=True)[:5],
        "assumptions": ["All defaults are editable", "Values are labelled as measured, estimated, or assumed", "Use local metering, procurement, and waste data for formal reporting"],
    }


@app.get("/api/dashboard/{department_id}")
def dashboard(department_id: int = 1, db: Session = Depends(get_db)) -> dict:
    return build_dashboard(department_id, db)


@app.get("/api/ai/{department_id}")
def ai_dashboard(department_id: int = 1, db: Session = Depends(get_db)) -> dict:
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    workloads = db.query(AIWorkload).filter_by(department_id=department_id).all()
    rows = []
    for w in workloads:
        training = ai_training_energy_kwh(w.training_power_kw, w.training_hours, w.pue)
        inference = ai_inference_energy_kwh(w.inference_power_kw, w.inference_seconds, w.inferences, w.pue)
        gross_kwh = training + inference
        gross_co2 = emissions_kgco2e(gross_kwh, dept.carbon_intensity)
        rows.append({"name": w.name, "useCase": w.use_case, "deployment": w.deployment, "gpuType": w.gpu_type, "trainingKwh": round(training, 3), "inferenceKwh": round(inference, 3), "grossKgCo2e": round(gross_co2, 3), "savingsKwh": w.estimated_savings_kwh, "savingsKgCo2e": w.estimated_savings_kgco2e, "netKgCo2e": round(gross_co2 - w.estimated_savings_kgco2e, 3), "confidence": w.confidence, "whatThisMeans": "Net impact compares AI compute footprint with editable operational savings such as fewer repeats, shorter scans, or reduced travel."})
    return {"workloads": rows}


@app.post("/api/activity/{department_id}")
def add_activity(department_id: int, item: ActivityInput, db: Session = Depends(get_db)) -> dict:
    if not db.get(Equipment, item.equipment_id):
        raise HTTPException(404, "Equipment not found")
    log = ActivityLog(department_id=department_id, **item.model_dump())
    db.add(log)
    db.commit()
    return {"status": "saved", "id": log.id}


@app.post("/api/emission-factors")
def upsert_emission_factor(item: EmissionFactorInput, db: Session = Depends(get_db)) -> dict:
    factor = db.query(EmissionFactor).filter_by(region=item.region).first()
    if factor is None:
        factor = EmissionFactor(region=item.region)
        db.add(factor)
    factor.kgco2e_per_kwh = item.kgco2e_per_kwh
    factor.source = item.source
    factor.editable_note = item.editable_note
    db.commit()
    return {"status": "saved", "region": factor.region}


@app.get("/api/scenarios/{department_id}")
def scenarios(department_id: int = 1, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.query(Scenario).filter_by(department_id=department_id).all()
    return [{"id": s.id, "name": s.name, "intervention": s.intervention, "expectedKwhSavings": s.expected_kwh_savings, "expectedKgCo2eSavings": s.expected_kgco2e_savings, "assumptions": json.loads(s.assumptions or "{}")} for s in rows]


@app.post("/api/scenarios/{department_id}")
def save_scenario(department_id: int, item: ScenarioInput, db: Session = Depends(get_db)) -> dict:
    scenario = Scenario(department_id=department_id, name=item.name, intervention=item.intervention, expected_kwh_savings=item.expected_kwh_savings, expected_kgco2e_savings=item.expected_kgco2e_savings, assumptions=json.dumps(item.assumptions))
    db.add(scenario)
    db.commit()
    return {"status": "saved", "id": scenario.id}


@app.get("/api/export/{department_id}.csv")
def export_csv(department_id: int = 1, db: Session = Depends(get_db)):
    data = build_dashboard(department_id, db)
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=["equipment", "modality", "period", "kwh", "kgco2e", "scans", "energyPerScan", "idleWasteKwh", "confidence"])
    writer.writeheader()
    writer.writerows([{k: r.get(k) for k in writer.fieldnames} for r in data["byEquipment"]])
    out.seek(0)
    return StreamingResponse(iter([out.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=ecorad_dashboard.csv"})


@app.get("/api/export/{department_id}.pdf")
def export_pdf(department_id: int = 1, db: Session = Depends(get_db)):
    data = build_dashboard(department_id, db)
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 50
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(50, y, "EcoRad Sustainability Summary")
    y -= 30
    pdf.setFont("Helvetica", 10)
    for line in [f"Department: {data['department']}", f"Region: {data['region']}", f"Energy: {data['totals']['kwh']} kWh", f"Carbon: {data['totals']['kgco2e']} kgCO2e", f"Water: {data['totals']['waterLiters']} liters", "Assumptions: default values are editable and should be replaced with measured local data where available."]:
        pdf.drawString(50, y, line)
        y -= 18
    y -= 12
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "Top improvement opportunities")
    y -= 20
    pdf.setFont("Helvetica", 9)
    for row in data["topOpportunities"]:
        pdf.drawString(55, y, f"{row['equipment']}: {row['idleWasteKwh']} avoidable idle kWh")
        y -= 14
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=ecorad_summary.pdf"})


static_dir = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        index = static_dir / "index.html"
        return FileResponse(index)

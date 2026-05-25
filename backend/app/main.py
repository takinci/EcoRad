from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import csv, io, json

from .database import get_db
from .models import Department, ActivityLog, Equipment, EmissionFactor, AIWorkload, Consumable, WasteRecord, Scenario
from .seed import seed
from .calculations import energy_kwh, emissions_kgco2e, energy_per_scan, idle_waste_kwh, ai_inference_energy_kwh, ai_training_energy_kwh, equivalencies

app = FastAPI(title="EcoRad API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ActivityInput(BaseModel):
    equipment_id: int
    period: str = "2026-01"
    scans: int = Field(ge=0)
    active_hours: float = Field(ge=0)
    idle_hours: float = Field(ge=0)
    standby_hours: float = Field(ge=0)
    off_hours: float = Field(ge=0)
    avoidable_idle_hours: float = Field(ge=0, default=0)
    confidence: str = "estimated"

@app.on_event("startup")
def startup():
    seed()

@app.get("/api/meta")
def meta(db: Session = Depends(get_db)):
    return {
        "profiles": ["Hospital radiology", "Outpatient imaging center", "Research imaging lab", "Teleradiology / informatics-heavy workflow"],
        "intendedUses": ["Estimate annual footprint", "Compare modalities", "Track monthly sustainability KPIs", "Evaluate AI tool impact", "Estimate savings from an intervention"],
        "regions": [r.region for r in db.query(EmissionFactor).all()],
        "interventions": ["Turn MRI/CT scanners off overnight", "Use standby mode", "Reduce low-value imaging", "Optimize scheduling", "Shorten protocols", "Reduce repeat scans", "Move computation to lower-carbon regions", "Use renewable electricity", "Reduce paper and film printing", "Extend hardware lifetime", "Consolidate servers", "Use smaller or more efficient AI models"]
    }

@app.get("/api/dashboard/{department_id}")
def dashboard(department_id: int = 1, db: Session = Depends(get_db)):
    dept = db.query(Department).get(department_id)
    if not dept: raise HTTPException(404, "Department not found")
    logs = db.query(ActivityLog).filter_by(department_id=department_id).all()
    rows = []
    total_kwh = total_co2 = total_scans = idle_waste = embodied_annual = 0
    for log in logs:
        eq = log.equipment
        kwh = sum([
            energy_kwh(eq.active_kw, log.active_hours), energy_kwh(eq.idle_kw, log.idle_hours),
            energy_kwh(eq.standby_kw, log.standby_hours), energy_kwh(eq.off_kw, log.off_hours)
        ])
        co2 = emissions_kgco2e(kwh, dept.carbon_intensity)
        waste = idle_waste_kwh(eq.idle_kw, log.avoidable_idle_hours)
        embodied = eq.embodied_kgco2e / eq.lifetime_years / 12 if eq.lifetime_years else 0
        rows.append({"equipment": eq.name, "modality": eq.modality.name, "kwh": round(kwh,2), "kgco2e": round(co2,2), "scans": log.scans, "energyPerScan": round(energy_per_scan(kwh, log.scans),3), "idleWasteKwh": round(waste,2), "confidence": log.confidence})
        total_kwh += kwh; total_co2 += co2; total_scans += log.scans; idle_waste += waste; embodied_annual += embodied
    consumables = db.query(Consumable).filter_by(department_id=department_id).all()
    consumable_co2 = sum(c.quantity * c.kgco2e_per_unit for c in consumables)
    water = sum(c.quantity * c.water_liters_per_unit for c in consumables)
    total_co2 += consumable_co2
    return {"department": dept.name, "profile": dept.profile, "region": dept.region, "carbonIntensity": dept.carbon_intensity, "totals": {"kwh": round(total_kwh,2), "mwh": round(total_kwh/1000,2), "kgco2e": round(total_co2,2), "tonnesCo2e": round(total_co2/1000,3), "scans": total_scans, "energyPerScan": round(energy_per_scan(total_kwh,total_scans),3), "idleWasteKwh": round(idle_waste,2), "embodiedMonthlyKgCo2e": round(embodied_annual,2), "waterLiters": round(water,2)}, "equivalencies": equivalencies(total_kwh,total_co2,water), "byEquipment": rows, "topOpportunities": sorted(rows, key=lambda x:x["idleWasteKwh"], reverse=True)[:5]}

@app.get("/api/ai/{department_id}")
def ai_dashboard(department_id: int = 1, db: Session = Depends(get_db)):
    dept = db.query(Department).get(department_id)
    workloads = db.query(AIWorkload).filter_by(department_id=department_id).all()
    rows=[]
    for w in workloads:
        training = ai_training_energy_kwh(w.training_power_kw, w.training_hours, w.pue)
        inference = ai_inference_energy_kwh(w.inference_power_kw, w.inference_seconds, w.inferences, w.pue)
        gross_kwh = training + inference
        gross_co2 = emissions_kgco2e(gross_kwh, dept.carbon_intensity)
        rows.append({"name":w.name,"useCase":w.use_case,"deployment":w.deployment,"gpuType":w.gpu_type,"trainingKwh":round(training,3),"inferenceKwh":round(inference,3),"grossKgCo2e":round(gross_co2,3),"savingsKwh":w.estimated_savings_kwh,"savingsKgCo2e":w.estimated_savings_kgco2e,"netKgCo2e":round(gross_co2-w.estimated_savings_kgco2e,3),"confidence":w.confidence,"whatThisMeans":"Net impact compares AI compute footprint with editable operational savings such as fewer repeats, shorter scans, or reduced travel."})
    return {"workloads": rows}

@app.post("/api/activity/{department_id}")
def add_activity(department_id: int, item: ActivityInput, db: Session = Depends(get_db)):
    if not db.query(Equipment).get(item.equipment_id): raise HTTPException(404, "Equipment not found")
    log = ActivityLog(department_id=department_id, **item.dict())
    db.add(log); db.commit(); return {"status":"saved", "id": log.id}

@app.get("/api/scenarios/{department_id}")
def scenarios(department_id: int=1, db: Session=Depends(get_db)):
    return db.query(Scenario).filter_by(department_id=department_id).all()

@app.get("/api/export/{department_id}.csv")
def export_csv(department_id: int=1, db: Session=Depends(get_db)):
    data = dashboard(department_id, db)
    out = io.StringIO(); writer = csv.DictWriter(out, fieldnames=["equipment","modality","kwh","kgco2e","scans","energyPerScan","idleWasteKwh","confidence"])
    writer.writeheader(); writer.writerows(data["byEquipment"]); out.seek(0)
    return StreamingResponse(iter([out.getvalue()]), media_type="text/csv", headers={"Content-Disposition":"attachment; filename=ecorad_dashboard.csv"})

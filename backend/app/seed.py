from .database import Base, engine, SessionLocal
from .models import *

SOURCE_RAD = "Editable assumption, see sources.md: radiology energy and sustainability literature."
SOURCE_AI = "Editable assumption, see sources.md: AI energy, cloud sustainability, and radiology AI literature."
SOURCE_GRID = "Our World in Data carbon intensity of electricity dataset, editable regional default."


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Department).first():
            return
        dept = Department(name="Demo Academic Radiology", profile="Hospital radiology", region="Switzerland", carbon_intensity=0.10)
        db.add(dept); db.flush()
        mods = ["MRI", "CT", "X-ray", "Ultrasound", "Mammography", "Fluoroscopy", "PET/CT", "PACS/RIS", "Workstation", "Server"]
        mod_objs = {}
        for m in mods:
            obj = Modality(name=m, description=f"{m} sustainability tracking category")
            db.add(obj); db.flush(); mod_objs[m] = obj
        equipment = [
            ("MRI 3T A", "MRI", 30, 15, 5, 0.5, 85000, 10),
            ("CT Scanner A", "CT", 60, 8, 3, 0.2, 45000, 8),
            ("Digital X-ray Room", "X-ray", 12, 2, 0.6, 0.1, 12000, 8),
            ("Ultrasound Fleet", "Ultrasound", 1.5, 0.4, 0.1, 0.02, 3500, 6),
            ("PACS Storage", "PACS/RIS", 4, 4, 4, 4, 20000, 5),
            ("Reporting Workstations", "Workstation", 2, 0.8, 0.2, 0.05, 6000, 5),
        ]
        for name, mod, active, idle, standby, off, emb, life in equipment:
            db.add(Equipment(department_id=dept.id, modality_id=mod_objs[mod].id, name=name, active_kw=active, idle_kw=idle, standby_kw=standby, off_kw=off, embodied_kgco2e=emb, lifetime_years=life, citation=SOURCE_RAD))
        db.flush()
        for eq in db.query(Equipment).all():
            scans = 1200 if "MRI" in eq.name else 1800 if "CT" in eq.name else 2500
            db.add(ActivityLog(department_id=dept.id, equipment_id=eq.id, period="2026-01", scans=scans, active_hours=160, idle_hours=300, standby_hours=250, off_hours=34, avoidable_idle_hours=120))
        factors = [("Switzerland",0.10),("Germany",0.36),("France",0.06),("United States",0.38),("United Kingdom",0.20),("EU average",0.25),("Editable custom",0.30)]
        for region, ci in factors:
            db.add(EmissionFactor(region=region, kgco2e_per_kwh=ci, source=SOURCE_GRID, editable_note="Replace with local measured or official data where available."))
        db.add(AIWorkload(department_id=dept.id, name="Chest CT triage AI", use_case="Triage", deployment="Cloud", gpu_type="T4 equivalent", training_power_kw=0.35, training_hours=0, inference_power_kw=0.08, inference_seconds=2.5, inferences=1800, pue=1.2, estimated_savings_kwh=120, estimated_savings_kgco2e=12, citation=SOURCE_AI))
        db.add(Consumable(department_id=dept.id, name="Contrast syringe kits", quantity=500, unit="kits", kgco2e_per_unit=0.25, water_liters_per_unit=1.0, citation="Editable assumption, local procurement data preferred."))
        db.add(WasteRecord(department_id=dept.id, type="Clinical imaging waste", kg=350, recyclable_kg=80, hazardous_kg=20))
        db.add(Scenario(department_id=dept.id, name="MRI overnight standby", intervention="Use standby/off policy during inactive periods", expected_kwh_savings=1800, expected_kgco2e_savings=180, assumptions="Based on avoidable idle hours entered by user."))
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    seed()

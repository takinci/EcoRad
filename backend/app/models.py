from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)


class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    profile = Column(String, nullable=False)
    region = Column(String, default="Switzerland")
    carbon_intensity = Column(Float, default=0.10)


class Modality(Base):
    __tablename__ = "modalities"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)


class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    modality_id = Column(Integer, ForeignKey("modalities.id"))
    name = Column(String, nullable=False)
    active_kw = Column(Float, default=0)
    idle_kw = Column(Float, default=0)
    standby_kw = Column(Float, default=0)
    off_kw = Column(Float, default=0)
    embodied_kgco2e = Column(Float, default=0)
    lifetime_years = Column(Float, default=7)
    confidence = Column(String, default="assumed")
    citation = Column(Text)
    modality = relationship("Modality")


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    equipment_id = Column(Integer, ForeignKey("equipment.id"))
    period = Column(String, default="2026-01")
    scans = Column(Integer, default=0)
    active_hours = Column(Float, default=0)
    idle_hours = Column(Float, default=0)
    standby_hours = Column(Float, default=0)
    off_hours = Column(Float, default=0)
    avoidable_idle_hours = Column(Float, default=0)
    confidence = Column(String, default="estimated")
    equipment = relationship("Equipment")


class EnergyRecord(Base):
    __tablename__ = "energy_records"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    source = Column(String, nullable=False)
    kwh = Column(Float, default=0)
    confidence = Column(String, default="estimated")


class EmissionFactor(Base):
    __tablename__ = "emission_factors"
    id = Column(Integer, primary_key=True)
    region = Column(String, unique=True)
    kgco2e_per_kwh = Column(Float, nullable=False)
    source = Column(Text)
    editable_note = Column(Text)


class AIWorkload(Base):
    __tablename__ = "ai_workloads"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    name = Column(String, nullable=False)
    use_case = Column(String, default="triage")
    deployment = Column(String, default="local")
    gpu_type = Column(String, default="editable")
    training_power_kw = Column(Float, default=0)
    training_hours = Column(Float, default=0)
    inference_power_kw = Column(Float, default=0)
    inference_seconds = Column(Float, default=0)
    inferences = Column(Integer, default=0)
    pue = Column(Float, default=1.2)
    estimated_savings_kwh = Column(Float, default=0)
    estimated_savings_kgco2e = Column(Float, default=0)
    confidence = Column(String, default="assumed")
    citation = Column(Text)


class Consumable(Base):
    __tablename__ = "consumables"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    name = Column(String)
    quantity = Column(Float, default=0)
    unit = Column(String, default="items")
    kgco2e_per_unit = Column(Float, default=0)
    water_liters_per_unit = Column(Float, default=0)
    citation = Column(Text)


class WasteRecord(Base):
    __tablename__ = "waste_records"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    type = Column(String)
    kg = Column(Float, default=0)
    recyclable_kg = Column(Float, default=0)
    hazardous_kg = Column(Float, default=0)


class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    name = Column(String)
    intervention = Column(String)
    expected_kwh_savings = Column(Float, default=0)
    expected_kgco2e_savings = Column(Float, default=0)
    assumptions = Column(Text)


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    title = Column(String)
    content_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

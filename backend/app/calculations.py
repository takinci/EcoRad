"""Core EcoRad sustainability calculations.

Assumptions are editable and stored with citation fields in seed data. Formula basis:
- kWh = power in kW * time in hours
- CO2e = kWh * carbon intensity kgCO2e/kWh
- Scope 2 electricity accounting follows GHG Protocol style location-based estimation.
See sources.md for radiology, AI, and carbon accounting references.
"""
from __future__ import annotations

from dataclasses import dataclass


class CalculationError(ValueError):
    pass


def _non_negative(**values: float) -> None:
    for key, value in values.items():
        if value < 0:
            raise CalculationError(f"{key} must be non-negative")


def energy_kwh(power_kw: float, hours: float) -> float:
    _non_negative(power_kw=power_kw, hours=hours)
    return power_kw * hours


def emissions_kgco2e(kwh: float, carbon_intensity_kg_per_kwh: float, pue: float = 1.0) -> float:
    _non_negative(kwh=kwh, carbon_intensity_kg_per_kwh=carbon_intensity_kg_per_kwh, pue=pue)
    if pue < 1:
        raise CalculationError("pue should normally be >= 1")
    return kwh * pue * carbon_intensity_kg_per_kwh


def energy_per_scan(total_kwh: float, scan_count: int) -> float:
    _non_negative(total_kwh=total_kwh, scan_count=scan_count)
    return total_kwh / scan_count if scan_count else 0.0


def ai_inference_energy_kwh(power_kw: float, inference_seconds: float, number_of_inferences: int, pue: float = 1.0) -> float:
    _non_negative(power_kw=power_kw, inference_seconds=inference_seconds, number_of_inferences=number_of_inferences, pue=pue)
    return power_kw * (inference_seconds / 3600.0) * number_of_inferences * pue


def ai_training_energy_kwh(hardware_power_kw: float, training_hours: float, pue: float = 1.0) -> float:
    _non_negative(hardware_power_kw=hardware_power_kw, training_hours=training_hours, pue=pue)
    return hardware_power_kw * training_hours * pue


def idle_waste_kwh(idle_power_kw: float, avoidable_idle_hours: float) -> float:
    return energy_kwh(idle_power_kw, avoidable_idle_hours)


@dataclass(frozen=True)
class EquivalencyFactors:
    household_kwh_per_year: float = 3500.0
    car_kgco2e_per_km: float = 0.17
    phone_charge_kwh: float = 0.012
    tree_kgco2e_per_year: float = 21.0
    glass_water_liters: float = 0.25


def equivalencies(kwh: float, kgco2e: float, water_liters: float = 0, factors: EquivalencyFactors = EquivalencyFactors()) -> dict:
    _non_negative(kwh=kwh, kgco2e=kgco2e, water_liters=water_liters)
    return {
        "household_years": kwh / factors.household_kwh_per_year if factors.household_kwh_per_year else 0,
        "car_km": kgco2e / factors.car_kgco2e_per_km if factors.car_kgco2e_per_km else 0,
        "phone_charges": kwh / factors.phone_charge_kwh if factors.phone_charge_kwh else 0,
        "trees_one_year": kgco2e / factors.tree_kgco2e_per_year if factors.tree_kgco2e_per_year else 0,
        "glasses_of_water": water_liters / factors.glass_water_liters if factors.glass_water_liters else 0,
    }

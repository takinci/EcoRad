import pytest
from backend.app.calculations import energy_kwh, emissions_kgco2e, energy_per_scan, ai_inference_energy_kwh, ai_training_energy_kwh, CalculationError


def test_energy():
    assert energy_kwh(10, 2.5) == 25


def test_emissions():
    assert emissions_kgco2e(100, 0.2) == 20
    assert emissions_kgco2e(100, 0.2, 1.5) == 30


def test_per_scan_zero_safe():
    assert energy_per_scan(100, 0) == 0


def test_ai_inference():
    assert round(ai_inference_energy_kwh(0.1, 36, 100, 1.0), 3) == 0.1


def test_ai_training():
    assert ai_training_energy_kwh(0.5, 10, 1.2) == 6


def test_negative_blocked():
    with pytest.raises(CalculationError):
        energy_kwh(-1, 1)

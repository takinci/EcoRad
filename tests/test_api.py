from fastapi.testclient import TestClient
from backend.app.main import app


def test_health_and_dashboard():
    with TestClient(app) as client:
        assert client.get('/api/health').status_code == 200
        response = client.get('/api/dashboard/1')
        assert response.status_code == 200
        data = response.json()
        assert data['totals']['kwh'] >= 0
        assert 'topOpportunities' in data


def test_exports():
    with TestClient(app) as client:
        assert client.get('/api/export/1.csv').status_code == 200
        assert client.get('/api/export/1.pdf').status_code == 200

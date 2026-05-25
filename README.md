# EcoRad

EcoRad is a GitHub-ready sustainability intelligence web application for radiology departments. It estimates, tracks, visualizes, and explains environmental impact from imaging operations, infrastructure, consumables, patient workflows, and AI tool use.

## Stack

- Backend: Python FastAPI
- Database: SQLite locally, PostgreSQL-ready SQLAlchemy models
- Frontend: React, Vite, Chart.js
- Deployment: Dockerfile and docker-compose
- Tests: pytest

## Repository structure

```text
ecorad/
  backend/app/          FastAPI app, models, seed data, calculations
  frontend/src/         React UI
  frontend/public/      SVG logo and favicon
  tests/                Unit tests for calculations
  sources.md            References and assumption governance
  Dockerfile
  docker-compose.yml
  requirements.txt
```

## Run locally with Docker

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:5173
- API: http://localhost:8000/docs

## Run backend only

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

## Run frontend only

```bash
cd frontend
npm install
npm run dev
```

## Run tests

```bash
pytest
```

## Main API endpoints

- `GET /api/meta`
- `GET /api/dashboard/1`
- `GET /api/ai/1`
- `GET /api/scenarios/1`
- `POST /api/activity/1`
- `GET /api/export/1.csv`

## Calculation logic

- `kWh = power in kW × time in hours`
- `CO2e = kWh × carbon intensity in kgCO2e/kWh`
- `Energy per scan = total modality kWh / scan count`
- `Idle waste = idle kWh that could be avoided by standby/off policies`
- `AI inference energy = GPU/CPU power × inference time × number of inferences × PUE`
- `AI training energy = hardware power × training hours × PUE`

## Branding assets included

The app includes an inline EcoRad logo plus `frontend/public/logo.svg` and `frontend/public/favicon.svg`. PNG exports can be generated from the SVG using design tooling or a CI asset pipeline.

## Cloud hosting notes

Backend can be deployed to Azure App Service, AWS ECS/Fargate, Google Cloud Run, Render, Fly.io, or a Kubernetes cluster. For production:

1. Replace SQLite with PostgreSQL.
2. Set CORS to approved domains only.
3. Add authentication and role-based access control.
4. Store emission factor updates and assumptions under audit control.
5. Add PDF generation to the export endpoint if formal reports are required.
6. Add CI/CD checks for tests, linting, dependency scanning, and container scanning.

## Important validation note

EcoRad is a decision-support and reporting prototype. For regulated use, validate intended use, data provenance, assumptions, calculation logic, audit trail, access control, change control, and report generation according to the applicable quality system.

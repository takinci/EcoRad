# EcoRad

EcoRad is a deployable radiology sustainability intelligence web tool. It estimates, tracks, visualizes, and explains environmental impact from imaging operations, infrastructure, consumables, waste, patient workflow assumptions, and AI workloads.

## What is included

- FastAPI backend with SQLite by default and PostgreSQL-ready `DATABASE_URL`
- React + Vite frontend with Chart.js visualizations
- Seed data for MRI, CT, X-ray, ultrasound, PACS/RIS, workstations, servers, consumables, waste, scenarios, and AI workload examples
- Editable regional carbon-intensity assumptions
- CSV and PDF export endpoints
- Docker production build serving frontend and API from one container
- Development Docker Compose for API and Vite hot reload
- Unit tests for calculation logic
- `sources.md` with grouped scientific and policy references

## Repository structure

```text
ecorad/
  backend/app/
    calculations.py
    config.py
    database.py
    main.py
    models.py
    seed.py
  frontend/
    public/
    src/
    index.html
    package.json
  tests/
  .github/workflows/ci.yml
  Dockerfile
  docker-compose.yml
  docker-compose.dev.yml
  requirements.txt
  sources.md
```

## Run locally without Docker

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend at `http://localhost:5173`. The API runs at `http://localhost:8000`.

## Run production container

```bash
docker compose up --build
```

Open `http://localhost:8000`. The FastAPI app serves the compiled React app and the `/api/*` endpoints.

## API endpoints

- `GET /api/health`
- `GET /api/meta`
- `GET /api/departments`
- `POST /api/departments`
- `GET /api/equipment/{department_id}`
- `GET /api/dashboard/{department_id}`
- `GET /api/ai/{department_id}`
- `POST /api/activity/{department_id}`
- `POST /api/emission-factors`
- `GET /api/scenarios/{department_id}`
- `POST /api/scenarios/{department_id}`
- `GET /api/export/{department_id}.csv`
- `GET /api/export/{department_id}.pdf`

## PostgreSQL deployment

Set `DATABASE_URL` before starting the backend:

```bash
DATABASE_URL=postgresql+psycopg://user:password@host:5432/ecorad
```

Install the relevant PostgreSQL driver if needed, for example `psycopg[binary]`.

## Important implementation notes

The default values are intentionally editable assumptions, not fixed scientific claims. For formal ESG or regulatory reporting, replace assumptions with measured local metering, procurement, waste, cloud, and travel data. Each seeded assumption includes a citation field or source note.

## Tests

```bash
pytest
```

## GitHub Actions

The included workflow installs Python dependencies and runs tests on every push or pull request.

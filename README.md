
# EcoRad

![EcoRad Logo](./logo-ecorad.png)

## Sustainable Radiology

EcoRad is a radiology sustainability platform designed to help imaging departments estimate, visualize and reduce the environmental impact of imaging operations, AI workloads and healthcare infrastructure.

---

## Goal of the Tool

EcoRad helps hospitals and radiology organizations:
- estimate energy consumption
- calculate carbon emissions
- analyze AI sustainability impact
- optimize imaging workflows
- compare sustainability interventions
- generate ESG-style sustainability reports

The platform translates complex sustainability metrics into understandable operational insights for:
- radiologists
- sustainability officers
- medical physicists
- healthcare executives
- AI governance teams
- academic institutions

---

## Main Capabilities

### Radiology Sustainability Dashboard
- MRI, CT, X-ray and ultrasound tracking
- Active vs idle energy analysis
- Scope 1, 2 and 3 emissions
- Department KPI monitoring
- Modality comparison

### AI Sustainability Dashboard
- AI training footprint
- AI inference energy
- GPU and cloud analysis
- Net AI impact estimation
- Sustainability optimization

### Scenario Analysis
- Overnight shutdown policies
- Standby optimization
- Reduced repeat scans
- Renewable electricity scenarios
- Efficient AI model analysis

### Reporting
- CSV export
- PDF report generation
- Scenario comparison
- Assumption documentation

---

## Technology Stack

### Backend
- FastAPI
- Python
- SQLAlchemy
- SQLite
- PostgreSQL-ready schema

### Frontend
- React
- JavaScript
- Chart.js
- HTML/CSS

### Deployment
- Docker
- Docker Compose
- GitHub Pages support

---

## Folder Structure

```text
backend/
frontend/
tests/
docs/
docker/
index.html
README.md
sources.md
logo-ecorad.png
```

---

## How to Run Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Docker Deployment

```bash
docker-compose up --build
```

---

## GitHub Pages Deployment

This repository contains a root `index.html` file compatible with GitHub Pages deployment.

Deployment steps:
1. Push repository to GitHub
2. Open repository settings
3. Enable GitHub Pages
4. Select root deployment
5. Save

---

## Scientific Basis

EcoRad uses editable assumptions and references from:
- radiology sustainability literature
- AI sustainability publications
- healthcare ESG methodologies
- carbon accounting frameworks
- electricity carbon intensity datasets

See `sources.md` for detailed references.

---

## Branding

EcoRad branding combines:
- radiology imaging geometry
- sustainability-inspired forms
- AI and digital health aesthetics
- enterprise healthcare design

<div align="center">

<img src="./Logo only.png" alt="EcoRad logo" width="120"/>

# EcoRad

### Radiology Sustainability Intelligence

**Measure the environmental footprint of a clinical imaging department — energy, carbon, water, AI, and more — directly in your browser.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-takinci.github.io%2FEcoRad-2E7D32?style=for-the-badge&logo=github)](https://takinci.github.io/EcoRad/)
[![Built with React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Chart.js](https://img.shields.io/badge/Chart.js-4-FF6384?style=flat-square&logo=chartdotjs)](https://www.chartjs.org)
[![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-222?style=flat-square&logo=github)](https://takinci.github.io/EcoRad/)

</div>

---

## What is EcoRad?

EcoRad is a browser-based sustainability dashboard for clinical radiology departments. It quantifies the environmental impact of imaging operations, compares interventions, models AI tool footprints, and generates shareable reports — all from published literature defaults that you can override with your own measured data.

No installation. No backend. No data leaves your browser.

**→ Try it live: [takinci.github.io/EcoRad](https://takinci.github.io/EcoRad/)**

---

## What can it do?

### 🔋 Radiology Sustainability Dashboard

Five metric categories, fully reactive to your region, department profile, and time period:

| Category | What it tracks |
|---|---|
| **1. Energy consumption** | Total kWh/MWh, active vs idle breakdown, avoidable idle, energy per scan |
| **2. Carbon emissions** | GHG Protocol Scope 1 (direct), Scope 2 (electricity), Scope 3 (hardware embodied + patient travel) with stacked bar chart |
| **3. Infrastructure** | Top idle waster, hardware lifespans, carbon intensity, Scope 3 total, top-5 opportunity table |
| **4. Resource footprint** | Water (L/kWh cooling), paper consumption (g/encounter), hazardous waste (contrast media) |
| **5. Real-world equivalencies** | Car km, phone charges, tree-years to offset, short-haul flights (ICAO 2023), household electricity years |

### 🤖 AI Sustainability Dashboard

Three-phase lifecycle model for a radiology AI tool:

| Phase | Metrics |
|---|---|
| **Training** | Total kWh (one-time), CO₂e, estimated GPU hours, amortised per month |
| **Testing / validation** | Hold-out set energy, CO₂e, proxy metric note (DLP/CTDIvol R²=0.87–0.92) |
| **Inference & deployment** | Per-study energy, monthly and lifetime totals, water footprint |

Plus: Green AI efficiency ratio (accuracy % per kWh), PUE, embodied GPU carbon, rebound effect risk, and a full modality energy benchmark table (Vosshenrich et al.).

Selectable **architecture** (CNN, U-Net, EfficientNet, ViT, Diffusion/Generative), **model size**, **precision** (float32 / float16 AMP), and **cloud provider**.

### 📊 Scenario Comparison

Pick from 12 evidence-based interventions and see the before/after energy and carbon impact:

> Turn MRI/CT off overnight · Standby mode · Reduce low-value imaging · Shorten protocols · Renewable electricity · Move computation to lower-carbon region · Use smaller AI models · Consolidate servers · and more

### 📤 Export

Download a CSV report or print to PDF with a clean print-optimised layout. The export page includes key assumption citations so reports are audit-ready.

---

## Department Profiles

Switch profile to load a different equipment fleet — all numbers update instantly:

| Profile | Fleet |
|---|---|
| **Hospital radiology** | MRI 3T + CT + X-ray + Ultrasound + PACS + Workstations |
| **Outpatient imaging center** | MRI 1.5T + smaller CT + X-ray + 3× Ultrasound |
| **Research imaging lab** | MRI 7T + MRI 3T + CT + Ultrasound + Analysis Workstations ×8 |
| **Teleradiology / informatics** | Remote PACS + Archive + AI Inference Servers + Workstations ×12 |

---

## Configurable inputs

All settings are reflected in the URL hash — copy the link to share your exact configuration:

- **Region / grid** — Switzerland, France, Germany, United States, United Kingdom, EU average, Global average, Custom
- **Time period** — Monthly, Quarterly, Annual
- **Department profile** — 4 presets (see above)
- **Metric type** — Energy, Carbon, Water, AI net impact
- **Intended use** — footprint estimate, modality comparison, KPI tracking, AI impact, intervention evaluation

---

## Scientific basis

Every default value is sourced from peer-reviewed literature. Key references:

| Area | Source |
|---|---|
| MRI active power (30 kW, 3T) | Heye et al. *J Magn Reson Imaging* 2023 · DOI [10.1002/jmri.28994](https://doi.org/10.1002/jmri.28994) |
| CT active power (40–80 kW) | Acra 2024 · DOI [10.1016/j.acra.2024.05.004](https://doi.org/10.1016/j.acra.2024.05.004) |
| Carbon intensity by region | Our World in Data 2022–2023 · [ourworldindata.org](https://ourworldindata.org/grapher/carbon-intensity-electricity) |
| AI footprint methodology | Doo et al. *Radiology* 2024 · DOI [10.1148/radiol.232030](https://doi.org/10.1148/radiol.232030) |
| Intervention savings | McKee et al. *Radiology* 2024 · DOI [10.1148/radiol.240219](https://doi.org/10.1148/radiol.240219) |
| Modality energy benchmarks | Vosshenrich et al. (Implementation Guide) |
| Idle state efficiency | Schoen et al. — idle offers 14.9× more savings than active state |
| ESR guidance | ESR Green Imaging self-assessment · ESR Position Paper 2025 |

Full reference list: [sources.md](./sources.md)

> **All values are literature-derived defaults.** Replace them with your own scanner logs, utility bills, or measured data for publication-quality reporting.

---

## Run locally

```bash
git clone https://github.com/takinci/EcoRad.git
cd EcoRad/frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To build for deployment:

```bash
npm run build   # outputs to ../docs/
```

---

## Tech stack

| Layer | Technology |
|---|---|
| UI framework | React 18 |
| Build tool | Vite 5 |
| Charts | Chart.js 4 + react-chartjs-2 |
| Icons | Lucide React |
| Hosting | GitHub Pages (static, no backend) |
| CI/CD | GitHub Actions |

---

## Who is it for?

- **Radiologists and clinical leads** — understand the footprint of your department and identify quick wins
- **Sustainability officers** — generate Scope 1/2/3 estimates and intervention comparisons for ESG reporting
- **Medical physicists** — benchmark scanner energy against published literature
- **AI governance teams** — model the lifecycle carbon footprint of a radiology AI tool before deployment
- **Academic researchers** — explore and cite the evidence base, export data for publications
- **Healthcare executives** — communicate sustainability performance in accessible equivalencies (car km, flights, tree-years)

---

## Assumptions and governance

1. Prefer measured data — scanner logs, smart meters, utility bills always override defaults
2. Literature values are transparent defaults, not authoritative truth
3. Mark every input as *measured*, *estimated*, or *assumed*
4. Carbon intensity must be editable and region-specific
5. Separate AI gross footprint from estimated sustainability benefits
6. Report Scope 1, 2, and 3 separately

See [sources.md](./sources.md) for the full assumptions governance document.

---

<div align="center">

Built for radiology sustainability research · Evidence-based · Open source

[**→ Open EcoRad**](https://takinci.github.io/EcoRad/)

</div>

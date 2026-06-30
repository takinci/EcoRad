<div align="center">

<img src="./Logo only.png" alt="CEDARS logo" width="120"/>

# CEDARS

### Carbon, Energy Diagnostics for AI and Radiology Sustainability

**Measure the environmental footprint of clinical imaging — energy, carbon, water, and AI — and turn it into a standardised, shareable disclosure, directly in your browser.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-takinci.github.io%2Fcedars-2E7D32?style=for-the-badge&logo=github)](https://takinci.github.io/cedars/)
[![Built with React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Chart.js](https://img.shields.io/badge/Chart.js-4-FF6384?style=flat-square&logo=chartdotjs)](https://www.chartjs.org)
[![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-222?style=flat-square&logo=github)](https://takinci.github.io/cedars/)

</div>

---

## What is CEDARS?

CEDARS (Carbon, Energy Diagnostics for AI and Radiology Sustainability) is a browser-based tool that quantifies the environmental footprint of a radiology operation **and** of the AI models it deploys, then expresses the result as a standardised **CEDARS Score and Rating** ecolabel for reporting and comparison — all from published literature defaults you can override with your own measured data.

No installation. No backend. No data leaves your browser.

**→ Try it live: [takinci.github.io/cedars](https://takinci.github.io/cedars/)**

---

## What can it do?

CEDARS is organised into five pages: **Home · Radiology Dashboard · AI Dashboard · Compare · EcoLabel**.

### 🔋 Radiology Dashboard

Build your department by setting the count of each device in your **equipment fleet** (MRI by field strength, CT, PET-CT, X-ray, mammography, ultrasound, angio/IR, fluoroscopy, PACS, workstations). Every metric reacts to your fleet, region, and time period:

| Category | What it tracks |
|---|---|
| **1. Energy** | Total kWh/MWh, active vs idle breakdown, avoidable idle, energy per scan |
| **2. Carbon (GHG Scopes)** | Scope 1 (direct) · Scope 2 (electricity) · Scope 3 — embodied hardware, patient travel, **staff commute** (auto-estimated from the device fleet), and **DICOM data transfer** — plus a per-study **Software Carbon Intensity (SCI)** metric (Green Software Foundation) |
| **3. Infrastructure** | Top idle waster, hardware lifespans, grid carbon intensity, Scope 3 total, top-5 opportunity table |
| **4. Resource footprint** | Water (cooling), paper, hazardous waste (contrast media) |
| **5. Real-world equivalencies** | Car km, phone charges, tree-years, short-haul flights, household-electricity years |

The Home page can also **add one or more AI/ML tools** so their footprint is included in the department totals.

### 🤖 AI Sustainability Dashboard

Model the lifecycle footprint of a radiology AI tool with a tabbed, three-phase breakdown plus a built-in cloud-infrastructure view.

- **Task-family model library** — start from an editable, literature-anchored template: Classification/triage, lesion detection, 2D & 3D segmentation, reconstruction/denoising, diffusion synthesis, report generation (LLM/VLM), foundation/prompt models, or Custom.
- **Advanced model parameters** (progressive disclosure) — parameters, 2D/3D, input resolution, slices; inference energy **scales physically** with `params × resolution² (× slices)`.
- **GPU training-energy estimator** — derive training kWh from GPU type × count × hours × PUE, or enter a measured value.
- **Performance is user-owned, never predicted** — you enter the model's reported accuracy (with its metric: AUC, Dice, SSIM…) and any clinical co-benefits; defaults come from the cited reference.
- **Lifecycle tabs** — Training, Testing/validation, Inference & deployment, Carbon summary, Clinical co-benefits.
- **Infrastructure tab** — full cloud-carbon accounting (compute, storage, data transfer, monthly totals, cross-region optimisation), with the AI's training + inference auto-seeded; provider/region are shared with the lifecycle math.

### 📊 Compare

Two modes in one tab:

- **Interventions** — pick an evidence-based action (turn scanners off overnight, standby mode, reduce low-value imaging, shorten protocols, renewable electricity, lower-carbon region, smaller AI models, consolidate servers, …) and see the before/after energy and carbon.
- **AI model benchmark** — shortlist several model configurations, compare them in a table under one department context, and read off the **accuracy-vs-carbon trade-off** on a Pareto scatter (efficient models highlighted).

### 🏷️ EcoLabel — CEDARS Score & Rating

Turn an estimate into a standardised disclosure, after the design logic of Energy Star and the EU Energy Label:

- **CEDARS Score** — a continuous **0–100** value from the estimated footprint, for precise reporting.
- **CEDARS Rating** — a recognisable **1–5 leaf** badge mapped from the Score.
- **Disclosure checklist** — the minimum set of items for a reproducible footprint (hardware, energy, grid intensity, cloud/PUE, training–inference split, water, Score+Rating), modelled on CLAIM/DEAL.
- **Two scopes:**
  - **AI model only** — a standalone research-disclosure label for a single model.
  - **Radiology department** — facility energy plus a list of **deployed AI tools**, whose *net* annual CO₂ (compute minus clinical savings) folds into the department's score; import a model from the AI Dashboard in one click or enter one manually.
- **Export** each label as a PNG badge, a markdown table, or a ready-to-paste paper/ESG paragraph.

### 📤 Export

Per-dashboard CSV reports, print-to-PDF with a clean layout, and the EcoLabel exports above — all carrying key assumption citations so reports are audit-ready.

---

## Configurable inputs

Core settings are reflected in the URL hash — copy the link to share your exact configuration:

- **Equipment fleet** — set the count of each device type
- **Region / grid** — Switzerland, France, Germany, United States, United Kingdom, EU average, Global average, or a custom carbon intensity
- **Time period** — Monthly, Quarterly, Annual
- **Renewable %** and **custom grid intensity** where applicable
- **Cloud provider & region** — Local / AWS / Azure / Google Cloud, with per-region grid intensity for AI and infrastructure

Staff-commute headcount is derived automatically from the device fleet (NHS/BIR workforce ratios), so it needs no manual entry.

---

## Scientific basis

Every default value is sourced from peer-reviewed literature and listed in **[sources.md](./sources.md)**. Selected references:

| Area | Source |
|---|---|
| MRI active power (≈30 kW, 3T) | Heye et al. *J Magn Reson Imaging* 2023 · DOI [10.1002/jmri.28994](https://doi.org/10.1002/jmri.28994) |
| CT active power (40–80 kW) | Acra 2024 · DOI [10.1016/j.acra.2024.05.004](https://doi.org/10.1016/j.acra.2024.05.004) |
| Interventional imaging power (direct sensor) | Vosshenrich et al. *AJR* 2024 · DOI [10.2214/AJR.24.30988](https://doi.org/10.2214/AJR.24.30988) |
| Carbon intensity by region | Our World in Data 2022–2023 · [ourworldindata.org](https://ourworldindata.org/grapher/carbon-intensity-electricity) |
| AI footprint & lifecycle framework | Doo et al. *Radiology* 2024 · DOI [10.1148/radiol.232030](https://doi.org/10.1148/radiol.232030) |
| LLM energy vs. model size | Doo et al. *Radiology* 2024 · DOI [10.1148/radiol.240320](https://doi.org/10.1148/radiol.240320) |
| DICOM network energy (0.001 kWh/GB) | Aslan et al. *J Industrial Ecology* 2018 · DOI [10.1111/jiec.12630](https://doi.org/10.1111/jiec.12630) |
| Software Carbon Intensity (SCI) | Green Software Foundation · SCI Specification v1.0 |
| Intervention savings | McKee et al. *Radiology* 2024 · DOI [10.1148/radiol.240219](https://doi.org/10.1148/radiol.240219) |
| Ecolabel design logic | Energy Star · EU Energy Label (Regulation EU 2021/341) |
| AI model library anchors | CheXNet, U-Net, nnU-Net, MedSAM, diffusion recon (see sources.md) |

> **All values are literature-derived defaults.** Replace them with your own scanner logs, utility bills, GPU measurements, or validation results for publication-quality reporting. CEDARS **models energy** but only **records performance** — it never predicts a model's accuracy.

---

## Run locally

```bash
git clone https://github.com/takinci/cedars.git
cd cedars/frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To build for deployment:

```bash
npm run build   # outputs to ../docs/
```

> Requires Node 20+ (Vite 5).

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

- **Radiologists and clinical leads** — understand your department's footprint and find quick wins
- **Sustainability officers** — generate Scope 1/2/3 estimates and CEDARS disclosures for ESG reporting
- **Medical physicists** — benchmark scanner energy against published literature
- **AI developers and governance teams** — model an AI tool's lifecycle carbon, benchmark candidates on accuracy-vs-carbon, and attach the result to a department
- **Academic researchers** — generate a standardised CEDARS EcoLabel for a manuscript, with a reproducible disclosure checklist
- **Healthcare executives** — communicate performance in accessible equivalencies

---

## Assumptions and governance

1. Prefer measured data — scanner logs, smart meters, utility bills, GPU measurements always override defaults
2. Literature values are transparent defaults, not authoritative truth
3. Mark every input as *measured*, *estimated*, or *assumed*
4. Carbon intensity must be editable and region-specific
5. Separate AI gross footprint from estimated sustainability benefits
6. Report Scope 1, 2, and 3 separately
7. **Energy may be modelled; model performance may only be recorded** — accuracy and clinical benefit are user-entered, never predicted

See [sources.md](./sources.md) for the full assumptions-governance document.

---

<div align="center">

Built for radiology sustainability research · Evidence-based · Open source

[**→ Open CEDARS**](https://takinci.github.io/cedars/)

</div>

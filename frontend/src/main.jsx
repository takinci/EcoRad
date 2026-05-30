import React, {useState, useMemo, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Bar, Doughnut} from 'react-chartjs-2';
import {Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend} from 'chart.js';
import {Leaf, Brain, Download, Activity, Gauge, TrendingDown, Droplets, FileText, Trash2, Cpu, Car, TreePine, Plane, Factory, Zap, Target, AlertTriangle, BarChart3} from 'lucide-react';
import './styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// ── Reference tables ──────────────────────────────────────────────────────────

// kgCO₂e/kWh per region — Our World in Data (OWID), Carbon Intensity of Electricity, 2022-2023 national averages
// https://ourworldindata.org/grapher/carbon-intensity-electricity
// Global average (0.473) and EU average (0.237) from Vosshenrich et al. (cited in Implementation Guide).
// Replace with local utility/Eurostat data where available.
const CARBON_INTENSITY = {
  "Switzerland":    0.10,  // hydro + nuclear dominant; OWID 2023
  "France":         0.06,  // ~70 % nuclear; OWID 2023
  "Germany":        0.36,  // coal/gas/renewable mix; OWID 2023
  "United States":  0.38,  // national grid average; OWID 2023
  "United Kingdom": 0.20,  // gas + offshore wind; OWID 2023
  "EU average":     0.237, // Vosshenrich et al. / Eurostat 2022
  "Global average": 0.473, // Vosshenrich et al. — use for conservative global estimates
  "Editable custom":0.30,  // placeholder — replace with measured utility factor
};

const TIME_MULT = {Monthly: 1, Quarterly: 3, Annual: 12};
const TIME_LABEL = {Monthly: "/mo", Quarterly: "/qtr", Annual: "/yr"};

// Equipment fleets per department profile. Power values from literature (see sources.md).
// Hours are typical monthly operational patterns per profile type.
const EQUIPMENT_PROFILES = {
  "Hospital radiology": [
    {name:"MRI 3T",               modality:"MRI",         active_kw:30,  idle_kw:15,  standby_kw:5,   off_kw:0.5,  active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:120, scans:1200},
    {name:"CT Scanner",           modality:"CT",          active_kw:60,  idle_kw:8,   standby_kw:3,   off_kw:0.2,  active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:120, scans:1800},
    {name:"Digital X-ray Room",   modality:"X-ray",       active_kw:12,  idle_kw:2,   standby_kw:0.6, off_kw:0.1,  active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:120, scans:2500},
    {name:"Ultrasound Fleet",     modality:"Ultrasound",  active_kw:1.5, idle_kw:0.4, standby_kw:0.1, off_kw:0.02, active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:120, scans:2500},
    {name:"PACS Storage",         modality:"PACS/RIS",    active_kw:4,   idle_kw:4,   standby_kw:4,   off_kw:4,    active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:120, scans:2500},
    {name:"Reporting Workstations",modality:"Workstation", active_kw:2,  idle_kw:0.8, standby_kw:0.2, off_kw:0.05, active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:120, scans:2500},
  ],
  "Outpatient imaging center": [
    {name:"MRI 1.5T",             modality:"MRI",         active_kw:22,  idle_kw:12,  standby_kw:4,   off_kw:0.5,  active_h:120, idle_h:260, standby_h:280, off_h:84,  avoidable_idle_h:100, scans:800},
    {name:"CT Scanner",           modality:"CT",          active_kw:45,  idle_kw:6,   standby_kw:2,   off_kw:0.2,  active_h:100, idle_h:220, standby_h:300, off_h:124, avoidable_idle_h:80,  scans:1000},
    {name:"Digital X-ray",        modality:"X-ray",       active_kw:10,  idle_kw:1.5, standby_kw:0.5, off_kw:0.1,  active_h:120, idle_h:240, standby_h:280, off_h:104, avoidable_idle_h:80,  scans:1800},
    {name:"Ultrasound (×3)",      modality:"Ultrasound",  active_kw:4.5, idle_kw:1.2, standby_kw:0.3, off_kw:0.06, active_h:140, idle_h:260, standby_h:260, off_h:84,  avoidable_idle_h:100, scans:3000},
    {name:"PACS Storage",         modality:"PACS/RIS",    active_kw:2,   idle_kw:2,   standby_kw:2,   off_kw:2,    active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:60,  scans:2500},
    {name:"Workstations (×4)",    modality:"Workstation", active_kw:0.8, idle_kw:0.3, standby_kw:0.08,off_kw:0.02, active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:100, scans:2500},
  ],
  "Research imaging lab": [
    {name:"MRI 7T Research",      modality:"MRI",         active_kw:45,  idle_kw:22,  standby_kw:8,   off_kw:1,    active_h:120, idle_h:320, standby_h:260, off_h:44,  avoidable_idle_h:150, scans:300},
    {name:"MRI 3T Clinical",      modality:"MRI",         active_kw:30,  idle_kw:15,  standby_kw:5,   off_kw:0.5,  active_h:100, idle_h:280, standby_h:280, off_h:84,  avoidable_idle_h:130, scans:500},
    {name:"CT Research Unit",     modality:"CT",          active_kw:55,  idle_kw:7,   standby_kw:3,   off_kw:0.2,  active_h:80,  idle_h:200, standby_h:300, off_h:164, avoidable_idle_h:80,  scans:400},
    {name:"Ultrasound",           modality:"Ultrasound",  active_kw:1.5, idle_kw:0.4, standby_kw:0.1, off_kw:0.02, active_h:80,  idle_h:200, standby_h:300, off_h:164, avoidable_idle_h:60,  scans:300},
    {name:"Research PACS",        modality:"PACS/RIS",    active_kw:6,   idle_kw:6,   standby_kw:6,   off_kw:6,    active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:80,  scans:1500},
    {name:"Analysis Workstations (×8)",modality:"Workstation",active_kw:3.2,idle_kw:1.6,standby_kw:0.4,off_kw:0.08,active_h:200, idle_h:350, standby_h:174, off_h:20,  avoidable_idle_h:80,  scans:2000},
  ],
  "Teleradiology / informatics-heavy workflow": [
    {name:"Remote PACS (primary)",modality:"PACS/RIS",    active_kw:8,   idle_kw:8,   standby_kw:8,   off_kw:8,    active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:60,  scans:5000},
    {name:"Archive Storage",      modality:"PACS/RIS",    active_kw:3,   idle_kw:3,   standby_kw:3,   off_kw:3,    active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:30,  scans:5000},
    {name:"AI Inference Servers", modality:"PACS/RIS",    active_kw:5,   idle_kw:5,   standby_kw:5,   off_kw:5,    active_h:160, idle_h:300, standby_h:250, off_h:34,  avoidable_idle_h:60,  scans:5000},
    {name:"Workstations (×12)",   modality:"Workstation", active_kw:2.4, idle_kw:1.0, standby_kw:0.24,off_kw:0.06, active_h:160, idle_h:280, standby_h:250, off_h:54,  avoidable_idle_h:120, scans:5000},
  ],
};
// Backwards-compatible alias used by INTERVENTIONS notes
const EQUIPMENT_BASE = EQUIPMENT_PROFILES["Hospital radiology"];

// Monthly kWh savings per intervention — conservative departmental estimates.
// Sources: McKee 2024 (10.1148/radiol.240219), ESR Position Paper 2025, JMRI 2023 (10.1002/jmri.28994),
// IJHCQA 2016 (10.1108/IJHCQA-10-2016-0153), Radiol 2023 (10.1148/radiol.230441), AJR 2023 (10.2214/AJR.23.30189),
// LLM-Energy PDF (model efficiency), Clinical-AI PDF (virtualisation).
// Replace kwh values with before/after metering for your department.
const INTERVENTIONS = {
  // idle 15 kW × 8 h/night × ~20 nights ≈ 2 400 kWh/month (JMRI-2023, Radiol-243453)
  "Turn MRI/CT scanners off overnight":      {kwh: 2400, note: "Eliminates ~8 h/night idle draw on MRI and CT. (JMRI 2023, Radiol 2024)"},
  // standby ~40–60 % lower than idle (Herrmann 2012, CJRS 2022)
  "Use standby mode during inactive periods":{kwh: 1200, note: "Drops idle to standby during low-activity windows. (Herrmann 2012, CJRS 2022)"},
  // reducing 5–10 % unnecessary scans (McKee 2024, ESR PP 2025)
  "Reduce low-value imaging":                {kwh:  800, note: "Fewer scans = less active operation time. (McKee 2024, ESR PP 2025)"},
  // tighter scheduling cuts dead-time idle (IJHCQA 2016)
  "Optimize scheduling":                     {kwh:  600, note: "Tighter scheduling reduces dead-time idle energy. (IJHCQA 2016)"},
  // protocol compression reduces per-scan active time (Radiol 2023, EurRad 2024)
  "Shorten protocols":                       {kwh:  450, note: "Shorter scan times reduce active energy per study. (Radiol 2023, EurRad 2024)"},
  // each avoided CT ≈ 0.5 kWh; ~1 800 repeats/month = 900 kWh (AJR 2023)
  "Reduce repeat scans":                     {kwh:  900, note: "Each avoided repeat saves full scan energy. (AJR 2023)"},
  // grid swap from 0.38 to ≤0.10 kgCO₂e/kWh saves up to 75 % of Scope 2 (OWID)
  "Move computation to lower-carbon regions":{kwh:    0, co2Pct: 30, note: "Same energy, lower-carbon grid. (OWID carbon intensity data)"},
  // Scope 2 elimination via green tariff or PPA (ESR Green Imaging)
  "Use renewable electricity":               {kwh:    0, co2Pct: 80, note: "Scope 2 decarbonisation via green tariff or PPA. (ESR Green Imaging)"},
  // film processor and laser printer loads (Radiol 2024, 10.1148/radiol.240398)
  "Reduce paper and film printing":          {kwh:  120, note: "Printer and film processor elimination. (Radiol 2024)"},
  // embodied carbon amortised over more years (ESR PP 2025, Scope 3)
  "Extend hardware lifetime":                {kwh:    0, co2Pct: 15, note: "Amortises embodied carbon over more years. (ESR PP 2025)"},
  // virtualisation / right-sizing (Clinical-AI PDF, Doo 2024)
  "Consolidate servers":                     {kwh:  500, note: "Virtualisation reduces physical server count. (Doo 2024, Clinical-AI)"},
  // lighter models use less inference compute (LLM-Energy PDF)
  "Use smaller or more efficient AI models": {kwh:   80, note: "Lighter AI models use less inference compute. (LLM-Energy PDF)"},
};

// Cloud provider PUE and global fleet carbon intensity defaults.
// PUE sources: AWS 2022 Sustainability Report, Microsoft 2023 Environmental Report, Google 2023 Environmental Report.
// Carbon intensity is global fleet average — regional deployments vary substantially.
// Clinical AI footprint framing: Doo 2024 (10.1148/radiol.232030); lifecycle methodology: Clinical-AI PDF.
const CLOUD = {
  "Local compute": {pue: 1.50, ci: 0.25}, // typical on-premise server room (ASHRAE)
  "AWS":           {pue: 1.15, ci: 0.20}, // AWS 2022 Sustainability Report
  "Azure":         {pue: 1.15, ci: 0.18}, // Microsoft 2023 Environmental Report
  "Google Cloud":  {pue: 1.10, ci: 0.12}, // Google 2023 Environmental Report (lowest industry PUE)
};

// ── AI architecture library ───────────────────────────────────────────────────
// trainFactor / inferFactor multiply base model energy by architecture complexity.
// Sources: LLM-Energy PDF; Clinical-AI PDF; Doo 2024 (10.1148/radiol.232030)
const AI_ARCHITECTURES = {
  "CNN / ResNet": {
    trainFactor: 1.0, inferFactor: 1.0,
    desc: "Convolutional network. Efficient for classification and detection. Standard radiology AI baseline.",
  },
  "U-Net (segmentation)": {
    trainFactor: 1.2, inferFactor: 1.15,
    desc: "Encoder-decoder for organ/lesion segmentation. Widely deployed in radiology AI workflows.",
  },
  "EfficientNet": {
    trainFactor: 0.85, inferFactor: 0.80,
    desc: "Compound-scaled CNN. Better accuracy per FLOP than ResNet. Recommended for energy-efficient deployment. (LLM-Energy PDF)",
  },
  "Vision Transformer (ViT)": {
    trainFactor: 1.8, inferFactor: 1.5,
    desc: "Attention-based transformer. Higher accuracy potential at significantly greater compute cost vs CNN.",
  },
  "Diffusion / Generative AI": {
    trainFactor: 3.5, inferFactor: 2.5,
    desc: "For image reconstruction, synthesis, and augmentation. Highest energy footprint per inference. Use AMP.",
  },
};

// Annual modality energy benchmarks (kWh/year and kgCO₂e/year at global avg 0.473 kgCO₂e/kWh)
// Source: Vosshenrich et al. (Implementation Guide); Heye JMRI 2023 (10.1002/jmri.28994); Klein 2024
const MODALITY_BENCHMARKS = [
  {modality: "MRI 1.5T superconducting",   kwhYear: 269400, co2Year: 59000,  note: "Idle >50% of total. Vosshenrich; Heye 2023"},
  {modality: "MRI 3T (state-of-the-art)",  kwhYear: 125000, co2Year: 29625,  note: "Range 80 000–170 000 kWh/yr. Heye 2023"},
  {modality: "MRI 0.35T permanent magnet", kwhYear: 16100,  co2Year: 3526,   note: "Lowest-field option. Klein 2024; 51% PV self-sufficiency achievable"},
  {modality: "CT scanner",                 kwhYear: 37800,  co2Year: 8278,   note: "Idle up to 66% of total (Schoen et al.)"},
  {modality: "PET-CT",                     kwhYear: 66150,  co2Year: 15677,  note: "Range 56 700–75 600 kWh/yr; idle 1.5–2× CT"},
  {modality: "Ultrasound",                 kwhYear: 2500,   co2Year: 500,    note: "Lowest-energy modality; consider as alternative to CT/MRI"},
  {modality: "PC workstations (×10)",      kwhYear: 27500,  co2Year: 6000,   note: "Walters: auto-off saves 17 MWh/yr per 88 units = 3.4 tCO₂e"},
];

// ── AI model library ─────────────────────────────────────────────────────────
// GPU power, inference latency, and training energy from LLM-Energy PDF and Doo 2024.
// Clinical benefit estimates from sources: scan time reduction (Radiol 2023 10.1148/radiol.230441),
// low-value imaging reduction McKee 2024 (10.1148/radiol.240219), ESR PP 2025.
// Embodied GPU CO₂ from ESR PP 2025 / Clinical-AI PDF.
const AI_MODELS = {
  "Small (< 100M params)": {
    gpuKw: 0.08, inferSec: 2.5,  trainMwh: 0.5,  accuracy: 0.88,
    scanTimeReductPct: 30, lowValueReductPct: 10, embCo2Kg: 50,
  },
  "Medium (100M–1B params)": {
    gpuKw: 0.15, inferSec: 5,    trainMwh: 5,    accuracy: 0.93,
    scanTimeReductPct: 60, lowValueReductPct: 15, embCo2Kg: 80,
  },
  "Large (> 1B params)": {
    gpuKw: 0.25, inferSec: 10,   trainMwh: 50,   accuracy: 0.96,
    scanTimeReductPct: 75, lowValueReductPct: 20, embCo2Kg: 150,
  },
};
// Automatic Mixed Precision (AMP) reduces inference energy ~40% (float32→float16)
// Source: LLM-Energy PDF; Clinical-AI PDF
const PRECISION_FACTOR = {
  "float32 (standard)":   1.0,
  "float16 / AMP":        0.6,
};

// ── Resource & scope constants ────────────────────────────────────────────────

// Cooling water: L per kWh. Google 2023 Env Report 0.45 L/kWh; typical data centre 1.5–2.5 L/kWh (ASHRAE)
const WATER_PER_KWH = 1.8;

// Embodied carbon amortised over hardware lifespan (kgCO₂e / month)
// MRI 3T: ~70 tCO₂e manufacturing / 15-yr lifespan (ESR PP 2025, Radiol 10.1148/radiol.240398)
// CT: ~20 tCO₂e / 12 yr; X-ray: ~4 tCO₂e / 10 yr; Ultrasound: ~1 tCO₂e / 7 yr
const EMBODIED_KG_MO = {
  "MRI": 389, "CT": 139, "X-ray": 33, "Ultrasound": 12, "PACS/RIS": 30, "Workstation": 5,
};

const PATIENT_KM_RT    = 20;   // avg round-trip patient travel km — replace with local data (ESR sustainability guidance)
const CAR_CO2_KG_KM    = 0.17; // kgCO₂e/km average car (DEFRA 2023)
const PAPER_G_PER_ENC  = 25;   // g paper per encounter in digital workflow (ESR Green Imaging)
const HAZ_WASTE_G_SCAN = 50;   // g hazardous waste per imaging scan — contrast media disposal estimate

const META = {
  profiles:       ["Hospital radiology", "Outpatient imaging center", "Research imaging lab", "Teleradiology / informatics-heavy workflow"],
  intendedUses:   ["Estimate annual footprint", "Compare modalities", "Track monthly sustainability KPIs", "Evaluate AI tool impact", "Estimate savings from an intervention"],
  regions:        Object.keys(CARBON_INTENSITY),
  metricTypes:    ["Energy", "Carbon", "Water", "AI net impact"],
  timePeriods:    Object.keys(TIME_MULT),
  interventions:  Object.keys(INTERVENTIONS),
  cloudProviders: Object.keys(CLOUD),
  scannerStates:  ["Active", "Idle", "Standby", "Off"],
  modelSizes:     Object.keys(AI_MODELS),
  precisions:     Object.keys(PRECISION_FACTOR),
  architectures:  Object.keys(AI_ARCHITECTURES),
};

// ── Calculation functions ─────────────────────────────────────────────────────
const rnd = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

function computeDashboard(region, timePeriod, profile = "Hospital radiology", customCi) {
  const ci       = getCI(region, customCi);
  const mult     = TIME_MULT[timePeriod] ?? 1;
  const fleet    = EQUIPMENT_PROFILES[profile] ?? EQUIPMENT_BASE;

  const byEquipment = fleet.map(eq => {
    const kwh          = (eq.active_kw*eq.active_h + eq.idle_kw*eq.idle_h + eq.standby_kw*eq.standby_h + eq.off_kw*eq.off_h) * mult;
    const activeKwh    = eq.active_kw * eq.active_h * mult;
    const idleKwh      = (eq.idle_kw * eq.idle_h + eq.standby_kw * eq.standby_h) * mult;
    const kgco2e       = kwh * ci;
    const idleWasteKwh = eq.idle_kw * eq.avoidable_idle_h * mult;
    const scans        = eq.scans * mult;
    const isImaging    = ["MRI","CT","X-ray","Ultrasound"].includes(eq.modality);
    return {equipment: eq.name, modality: eq.modality,
            kwh: rnd(kwh), activeKwh: rnd(activeKwh), idleKwh: rnd(idleKwh),
            kgco2e: rnd(kgco2e), scans,
            // energyPerScan only meaningful for patient-imaging rows; null for PACS/Workstation
            energyPerScan: isImaging ? rnd(kwh / scans, 3) : null,
            idleWasteKwh: rnd(idleWasteKwh), confidence: "estimated"};
  });

  const totalKwh       = byEquipment.reduce((s, e) => s + e.kwh, 0);
  const totalActiveKwh = byEquipment.reduce((s, e) => s + e.activeKwh, 0);
  const totalIdleKwh   = byEquipment.reduce((s, e) => s + e.idleKwh, 0);
  const totalCo2       = byEquipment.reduce((s, e) => s + e.kgco2e, 0);
  const totalScans     = byEquipment.reduce((s, e) => s + e.scans, 0);
  const totalIdle      = byEquipment.reduce((s, e) => s + e.idleWasteKwh, 0);
  const label          = TIME_LABEL[timePeriod];

  // Patient-generating imaging scans only — use fleet (not EQUIPMENT_BASE) so profile changes propagate
  const imagingScans = fleet
    .filter(e => ["MRI","CT","X-ray","Ultrasound"].includes(e.modality))
    .reduce((s, e) => s + e.scans * mult, 0);

  // GHG Protocol scope breakdown
  // Scope 1: direct fuel/gas estimated at 8% of Scope 2 (backup generators, medical gas) — McKee 2024
  // Scope 3 embodied: hardware manufacturing amortised (ESR PP 2025) — use fleet for profile-awareness
  // Scope 3 travel: patient travel at PATIENT_KM_RT × CAR_CO2_KG_KM (DEFRA 2023)
  const scope2Kg       = rnd(totalCo2);
  const scope1Kg       = rnd(scope2Kg * 0.08);
  const scope3EmbKg    = rnd(fleet.reduce((s, eq) => s + (EMBODIED_KG_MO[eq.modality] ?? 0) * mult, 0));
  const scope3TravelKg = rnd(imagingScans * PATIENT_KM_RT * CAR_CO2_KG_KM);
  const scope3Kg       = rnd(scope3EmbKg + scope3TravelKg);

  // Resource metrics
  const waterLitres  = rnd(totalKwh * WATER_PER_KWH, 0);
  const paperKg      = rnd(imagingScans * PAPER_G_PER_ENC / 1000, 1);
  const hazardousKg  = rnd(imagingScans * HAZ_WASTE_G_SCAN / 1000, 1);

  return {
    byEquipment,
    topOpportunities: [...byEquipment].sort((a, b) => b.idleWasteKwh - a.idleWasteKwh).slice(0, 5),
    totals: {
      kwh: rnd(totalKwh), mwh: rnd(totalKwh / 1000),
      tonnesCo2e: rnd(totalCo2 / 1000, 3),
      co2Kg: totalCo2,  // raw Scope 2 kg — used by computeScenario to avoid double-rounding
      // divide by imagingScans (MRI/CT/X-ray/US only) not totalScans (which inflates via PACS/WS placeholders)
      energyPerScan: imagingScans > 0 ? rnd(totalKwh / imagingScans, 3) : 0,
      idleWasteKwh: rnd(totalIdle), label,
      activeKwh: rnd(totalActiveKwh), idleKwh: rnd(totalIdleKwh),
      activePct: totalKwh > 0 ? rnd(totalActiveKwh / totalKwh * 100, 1) : 0,
      idlePct:   totalKwh > 0 ? rnd(totalIdleKwh   / totalKwh * 100, 1) : 0,
    },
    scopes:    {scope1Kg, scope2Kg, scope3EmbKg, scope3TravelKg, scope3Kg, imagingScans},
    resources: {waterLitres, paperKg, hazardousKg},
    equivalencies: {
      car_km:          rnd(totalCo2 / 0.17,   0),
      phone_charges:   rnd(totalKwh / 0.012,  0),
      household_years: rnd(totalKwh / 3500,   2),
      trees_year:      rnd(totalCo2 / 21,     1), // 1 tree absorbs ~21 kgCO₂/yr
      flights_short:   rnd(totalCo2 / 255,    1), // avg short-haul economy seat ~255 kgCO₂ (ICAO 2023)
    },
    ci, region, timePeriod,
  };
}

// Which interventions are driven by which extra control
const SCANNER_STATE_INTERVENTIONS = new Set([
  'Turn MRI/CT scanners off overnight',
  'Use standby mode during inactive periods',
]);
const CLOUD_INTERVENTIONS = new Set([
  'Move computation to lower-carbon regions',
  'Consolidate servers',
  'Use renewable electricity',
]);

function computeScenario(intervention, region, timePeriod, profile, customCi, cloudProvider, scannerState) {
  const ci    = getCI(region, customCi);
  const mult  = TIME_MULT[timePeriod] ?? 1;
  const eff   = INTERVENTIONS[intervention] ?? {kwh: 0};
  const base  = computeDashboard(region, timePeriod, profile, customCi);
  const fleet = EQUIPMENT_PROFILES[profile] ?? EQUIPMENT_BASE;
  const cf    = CLOUD[cloudProvider] ?? CLOUD["Local compute"];

  // Map scanner state label to the equipment power field
  const STATE_FIELD = {Active:'active_kw', Idle:'idle_kw', Standby:'standby_kw', Off:'off_kw'};
  const targetField = STATE_FIELD[scannerState] ?? 'standby_kw';

  let kwhSaved = 0;
  let co2PctOff = 0;

  if (intervention === 'Turn MRI/CT scanners off overnight') {
    // Dynamic: MRI + CT idle → target state during avoidable idle hours
    kwhSaved = rnd(fleet
      .filter(eq => ['MRI','CT'].includes(eq.modality))
      .reduce((s, eq) => s + Math.max(0, eq.idle_kw - (eq[targetField] ?? 0)) * eq.avoidable_idle_h * mult, 0));

  } else if (intervention === 'Use standby mode during inactive periods') {
    // Dynamic: all equipment idle → target state during avoidable idle hours
    kwhSaved = rnd(fleet
      .reduce((s, eq) => s + Math.max(0, eq.idle_kw - (eq[targetField] ?? 0)) * eq.avoidable_idle_h * mult, 0));

  } else if (intervention === 'Move computation to lower-carbon regions') {
    // CO₂ saving is bounded by the compute portion of total emissions (PACS/WS only)
    // Moving cloud region doesn't affect on-site MRI/CT scanner grid draw
    const computeCo2 = fleet
      .filter(eq => ['PACS/RIS','Workstation'].includes(eq.modality))
      .reduce((s, eq) => s + (eq.active_kw*eq.active_h + eq.idle_kw*eq.idle_h + eq.standby_kw*eq.standby_h + eq.off_kw*eq.off_h) * mult * ci, 0);
    const ciDeltaFraction = ci > cf.ci ? (ci - cf.ci) / ci : 0;
    // Express as a % of total base CO₂ so the generic formula applies correctly
    const baseCo2Raw = base.totals.co2Kg;
    co2PctOff = baseCo2Raw > 0 ? rnd(computeCo2 * ciDeltaFraction / baseCo2Raw * 100, 1) : 0;

  } else if (intervention === 'Consolidate servers') {
    // Energy savings from improved PUE: compute workload moves to cloud
    const localPue = CLOUD["Local compute"].pue;
    const computeKwh = fleet
      .filter(eq => ['PACS/RIS','Workstation'].includes(eq.modality))
      .reduce((s, eq) => s + (eq.active_kw*eq.active_h + eq.idle_kw*eq.idle_h + eq.standby_kw*eq.standby_h + eq.off_kw*eq.off_h) * mult, 0);
    kwhSaved = rnd(computeKwh * Math.max(0, 1 - cf.pue / localPue));

  } else {
    // All other interventions: use pre-defined table values
    kwhSaved  = rnd((eff.kwh ?? 0) * mult);
    co2PctOff = eff.co2Pct ?? 0;
  }

  const co2Fraction   = co2PctOff / 100;
  const projectedKwh  = Math.max(0, rnd(base.totals.kwh - kwhSaved));         // floor at 0
  const baseCo2kg     = rnd(base.totals.co2Kg, 1);                            // raw kg, not tonnesCo2e*1000
  const projectedCo2  = Math.max(0, rnd(baseCo2kg * (1 - co2Fraction) - kwhSaved * ci, 1)); // floor at 0
  const co2Saved      = rnd(baseCo2kg - projectedCo2, 1);
  const pctEnergy     = base.totals.kwh > 0 ? rnd((kwhSaved / base.totals.kwh) * 100, 1) : 0;
  const usesScanner   = SCANNER_STATE_INTERVENTIONS.has(intervention);
  const usesCloud     = CLOUD_INTERVENTIONS.has(intervention);

  return {
    intervention, timePeriod, note: eff.note ?? "",
    usesScanner, usesCloud,
    baseline:  {kwh: base.totals.kwh, co2: baseCo2kg},
    projected: {kwh: projectedKwh,    co2: projectedCo2},
    savings:   {kwh: kwhSaved, co2: co2Saved, pctEnergy},
  };
}

function computeAI(cloudProvider, region, modelSize, precision, architecture, customCi, profile) {
  const cf    = CLOUD[cloudProvider]          ?? CLOUD["Local compute"];
  const ci    = getCI(region, customCi);
  const model = AI_MODELS[modelSize]           ?? AI_MODELS["Small (< 100M params)"];
  const arch  = AI_ARCHITECTURES[architecture] ?? AI_ARCHITECTURES["CNN / ResNet"];
  const ampF  = PRECISION_FACTOR[precision]    ?? 1.0;
  const DEPLOY_MO    = 36;
  const TEST_STUDIES = 500;
  // Derive scan volume and per-scan energy from the selected profile so both pages are consistent
  const profileDash  = computeDashboard(region, 'Monthly', profile, customCi);
  const STUDIES      = profileDash.scopes.imagingScans;               // imaging scans/month for this profile
  const AVG_SCAN_KWH = profileDash.totals.energyPerScan || 0.5;       // kWh/scan from this profile (fallback 0.5)

  // ── Phase 1: Training ────────────────────────────────────────────────────
  // Total one-time training energy scaled by architecture and model size.
  // Developer tools: CodeCarbon, EcoLogits, Carbontracker (Implementation Guide §4)
  // Sources: LLM-Energy PDF; Doo 2024 (10.1148/radiol.232030)
  const trainKwhTotal  = rnd(model.trainMwh * 1000 * arch.trainFactor, 0);
  const trainKgCo2e    = rnd(trainKwhTotal * cf.ci, 1);
  const trainGpuHours  = rnd(trainKwhTotal / model.gpuKw, 0); // estimated GPU compute time
  const trainKwhMonth  = rnd(trainKwhTotal / DEPLOY_MO, 2);   // amortised over deployment

  // ── Phase 2: Testing / Validation ────────────────────────────────────────
  // One-time inference run over hold-out test set.
  // Proxy: DLP/CTDIvol dose metrics correlate with net scan energy R²=0.87–0.92 (Schoen et al.)
  const testKwhTotal   = rnd(model.gpuKw * arch.inferFactor * (model.inferSec / 3600) * TEST_STUDIES * cf.pue * ampF, 4);
  const testKgCo2e     = rnd(testKwhTotal * cf.ci, 4);

  // ── Phase 3: Inference & Deployment ─────────────────────────────────────
  // Inference energy per study; scales with every request — dominant lifetime cost.
  // MRI cooling adds +45% energy overhead during active acquisition (Heye/Vosshenrich)
  const inferKwhPerStudy = rnd(model.gpuKw * arch.inferFactor * (model.inferSec / 3600) * cf.pue * ampF, 6);
  const inferKwhMonthly  = rnd(inferKwhPerStudy * STUDIES, 4);
  const inferKwhLifetime = rnd(inferKwhMonthly * DEPLOY_MO, 1);
  const ampSavingPct     = rnd((1 - ampF) * 100, 0);

  // ── Monthly totals (inference + amortised training) ─────────────────────
  const totalMonthlyKwh  = rnd(inferKwhMonthly + trainKwhMonth, 3);
  const embGpuKgCo2e     = rnd(model.embCo2Kg / DEPLOY_MO, 2);
  const grossKgCo2e      = rnd(totalMonthlyKwh * cf.ci + embGpuKgCo2e, 3);

  // ── Clinical co-benefits ─────────────────────────────────────────────────
  // Scan time reduction → direct scanner energy savings at local grid CI
  // Radiol 2023 (10.1148/radiol.230441): AI reconstruction cuts scan time 45–89%
  const scanEnergySaved  = rnd(STUDIES * AVG_SCAN_KWH * (model.scanTimeReductPct / 100), 1);
  // Low-value imaging reduction → avoided scans (McKee 2024: up to 20%)
  // Recycling Pyramid "Prevent" tier (Implementation Guide §1)
  const scansAvoided     = Math.round(STUDIES * (model.lowValueReductPct / 100));
  const savingsKgCo2e    = rnd((scanEnergySaved + scansAvoided * AVG_SCAN_KWH) * ci, 2);
  const netKgCo2e        = rnd(grossKgCo2e - savingsKgCo2e, 3);

  // ── Infrastructure & efficiency ──────────────────────────────────────────
  const waterLitres     = rnd(totalMonthlyKwh * WATER_PER_KWH, 1);
  // Accuracy % per monthly inference kWh — Green AI efficiency metric
  // Captures diminishing returns of larger models (Implementation Guide §3)
  const efficiencyRatio = inferKwhMonthly > 0 ? rnd((model.accuracy * 100) / inferKwhMonthly, 1) : 0;
  // Rebound risk: faster reads may induce more scan orders, negating savings (§4 counter-metric)
  const reboundRisk     = model.scanTimeReductPct > 60 ? "High" : model.scanTimeReductPct > 30 ? "Moderate" : "Low";

  return {
    architecture, modelSize, precision, archDesc: arch.desc,
    training:  {kwhTotal: trainKwhTotal, kgCo2e: trainKgCo2e, gpuHours: trainGpuHours, kwhAmortised: trainKwhMonth},
    testing:   {kwhTotal: testKwhTotal,  kgCo2e: testKgCo2e,  studies: TEST_STUDIES},
    inference: {kwhPerStudy: inferKwhPerStudy, kwhMonthly: inferKwhMonthly, kwhLifetime: inferKwhLifetime, studies: STUDIES},
    monthly:   {kwh: totalMonthlyKwh, co2: rnd(totalMonthlyKwh * cf.ci, 3)},
    ampSavingPct, grossKgCo2e, embGpuKgCo2e, savingsKgCo2e, netKgCo2e,
    pue: cf.pue, cloudCi: cf.ci, waterLitres, efficiencyRatio, accuracy: model.accuracy,
    scanTimeReductPct: model.scanTimeReductPct, lowValueReductPct: model.lowValueReductPct,
    scansAvoided, scanEnergySaved, reboundRisk,
  };
}

// ── UI components ─────────────────────────────────────────────────────────────
function Logo({onClick}) {
  return (
    <div className="brand" onClick={onClick} style={onClick ? {cursor:'pointer'} : undefined}>
      <img src="./logo.png" alt="EcoRad logo" style={{width:52, height:52, objectFit:'contain'}}/>
      <div><strong>EcoRad</strong><span>Sustainable Intelligence for Radiology</span></div>
    </div>
  );
}

function Card({title, value, sub, icon, style}) {
  return (
    <section className="card" style={style}>
      <div className="cardHead">{icon}<span>{title}</span></div>
      <b>{value}</b>
      <p>{sub}</p>
    </section>
  );
}

function Sel({label: lbl, value, options, onChange}) {
  return (
    <label>
      {lbl}
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function downloadCSV(dash) {
  const headers = ["equipment","modality","kwh","kgco2e","scans","energyPerScan","idleWasteKwh","confidence"];
  const rows = dash.byEquipment.map(r => headers.map(h => r[h]).join(','));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([[headers.join(','), ...rows].join('\n')], {type:'text/csv'}));
  a.download = 'ecorad_dashboard.csv';
  a.click();
}

const CHART_COLORS = ['#2E7D32','#26A69A','#66BB6A','#4DB6AC','#A5D6A7','#80CBC4'];

// Smart unit formatters — switch unit at sensible thresholds
const fmtCo2 = kg  => kg  >= 1000 ? `${rnd(kg/1000, 2)} tCO₂e`  : `${Math.round(kg).toLocaleString()} kgCO₂e`;
const fmtKwh = kwh => kwh >= 1000 ? `${rnd(kwh/1000, 1)} MWh`   : `${Math.round(kwh).toLocaleString()} kWh`;
const fmtL   = l   => l   >= 1000 ? `${rnd(l/1000, 1)} kL`      : `${Math.round(l).toLocaleString()} L`;

// Resolve effective carbon intensity — uses customCi when region is "Editable custom"
const getCI = (region, customCi) =>
  region === 'Editable custom' ? (isNaN(parseFloat(customCi)) ? 0.30 : parseFloat(customCi)) : (CARBON_INTENSITY[region] ?? 0.25);

// URL hash state persistence — encodes/decodes core settings so shared links work
const HASH_KEYS = {p:'profile', u:'intendedUse', r:'region', m:'metricType', t:'timePeriod', c:'customCi'};
function readHash() {
  try {
    const q = new URLSearchParams(window.location.hash.replace(/^#/,''));
    const out = {};
    for (const [k, field] of Object.entries(HASH_KEYS)) { if (q.has(k)) out[field] = q.get(k); }
    return out;
  } catch { return {}; }
}
function writeHash(s) {
  const q = new URLSearchParams();
  for (const [k, field] of Object.entries(HASH_KEYS)) q.set(k, s[field]);
  history.replaceState(null, '', '#' + q.toString());
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState('landing');

  // Shared settings — drive all calculations; initialised from URL hash if present
  const [settings, setSettings] = useState(() => ({
    profile: "Hospital radiology",
    intendedUse: "Estimate annual footprint",
    region: "Switzerland",
    metricType: "Energy",
    timePeriod: "Monthly",
    customCi: "0.30",
    ...readHash(),
  }));
  const [scen, setScen] = useState({
    intervention: "Turn MRI/CT scanners off overnight",
    cloudProvider: "Local compute",
    scannerState: "Standby",
    modelSize: "Small (< 100M params)",
    precision: "float32 (standard)",
    architecture: "CNN / ResNet",
  });

  const set = (key, val) => setSettings(s => ({...s, [key]: val}));
  const setS = (key, val) => setScen(s => ({...s, [key]: val}));

  // Print the dashboard: synchronously render it before opening the dialog,
  // then restore the export page once the dialog is dismissed.
  const handlePrint = () => {
    flushSync(() => setPage('dashboard'));
    const restore = () => { setPage('export'); window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  // Persist settings to URL hash so links are shareable
  useEffect(() => { writeHash(settings); }, [settings]);

  // Convert Chart.js canvases to static PNG images before printing so they
  // appear in PDF output (canvas elements are often blank in print renderers).
  useEffect(() => {
    const beforePrint = () => {
      document.querySelectorAll('canvas').forEach((canvas, i) => {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.cssText = 'width:100%;display:block';
        img.dataset.chartProxy = i;
        canvas.insertAdjacentElement('afterend', img);
        canvas.style.display = 'none';
      });
    };
    const afterPrint = () => {
      document.querySelectorAll('img[data-chart-proxy]').forEach(img => img.remove());
      document.querySelectorAll('canvas').forEach(canvas => { canvas.style.display = ''; });
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);

  // Recalculate whenever settings change
  const dash     = useMemo(() => computeDashboard(settings.region, settings.timePeriod, settings.profile, settings.customCi), [settings.region, settings.timePeriod, settings.profile, settings.customCi]);
  const scenario = useMemo(() => computeScenario(scen.intervention, settings.region, settings.timePeriod, settings.profile, settings.customCi, scen.cloudProvider, scen.scannerState), [scen.intervention, settings.region, settings.timePeriod, settings.profile, settings.customCi, scen.cloudProvider, scen.scannerState]);
  const ai       = useMemo(() => computeAI(scen.cloudProvider, settings.region, scen.modelSize, scen.precision, scen.architecture, settings.customCi, settings.profile), [scen.cloudProvider, settings.region, scen.modelSize, scen.precision, scen.architecture, settings.customCi, settings.profile]);

  const chartEnergy = {
    labels: dash.byEquipment.map(x => x.equipment),
    datasets: [{
      label:`kWh${dash.totals.label}`,
      data: dash.byEquipment.map(x => x.kwh),
      backgroundColor: dash.byEquipment.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderColor: dash.byEquipment.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderWidth: 1,
    }],
  };
  const energyBarOptions = {
    indexAxis: 'y',
    responsive: true,
    aspectRatio: 1,
    plugins: {legend: {display: false}},
    scales: {
      x: {ticks: {callback: v => `${v}`}},
      y: {grid: {display: false}},
    },
  };
  const chartCo2 = {
    labels: dash.byEquipment.map(x => x.equipment),
    datasets: [{label:'kgCO₂e', data: dash.byEquipment.map(x => x.kgco2e), backgroundColor: CHART_COLORS}],
  };
  const chartScenario = {
    labels: ['Baseline', 'After intervention'],
    datasets: [
      {label:`Energy kWh${dash.totals.label}`, data:[scenario.baseline.kwh, scenario.projected.kwh], backgroundColor:['#A5D6A7','#2E7D32']},
      {label:'Carbon kgCO₂e', data:[scenario.baseline.co2, scenario.projected.co2], backgroundColor:['#80CBC4','#26A69A']},
    ],
  };
  // Scope 1/2/3 stacked horizontal bar — shown as % of total so all scopes are visible
  const scopeTotal = dash.scopes.scope1Kg + dash.scopes.scope2Kg + dash.scopes.scope3Kg;
  const scopePct   = v => scopeTotal > 0 ? rnd(v / scopeTotal * 100, 1) : 0;
  const chartScopes = {
    labels: ['% of total emissions' + dash.totals.label],
    datasets: [
      {label:`Scope 1 — Direct (${scopePct(dash.scopes.scope1Kg)}%)`,           data:[scopePct(dash.scopes.scope1Kg)],    backgroundColor:'#81C784'},
      {label:`Scope 2 — Electricity (${scopePct(dash.scopes.scope2Kg)}%)`,       data:[scopePct(dash.scopes.scope2Kg)],    backgroundColor:'#2E7D32'},
      {label:`Scope 3 — Embodied (${scopePct(dash.scopes.scope3EmbKg)}%)`,       data:[scopePct(dash.scopes.scope3EmbKg)], backgroundColor:'#4DB6AC'},
      {label:`Scope 3 — Patient travel (${scopePct(dash.scopes.scope3TravelKg)}%)`, data:[scopePct(dash.scopes.scope3TravelKg)], backgroundColor:'#A5D6A7'},
    ],
  };
  const scopeBarOpts = {
    indexAxis:'y',
    plugins:{legend:{position:'bottom'}, tooltip:{callbacks:{label: ctx => ` ${ctx.dataset.label}: ${fmtCo2(dash.scopes[['scope1Kg','scope2Kg','scope3EmbKg','scope3TravelKg'][ctx.datasetIndex]])}`}}},
    scales:{x:{stacked:true, max:100, ticks:{callback: v => v+'%'}}, y:{stacked:true}},
    responsive:true,
  };

  const pages = ['landing','input','dashboard','ai','scenario','export'];
  const PAGE_LABELS = {landing:'Landing', input:'Input', dashboard:'Dashboard', ai:'AI', scenario:'Scenario', export:'Export'};

  return (
    <>
      <header>
        <Logo onClick={() => window.location.assign('https://takinci.github.io/EcoRad/')}/>
        <nav>
          {pages.map(p => (
            <button key={p} className={page===p?'on':''} onClick={()=>setPage(p)}>{PAGE_LABELS[p] ?? p}</button>
          ))}
        </nav>
      </header>

      {/* ── Landing ── */}
      {page==='landing' && (
        <main className="hero">
          <div>
            <p className="eyebrow">Radiology + AI + Planetary Health</p>
            <h1>Measure. Optimize. Sustain.</h1>
            <p>EcoRad estimates environmental impact from imaging operations, infrastructure, consumables, patient workflows, and AI tool use.</p>
            <button onClick={()=>setPage('input')}>Get started →</button>
          </div>
          <div className="heroVisual">
            <Logo/>
            <p>Set your region and time period on the <strong>input</strong> page to customise every number in the dashboard.</p>
          </div>
        </main>
      )}

      {/* ── Input ── */}
      {page==='input' && (
        <main>
          <h1>Data input</h1>
          <p className="note">These settings recalculate the entire dashboard in real time.</p>
          <div className="grid grid3">
            <Sel label="Department profile" value={settings.profile}     options={META.profiles}     onChange={v=>set('profile',v)}/>
            <Sel label="Intended use"       value={settings.intendedUse} options={META.intendedUses} onChange={v=>set('intendedUse',v)}/>
            <Sel label="Region / grid"      value={settings.region}      options={META.regions}      onChange={v=>set('region',v)}/>
            <Sel label="Metric type"        value={settings.metricType}  options={META.metricTypes}  onChange={v=>set('metricType',v)}/>
            <Sel label="Time period"        value={settings.timePeriod}  options={META.timePeriods}  onChange={v=>set('timePeriod',v)}/>
          </div>
          {settings.region === 'Editable custom' && (
            <div style={{marginTop:16}}>
              <label style={{maxWidth:320}}>
                Custom carbon intensity (kgCO₂e/kWh)
                <input
                  type="number" min="0" max="2" step="0.001"
                  value={settings.customCi}
                  onChange={e => set('customCi', e.target.value)}
                  style={{marginTop:8}}
                />
              </label>
              <p className="note" style={{marginTop:6}}>Enter your local utility or national grid factor. Check your electricity provider or national statistics office. Global avg: 0.473 · EU avg: 0.237 (Vosshenrich et al.)</p>
            </div>
          )}
          <div className="inputSummary">
            <p>Carbon intensity for <strong>{settings.region}</strong>: <strong>{getCI(settings.region, settings.customCi)} kgCO₂e/kWh</strong> <span className="note">— {settings.region === 'Editable custom' ? 'custom value — edit above.' : 'Our World in Data, 2022–2023 national average. Replace with local utility data for higher accuracy.'}</span></p>
            <p>Showing <strong>{settings.timePeriod.toLowerCase()}</strong> figures — multiplier ×{TIME_MULT[settings.timePeriod]}</p>
            <p className="note">Equipment power defaults: MRI 30 kW active (Heye et al., JMRI 2023 · DOI 10.1002/jmri.28994); CT 60 kW active (Acra 2024 · DOI 10.1016/j.acra.2024.05.004). See <a href="https://github.com/takinci/EcoRad/blob/main/sources.md" style={{color:'#2E7D32'}} target="_blank" rel="noreferrer">sources.md</a> for all citations.</p>
            <button onClick={()=>setPage(settings.metricType==='AI net impact' ? 'ai' : 'dashboard')} style={{marginTop:16}}>
              View {settings.metricType==='AI net impact' ? 'AI dashboard' : 'dashboard'} →
            </button>
          </div>
        </main>
      )}

      {/* ── Dashboard ── */}
      {page==='dashboard' && (
        <main>
          <h1>{settings.profile} <span className="badge">{settings.region}</span> <span className="badge">{settings.timePeriod}</span></h1>
          {settings.metricType !== 'Energy' && (
            <p className="note" style={{marginBottom:16}}>
              Showing all metrics — <strong>{settings.metricType}</strong> sections highlighted.{' '}
              {settings.intendedUse !== 'Estimate annual footprint' && <>Intended use: <em>{settings.intendedUse}</em>.</>}
            </p>
          )}

          {/* ── 1. Energy consumption ── */}
          <section style={{background:'none',boxShadow:'none',padding:0}}>
            <h2 style={{marginBottom:12,color: settings.metricType==='Energy' ? '#1b5e20' : undefined}}>1. Energy consumption {settings.metricType==='Energy' && <span className="badge">viewing</span>}</h2>
            <div className="cards">
              <Card icon={<Gauge/>}       title={`Total electricity ${dash.totals.label}`}    value={fmtKwh(dash.totals.kwh)}                  sub="All scanners, PACS, workstations, and servers." style={{gridColumn:'span 4'}}/>
              <Card icon={<Activity/>}    title={`Active scanning ${dash.totals.label}`}      value={fmtKwh(dash.totals.activeKwh)}            sub={`${dash.totals.activePct}% of total — energy during actual scan acquisition.`}/>
              <Card icon={<TrendingDown/>} title={`Idle + standby ${dash.totals.label}`}      value={fmtKwh(dash.totals.idleKwh)}              sub={`${dash.totals.idlePct}% of total — between scans and overnight. Primary optimisation target.`}/>
              <Card icon={<TrendingDown/>} title={`Avoidable idle ${dash.totals.label}`}      value={fmtKwh(dash.totals.idleWasteKwh)}         sub="Recoverable by standby / power-off policies."/>
              <Card icon={<Activity/>}    title="Energy per imaging scan"                     value={`${dash.totals.energyPerScan} kWh`}       sub="Total ÷ all scans. Use for modality benchmarking and protocol optimisation."/>
            </div>
          </section>

          {/* ── 2. Carbon emissions ── */}
          <section style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12,color: settings.metricType==='Carbon' ? '#1b5e20' : undefined}}>2. Carbon emissions — GHG Protocol scopes {settings.metricType==='Carbon' && <span className="badge">viewing</span>}</h2>
            <p className="note" style={{marginBottom:12}}>Scope 1: direct fuel (estimated). Scope 2: purchased electricity (calculated). Scope 3: hardware embodied carbon + patient travel (estimated). All {dash.totals.label}.</p>
            <div className="cards">
              <Card icon={<Factory/>}    title="Scope 1 — Direct"             value={fmtCo2(dash.scopes.scope1Kg)}           sub="Backup generators, medical gas. Estimated 8% of Scope 2 (McKee 2024)."/>
              <Card icon={<Gauge/>}      title="Scope 2 — Electricity"        value={fmtCo2(dash.scopes.scope2Kg)}           sub={`Grid at ${dash.ci} kgCO₂e/kWh (${settings.region}). Primary measured scope.`}/>
              <Card icon={<Cpu/>}        title="Scope 3 — Embodied carbon"    value={fmtCo2(dash.scopes.scope3EmbKg)}        sub="Hardware manufacturing amortised over lifespan. Extend lifetime to reduce."/>
              <Card icon={<Car/>}        title="Scope 3 — Patient travel"     value={fmtCo2(dash.scopes.scope3TravelKg)}     sub={`${dash.scopes.imagingScans.toLocaleString()} scans × ${PATIENT_KM_RT} km avg round trip.`}/>
            </div>
            <section style={{marginTop:16}}>
              <h2>Scope 1 / 2 / 3 breakdown</h2>
              <Bar data={chartScopes} options={scopeBarOpts}/>
              <p className="note" style={{marginTop:8}}>Patient travel typically dominates Scope 3 in clean-grid regions — reducing unnecessary scans cuts more carbon than efficiency measures alone. Absolute values shown in cards above.</p>
            </section>
          </section>

          {/* ── Charts ── */}
          <div className="charts" style={{marginTop:28}}>
            <section><h2>Energy by equipment</h2><Bar data={chartEnergy} options={energyBarOptions}/></section>
            <section><h2>Carbon (Scope 2) by equipment</h2><Doughnut data={chartCo2}/></section>
          </div>

          {/* ── 3. Infrastructure ── */}
          <section style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>3. Infrastructure and hardware</h2>
            <div className="cards">
              <Card icon={<Cpu/>}         title="Top idle waster"               value={dash.topOpportunities[0]?.equipment ?? '—'}               sub={`${fmtKwh(dash.topOpportunities[0]?.idleWasteKwh ?? 0)} avoidable idle${dash.totals.label}. Highest single-unit saving.`}/>
              <Card icon={<Activity/>}    title="Hardware lifespans"             value="MRI 15 yr / CT 12 yr"                                      sub="X-ray 10 yr, Ultrasound 7 yr. Extend to reduce Scope 3 embodied carbon."/>
              <Card icon={<TrendingDown/>} title="Carbon intensity"              value={`${dash.ci} kgCO₂e/kWh`}                                  sub={`${settings.region} grid. Move to renewable tariff or lower-carbon region to cut Scope 2.`}/>
              <Card icon={<Gauge/>}       title="Scope 3 total"                  value={fmtCo2(dash.scopes.scope3Kg)}                             sub="Embodied + patient travel combined. Often larger than Scope 2 in a full lifecycle view."/>
            </div>
            <section style={{marginTop:12}}>
              <h2>Top 5 improvement opportunities — idle energy</h2>
              {dash.topOpportunities.map((x,i) => (
                <div key={i} className="row">
                  <b>{x.equipment}</b>
                  <span>{x.idleWasteKwh.toLocaleString()} kWh avoidable idle{dash.totals.label}</span>
                  <small>{x.confidence}</small>
                </div>
              ))}
            </section>
          </section>

          {/* ── 4. Resource metrics ── */}
          <section style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12,color: settings.metricType==='Water' ? '#1b5e20' : undefined}}>4. Resource footprint {settings.metricType==='Water' && <span className="badge">viewing</span>}</h2>
            <p className="note" style={{marginBottom:12}}>Replace defaults with procurement records, waste manifests, and water bills for publication-quality figures.</p>
            <div className="cards">
              <Card icon={<Droplets/>}   title={`Water footprint ${dash.totals.label}`}       value={fmtL(dash.resources.waterLitres)}           sub={`${WATER_PER_KWH} L/kWh cooling estimate. Google Cloud 0.45 L/kWh; local servers ~2 L/kWh.`}/>
              <Card icon={<FileText/>}   title={`Paper consumption ${dash.totals.label}`}     value={`${dash.resources.paperKg} kg`}                     sub={`~${PAPER_G_PER_ENC}g/encounter digital workflow. Full film-based: ~200g. (ESR Green Imaging)`}/>
              <Card icon={<Trash2/>}     title={`Hazardous waste ${dash.totals.label}`}       value={`${dash.resources.hazardousKg} kg`}                 sub="Contrast media disposal, sharps. Replace with waste manifest data."/>
              <Card icon={<Leaf/>}       title={`Total Scope 2 carbon ${dash.totals.label}`}  value={fmtCo2(dash.scopes.scope2Kg)}                       sub="All electricity-derived emissions. Primary target for renewable energy procurement."/>
            </div>
          </section>

          {/* ── 5. Equivalencies ── */}
          <section style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>5. Real-world equivalencies <span style={{fontWeight:400,fontSize:14,color:'#607d66'}}>(Scope 2 electricity only)</span></h2>
            <div className="cards">
              <Card icon={<Car/>}        title="Car km equivalent"      value={dash.equivalencies.car_km.toLocaleString()}           sub="km driven by average petrol car at 0.17 kgCO₂/km (DEFRA 2023)."/>
              <Card icon={<Activity/>}   title="Phone charges"          value={dash.equivalencies.phone_charges.toLocaleString()}    sub="Smartphone full charges at 12 Wh each."/>
              <Card icon={<TreePine/>}   title="Tree-years to offset"   value={dash.equivalencies.trees_year.toLocaleString()}       sub="Trees growing for 1 year absorbing ~21 kgCO₂/yr each."/>
              <Card icon={<Plane/>}      title="Short-haul flights"     value={dash.equivalencies.flights_short.toLocaleString()}    sub="Economy passenger seats at 255 kgCO₂ each (ICAO 2023)."/>
            </div>
            <p className="note" style={{marginTop:12}}>Also equivalent to <strong>{dash.equivalencies.household_years}</strong> household electricity years (3 500 kWh/yr average).</p>
          </section>
        </main>
      )}

      {/* ── AI ── */}
      {page==='ai' && (
        <main>
          <h1>AI sustainability dashboard <span className="badge">{settings.region}</span></h1>
          <p className="note" style={{marginBottom:16}}>Recycling Pyramid priority: Prevent unnecessary scans → Reduce scan energy → Recover/recycle prior data. (Implementation Guide §1)</p>

          {/* ── Selectors ── */}
          <div className="grid" style={{marginBottom:24}}>
            <Sel label="Architecture"        value={scen.architecture}  options={META.architectures}   onChange={v=>setS('architecture',v)}/>
            <Sel label="Model size"          value={scen.modelSize}     options={META.modelSizes}      onChange={v=>setS('modelSize',v)}/>
            <Sel label="Precision / AMP"     value={scen.precision}     options={META.precisions}      onChange={v=>setS('precision',v)}/>
            <Sel label="Cloud / deployment"  value={scen.cloudProvider} options={META.cloudProviders}  onChange={v=>setS('cloudProvider',v)}/>
          </div>

          {/* ── Model details ── */}
          <section style={{background:'none',boxShadow:'none',padding:0}}>
            <h2 style={{marginBottom:12}}>Model details</h2>
            <div className="cards">
              <Card icon={<Brain/>}      title="Architecture"         value={scen.architecture}                         sub={ai.archDesc}/>
              <Card icon={<Cpu/>}        title="Model size"           value={scen.modelSize}                            sub={`~${AI_MODELS[scen.modelSize].trainMwh * 1000} kWh to train. Accuracy: ${rnd(ai.accuracy*100,0)}%.`}/>
              <Card icon={<Target/>}     title="Accuracy"             value={`${rnd(ai.accuracy*100,0)}%`}              sub="Diagnostic accuracy on hold-out test set. Larger models gain marginally at high energy cost."/>
              <Card icon={<BarChart3/>}  title="Efficiency ratio"     value={`${ai.efficiencyRatio} acc%/kWh`}          sub="Accuracy % per monthly inference kWh. Use to compare architectures and model sizes. (Green AI metric)"/>
            </div>
          </section>

          {/* ── Phase 1: Training ── */}
          <section style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>Phase 1 — Training the model</h2>
            <p className="note" style={{marginBottom:12}}>One-time energy cost. Track with CodeCarbon, EcoLogits, or Carbontracker. (Implementation Guide §4 · Metric 1)</p>
            <div className="cards">
              <Card icon={<Zap/>}        title="Total training energy"    value={`${ai.training.kwhTotal.toLocaleString()} kWh`}  sub={`One-time. Scaled by architecture (${scen.architecture}) and model size. (LLM-Energy PDF)`}/>
              <Card icon={<Leaf/>}       title="Training CO₂e"            value={`${ai.training.kgCo2e} kgCO₂e`}                sub={`At ${ai.cloudCi} kgCO₂e/kWh (${scen.cloudProvider}). Consider low-CI region for training jobs.`}/>
              <Card icon={<Gauge/>}      title="Estimated GPU compute"    value={`~${ai.training.gpuHours.toLocaleString()} h`}  sub="Estimated GPU hours at model GPU power draw. Actual depends on parallelism and hardware."/>
              <Card icon={<Activity/>}   title="Amortised / month"        value={`${ai.training.kwhAmortised} kWh/mo`}           sub="Training cost spread over 36-month deployment lifespan for lifecycle comparison."/>
            </div>
          </section>

          {/* ── Phase 2: Testing ── */}
          <section style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>Phase 2 — Testing and validation</h2>
            <p className="note" style={{marginBottom:12}}>One-time hold-out inference run. Proxy: DLP / CTDIvol correlate with net scan energy R²=0.87–0.92 (Schoen et al.), enabling energy inference from dose reports.</p>
            <div className="cards">
              <Card icon={<Zap/>}        title="Test set energy"          value={`${ai.testing.kwhTotal} kWh`}                   sub={`${ai.testing.studies} studies. One-time cost; small fraction of training energy.`}/>
              <Card icon={<Leaf/>}       title="Test set CO₂e"            value={`${ai.testing.kgCo2e} kgCO₂e`}                 sub={`At ${ai.cloudCi} kgCO₂e/kWh. Include in model carbon disclosure.`}/>
              <Card icon={<Target/>}     title="Test set size"            value={`${ai.testing.studies} studies`}               sub="Default hold-out set. Larger sets improve accuracy estimates but increase energy cost."/>
              <Card icon={<BarChart3/>}  title="Precision mode"           value={scen.precision}                                 sub={`AMP (float16) saves ${ai.ampSavingPct}% inference energy with minimal accuracy loss. Apply to both test and inference.`}/>
            </div>
          </section>

          {/* ── Phase 3: Inference & Deployment ── */}
          <section style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>Phase 3 — Inference and deployment</h2>
            <p className="note" style={{marginBottom:12}}>Inference scales with every study — this dominates the AI lifecycle energy cost. MRI cooling adds +45% to scanner energy during active acquisition (Heye/Vosshenrich). (Implementation Guide §4 · Metric 2)</p>
            <div className="cards">
              <Card icon={<Activity/>}   title="Energy per study"         value={`${ai.inference.kwhPerStudy} kWh`}              sub="Per-inference energy including PUE and AMP factor. Scales with every request."/>
              <Card icon={<Zap/>}        title="Monthly inference energy" value={`${ai.inference.kwhMonthly} kWh`}               sub={`Across ${ai.inference.studies.toLocaleString()} studies/month at ${scen.cloudProvider}.`}/>
              <Card icon={<Gauge/>}      title="Lifetime inference total" value={`${ai.inference.kwhLifetime.toLocaleString()} kWh`} sub="36-month deployment. Inference typically exceeds training energy within 1–3 months."/>
              <Card icon={<Droplets/>}   title="Monthly water footprint"  value={`${ai.waterLitres} L`}                          sub={`${WATER_PER_KWH} L/kWh cooling estimate. Often overlooked environmental cost.`}/>
            </div>
          </section>

          {/* ── Carbon summary ── */}
          <section style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>Carbon emissions summary</h2>
            <p className="note" style={{marginBottom:12}}>Operational carbon uses cloud provider CI ({ai.cloudCi} kgCO₂e/kWh). Clinical savings use local grid ({settings.region}: {getCI(settings.region, settings.customCi)} kgCO₂e/kWh). Global avg: 0.473 · EU avg: 0.237 (Vosshenrich)</p>
            <div className="cards">
              <Card icon={<Leaf/>}        title="Gross CO₂e/month"          value={`${ai.grossKgCo2e} kgCO₂e`}                 sub="Inference + amortised training + embodied GPU (all monthly)."/>
              <Card icon={<Cpu/>}         title="Embodied GPU carbon"        value={`${ai.embGpuKgCo2e} kgCO₂e/mo`}            sub={`Total ${AI_MODELS[scen.modelSize].embCo2Kg} kgCO₂e manufacturing, amortised 36 months. (ESR PP 2025)`}/>
              <Card icon={<TrendingDown/>} title="Clinical savings"          value={`−${ai.savingsKgCo2e} kgCO₂e/mo`}          sub="Scanner time reduction + avoided scans. Replace with measured before/after metering."/>
              <section className="card">
                <div className="cardHead"><BarChart3/><span>Net AI impact / month</span></div>
                <b style={{color: ai.netKgCo2e < 0 ? '#2E7D32' : '#c62828'}}>{ai.netKgCo2e} kgCO₂e</b>
                <p>{ai.netKgCo2e < 0 ? "Net positive — clinical savings outweigh full AI footprint." : "Net negative — AI costs currently exceed measured savings."}</p>
              </section>
            </div>
          </section>

          {/* ── Clinical co-benefits ── */}
          <section style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>Clinical sustainability co-benefits</h2>
            <p className="note" style={{marginBottom:12}}>Unnecessary imaging estimated at 20–50% of all scans (Implementation Guide §1). AI decision support targets the Prevent tier of the Recycling Pyramid.</p>
            <div className="cards">
              <Card icon={<TrendingDown/>} title="Scan time reduction"        value={`${ai.scanTimeReductPct}%`}                sub={`AI reconstruction/denoising. Saves ${ai.scanEnergySaved} kWh/month in scanner energy. (Radiol 2023: 45–89% range)`}/>
              <Card icon={<Leaf/>}         title="Low-value imaging avoided"  value={`${ai.lowValueReductPct}%`}               sub={`~${ai.scansAvoided} scans/month avoided. Reduces energy, contrast waste, and data storage. (McKee 2024: up to 20%)`}/>
              <Card icon={<Zap/>}          title="Scanner energy saved/month" value={`${ai.scanEnergySaved} kWh`}              sub="Direct hardware energy saving from shorter protocols and avoided acquisitions."/>
              <Card icon={<AlertTriangle/>} title="Rebound effect risk"        value={ai.reboundRisk}                          sub="Faster reads may induce more scan orders, cancelling gains. Monitor scan volume after deployment. (Implementation Guide §4)"/>
            </div>
          </section>

          {/* ── Modality benchmarks ── */}
          <section style={{marginTop:28}}>
            <h2>Modality energy benchmarks</h2>
            <p className="note" style={{marginBottom:12}}>Annual reference values from Vosshenrich et al. Idle state accounts for 50–66% of total energy (Schoen et al.: idle offers 14.9× more savings potential than active state).</p>
            <div className="row" style={{fontWeight:700, color:'#2E7D32'}}><span>Modality</span><span>kWh / year</span><span style={{fontSize:12}}>Note</span></div>
            {MODALITY_BENCHMARKS.map((m,i)=>(
              <div key={i} className="row">
                <b>{m.modality}</b>
                <span>{m.kwhYear.toLocaleString()} kWh · {m.co2Year.toLocaleString()} kg CO₂e</span>
                <small>{m.note}</small>
              </div>
            ))}
          </section>
        </main>
      )}

      {/* ── Scenario ── */}
      {page==='scenario' && (
        <main>
          <h1>Scenario comparison</h1>
          <div className="grid" style={{marginBottom:8}}>
            <Sel label="Intervention"         value={scen.intervention}  options={META.interventions}  onChange={v=>setS('intervention',v)}/>
            <Sel label={<span>Cloud provider {scenario.usesCloud ? <span className="badge">active</span> : <span style={{fontWeight:400,color:'#aaa',fontSize:11}}>not used by this intervention</span>}</span>}
                 value={scen.cloudProvider} options={META.cloudProviders} onChange={v=>setS('cloudProvider',v)}/>
            <Sel label={<span>Scanner state target {scenario.usesScanner ? <span className="badge">active</span> : <span style={{fontWeight:400,color:'#aaa',fontSize:11}}>not used by this intervention</span>}</span>}
                 value={scen.scannerState} options={META.scannerStates} onChange={v=>setS('scannerState',v)}/>
          </div>
          <p className="note" style={{marginBottom:16}}>
            {scenario.note}
            {scenario.usesScanner && <> · Scanner state target changes how deep the power-down goes (Standby saves less than Off).</>}
            {scenario.usesCloud   && <> · Cloud provider changes the carbon intensity of compute ({scen.cloudProvider}: {(CLOUD[scen.cloudProvider]??CLOUD["Local compute"]).ci} kgCO₂e/kWh vs region {getCI(settings.region, settings.customCi)} kgCO₂e/kWh).</>}
          </p>
          <div className="scenarioGrid">
            <section className="card">
              <div className="cardHead"><Gauge/><span>Baseline ({settings.timePeriod})</span></div>
              <p><b>{scenario.baseline.kwh.toLocaleString()} kWh</b></p>
              <p>{scenario.baseline.co2.toLocaleString()} kgCO₂e</p>
            </section>
            <section className="card savings">
              <div className="cardHead"><TrendingDown/><span>Projected savings</span></div>
              <b>−{scenario.savings.kwh.toLocaleString()} kWh</b>
              <p>−{scenario.savings.co2.toLocaleString()} kgCO₂e</p>
              <p><span className="badge">{scenario.savings.pctEnergy}% energy reduction</span></p>
            </section>
            <section className="card">
              <div className="cardHead"><Leaf/><span>After intervention</span></div>
              <p><b>{scenario.projected.kwh.toLocaleString()} kWh</b></p>
              <p>{scenario.projected.co2.toLocaleString()} kgCO₂e</p>
            </section>
          </div>
          <div className="charts" style={{marginTop:24}}>
            <section><h2>Before vs after</h2><Bar data={chartScenario}/></section>
          </div>
          <p className="note" style={{marginTop:12}}>Region: {settings.region} — {settings.timePeriod} figures. Change region or time period on the Input page.</p>
        </main>
      )}

      {/* ── Export ── */}
      {page==='export' && (
        <main>
          <h1>Export report</h1>
          <p>Every report should include the assumptions table, confidence level, units, and citation fields.</p>
          <button className="download" onClick={()=>downloadCSV(dash)}><Download/>Download CSV ({settings.timePeriod})</button>
          <button className="download" onClick={handlePrint} style={{marginLeft:'12px'}}><Download/>Print / Save as PDF</button>
          <section style={{marginTop:24}}>
            <h2>Key assumptions and sources</h2>
            <p className="note">Carbon intensity: Our World in Data 2022–2023 national averages (ourworldindata.org/grapher/carbon-intensity-electricity).</p>
            <p className="note">MRI active power 30 kW: Heye et al. J Magn Reson Imaging 2023 · DOI 10.1002/jmri.28994.</p>
            <p className="note">CT active power 60 kW: Acra 2024 · DOI 10.1016/j.acra.2024.05.004; CJRS 2022 · DOI 10.1177/08465371221133074.</p>
            <p className="note">AI footprint methodology: Doo et al. Radiology 2024 · DOI 10.1148/radiol.232030.</p>
            <p className="note">Intervention savings: McKee et al. Radiology 2024 · DOI 10.1148/radiol.240219; ESR Position Paper 2025.</p>
            <p className="note">Full reference list: <a href="https://github.com/takinci/EcoRad/blob/main/sources.md" style={{color:'#2E7D32'}} target="_blank" rel="noreferrer">sources.md on GitHub</a>. All numbers are defaults — replace with locally measured values for publication-quality reporting.</p>
          </section>
        </main>
      )}

      <footer>
        <Logo dark/>
        <span>ESG-ready sustainability intelligence for academic hospitals, enterprise healthcare systems, radiology AI teams, and scientific reporting.</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App/>);

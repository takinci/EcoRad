import React, {useState, useMemo, useEffect, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend} from 'chart.js';

const Bar      = React.lazy(() => import('react-chartjs-2').then(m => ({default: m.Bar})));
const Doughnut = React.lazy(() => import('react-chartjs-2').then(m => ({default: m.Doughnut})));
import {Leaf, Brain, Download, Activity, Gauge, TrendingDown, Droplets, FileText, Trash2, Cpu, Car, TreePine, Plane, Factory, Zap, Target, AlertTriangle, BarChart3, Home, Flame, Lightbulb, Coffee, Monitor, Server, Database, Wifi, Cloud, Plus, ArrowRight, HardDrive, Globe} from 'lucide-react';
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

// GPU TDP reference for eco-label energy estimation.
// Sources: NVIDIA product datasheets; AWS/GCP GPU instance specs.
// Researchers should prefer measured energy (CodeCarbon, nvidia-smi) over these estimates.
const GPU_PRESETS = {
  "NVIDIA H100 (80GB SXM5)":  {tdpKw: 0.700},
  "NVIDIA A100 (80GB SXM4)":  {tdpKw: 0.400},
  "NVIDIA A100 (40GB PCIe)":  {tdpKw: 0.250},
  "NVIDIA V100 (32GB SXM2)":  {tdpKw: 0.300},
  "NVIDIA RTX 4090":           {tdpKw: 0.450},
  "NVIDIA RTX 3090":           {tdpKw: 0.350},
  "NVIDIA T4":                 {tdpKw: 0.070},
  "NVIDIA RTX A6000":          {tdpKw: 0.300},
  "AMD MI250X":                {tdpKw: 0.500},
  "Custom (enter TDP below)":  {tdpKw: 0.000},
};

// ── Cloud carbon tracking data ────────────────────────────────────────────────
// Per-region carbon intensity (kgCO₂e/kWh) and provider PUE.
// Sources: Cloud Carbon Footprint methodology (cloudcarbonfootprint.org);
// Electricity Maps 2023 annual averages; AWS/Azure/GCP sustainability reports 2022–2023.
// CI values are grid annual averages — real-time and location-matched values improve accuracy.
const CLOUD_REGIONS = {
  AWS: {
    label: 'Amazon Web Services', pue: 1.15,
    regions: {
      'eu-north-1 (Stockholm, SE)':     0.013,
      'eu-west-3 (Paris, FR)':          0.056,
      'us-west-2 (Oregon, US)':         0.109,
      'ca-central-1 (Canada)':          0.120,
      'eu-west-2 (London, UK)':         0.193,
      'eu-west-1 (Ireland)':            0.278,
      'eu-central-1 (Frankfurt, DE)':   0.338,
      'us-east-1 (N. Virginia, US)':    0.379,
      'us-east-2 (Ohio, US)':           0.410,
      'ap-southeast-1 (Singapore)':     0.408,
      'ap-northeast-1 (Tokyo, JP)':     0.506,
      'ap-southeast-2 (Sydney, AU)':    0.790,
    },
  },
  Azure: {
    label: 'Microsoft Azure', pue: 1.15,
    regions: {
      'swedencentral (Sweden)':         0.013,
      'francecentral (France)':         0.056,
      'westus2 (West US 2)':            0.109,
      'uksouth (UK South)':             0.193,
      'northeurope (Ireland)':          0.278,
      'germanywestcentral (Germany)':   0.338,
      'westeurope (Netherlands)':       0.390,
      'eastus (East US)':               0.379,
      'southeastasia (Singapore)':      0.408,
      'japaneast (Japan)':              0.506,
      'australiaeast (Australia)':      0.790,
    },
  },
  'Google Cloud': {
    label: 'Google Cloud Platform', pue: 1.10,
    regions: {
      'europe-north1 (Finland)':        0.067,
      'us-west1 (Oregon, US)':          0.075,
      'europe-west6 (Zürich, CH)':      0.095,
      'europe-west1 (Belgium)':         0.167,
      'europe-west4 (Netherlands)':     0.390,
      'us-east1 (S. Carolina, US)':     0.423,
      'us-central1 (Iowa, US)':         0.484,
      'asia-northeast1 (Tokyo, JP)':    0.506,
      'asia-east1 (Taiwan)':            0.541,
      'australia-southeast1 (Sydney)':  0.790,
    },
  },
  'Local compute': {
    label: 'Local / on-premise', pue: 1.50,
    regions: {
      'On-premise (Switzerland)':       0.100,
      'On-premise (France)':            0.056,
      'On-premise (Germany)':           0.360,
      'On-premise (UK)':                0.193,
      'On-premise (US average)':        0.380,
      'On-premise (global average)':    0.473,
    },
  },
};

// Instance power draw (watts) including CPU, GPU, memory, storage I/O at typical utilisation.
// GPU instances: 100% GPU utilisation assumed (training/inference).
// CPU instances: 50% average utilisation (Masanet 2020 Science).
// Sources: SPEC Power database; AWS/GCP/Azure instance specs; Cloud Carbon Footprint.
const CLOUD_INSTANCES = {
  'GPU: NVIDIA T4 (g4dn.xlarge / n1-std-4+T4)':         {watt: 170,  category: 'gpu', desc: 'Inference, lightweight training. Common in medical AI deployment.'},
  'GPU: NVIDIA A10G (g5.xlarge / NC A10 v5)':             {watt: 300,  category: 'gpu', desc: 'Efficient training & inference. Good energy-per-accuracy balance.'},
  'GPU: NVIDIA V100 16GB (p3.2xlarge / NCv3-6)':          {watt: 500,  category: 'gpu', desc: 'Research training. Widely used in published medical AI literature.'},
  'GPU: NVIDIA A100 40GB (a2-highgpu-1g / ND A100 v4)':  {watt: 500,  category: 'gpu', desc: 'High-performance training. Common in MICCAI / Radiology AI papers.'},
  'GPU: NVIDIA A100 80GB ×8 (p4d.24xlarge)':             {watt: 4800, category: 'gpu', desc: 'Multi-GPU training node. 8× A100 SXM4. Large-scale experiments only.'},
  'GPU: NVIDIA H100 ×8 (p5.48xlarge)':                    {watt: 6400, category: 'gpu', desc: 'Highest-tier node. 8× H100 SXM5. Substantial carbon commitment.'},
  'CPU: Small (2–4 vCPU, 8–16 GB)':                      {watt: 30,   category: 'cpu', desc: 'DICOM router, lightweight API, scheduler.'},
  'CPU: Medium (8–16 vCPU, 32–64 GB)':                   {watt: 75,   category: 'cpu', desc: 'PACS backend, AI inference API, database server.'},
  'CPU: Large (32–64 vCPU, 128–256 GB)':                 {watt: 150,  category: 'cpu', desc: 'Heavy preprocessing, multi-model inference pipeline.'},
  'CPU: Memory-optimised (64+ vCPU, 512 GB+)':           {watt: 250,  category: 'cpu', desc: 'In-memory DICOM cache, large-scale analytics.'},
  'Custom (enter watts)':                                  {watt: 0,    category: 'custom', desc: 'Enter measured or vendor-specified TDP for your exact instance.'},
};

// Storage energy intensity in Wh per TB-hour.
// Sources: Masanet et al. 2020 (Science); Cloud Carbon Footprint methodology.
const STORAGE_WH_PER_TB_HR = {
  'SSD / NVMe (block storage)':       1.20,
  'HDD (object storage — S3 / Blob)': 0.65,
  'Archive / cold storage (Glacier)': 0.10,
};

const NETWORK_KWH_PER_GB = 0.001; // kWh/GB — fixed-line DC average (Aslan et al. 2018)

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
  gpuModels:      Object.keys(GPU_PRESETS),
  taskTypes:      ["Classification", "Segmentation", "Detection", "Reconstruction", "Report generation", "Triage", "Other"],
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

function computeCloudCarbon(t) {
  const provData  = CLOUD_REGIONS[t.provider] ?? CLOUD_REGIONS['Local compute'];
  const regionCi  = provData.regions[t.region] ?? 0.3;
  const pue       = provData.pue;
  const renewable = Math.min(100, Math.max(0, parseFloat(t.renewablePct) || 0));
  const ci        = rnd(regionCi * (1 - renewable / 100), 4);

  const computeResults = t.computeLines.map(line => {
    const preset = CLOUD_INSTANCES[line.instance];
    const watt   = line.instance === 'Custom (enter watts)'
      ? (parseFloat(line.customWatt) || 0)
      : (preset?.watt ?? 0);
    const count  = Math.max(0, parseFloat(line.count) || 0);
    const hours  = Math.max(0, Math.min(744, parseFloat(line.hoursPerMonth) || 0));
    const rawKwh = rnd(watt / 1000 * count * hours, 2);
    const pueKwh = rnd(rawKwh * pue, 2);
    const co2    = rnd(pueKwh * ci, 2);
    return {...line, watt, rawKwh, pueKwh, co2, category: preset?.category ?? 'cpu'};
  });

  const storageResults = t.storageLines.map(line => {
    const whPerTbHr = STORAGE_WH_PER_TB_HR[line.type] ?? 0.65;
    const tb        = Math.max(0, parseFloat(line.tb) || 0);
    const rawKwh    = rnd(whPerTbHr / 1000 * tb * 720, 3);
    const pueKwh    = rnd(rawKwh * pue, 3);
    const co2       = rnd(pueKwh * ci, 3);
    return {...line, rawKwh, pueKwh, co2};
  });

  const netGb  = Math.max(0, parseFloat(t.networkingGb) || 0);
  const netKwh = rnd(netGb * NETWORK_KWH_PER_GB, 3);
  const netCo2 = rnd(netKwh * ci, 3);

  const rawComputeKwh  = rnd(computeResults.reduce((s, r) => s + r.rawKwh, 0), 2);
  const rawStorageKwh  = rnd(storageResults.reduce((s, r) => s + r.rawKwh, 0), 3);
  const totalComputeKwh = rnd(computeResults.reduce((s, r) => s + r.pueKwh, 0), 2);
  const totalStorageKwh = rnd(storageResults.reduce((s, r) => s + r.pueKwh, 0), 3);
  const totalKwh  = rnd(totalComputeKwh + totalStorageKwh + netKwh, 2);
  const totalCo2  = rnd(
    computeResults.reduce((s, r) => s + r.co2, 0) +
    storageResults.reduce((s, r) => s + r.co2, 0) + netCo2, 2);

  // Best region within same provider
  const provRegions = Object.entries(provData.regions);
  const bestSame = provRegions.reduce(
    (b, [name, rci]) => rci < b.ci ? {name, ci: rci} : b,
    {name: t.region, ci: regionCi}
  );
  const bestSameCi  = rnd(bestSame.ci * (1 - renewable / 100), 4);
  const bestSameCo2 = rnd((rawComputeKwh + rawStorageKwh) * pue * bestSameCi + netKwh * bestSameCi, 2);
  const bestSameSaving = totalCo2 > 0 ? rnd((1 - bestSameCo2 / Math.max(totalCo2, 1e-6)) * 100, 1) : 0;

  // Cross-provider comparison — find each provider's greenest region
  const crossProvider = Object.entries(CLOUD_REGIONS).map(([provName, provInfo]) => {
    const entries = Object.entries(provInfo.regions);
    const best    = entries.reduce((b, [n, rci]) => rci < b.ci ? {name: n, ci: rci} : b, {name: entries[0][0], ci: entries[0][1]});
    const effCi   = rnd(best.ci * (1 - renewable / 100), 4);
    const co2Est  = rnd((rawComputeKwh + rawStorageKwh) * provInfo.pue * effCi + netKwh * effCi, 2);
    const saving  = totalCo2 > 0 ? rnd((1 - co2Est / Math.max(totalCo2, 1e-6)) * 100, 1) : 0;
    return {provider: provName, label: provInfo.label, bestRegion: best.name, ci: best.ci, pue: provInfo.pue, co2Est, saving, isCurrent: provName === t.provider};
  }).sort((a, b) => a.co2Est - b.co2Est);

  return {
    computeResults, storageResults,
    netKwh, netCo2, netGb,
    totalComputeKwh, totalStorageKwh, totalKwh, totalCo2,
    rawComputeKwh, rawStorageKwh,
    ci, regionCi, pue, renewable,
    bestSame: {...bestSame, ci: bestSameCi, co2: bestSameCo2, saving: bestSameSaving},
    crossProvider,
    isBestRegion: t.region === bestSame.name,
  };
}

// ── UI components ─────────────────────────────────────────────────────────────
function Logo({onClick}) {
  return (
    <div className="brand" onClick={onClick} style={onClick ? {cursor:'pointer'} : undefined}>
      <img src="./logo-only.png" alt="EcoRad logo" style={{width:68, height:68, objectFit:'contain'}}/>
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
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const row = cells => cells.map(q).join(',');
  const blank = '';

  const lines = [
    row(['EcoRad Sustainability Report']),
    row(['Profile', dash.region, dash.timePeriod]),
    row(['Carbon intensity (kgCO2e/kWh)', dash.ci]),
    blank,

    row(['ENERGY TOTALS']),
    row(['Metric', 'Value', 'Unit']),
    row(['Total electricity',   dash.totals.kwh,         'kWh']),
    row(['Active scanning',     dash.totals.activeKwh,   'kWh']),
    row(['Idle + standby',      dash.totals.idleKwh,     'kWh']),
    row(['Avoidable idle',      dash.totals.idleWasteKwh,'kWh']),
    row(['Energy per imaging scan', dash.totals.energyPerScan, 'kWh/scan']),
    blank,

    row(['CARBON — GHG PROTOCOL SCOPES']),
    row(['Scope', 'kgCO2e']),
    row(['Scope 1 — Direct',           dash.scopes.scope1Kg]),
    row(['Scope 2 — Electricity',      dash.scopes.scope2Kg]),
    row(['Scope 3 — Embodied carbon',  dash.scopes.scope3EmbKg]),
    row(['Scope 3 — Patient travel',   dash.scopes.scope3TravelKg]),
    row(['Scope 3 — Total',            dash.scopes.scope3Kg]),
    blank,

    row(['RESOURCES']),
    row(['Metric', 'Value', 'Unit']),
    row(['Water footprint',   dash.resources.waterLitres, 'L']),
    row(['Paper consumption', dash.resources.paperKg,     'kg']),
    row(['Hazardous waste',   dash.resources.hazardousKg, 'kg']),
    blank,

    row(['REAL-WORLD EQUIVALENCIES (Scope 2)']),
    row(['Metric', 'Value', 'Unit']),
    row(['Car km equivalent',     dash.equivalencies.car_km,          'km']),
    row(['Phone charges',         dash.equivalencies.phone_charges,   'charges']),
    row(['Tree-years to offset',  dash.equivalencies.trees_year,      'tree-years']),
    row(['Short-haul flights',    dash.equivalencies.flights_short,   'flights']),
    row(['Household electricity', dash.equivalencies.household_years, 'years']),
    blank,

    row(['EQUIPMENT BREAKDOWN']),
    row(['Equipment', 'Modality', 'kWh', 'kgCO2e', 'Scans', 'kWh/scan', 'Avoidable idle kWh', 'Confidence']),
    ...dash.byEquipment.map(r =>
      row([r.equipment, r.modality, r.kwh, r.kgco2e, r.scans, r.energyPerScan ?? 'N/A', r.idleWasteKwh, r.confidence])
    ),
  ];

  const blob = new Blob([lines.join('\n')], {type: 'text/csv'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ecorad_${dash.region}_${dash.timePeriod}.csv`.replace(/\s+/g, '_');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateEcoMarkdown(d) {
  const rows = [
    ['Project / model',          d.projectName],
    ['Task type',                d.taskType],
    ['Architecture',             d.architecture],
    ['Parameters',               d.paramsMillion],
    ['Training dataset',         d.datasetSize],
    ['GPU hardware',             d.gpuHardware],
    ['Training runs',            `${d.numRuns} experiment${d.numRuns > 1 ? 's' : ''}`],
    ['Total GPU-hours',          `${d.totalGpuHours} h`],
    ['Energy per run',           `${d.energyPerRunKwh} kWh${d.energyMeasured ? ' (measured)' : ' (estimated from TDP)'}`],
    ['Total training energy',    `${d.totalEnergyKwh} kWh`],
    ['Training CO₂e',       `${d.trainCo2} kgCO₂e`],
    ['Renewable energy',         `${d.renewablePct}%`],
    ['Compute provider / PUE',   `${d.cloudProvider} · PUE ${d.pue}`],
    ['Grid region / CI',         `${d.region} · ${d.ci} kgCO₂e/kWh`],
    ['Water footprint (cooling)', `${d.waterLitres.toLocaleString()} L`],
    ...(d.hasInference ? [[
      'Monthly inference',
      `${d.inferStudies.toLocaleString()} studies · ${d.inferMonthlyKwh} kWh · ${d.inferCo2Month} kgCO₂e`,
    ]] : []),
    ['Estimated with',           `EcoRad · ${d.date}`],
  ];
  return [
    '| Metric | Value |',
    '|:---|:---|',
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '> Sustainability label generated with [EcoRad](https://takinci.github.io/EcoRad/).',
    '> Reporting framework: Doo FX et al. *Radiology* 2024 · DOI 10.1148/radiol.232030.',
  ].join('\n');
}

function downloadEcoPNG(d) {
  const W = 510;
  const rows = [
    ['Task type',                d.taskType],
    ['Architecture',             d.architecture],
    ['Parameters',               d.paramsMillion],
    ['Training dataset',         d.datasetSize],
    ['GPU hardware',             d.gpuHardware],
    ['Training runs',            `${d.numRuns} exp · ${d.totalGpuHours} GPU-h total`],
    ['Energy / run',             `${d.energyPerRunKwh} kWh${d.energyMeasured ? ' (measured)' : ' (est.)'}`],
    ['Total training energy',    `${d.totalEnergyKwh} kWh`],
    [`Training CO₂e`,       `${d.trainCo2} kgCO₂e`],
    ['Renewable energy',         `${d.renewablePct}%`],
    ['Compute / grid',           `${d.cloudProvider} · ${d.region} · ${d.ci} kgCO₂e/kWh`],
    ['Water footprint (cooling)', `${d.waterLitres.toLocaleString()} L`],
    ...(d.hasInference ? [['Monthly inference', `${d.inferStudies.toLocaleString()} studies · ${d.inferMonthlyKwh} kWh`]] : []),
  ];
  const ROW_H = 26, HEADER_H = 72, FOOTER_H = 28;
  const H = HEADER_H + 4 + rows.length * ROW_H + 6 + FOOTER_H + 4;
  const canvas = document.createElement('canvas');
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(0, 0, W, H, 14); ctx.fill();
  ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(1, 1, W - 2, H - 2, 13); ctx.stroke();
  ctx.fillStyle = '#1b5e20';
  ctx.beginPath(); ctx.roundRect(1, 1, W - 2, HEADER_H, [13, 13, 0, 0]); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px sans-serif';
  ctx.fillText('EcoRad Eco-label', 16, 26);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#A5D6A7';
  ctx.fillText(d.projectName, 16, 48);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#81C784';
  ctx.fillText(`AI/ML Training Report · Radiology · ${d.date}`, 16, 66);
  rows.forEach(([k, v], i) => {
    const y = HEADER_H + 4 + i * ROW_H;
    ctx.fillStyle = i % 2 === 0 ? '#f1f8f1' : '#ffffff';
    ctx.fillRect(2, y, W - 4, ROW_H);
    ctx.fillStyle = '#607d66'; ctx.font = '11px sans-serif';
    ctx.fillText(k, 14, y + 17);
    ctx.fillStyle = '#263238'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(String(v), 210, y + 17);
  });
  const footerY = HEADER_H + 4 + rows.length * ROW_H + 6;
  ctx.fillStyle = '#e8f5e9';
  ctx.beginPath(); ctx.roundRect(2, footerY, W - 4, FOOTER_H, [0, 0, 11, 11]); ctx.fill();
  ctx.fillStyle = '#2E7D32'; ctx.font = '10px sans-serif';
  ctx.fillText(`EcoRad · ${d.date} · Doo et al. Radiology 2024 · CC BY 4.0`, 14, footerY + 18);
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecorad_ecolabel_${(d.projectName || 'untitled').replace(/\W+/g, '_')}.png`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  });
}

const CHART_COLORS = ['#2E7D32','#26A69A','#66BB6A','#4DB6AC','#A5D6A7','#80CBC4'];

// Smart unit formatters — switch unit at sensible thresholds
const fmtCo2 = kg  => kg  >= 1000 ? `${rnd(kg/1000, 2)} tCO₂e`  : `${Math.round(kg).toLocaleString()} kgCO₂e`;
const fmtKwh = kwh => kwh >= 1000 ? `${rnd(kwh/1000, 1)} MWh`   : `${Math.round(kwh).toLocaleString()} kWh`;
const fmtL   = l   => l   >= 1000 ? `${rnd(l/1000, 1)} kL`      : `${Math.round(l).toLocaleString()} L`;
// Large-number formatter for equivalency cards — readable at a glance
const fmtBig = n => {
  if (n === 0)    return '0';
  if (n >= 1e9)   return (n / 1e9).toFixed(1) + ' B';
  if (n >= 1e6)   return (n / 1e6).toFixed(1) + ' M';
  if (n >= 1000)  return Math.round(n).toLocaleString();
  if (n >= 10)    return Math.round(n).toString();
  if (n >= 1)     return n.toFixed(1);
  return n < 0.001 ? '< 0.001' : n.toFixed(3);
};

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

  const set  = (key, val) => setSettings(s => ({...s, [key]: val}));
  const setS = (key, val) => setScen(s => ({...s, [key]: val}));
  const [aiTab,   setAiTab]   = useState('model');
  const [dashTab, setDashTab] = useState('equiv');
  const [equivScope, setEquivScope] = useState('scope2');
  const [landingAIOpen, setLandingAIOpen] = useState(false);
  const [landingAI, setLandingAI] = useState({gpu:'NVIDIA A100 (80GB SXM4)', hoursPerDay:'8'});
  const [ecoCopied, setEcoCopied] = useState(false);
  const [ecoLabel, setEcoLabel] = useState({
    projectName: '',
    taskType: 'Classification',
    architecture: '',
    paramsMillion: '',
    datasetSize: '',
    gpuModel: 'NVIDIA A100 (80GB SXM4)',
    customTdpW: '300',
    gpuCount: '1',
    trainingHoursPerRun: '',
    numRuns: '1',
    energyMeasured: false,
    energyKwhPerRun: '',
    cloudProvider: 'Local compute',
    region: 'Global average',
    renewablePct: '0',
    inferStudiesMonth: '',
    inferKwhPerStudy: '',
  });
  const setEco = (key, val) => setEcoLabel(l => ({...l, [key]: val}));

  const [cloudTracker, setCloudTracker] = useState({
    provider: 'AWS',
    region: 'eu-west-1 (Ireland)',
    renewablePct: '0',
    computeLines: [
      {id: 1, label: 'AI inference server', instance: 'GPU: NVIDIA T4 (g4dn.xlarge / n1-std-4+T4)', count: '1', hoursPerMonth: '720', customWatt: ''},
    ],
    storageLines: [
      {id: 1, label: 'PACS archive', type: 'HDD (object storage — S3 / Blob)', tb: '10'},
    ],
    networkingGb: '500',
  });
  const setCloud    = (key, val) => setCloudTracker(t => ({...t, [key]: val}));
  const addComputeLine = () => setCloudTracker(t => ({...t, computeLines: [...t.computeLines, {id: Date.now(), label: '', instance: 'CPU: Medium (8–16 vCPU, 32–64 GB)', count: '1', hoursPerMonth: '720', customWatt: ''}]}));
  const removeComputeLine = id => setCloudTracker(t => ({...t, computeLines: t.computeLines.filter(l => l.id !== id)}));
  const updateComputeLine = (id, field, val) => setCloudTracker(t => ({...t, computeLines: t.computeLines.map(l => l.id === id ? {...l, [field]: val} : l)}));
  const addStorageLine = () => setCloudTracker(t => ({...t, storageLines: [...t.storageLines, {id: Date.now(), label: '', type: 'HDD (object storage — S3 / Blob)', tb: '1'}]}));
  const removeStorageLine = id => setCloudTracker(t => ({...t, storageLines: t.storageLines.filter(l => l.id !== id)}));
  const updateStorageLine = (id, field, val) => setCloudTracker(t => ({...t, storageLines: t.storageLines.map(l => l.id === id ? {...l, [field]: val} : l)}));

  const handlePrint = () => { window.print(); };

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

  const equivData = useMemo(() => {
    const co2 = equivScope === 'scope2'
      ? dash.scopes.scope2Kg
      : dash.scopes.scope1Kg + dash.scopes.scope2Kg + dash.scopes.scope3Kg;
    const kwh = dash.totals.kwh;
    return {
      co2, kwh,
      // Transport — CO₂-based
      car_km:        Math.round(co2 / 0.17),        // avg petrol car DEFRA 2023
      car_years:     rnd(co2 / 2100, 2),            // avg EU car 2.1 tCO₂e/yr (EEA 2023)
      flights_short: rnd(co2 / 255, 1),             // economy short-haul seat (ICAO 2023)
      flights_long:  rnd(co2 / 1200, 1),            // economy transatlantic seat (ICAO 2023)
      // Home & energy — kWh-based
      homes:         rnd(kwh / 3500, 2),            // avg EU household electricity 3 500 kWh/yr
      phone_charges: Math.round(kwh / 0.012),       // smartphone 12 Wh per charge
      led_years:     Math.round(kwh / 50),          // 60 W→10 W LED saves 50 kWh/yr
      tea_cups:      Math.round(kwh / 0.025),       // 250 ml kettle boil ~0.025 kWh
      laptop_days:   Math.round(kwh / 0.24),        // 30 W × 8 h/day
      stream_hours:  Math.round(kwh / 0.1),         // TV streaming ~100 W device
      // Nature — CO₂-based
      trees_year:    Math.round(co2 / 21),          // 1 tree ~21 kgCO₂/yr absorbed
      forest_ha:     rnd(co2 / 5500, 3),            // temperate forest ~5.5 tCO₂/ha/yr (FAO)
      // Fossil fuels — CO₂-based
      barrels_oil:   rnd(co2 / 430, 1),             // crude oil combustion EPA (0.43 tCO₂/barrel)
      tonnes_coal:   rnd(co2 / 2350, 2),            // bituminous coal ~2 350 kgCO₂/tonne (IPCC)
    };
  }, [dash, equivScope]);

  const ecoLabelData = useMemo(() => {
    const gpuTdpKw = ecoLabel.gpuModel === 'Custom (enter TDP below)'
      ? (parseFloat(ecoLabel.customTdpW) || 300) / 1000
      : (GPU_PRESETS[ecoLabel.gpuModel]?.tdpKw ?? 0.3);
    const cf = CLOUD[ecoLabel.cloudProvider] ?? CLOUD['Local compute'];
    const ci = getCI(ecoLabel.region, settings.customCi);
    const gpuCount = Math.max(1, parseInt(ecoLabel.gpuCount) || 1);
    const hoursPerRun = parseFloat(ecoLabel.trainingHoursPerRun) || 0;
    const numRuns = Math.max(1, parseInt(ecoLabel.numRuns) || 1);
    const renewablePct = Math.min(100, Math.max(0, parseFloat(ecoLabel.renewablePct) || 0));
    const totalGpuHours = rnd(gpuCount * hoursPerRun * numRuns, 1);
    const energyPerRunKwh = ecoLabel.energyMeasured
      ? (parseFloat(ecoLabel.energyKwhPerRun) || 0)
      : rnd(gpuTdpKw * gpuCount * hoursPerRun * cf.pue, 2);
    const totalEnergyKwh = rnd(energyPerRunKwh * numRuns, 2);
    const effectiveCi = rnd(ci * (1 - renewablePct / 100), 4);
    const trainCo2 = rnd(totalEnergyKwh * effectiveCi, 2);
    const waterLitres = Math.round(totalEnergyKwh * WATER_PER_KWH);
    const inferStudies = parseFloat(ecoLabel.inferStudiesMonth) || 0;
    const inferKwhPerStudy = parseFloat(ecoLabel.inferKwhPerStudy) || 0;
    const inferMonthlyKwh = rnd(inferStudies * inferKwhPerStudy, 4);
    const inferCo2Month = rnd(inferMonthlyKwh * effectiveCi, 4);
    const gpuLabel = ecoLabel.gpuModel === 'Custom (enter TDP below)'
      ? `Custom GPU (${ecoLabel.customTdpW || 300} W TDP)`
      : ecoLabel.gpuModel;
    return {
      projectName: ecoLabel.projectName || 'Untitled project',
      taskType: ecoLabel.taskType,
      architecture: ecoLabel.architecture || '—',
      paramsMillion: ecoLabel.paramsMillion ? `${parseFloat(ecoLabel.paramsMillion).toLocaleString()}M params` : '—',
      datasetSize: ecoLabel.datasetSize ? `${parseFloat(ecoLabel.datasetSize).toLocaleString()} studies` : '—',
      gpuHardware: gpuCount > 1 ? `${gpuCount}× ${gpuLabel}` : gpuLabel,
      totalGpuHours, numRuns, energyPerRunKwh, totalEnergyKwh, trainCo2,
      renewablePct, cloudProvider: ecoLabel.cloudProvider, region: ecoLabel.region,
      ci, effectiveCi, waterLitres, pue: cf.pue,
      hasInference: inferStudies > 0 && inferKwhPerStudy > 0,
      inferMonthlyKwh, inferCo2Month, inferStudies: Math.round(inferStudies),
      energyMeasured: ecoLabel.energyMeasured,
      date: new Date().toISOString().slice(0, 7),
    };
  }, [ecoLabel, settings.customCi]);

  const cloudResult = useMemo(() => computeCloudCarbon(cloudTracker), [cloudTracker]);

  const landingAIKwh = useMemo(() => {
    if (!landingAIOpen) return 0;
    const tdpKw = GPU_PRESETS[landingAI.gpu]?.tdpKw ?? 0.3;
    const hours = parseFloat(landingAI.hoursPerDay) || 0;
    return rnd(tdpKw * hours * 30 * (CLOUD['Local compute']?.pue ?? 1.5), 2);
  }, [landingAIOpen, landingAI]);
  const landingAICo2 = useMemo(() => {
    if (!landingAIOpen) return 0;
    return rnd(landingAIKwh * getCI(settings.region, settings.customCi), 2);
  }, [landingAIOpen, landingAIKwh, settings.region, settings.customCi]);

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

  const pages = ['landing','dashboard','ai','cloudtrack','scenario','ecolabel'];
  const PAGE_LABELS = {landing:'Home', dashboard:'Dashboard', ai:'AI', cloudtrack:'Cloud Carbon', scenario:'Scenario', ecolabel:'Eco-label'};

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

      {/* ── Home / Live Calculator ── */}
      {page==='landing' && (
        <main className="hero">
          <div>
            <p className="eyebrow">Radiology + AI + Planetary Health</p>
            <h1 style={{fontSize:52,lineHeight:1.05,margin:'0 0 20px'}}>How much CO₂ does your department emit?</h1>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
              <Sel label="Department type" value={settings.profile} options={META.profiles} onChange={v=>set('profile',v)}/>
              <Sel label="Region / grid"   value={settings.region}  options={META.regions}  onChange={v=>set('region',v)}/>
            </div>
            {!landingAIOpen ? (
              <button onClick={()=>setLandingAIOpen(true)} style={{background:'none',border:'1.5px dashed #81C784',color:'#2E7D32',borderRadius:14,padding:'8px 18px',cursor:'pointer',fontSize:14,fontWeight:600}}>
                + Add AI / ML tools
              </button>
            ) : (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:8}}>
                  <Sel label="GPU type"    value={landingAI.gpu}         options={META.gpuModels}                   onChange={v=>setLandingAI(a=>({...a,gpu:v}))}/>
                  <Sel label="Hours / day" value={landingAI.hoursPerDay} options={['2','4','6','8','12','16','24']} onChange={v=>setLandingAI(a=>({...a,hoursPerDay:v}))}/>
                </div>
                <button onClick={()=>setLandingAIOpen(false)} style={{background:'none',border:'none',color:'#607d66',cursor:'pointer',fontSize:13,padding:0}}>✕ Remove AI</button>
              </div>
            )}
          </div>
          <div className="heroVisual">
            <div style={{color:'#607d66',fontSize:13,marginBottom:8}}>{settings.profile} · {settings.region} · Monthly</div>
            <div style={{fontSize:56,fontWeight:900,color:'#1b5e20',lineHeight:1}}>{fmtCo2(dash.scopes.scope2Kg + landingAICo2)}</div>
            <div style={{color:'#2E7D32',fontWeight:700,fontSize:16,marginTop:4,marginBottom: landingAIOpen && landingAICo2>0 ? 8 : 20}}>CO₂ per month</div>
            {landingAIOpen && landingAICo2>0 && (
              <div style={{fontSize:13,color:'#607d66',marginBottom:16}}>↑ includes {fmtCo2(landingAICo2)} from AI tools</div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
              {[
                {icon:<Car style={{width:18,height:18}}/>,     n:Math.round((dash.scopes.scope2Kg+landingAICo2)/0.17).toLocaleString(), label:'km driven by car'},
                {icon:<Plane style={{width:18,height:18}}/>,   n:String(rnd((dash.scopes.scope2Kg+landingAICo2)/255,1)),                label:'short-haul flights'},
                {icon:<TreePine style={{width:18,height:18}}/>,n:Math.round((dash.scopes.scope2Kg+landingAICo2)/21).toLocaleString(),  label:'tree-years to offset'},
              ].map((e,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{color:'#2E7D32'}}>{e.icon}</span>
                  <strong style={{color:'#263238'}}>{e.n}</strong>
                  <span style={{color:'#607d66',fontSize:14}}>{e.label}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>setPage('dashboard')}>Full breakdown →</button>
          </div>
        </main>
      )}


      {/* ── Dashboard ── */}
      {page==='dashboard' && (
        <main>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:8}}>
            <h1 style={{margin:0}}>{settings.profile} <span className="badge">{settings.region}</span> <span className="badge">{settings.timePeriod}</span></h1>
            <div style={{display:'flex',gap:8}}>
              <button className="download" onClick={()=>downloadCSV(dash)} style={{padding:'8px 14px',fontSize:13}}><Download/>CSV</button>
              <button className="download" onClick={handlePrint} style={{padding:'8px 14px',fontSize:13}}><Download/>Print / PDF</button>
            </div>
          </div>

          {/* ── Sticky tab nav ── */}
          <div className="stickyControls">
            <div className="aiSummary">
              <span>Total energy <b>{fmtKwh(dash.totals.kwh + landingAIKwh)}{dash.totals.label}</b></span>
              <span>Scope 2 CO₂ <b>{fmtCo2(dash.scopes.scope2Kg + landingAICo2)}</b></span>
              {landingAIOpen && <span>AI tools <b>{fmtCo2(landingAICo2)}</b></span>}
              <span>Avoidable idle <b>{fmtKwh(dash.totals.idleWasteKwh)}</b></span>
            </div>
            <div className="aiTabs">
              {[['equiv','What it means'],['energy','Energy'],['carbon','Carbon'],['charts','Charts'],['infrastructure','Infrastructure'],['resources','Resources']].map(([id,label])=>(
                <button key={id} className={dashTab===id?'on':''} onClick={()=>{
                  setDashTab(id);
                  document.getElementById('dash-'+id)?.scrollIntoView({behavior:'smooth',block:'start'});
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* ── What it means (equivalencies — first) ── */}
          <section id="dash-equiv" className="aiSection" style={{background:'none',boxShadow:'none',padding:0}}>
            <h2 style={{marginBottom:4}}>What it means in everyday terms</h2>
            <p className="note" style={{marginBottom:16}}>
              Inspired by the <a href="https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator" style={{color:'#2E7D32'}} target="_blank" rel="noreferrer">EPA Greenhouse Gas Equivalencies Calculator</a>.
              Switch between Scope 2 (electricity only) or all scopes below.
            </p>

            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
              <button className={equivScope==='scope2'?'on':''} onClick={()=>setEquivScope('scope2')} style={{padding:'7px 14px',fontSize:13}}>Scope 2 — electricity only</button>
              <button className={equivScope==='all'?'on':''} onClick={()=>setEquivScope('all')} style={{padding:'7px 14px',fontSize:13}}>All scopes — full lifecycle</button>
            </div>
            <p className="note" style={{marginBottom:24,fontSize:12}}>
              {equivScope==='scope2' ? 'Showing Scope 2 (purchased electricity). Best for comparing with published benchmarks.' : 'Showing Scope 1 + 2 + 3 (direct + electricity + embodied + patient travel). Full lifecycle view.'}
              {' '}Change settings on the <button onClick={()=>setPage('landing')} style={{background:'none',border:'none',color:'#2E7D32',cursor:'pointer',padding:'0 2px',fontSize:12,fontWeight:600,boxShadow:'none'}}>Home page →</button>
            </p>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:20,marginBottom:32}}>
              {[
                {icon:<Car style={{width:40,height:40}}/>,     n:fmtBig(equivData.car_km),        unit:`km driven by car${dash.totals.label}`,      note:'Avg petrol car at 0.17 kgCO₂/km (DEFRA 2023).', bg:'#e8f5e9'},
                {icon:<Plane style={{width:40,height:40}}/>,   n:fmtBig(equivData.flights_short), unit:`short-haul flights${dash.totals.label}`,     note:'Economy seat, ~255 kgCO₂e each (ICAO 2023).',   bg:'#e0f7fa'},
                {icon:<TreePine style={{width:40,height:40}}/>,n:fmtBig(equivData.trees_year),    unit:'trees absorbing for 1 year',                 note:'One mature tree sequesters ~21 kgCO₂/yr.',       bg:'#f1f8e9'},
                {icon:<Home style={{width:40,height:40}}/>,    n:fmtBig(equivData.homes),         unit:`home electricity years${dash.totals.label}`, note:'EU average household: 3,500 kWh/yr.',            bg:'#fff8e1'},
              ].map((c,i)=>(
                <div key={i} style={{background:c.bg,borderRadius:28,padding:'32px 20px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:10,boxShadow:'0 8px 30px #1b5e2012'}}>
                  <div style={{color:'#2E7D32'}}>{c.icon}</div>
                  <div style={{fontSize:46,fontWeight:900,color:'#1b5e20',lineHeight:1}}>{c.n}</div>
                  <div style={{fontWeight:700,fontSize:15,color:'#263238'}}>{c.unit}</div>
                  <div style={{fontSize:12,color:'#607d66',lineHeight:1.5}}>{c.note}</div>
                </div>
              ))}
            </div>

            {landingAIOpen && landingAICo2>0 && (
              <p className="note" style={{marginBottom:20,padding:'10px 14px',background:'#f1f8f1',borderRadius:12}}>
                AI tools add approx. <strong>{fmtCo2(landingAICo2)}</strong>{dash.totals.label} on top of the figures above.{' '}
                <button onClick={()=>setPage('ai')} style={{background:'none',border:'none',color:'#2E7D32',cursor:'pointer',padding:'0 2px',fontSize:13,fontWeight:600,boxShadow:'none'}}>Full AI analysis →</button>
              </p>
            )}

            <section style={{marginBottom:28}}>
              <h2 style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><Car style={{color:'#2E7D32'}}/> Transport</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16}}>
                {[
                  {icon:<Car/>,   n:fmtBig(equivData.car_years),    unit:'cars driven for a full year',     note:'EU avg passenger car emits 2.1 tCO₂e/yr (EEA 2023).'},
                  {icon:<Plane/>, n:fmtBig(equivData.flights_short), unit:'short-haul economy flights',      note:'~255 kgCO₂e per seat (ICAO 2023). London–Rome class.'},
                  {icon:<Plane/>, n:fmtBig(equivData.flights_long),  unit:'transatlantic long-haul flights', note:'~1,200 kgCO₂e per economy seat (ICAO 2023).'},
                  {icon:<Car/>,   n:fmtBig(equivData.car_km),        unit:'km driven at 0.17 kgCO₂/km',     note:'Avg UK petrol car (DEFRA 2023). Diesel ~0.17 similar.'},
                ].map((c,i)=>(
                  <div key={i} className="card" style={{textAlign:'center',padding:'20px 16px'}}>
                    <div style={{color:'#2E7D32',marginBottom:6}}>{c.icon}</div>
                    <div style={{fontSize:34,fontWeight:900,color:'#1b5e20',lineHeight:1.1}}>{c.n}</div>
                    <div style={{fontWeight:700,fontSize:13,color:'#263238',margin:'6px 0'}}>{c.unit}</div>
                    <div style={{fontSize:11,color:'#607d66',lineHeight:1.5}}>{c.note}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{marginBottom:28}}>
              <h2 style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><Home style={{color:'#2E7D32'}}/> Home &amp; everyday life</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16}}>
                {[
                  {icon:<Lightbulb/>,n:fmtBig(equivData.led_years),    unit:'LED bulb-switches',     note:'Switching one 60 W incandescent to 10 W LED saves ~50 kWh/yr each.'},
                  {icon:<Activity/>, n:fmtBig(equivData.phone_charges), unit:'smartphone charges',    note:'Full charge of a modern smartphone at ~12 Wh each.'},
                  {icon:<Monitor/>,  n:fmtBig(equivData.stream_hours),  unit:'hours of TV streaming', note:'TV device consumes ~100 W. Equivalent screen time.'},
                  {icon:<Coffee/>,   n:fmtBig(equivData.tea_cups),      unit:'cups of tea or coffee', note:'Boiling 250 ml in a kettle uses ~0.025 kWh per cup.'},
                  {icon:<Cpu/>,      n:fmtBig(equivData.laptop_days),   unit:'laptop working days',   note:'30 W laptop × 8 h/day = 0.24 kWh/day average.'},
                ].map((c,i)=>(
                  <div key={i} className="card" style={{textAlign:'center',padding:'20px 16px'}}>
                    <div style={{color:'#26A69A',marginBottom:6}}>{c.icon}</div>
                    <div style={{fontSize:34,fontWeight:900,color:'#1b5e20',lineHeight:1.1}}>{c.n}</div>
                    <div style={{fontWeight:700,fontSize:13,color:'#263238',margin:'6px 0'}}>{c.unit}</div>
                    <div style={{fontSize:11,color:'#607d66',lineHeight:1.5}}>{c.note}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{marginBottom:28}}>
              <h2 style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><TreePine style={{color:'#2E7D32'}}/> Nature &amp; carbon sinks</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16}}>
                {[
                  {icon:<TreePine/>,n:fmtBig(equivData.trees_year), unit:'trees absorbing CO₂ for 1 year', note:'One mature tree sequesters ~21 kgCO₂/yr (IPCC avg).'},
                  {icon:<Leaf/>,    n:fmtBig(equivData.forest_ha),  unit:'hectares of temperate forest',   note:'1 ha temperate forest sequesters ~5.5 tCO₂/yr (FAO).'},
                ].map((c,i)=>(
                  <div key={i} className="card" style={{textAlign:'center',padding:'20px 16px',background:'#f9fbe7'}}>
                    <div style={{color:'#33691e',marginBottom:6}}>{c.icon}</div>
                    <div style={{fontSize:34,fontWeight:900,color:'#1b5e20',lineHeight:1.1}}>{c.n}</div>
                    <div style={{fontWeight:700,fontSize:13,color:'#263238',margin:'6px 0'}}>{c.unit}</div>
                    <div style={{fontSize:11,color:'#607d66',lineHeight:1.5}}>{c.note}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{marginBottom:28}}>
              <h2 style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><Flame style={{color:'#c62828'}}/> Fossil fuel equivalent</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16}}>
                {[
                  {icon:<Droplets/>,n:fmtBig(equivData.barrels_oil), unit:'barrels of crude oil burned', note:'1 barrel crude oil combustion ≈ 430 kgCO₂e (EPA).'},
                  {icon:<Flame/>,   n:fmtBig(equivData.tonnes_coal), unit:'tonnes of coal burned',       note:'Bituminous coal ≈ 2,350 kgCO₂/tonne combustion (IPCC).'},
                ].map((c,i)=>(
                  <div key={i} className="card" style={{textAlign:'center',padding:'20px 16px',background:'#fff3e0'}}>
                    <div style={{color:'#e65100',marginBottom:6}}>{c.icon}</div>
                    <div style={{fontSize:34,fontWeight:900,color:'#bf360c',lineHeight:1.1}}>{c.n}</div>
                    <div style={{fontWeight:700,fontSize:13,color:'#263238',margin:'6px 0'}}>{c.unit}</div>
                    <div style={{fontSize:11,color:'#607d66',lineHeight:1.5}}>{c.note}</div>
                  </div>
                ))}
              </div>
            </section>

            <p className="note" style={{borderTop:'1px solid #c8e6c9',paddingTop:16}}>
              Sources: DEFRA 2023 (car emissions); ICAO 2023 (aviation); EEA 2023 (EU household energy); IPCC (coal &amp; forest carbon); EPA (crude oil); FAO (forest sequestration).
            </p>
          </section>

          {/* ── 1. Energy consumption ── */}
          <section id="dash-energy" className="aiSection" style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>1. Energy consumption</h2>
            <div className="cards">
              <Card icon={<Gauge/>}        title={`Total electricity ${dash.totals.label}`}  value={fmtKwh(dash.totals.kwh + landingAIKwh)}  sub={`All scanners, PACS, workstations${landingAIOpen?' and AI tools':''}.`} style={{gridColumn:'span 4'}}/>
              <Card icon={<Activity/>}     title={`Active scanning ${dash.totals.label}`}    value={fmtKwh(dash.totals.activeKwh)}            sub={`${dash.totals.activePct}% of total — energy during actual scan acquisition.`}/>
              <Card icon={<TrendingDown/>} title={`Idle + standby ${dash.totals.label}`}     value={fmtKwh(dash.totals.idleKwh)}              sub={`${dash.totals.idlePct}% of total — between scans and overnight. Primary optimisation target.`}/>
              <Card icon={<TrendingDown/>} title={`Avoidable idle ${dash.totals.label}`}     value={fmtKwh(dash.totals.idleWasteKwh)}         sub="Recoverable by standby / power-off policies."/>
              <Card icon={<Activity/>}     title="Energy per imaging scan"                   value={`${dash.totals.energyPerScan} kWh`}       sub="Total ÷ all scans. Use for modality benchmarking and protocol optimisation."/>
              {landingAIOpen && <Card icon={<Cpu/>} title={`AI tools estimate ${dash.totals.label}`} value={fmtKwh(landingAIKwh)} sub={`${landingAI.gpu} · ${landingAI.hoursPerDay} h/day · local PUE 1.5. For detailed analysis use the AI tab.`}/>}
            </div>
          </section>

          {/* ── 2. Carbon emissions ── */}
          <section id="dash-carbon" className="aiSection" style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>2. Carbon emissions — GHG Protocol scopes</h2>
            <p className="note" style={{marginBottom:12}}>Scope 1: direct fuel (estimated). Scope 2: purchased electricity (calculated). Scope 3: hardware embodied carbon + patient travel (estimated). All {dash.totals.label}.</p>
            <div className="cards">
              <Card icon={<Factory/>}    title="Scope 1 — Direct"          value={fmtCo2(dash.scopes.scope1Kg)}       sub="Backup generators, medical gas. Estimated 8% of Scope 2 (McKee 2024)."/>
              <Card icon={<Gauge/>}      title="Scope 2 — Electricity"     value={fmtCo2(dash.scopes.scope2Kg)}       sub={`Grid at ${dash.ci} kgCO₂e/kWh (${settings.region}). Primary measured scope.`}/>
              <Card icon={<Cpu/>}        title="Scope 3 — Embodied carbon" value={fmtCo2(dash.scopes.scope3EmbKg)}    sub="Hardware manufacturing amortised over lifespan. Extend lifetime to reduce."/>
              <Card icon={<Car/>}        title="Scope 3 — Patient travel"  value={fmtCo2(dash.scopes.scope3TravelKg)} sub={`${dash.scopes.imagingScans.toLocaleString()} scans × ${PATIENT_KM_RT} km avg round trip.`}/>
            </div>
            <section style={{marginTop:16}}>
              <h2>Scope 1 / 2 / 3 breakdown</h2>
              <Suspense fallback={<div style={{height:80}}/>}><Bar data={chartScopes} options={scopeBarOpts}/></Suspense>
              <p className="note" style={{marginTop:8}}>Patient travel typically dominates Scope 3 in clean-grid regions — reducing unnecessary scans cuts more carbon than efficiency measures alone. Absolute values shown in cards above.</p>
            </section>
          </section>

          {/* ── Charts ── */}
          <div id="dash-charts" className="aiSection charts" style={{marginTop:28}}>
            <section><h2>Energy by equipment</h2><Suspense fallback={<div style={{height:200}}/>}><Bar data={chartEnergy} options={energyBarOptions}/></Suspense></section>
            <section><h2>Carbon (Scope 2) by equipment</h2><Suspense fallback={<div style={{height:200}}/>}><Doughnut data={chartCo2}/></Suspense></section>
          </div>

          {/* ── 3. Infrastructure ── */}
          <section id="dash-infrastructure" className="aiSection" style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>3. Infrastructure and hardware</h2>
            <div className="cards">
              <Card icon={<Cpu/>}          title="Top idle waster"    value={dash.topOpportunities[0]?.equipment ?? '—'}          sub={`${fmtKwh(dash.topOpportunities[0]?.idleWasteKwh ?? 0)} avoidable idle${dash.totals.label}. Highest single-unit saving.`}/>
              <Card icon={<Activity/>}     title="Hardware lifespans" value="MRI 15 yr / CT 12 yr"                                sub="X-ray 10 yr, Ultrasound 7 yr. Extend to reduce Scope 3 embodied carbon."/>
              <Card icon={<TrendingDown/>} title="Carbon intensity"   value={`${dash.ci} kgCO₂e/kWh`}                            sub={`${settings.region} grid. Move to renewable tariff or lower-carbon region to cut Scope 2.`}/>
              <Card icon={<Gauge/>}        title="Scope 3 total"      value={fmtCo2(dash.scopes.scope3Kg)}                       sub="Embodied + patient travel combined. Often larger than Scope 2 in a full lifecycle view."/>
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
          <section id="dash-resources" className="aiSection" style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>4. Resource footprint</h2>
            <p className="note" style={{marginBottom:12}}>Replace defaults with procurement records, waste manifests, and water bills for publication-quality figures.</p>
            <div className="cards">
              <Card icon={<Droplets/>} title={`Water footprint ${dash.totals.label}`}      value={fmtL(dash.resources.waterLitres)}  sub={`${WATER_PER_KWH} L/kWh cooling estimate. Google Cloud 0.45 L/kWh; local servers ~2 L/kWh.`}/>
              <Card icon={<FileText/>} title={`Paper consumption ${dash.totals.label}`}    value={`${dash.resources.paperKg} kg`}    sub={`~${PAPER_G_PER_ENC}g/encounter digital workflow. Full film-based: ~200g. (ESR Green Imaging)`}/>
              <Card icon={<Trash2/>}   title={`Hazardous waste ${dash.totals.label}`}      value={`${dash.resources.hazardousKg} kg`} sub="Contrast media disposal, sharps. Replace with waste manifest data."/>
              <Card icon={<Leaf/>}     title={`Total Scope 2 carbon ${dash.totals.label}`} value={fmtCo2(dash.scopes.scope2Kg)}      sub="All electricity-derived emissions. Primary target for renewable energy procurement."/>
            </div>
          </section>
        </main>
      )}

      {/* ── Equivalencies ── */}
      {/* ── AI ── */}
      {page==='ai' && (
        <main>
          <h1>AI sustainability dashboard <span className="badge">{settings.region}</span></h1>
          <p className="note" style={{marginBottom:16}}>Recycling Pyramid priority: Prevent unnecessary scans → Reduce scan energy → Recover/recycle prior data. (Implementation Guide §1)</p>

          {/* ── Sticky controls: selectors + summary bar + tabs ── */}
          <div className="stickyControls">
            <div className="grid">
              <Sel label="Architecture"        value={scen.architecture}  options={META.architectures}   onChange={v=>setS('architecture',v)}/>
              <Sel label="Model size"          value={scen.modelSize}     options={META.modelSizes}      onChange={v=>setS('modelSize',v)}/>
              <Sel label="Precision / AMP"     value={scen.precision}     options={META.precisions}      onChange={v=>setS('precision',v)}/>
              <Sel label="Cloud / deployment"  value={scen.cloudProvider} options={META.cloudProviders}  onChange={v=>setS('cloudProvider',v)}/>
            </div>
            <div className="aiSummary">
              <span>Net impact <b style={{color: ai.netKgCo2e < 0 ? '#2E7D32' : '#c62828'}}>{ai.netKgCo2e} kgCO₂e/mo</b></span>
              <span>Efficiency <b>{ai.efficiencyRatio} acc%/kWh</b></span>
              <span>Cloud CI <b>{ai.cloudCi} kgCO₂e/kWh</b></span>
            </div>
            <div className="aiTabs">
              {[['model','Model'],['training','Training'],['testing','Testing'],['inference','Inference'],['carbon','Carbon'],['clinical','Clinical'],['benchmarks','Benchmarks']].map(([id,label])=>(
                <button key={id} className={aiTab===id?'on':''} onClick={()=>{
                  setAiTab(id);
                  document.getElementById('ai-'+id)?.scrollIntoView({behavior:'smooth',block:'start'});
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* ── Model details ── */}
          <section id="ai-model" className="aiSection" style={{background:'none',boxShadow:'none',padding:0}}>
            <h2 style={{marginBottom:12}}>Model details</h2>
            <div className="cards">
              <Card icon={<Brain/>}      title="Architecture"         value={scen.architecture}                         sub={ai.archDesc}/>
              <Card icon={<Cpu/>}        title="Model size"           value={scen.modelSize}                            sub={`~${AI_MODELS[scen.modelSize].trainMwh * 1000} kWh to train. Accuracy: ${rnd(ai.accuracy*100,0)}%.`}/>
              <Card icon={<Target/>}     title="Accuracy"             value={`${rnd(ai.accuracy*100,0)}%`}              sub="Diagnostic accuracy on hold-out test set. Larger models gain marginally at high energy cost."/>
              <Card icon={<BarChart3/>}  title="Efficiency ratio"     value={`${ai.efficiencyRatio} acc%/kWh`}          sub="Accuracy % per monthly inference kWh. Use to compare architectures and model sizes. (Green AI metric)"/>
            </div>
          </section>

          {/* ── Phase 1: Training ── */}
          <section id="ai-training" className="aiSection" style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
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
          <section id="ai-testing" className="aiSection" style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>Phase 2 — Testing and validation</h2>
            <p className="note" style={{marginBottom:12}}>One-time hold-out inference run. Proxy: DLP / CTDIvol correlate with net scan energy R²=0.87–0.92 (Schoen et al.), enabling energy inference from dose reports.</p>
            <div className="cards">
              <Card icon={<Zap/>}        title="Test set energy"          value={`${ai.testing.kwhTotal} kWh`}                   sub={`${ai.testing.studies} studies. One-time cost; small fraction of training energy.`}/>
              <Card icon={<Leaf/>}       title="Test set CO₂e"            value={`${ai.testing.kgCo2e} kgCO₂e`}                 sub={`At ${ai.cloudCi} kgCO₂e/kWh. Include in model carbon disclosure.`}/>
              <Card icon={<Target/>}     title="Test set size"            value={`${ai.testing.studies} studies`}               sub="Default hold-out set. Larger sets improve accuracy estimates but increase energy cost."/>
              <Card icon={<BarChart3/>}  title="Precision mode"           value={scen.precision}                                 sub={`AMP (float16) saves ${ai.ampSavingPct}% inference energy with minimal accuracy loss. Apply to both test and inference.`}/>
            </div>
          </section>

          {/* ── Phase 3: Inference ── */}
          <section id="ai-inference" className="aiSection" style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>Phase 3 — Inference and deployment</h2>
            <p className="note" style={{marginBottom:12}}>Inference scales with every study — this dominates the AI lifecycle energy cost. MRI cooling adds +45% to scanner energy during active acquisition (Heye/Vosshenrich). (Implementation Guide §4 · Metric 2)</p>
            <div className="cards">
              <Card icon={<Activity/>}   title="Energy per study"         value={`${ai.inference.kwhPerStudy} kWh`}              sub="Per-inference energy including PUE and AMP factor. Scales with every request."/>
              <Card icon={<Zap/>}        title="Monthly inference energy" value={`${ai.inference.kwhMonthly} kWh`}               sub={`Across ${ai.inference.studies.toLocaleString()} studies/month at ${scen.cloudProvider}.`}/>
              <Card icon={<Gauge/>}      title="Lifetime inference total" value={`${ai.inference.kwhLifetime.toLocaleString()} kWh`} sub="36-month deployment. Inference typically exceeds training energy within 1–3 months."/>
              <Card icon={<Droplets/>}   title="Monthly water footprint"  value={`${ai.waterLitres} L`}                          sub={`${WATER_PER_KWH} L/kWh cooling estimate. Often overlooked environmental cost.`}/>
            </div>
          </section>

          {/* ── Carbon ── */}
          <section id="ai-carbon" className="aiSection" style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
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

          {/* ── Clinical ── */}
          <section id="ai-clinical" className="aiSection" style={{background:'none',boxShadow:'none',padding:0,marginTop:28}}>
            <h2 style={{marginBottom:12}}>Clinical sustainability co-benefits</h2>
            <p className="note" style={{marginBottom:12}}>Unnecessary imaging estimated at 20–50% of all scans (Implementation Guide §1). AI decision support targets the Prevent tier of the Recycling Pyramid.</p>
            <div className="cards">
              <Card icon={<TrendingDown/>} title="Scan time reduction"        value={`${ai.scanTimeReductPct}%`}                sub={`AI reconstruction/denoising. Saves ${ai.scanEnergySaved} kWh/month in scanner energy. (Radiol 2023: 45–89% range)`}/>
              <Card icon={<Leaf/>}         title="Low-value imaging avoided"  value={`${ai.lowValueReductPct}%`}               sub={`~${ai.scansAvoided} scans/month avoided. Reduces energy, contrast waste, and data storage. (McKee 2024: up to 20%)`}/>
              <Card icon={<Zap/>}          title="Scanner energy saved/month" value={`${ai.scanEnergySaved} kWh`}              sub="Direct hardware energy saving from shorter protocols and avoided acquisitions."/>
              <Card icon={<AlertTriangle/>} title="Rebound effect risk"        value={ai.reboundRisk}                          sub="Faster reads may induce more scan orders, cancelling gains. Monitor scan volume after deployment. (Implementation Guide §4)"/>
            </div>
          </section>

          {/* ── Benchmarks ── */}
          <section id="ai-benchmarks" className="aiSection" style={{marginTop:28}}>
            <h2>Modality energy benchmarks</h2>
            <p className="note" style={{marginBottom:12}}>Annual reference values from Vosshenrich et al. Idle state accounts for 50–66% of total energy (Schoen et al.: idle offers 14.9× more savings potential than active state).</p>
            <div className="row" style={{fontWeight:700,color:'#2E7D32'}}><span>Modality</span><span>kWh / year</span><span style={{fontSize:12}}>Note</span></div>
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

      {/* ── Cloud Carbon Tracker ── */}
      {page==='cloudtrack' && (
        <main>
          <h1>Cloud carbon tracker <span className="badge">{cloudTracker.provider}</span></h1>
          <p className="note" style={{marginBottom:24}}>
            Track the carbon footprint of your cloud infrastructure workload-by-workload — compute, storage, and data transfer.
            Inspired by <a href="https://www.cloudcarbonfootprint.org/" style={{color:'#2E7D32'}} target="_blank" rel="noreferrer">Cloud Carbon Footprint</a>.
            Select a provider and region to get per-region grid intensities; add workloads below.
          </p>

          {/* ── Sticky summary ── */}
          <div className="stickyControls" style={{marginBottom:24}}>
            <div className="aiSummary">
              <span>Total energy <b>{fmtKwh(cloudResult.totalKwh)} / mo</b></span>
              <span>Total CO₂ <b style={{color: cloudResult.totalCo2 > 0 ? '#c62828' : '#2E7D32'}}>{fmtCo2(cloudResult.totalCo2)} / mo</b></span>
              <span>Grid CI <b>{cloudResult.regionCi} kgCO₂e/kWh</b></span>
              <span>PUE <b>{cloudResult.pue}</b></span>
              {cloudResult.renewable > 0 && <span>Renewables <b>{cloudResult.renewable}%</b></span>}
            </div>
          </div>

          {/* ── Configuration ── */}
          <div className="inputSummary" style={{marginBottom:20}}>
            <h2 style={{marginTop:0, marginBottom:14, color:'#1b5e20'}}>Provider &amp; region</h2>
            <div className="grid grid3">
              <label>
                Cloud provider
                <select value={cloudTracker.provider} onChange={e => {
                  const prov = e.target.value;
                  const firstRegion = Object.keys(CLOUD_REGIONS[prov]?.regions ?? {})[0] ?? '';
                  setCloudTracker(t => ({...t, provider: prov, region: firstRegion}));
                }}>
                  {Object.keys(CLOUD_REGIONS).map(p => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label>
                Region <span style={{fontWeight:400, fontSize:12, color:'#607d66'}}>— sets grid carbon intensity</span>
                <select value={cloudTracker.region} onChange={e => setCloud('region', e.target.value)}>
                  {Object.entries(CLOUD_REGIONS[cloudTracker.provider]?.regions ?? {}).map(([name, ci]) => (
                    <option key={name} value={name}>{name} — {ci} kgCO₂e/kWh</option>
                  ))}
                </select>
              </label>
              <label>
                Renewable energy (%)
                <input type="number" min="0" max="100" value={cloudTracker.renewablePct} onChange={e => setCloud('renewablePct', e.target.value)} placeholder="0–100"/>
              </label>
            </div>
            <p className="note" style={{marginTop:8}}>
              Effective CI: <strong>{cloudResult.ci} kgCO₂e/kWh</strong>
              {cloudResult.renewable > 0 && <> (after {cloudResult.renewable}% renewable adjustment)</>}.
              {' '}PUE: <strong>{cloudResult.pue}</strong> ({cloudTracker.provider} {cloudTracker.provider === 'Google Cloud' ? '— industry-leading efficiency' : 'global fleet average'}).
            </p>
          </div>

          {/* ── Compute workloads ── */}
          <div className="inputSummary" style={{marginBottom:20}}>
            <h2 style={{marginTop:0, marginBottom:14, color:'#1b5e20', display:'flex', alignItems:'center', gap:8}}><Server style={{width:20,height:20}}/> Compute workloads</h2>
            <p className="note" style={{marginBottom:12}}>Add each instance type separately. Hours/month max 744 (31 days × 24 h). GPU instances assume 100% utilisation; CPU at 50% avg.</p>

            {/* Column headers */}
            <div style={{display:'grid', gridTemplateColumns:'1.4fr 2.4fr 0.5fr 0.7fr 0.7fr 0.7fr 32px', gap:8, padding:'0 0 6px', borderBottom:'1px solid #c8e6c9', fontSize:11, fontWeight:700, color:'#607d66'}}>
              <span>Workload label</span><span>Instance type</span><span>Count</span><span>h/month</span><span>kWh/mo</span><span>kgCO₂e/mo</span><span/>
            </div>

            {cloudResult.computeResults.map((res) => (
              <div key={res.id} style={{display:'grid', gridTemplateColumns:'1.4fr 2.4fr 0.5fr 0.7fr 0.7fr 0.7fr 32px', gap:8, padding:'8px 0', borderBottom:'1px solid #eef7ee', alignItems:'center'}}>
                <input
                  value={res.label} placeholder="e.g. AI training"
                  onChange={e => updateComputeLine(res.id, 'label', e.target.value)}
                  style={{padding:'6px 10px', borderRadius:10, border:'1px solid #c8e6c9', fontSize:13}}
                />
                <div>
                  <select value={res.instance} onChange={e => updateComputeLine(res.id, 'instance', e.target.value)} style={{width:'100%', padding:'6px 8px', borderRadius:10, border:'1px solid #c8e6c9', fontSize:12}}>
                    {Object.entries(CLOUD_INSTANCES).map(([name]) => <option key={name}>{name}</option>)}
                  </select>
                  {res.instance === 'Custom (enter watts)' && (
                    <input type="number" min="0" value={res.customWatt} placeholder="Watts" onChange={e => updateComputeLine(res.id, 'customWatt', e.target.value)} style={{marginTop:4, width:'100%', padding:'4px 8px', borderRadius:8, border:'1px solid #c8e6c9', fontSize:12}}/>
                  )}
                  <div style={{fontSize:10, color:'#607d66', marginTop:2}}>{CLOUD_INSTANCES[res.instance]?.desc}</div>
                </div>
                <input type="number" min="0" value={res.count} onChange={e => updateComputeLine(res.id, 'count', e.target.value)} style={{padding:'6px 8px', borderRadius:10, border:'1px solid #c8e6c9', fontSize:13, textAlign:'center'}}/>
                <input type="number" min="0" max="744" value={res.hoursPerMonth} onChange={e => updateComputeLine(res.id, 'hoursPerMonth', e.target.value)} style={{padding:'6px 8px', borderRadius:10, border:'1px solid #c8e6c9', fontSize:13, textAlign:'center'}}/>
                <span style={{fontWeight:700, color:'#263238', fontSize:13}}>{fmtKwh(res.pueKwh)}</span>
                <span style={{fontWeight:700, color:'#c62828', fontSize:13}}>{fmtCo2(res.co2)}</span>
                <button onClick={() => removeComputeLine(res.id)} title="Remove" style={{background:'none', color:'#aaa', padding:4, borderRadius:8, boxShadow:'none', lineHeight:1}}>
                  <Trash2 style={{width:15,height:15}}/>
                </button>
              </div>
            ))}

            <button onClick={addComputeLine} style={{marginTop:12, background:'#e8f5e9', color:'#2E7D32', boxShadow:'none', border:'1px dashed #a5d6a7', padding:'8px 16px', fontSize:13, display:'flex', alignItems:'center', gap:6}}>
              <Plus style={{width:15,height:15}}/> Add compute workload
            </button>
          </div>

          {/* ── Storage ── */}
          <div className="inputSummary" style={{marginBottom:20}}>
            <h2 style={{marginTop:0, marginBottom:14, color:'#1b5e20', display:'flex', alignItems:'center', gap:8}}><Database style={{width:20,height:20}}/> Storage</h2>
            <p className="note" style={{marginBottom:12}}>Enter provisioned TB. Energy is calculated for 720 h/month regardless of access pattern.</p>

            <div style={{display:'grid', gridTemplateColumns:'1.4fr 2fr 0.8fr 0.8fr 0.8fr 32px', gap:8, padding:'0 0 6px', borderBottom:'1px solid #c8e6c9', fontSize:11, fontWeight:700, color:'#607d66'}}>
              <span>Label</span><span>Storage type</span><span>TB</span><span>kWh/mo</span><span>kgCO₂e/mo</span><span/>
            </div>

            {cloudResult.storageResults.map((res) => (
              <div key={res.id} style={{display:'grid', gridTemplateColumns:'1.4fr 2fr 0.8fr 0.8fr 0.8fr 32px', gap:8, padding:'8px 0', borderBottom:'1px solid #eef7ee', alignItems:'center'}}>
                <input
                  value={res.label} placeholder="e.g. PACS archive"
                  onChange={e => updateStorageLine(res.id, 'label', e.target.value)}
                  style={{padding:'6px 10px', borderRadius:10, border:'1px solid #c8e6c9', fontSize:13}}
                />
                <select value={res.type} onChange={e => updateStorageLine(res.id, 'type', e.target.value)} style={{padding:'6px 8px', borderRadius:10, border:'1px solid #c8e6c9', fontSize:12}}>
                  {Object.keys(STORAGE_WH_PER_TB_HR).map(t => <option key={t}>{t}</option>)}
                </select>
                <input type="number" min="0" step="0.1" value={res.tb} onChange={e => updateStorageLine(res.id, 'tb', e.target.value)} style={{padding:'6px 8px', borderRadius:10, border:'1px solid #c8e6c9', fontSize:13, textAlign:'center'}}/>
                <span style={{fontWeight:700, color:'#263238', fontSize:13}}>{fmtKwh(res.pueKwh)}</span>
                <span style={{fontWeight:700, color:'#c62828', fontSize:13}}>{fmtCo2(res.co2)}</span>
                <button onClick={() => removeStorageLine(res.id)} title="Remove" style={{background:'none', color:'#aaa', padding:4, borderRadius:8, boxShadow:'none', lineHeight:1}}>
                  <Trash2 style={{width:15,height:15}}/>
                </button>
              </div>
            ))}

            <button onClick={addStorageLine} style={{marginTop:12, background:'#e8f5e9', color:'#2E7D32', boxShadow:'none', border:'1px dashed #a5d6a7', padding:'8px 16px', fontSize:13, display:'flex', alignItems:'center', gap:6}}>
              <Plus style={{width:15,height:15}}/> Add storage
            </button>
          </div>

          {/* ── Networking ── */}
          <div className="inputSummary" style={{marginBottom:28}}>
            <h2 style={{marginTop:0, marginBottom:14, color:'#1b5e20', display:'flex', alignItems:'center', gap:8}}><Wifi style={{width:20,height:20}}/> Data transfer</h2>
            <div style={{display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-end'}}>
              <label style={{maxWidth:220}}>
                Outbound data transfer (GB / month)
                <input type="number" min="0" value={cloudTracker.networkingGb} onChange={e => setCloud('networkingGb', e.target.value)} placeholder="e.g. 500"/>
              </label>
              <div style={{paddingBottom:8}}>
                <span style={{fontWeight:700, color:'#263238'}}>{fmtKwh(cloudResult.netKwh)}</span>
                <span style={{color:'#607d66', fontSize:13}}> → </span>
                <span style={{fontWeight:700, color:'#c62828'}}>{fmtCo2(cloudResult.netCo2)}</span>
              </div>
            </div>
            <p className="note" style={{marginTop:8}}>0.001 kWh/GB fixed-line data centre average (Aslan et al. 2018). Excludes last-mile and end-user device energy.</p>
          </div>

          {/* ── Results cards ── */}
          <h2>Monthly totals</h2>
          <div className="cards" style={{marginBottom:28}}>
            <section className="card" style={{gridColumn:'span 2'}}>
              <div className="cardHead"><Zap/><span>Total energy / month</span></div>
              <b>{fmtKwh(cloudResult.totalKwh)}</b>
              <p>Compute {fmtKwh(cloudResult.totalComputeKwh)} · Storage {fmtKwh(cloudResult.totalStorageKwh)} · Network {fmtKwh(cloudResult.netKwh)}</p>
            </section>
            <section className="card" style={{gridColumn:'span 2'}}>
              <div className="cardHead"><Leaf/><span>Total CO₂e / month</span></div>
              <b style={{color: cloudResult.totalCo2 > 0 ? '#c62828' : '#2E7D32'}}>{fmtCo2(cloudResult.totalCo2)}</b>
              <p>At {cloudResult.ci} kgCO₂e/kWh effective CI · PUE {cloudResult.pue}</p>
            </section>
            <Card icon={<Server/>} title="Compute" value={fmtKwh(cloudResult.totalComputeKwh)} sub={`${fmtCo2(cloudResult.computeResults.reduce((s,r)=>s+r.co2,0))} · ${cloudResult.computeResults.length} workload${cloudResult.computeResults.length!==1?'s':''}`}/>
            <Card icon={<HardDrive/>} title="Storage" value={fmtKwh(cloudResult.totalStorageKwh)} sub={`${fmtCo2(cloudResult.storageResults.reduce((s,r)=>s+r.co2,0))} · ${cloudResult.storageResults.reduce((s,r)=>s+(parseFloat(r.tb)||0),0).toFixed(1)} TB`}/>
            <Card icon={<Wifi/>} title="Data transfer" value={`${cloudResult.netGb.toLocaleString()} GB`} sub={`${fmtKwh(cloudResult.netKwh)} · ${fmtCo2(cloudResult.netCo2)}`}/>
            <Card icon={<TreePine/>} title="Trees to offset" value={Math.round(cloudResult.totalCo2 / 21).toLocaleString()} sub="Trees growing for 1 year to absorb this CO₂ at ~21 kgCO₂/yr each."/>
          </div>

          {/* ── Optimisation ── */}
          <section className="aiSection" style={{marginBottom:28}}>
            <h2 style={{marginBottom:8, display:'flex', alignItems:'center', gap:8}}><Globe style={{color:'#2E7D32'}}/> Regional optimisation</h2>
            <p className="note" style={{marginBottom:16}}>
              Same workload, different grid. Moving to a lower-carbon region costs nothing in compute but can cut operational CO₂ dramatically.
              {!cloudResult.isBestRegion && <> Best in {cloudTracker.provider}: <strong>{cloudResult.bestSame.name}</strong> → saves <strong style={{color:'#2E7D32'}}>{cloudResult.bestSame.saving}%</strong> ({fmtCo2(cloudResult.bestSame.co2)}/mo vs {fmtCo2(cloudResult.totalCo2)}/mo).</>}
              {cloudResult.isBestRegion && <> <strong>You are already in the lowest-carbon region for {cloudTracker.provider}.</strong></>}
            </p>

            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:12}}>
              {cloudResult.crossProvider.map((row, i) => {
                const isCurrentProv = row.isCurrent;
                const isBest = i === 0;
                return (
                  <div key={row.provider} style={{
                    background: isBest ? '#e8f5e9' : isCurrentProv ? '#f5f5f5' : 'white',
                    border: isBest ? '2px solid #2E7D32' : isCurrentProv ? '2px solid #90a4ae' : '1px solid #e0e0e0',
                    borderRadius:16, padding:'16px 20px',
                  }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                      <span style={{fontWeight:700, color: isBest ? '#1b5e20' : '#263238', fontSize:14}}>
                        {isBest && '★ '}{row.label}
                        {isCurrentProv && <span className="badge" style={{marginLeft:8}}>current</span>}
                      </span>
                      <span style={{fontWeight:900, color: isBest ? '#1b5e20' : '#c62828', fontSize:18}}>{fmtCo2(row.co2Est)}</span>
                    </div>
                    <div style={{fontSize:12, color:'#607d66'}}>Best region: <strong>{row.bestRegion}</strong></div>
                    <div style={{fontSize:12, color:'#607d66'}}>Grid CI: {row.ci} kgCO₂e/kWh · PUE {row.pue}</div>
                    {cloudResult.totalCo2 > 0 && row.saving !== 0 && (
                      <div style={{marginTop:8, fontWeight:700, color: row.saving > 0 ? '#2E7D32' : '#c62828', fontSize:13}}>
                        {row.saving > 0 ? `−${row.saving}% vs current` : `+${Math.abs(row.saving)}% vs current`}
                      </div>
                    )}
                    {row.saving === 0 && isCurrentProv && (
                      <div style={{marginTop:8, fontSize:12, color:'#607d66'}}>— current setup</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <p className="note" style={{borderTop:'1px solid #c8e6c9', paddingTop:16}}>
            Sources: Cloud Carbon Footprint methodology (cloudcarbonfootprint.org); Electricity Maps 2023 annual averages;
            AWS 2023 / Azure 2023 / GCP 2023 sustainability reports; Masanet et al. 2020 (Science); Aslan et al. 2018.
            Grid CI values are annual averages — use real-time data from Electricity Maps or provider carbon dashboards for hourly accuracy.
          </p>
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
            <section><h2>Before vs after</h2><Suspense fallback={<div style={{height:200}}/>}><Bar data={chartScenario}/></Suspense></section>
          </div>
          <p className="note" style={{marginTop:12}}>Region: {settings.region} — {settings.timePeriod} figures. Change region or time period on the Input page.</p>
        </main>
      )}

      {/* ── Eco-label ── */}
      {page==='ecolabel' && (
        <main>
          <h1>Eco-label generator</h1>
          <p className="note" style={{marginBottom:8}}>
            Enter your model's actual training metrics to generate a standardised sustainability label for paper or conference submission.
            Fields align with the AI environmental reporting framework recommended in Doo FX et al. <em>Radiology</em> 2024 (DOI 10.1148/radiol.232030).
          </p>
          <p className="note" style={{marginBottom:24}}>
            Measure training energy with <a href="https://codecarbon.io/" style={{color:'#2E7D32'}} target="_blank" rel="noreferrer">CodeCarbon</a>, <code>nvidia-smi</code>, or your cloud provider's carbon dashboard for the most accurate figures.
          </p>

          {/* ── Form ── */}
          <div className="inputSummary" style={{marginBottom:24}}>
            <h2 style={{marginTop:0, marginBottom:16, color:'#1b5e20'}}>Model &amp; task</h2>
            <div className="grid grid3">
              <label>
                Project / model name
                <input type="text" value={ecoLabel.projectName} onChange={e=>setEco('projectName',e.target.value)} placeholder="e.g. CXR-Net lung nodule detector"/>
              </label>
              <Sel label="Task type" value={ecoLabel.taskType} options={META.taskTypes} onChange={v=>setEco('taskType',v)}/>
              <label>
                Architecture (free text)
                <input type="text" value={ecoLabel.architecture} onChange={e=>setEco('architecture',e.target.value)} placeholder="e.g. EfficientNet-B4"/>
              </label>
              <label>
                Parameters (millions)
                <input type="number" min="0" value={ecoLabel.paramsMillion} onChange={e=>setEco('paramsMillion',e.target.value)} placeholder="e.g. 19"/>
              </label>
              <label>
                Training dataset (studies / images)
                <input type="number" min="0" value={ecoLabel.datasetSize} onChange={e=>setEco('datasetSize',e.target.value)} placeholder="e.g. 45000"/>
              </label>
            </div>
          </div>

          <div className="inputSummary" style={{marginBottom:24}}>
            <h2 style={{marginTop:0, marginBottom:16, color:'#1b5e20'}}>Training compute</h2>
            <div className="grid grid3">
              <Sel label="GPU model" value={ecoLabel.gpuModel} options={META.gpuModels} onChange={v=>setEco('gpuModel',v)}/>
              {ecoLabel.gpuModel === 'Custom (enter TDP below)' && (
                <label>
                  GPU TDP (Watts)
                  <input type="number" min="1" value={ecoLabel.customTdpW} onChange={e=>setEco('customTdpW',e.target.value)} placeholder="e.g. 350"/>
                </label>
              )}
              <label>
                Number of GPUs
                <input type="number" min="1" value={ecoLabel.gpuCount} onChange={e=>setEco('gpuCount',e.target.value)} placeholder="e.g. 4"/>
              </label>
              <label>
                Training hours per run
                <input type="number" min="0" step="0.1" value={ecoLabel.trainingHoursPerRun} onChange={e=>setEco('trainingHoursPerRun',e.target.value)} placeholder="e.g. 18"/>
              </label>
              <label>
                Number of training runs / experiments
                <input type="number" min="1" value={ecoLabel.numRuns} onChange={e=>setEco('numRuns',e.target.value)} placeholder="e.g. 12"/>
              </label>
            </div>
            <div style={{marginTop:16}}>
              <label style={{flexDirection:'row', alignItems:'center', gap:12, fontWeight:400, color:'#263238', cursor:'pointer'}}>
                <input type="checkbox" checked={ecoLabel.energyMeasured} onChange={e=>setEco('energyMeasured',e.target.checked)} style={{width:18,height:18,accentColor:'#2E7D32'}}/>
                I measured energy directly (CodeCarbon / nvidia-smi) — enter kWh per run below
              </label>
              {ecoLabel.energyMeasured && (
                <div style={{marginTop:12, maxWidth:320}}>
                  <label>
                    Measured energy per run (kWh)
                    <input type="number" min="0" step="0.01" value={ecoLabel.energyKwhPerRun} onChange={e=>setEco('energyKwhPerRun',e.target.value)} placeholder="e.g. 24.0"/>
                  </label>
                </div>
              )}
              {!ecoLabel.energyMeasured && (
                <p className="note" style={{marginTop:8}}>
                  Energy estimated from GPU TDP × count × hours × PUE. Use measured values for higher accuracy.
                </p>
              )}
            </div>
          </div>

          <div className="inputSummary" style={{marginBottom:24}}>
            <h2 style={{marginTop:0, marginBottom:16, color:'#1b5e20'}}>Deployment context</h2>
            <div className="grid grid3">
              <Sel label="Compute provider" value={ecoLabel.cloudProvider} options={META.cloudProviders} onChange={v=>setEco('cloudProvider',v)}/>
              <Sel label="Grid region" value={ecoLabel.region} options={META.regions} onChange={v=>setEco('region',v)}/>
              <label>
                Renewable energy (%)
                <input type="number" min="0" max="100" value={ecoLabel.renewablePct} onChange={e=>setEco('renewablePct',e.target.value)} placeholder="0–100"/>
              </label>
            </div>
            <p className="note" style={{marginTop:8}}>Renewable energy % reduces the effective carbon intensity. Set to 100 for green tariff or matched renewable certificates (RECs).</p>
          </div>

          <div className="inputSummary" style={{marginBottom:32}}>
            <h2 style={{marginTop:0, marginBottom:16, color:'#1b5e20'}}>Inference / deployment <span style={{fontWeight:400,fontSize:14,color:'#607d66'}}>(optional)</span></h2>
            <div className="grid grid3">
              <label>
                Monthly study volume
                <input type="number" min="0" value={ecoLabel.inferStudiesMonth} onChange={e=>setEco('inferStudiesMonth',e.target.value)} placeholder="e.g. 1200"/>
              </label>
              <label>
                Inference energy per study (kWh)
                <input type="number" min="0" step="0.0001" value={ecoLabel.inferKwhPerStudy} onChange={e=>setEco('inferKwhPerStudy',e.target.value)} placeholder="e.g. 0.004"/>
              </label>
            </div>
          </div>

          {/* ── Preview ── */}
          <h2>Label preview</h2>
          <div style={{display:'flex', gap:28, flexWrap:'wrap', alignItems:'flex-start', marginBottom:32}}>
            {/* Visual card */}
            <div style={{background:'white', border:'2px solid #2E7D32', borderRadius:14, overflow:'hidden', minWidth:320, maxWidth:510, fontFamily:'Inter,sans-serif', boxShadow:'0 8px 30px #1b5e2020', flexShrink:0}}>
              <div style={{background:'#1b5e20', padding:'14px 18px'}}>
                <div style={{color:'white', fontWeight:700, fontSize:16, display:'flex', alignItems:'center', gap:8}}>
                  <Leaf style={{width:16,height:16}}/> EcoRad Eco-label
                </div>
                <div style={{color:'#A5D6A7', fontSize:13, marginTop:4}}>{ecoLabelData.projectName}</div>
                <div style={{color:'#81C784', fontSize:11, marginTop:2}}>AI/ML Training Report · Radiology · {ecoLabelData.date}</div>
              </div>
              {[
                ['Task type',                ecoLabelData.taskType],
                ['Architecture',             ecoLabelData.architecture],
                ['Parameters',               ecoLabelData.paramsMillion],
                ['Training dataset',         ecoLabelData.datasetSize],
                ['GPU hardware',             ecoLabelData.gpuHardware],
                ['Training runs',            `${ecoLabelData.numRuns} experiment${ecoLabelData.numRuns > 1 ? 's' : ''}`],
                ['Total GPU-hours',          `${ecoLabelData.totalGpuHours} h`],
                ['Energy per run',           `${ecoLabelData.energyPerRunKwh} kWh${ecoLabelData.energyMeasured ? ' (measured)' : ' (est. from TDP)'}`],
                ['Total training energy',    `${ecoLabelData.totalEnergyKwh} kWh`],
                ['Training CO₂e',       `${ecoLabelData.trainCo2} kgCO₂e`],
                ['Renewable energy',         `${ecoLabelData.renewablePct}%`],
                ['Compute / PUE',            `${ecoLabelData.cloudProvider} · PUE ${ecoLabelData.pue}`],
                ['Grid region / CI',         `${ecoLabelData.region} · ${ecoLabelData.ci} kgCO₂e/kWh`],
                ['Water footprint',          `${ecoLabelData.waterLitres.toLocaleString()} L`],
                ...(ecoLabelData.hasInference ? [['Monthly inference', `${ecoLabelData.inferStudies.toLocaleString()} studies · ${ecoLabelData.inferMonthlyKwh} kWh · ${ecoLabelData.inferCo2Month} kgCO₂e`]] : []),
              ].map(([k, v], i) => (
                <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'7px 18px', background: i%2===0 ? '#f1f8f1' : 'white', fontSize:13, gap:12}}>
                  <span style={{color:'#607d66', flexShrink:0}}>{k}</span>
                  <span style={{fontWeight:700, color:'#263238', textAlign:'right'}}>{v}</span>
                </div>
              ))}
              <div style={{background:'#e8f5e9', padding:'8px 18px', fontSize:11, color:'#2E7D32'}}>
                Estimated with EcoRad · {ecoLabelData.date} · Doo et al. Radiology 2024 · CC BY 4.0
              </div>
            </div>

            {/* Actions */}
            <div style={{display:'flex', flexDirection:'column', gap:12, paddingTop:8}}>
              <button className="download" onClick={()=>downloadEcoPNG(ecoLabelData)}>
                <Download/> Download PNG badge
              </button>
              <button
                className="download"
                onClick={()=>{
                  navigator.clipboard.writeText(generateEcoMarkdown(ecoLabelData));
                  setEcoCopied(true);
                  setTimeout(()=>setEcoCopied(false), 2000);
                }}
                style={ecoCopied ? {background:'#26A69A'} : undefined}
              >
                <FileText/> {ecoCopied ? 'Copied!' : 'Copy markdown table'}
              </button>
              <p className="note" style={{maxWidth:220, fontSize:12, margin:0}}>
                PNG badge: embed in posters, slides, or PDF appendices.<br/><br/>
                Markdown table: paste into LaTeX supplementary files, GitHub READMEs, or preprint appendices.
              </p>
            </div>
          </div>

          {/* ── Markdown preview ── */}
          <section>
            <h2>Markdown table</h2>
            <pre style={{background:'#f1f8f1', borderRadius:14, padding:'16px 20px', fontSize:12, lineHeight:1.6, overflow:'auto', border:'1px solid #c8e6c9', fontFamily:'monospace', whiteSpace:'pre-wrap'}}>
              {generateEcoMarkdown(ecoLabelData)}
            </pre>
          </section>

          {/* ── Paper text ── */}
          <section style={{marginTop:24}}>
            <h2>Ready-to-paste paragraph</h2>
            <p className="note" style={{marginBottom:8}}>Copy this into a dedicated <strong>Environmental Impact</strong> section or supplementary material of your submission.</p>
            <pre style={{background:'#f1f8f1', borderRadius:14, padding:'16px 20px', fontSize:12, lineHeight:1.8, border:'1px solid #c8e6c9', fontFamily:'monospace', whiteSpace:'pre-wrap'}}>
              {`Environmental impact. ${ecoLabelData.projectName} was trained using ${ecoLabelData.gpuHardware} ` +
               `for ${ecoLabelData.totalGpuHours} GPU-hours across ${ecoLabelData.numRuns} experiment${ecoLabelData.numRuns>1?'s':''}. ` +
               `Total training energy consumption was ${ecoLabelData.totalEnergyKwh} kWh ` +
               `(${ecoLabelData.energyPerRunKwh} kWh per run${ecoLabelData.energyMeasured ? ', directly measured' : ', estimated from GPU TDP'}), ` +
               `with an estimated carbon footprint of ${ecoLabelData.trainCo2} kgCO₂e ` +
               `(${ecoLabelData.cloudProvider}; grid: ${ecoLabelData.region}, ${ecoLabelData.ci} kgCO₂e/kWh; ` +
               `renewable energy: ${ecoLabelData.renewablePct}%; PUE: ${ecoLabelData.pue}). ` +
               `The estimated cooling water footprint is ${ecoLabelData.waterLitres.toLocaleString()} L.` +
               (ecoLabelData.hasInference
                 ? ` Monthly inference for ${ecoLabelData.inferStudies.toLocaleString()} studies consumes ${ecoLabelData.inferMonthlyKwh} kWh (${ecoLabelData.inferCo2Month} kgCO₂e/month).`
                 : '') +
               ` Sustainability metrics were estimated using EcoRad (${ecoLabelData.date}), following the framework of Doo FX et al. (Radiology 2024, DOI: 10.1148/radiol.232030).`}
            </pre>
          </section>
        </main>
      )}

      <footer>
        <Logo dark/>
        <span>ESG-ready sustainability intelligence for academic hospitals, enterprise healthcare systems, radiology AI teams, and scientific reporting.</span>
        <a href="https://github.com/takinci/EcoRad/blob/main/sources.md" style={{color:'#A5D6A7',fontSize:13,whiteSpace:'nowrap'}} target="_blank" rel="noreferrer">All assumptions &amp; citations: sources.md</a>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App/>);

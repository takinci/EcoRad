import React, {useState, useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {Bar, Doughnut} from 'react-chartjs-2';
import {Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend} from 'chart.js';
import {Leaf, Brain, Download, Activity, Gauge, TrendingDown} from 'lucide-react';
import './styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// ── Reference tables ──────────────────────────────────────────────────────────

// kgCO₂e/kWh per region — Our World in Data (OWID), Carbon Intensity of Electricity, 2022-2023 national averages
// https://ourworldindata.org/grapher/carbon-intensity-electricity
// Replace with local utility/Eurostat data where available.
const CARBON_INTENSITY = {
  "Switzerland":    0.10, // hydro + nuclear dominant; OWID 2023
  "France":         0.06, // ~70 % nuclear; OWID 2023
  "Germany":        0.36, // coal/gas/renewable mix; OWID 2023
  "United States":  0.38, // national grid average; OWID 2023
  "United Kingdom": 0.20, // gas + offshore wind; OWID 2023
  "EU average":     0.25, // Eurostat/EEA mean; OWID 2023
  "Editable custom":0.30, // placeholder — replace with measured utility factor
};

const TIME_MULT = {Monthly: 1, Quarterly: 3, Annual: 12};
const TIME_LABEL = {Monthly: "/mo", Quarterly: "/qtr", Annual: "/yr"};

// Monthly power-mode data per equipment. All active_kw values are literature-derived defaults;
// replace with scanner logs, OEM data sheets, or smart-meter readings.
//
// MRI:  active 30 kW — Heye et al. JMRI 2023 (DOI: 10.1002/jmri.28994) reports mean 30.1 kW for 3T;
//        supported by Radiol 2024 (10.1148/radiol.243453) and EurRad 2024 (10.1007/s00330-024-11056-0).
//        idle ~50 % of active per Herrmann 2012 (Stanford PDF); standby ~15 kW via cryocooler load (Neurad 10.1016/j.neurad.2023.12.001).
// CT:   active 60 kW mid-range — Acra 2024 (10.1016/j.acra.2024.05.004) and CJRS 2022 (10.1177/08465371221133074)
//        report 40–80 kW for modern MDCT; AJR 2023 (10.2214/AJR.23.30189) confirms idle significance.
// X-ray/Ultrasound/PACS/WS: estimated from Radiol 2024 (10.1148/radiol.240398) multi-modality IT survey.
const EQUIPMENT_BASE = [
  {name:"MRI 3T A",              modality:"MRI",         active_kw:30,  idle_kw:15,  standby_kw:5,   off_kw:0.5,  active_h:160, idle_h:300, standby_h:250, off_h:34, avoidable_idle_h:120, scans:1200},
  {name:"CT Scanner A",          modality:"CT",          active_kw:60,  idle_kw:8,   standby_kw:3,   off_kw:0.2,  active_h:160, idle_h:300, standby_h:250, off_h:34, avoidable_idle_h:120, scans:1800},
  {name:"Digital X-ray Room",    modality:"X-ray",       active_kw:12,  idle_kw:2,   standby_kw:0.6, off_kw:0.1,  active_h:160, idle_h:300, standby_h:250, off_h:34, avoidable_idle_h:120, scans:2500},
  {name:"Ultrasound Fleet",      modality:"Ultrasound",  active_kw:1.5, idle_kw:0.4, standby_kw:0.1, off_kw:0.02, active_h:160, idle_h:300, standby_h:250, off_h:34, avoidable_idle_h:120, scans:2500},
  {name:"PACS Storage",          modality:"PACS/RIS",    active_kw:4,   idle_kw:4,   standby_kw:4,   off_kw:4,    active_h:160, idle_h:300, standby_h:250, off_h:34, avoidable_idle_h:120, scans:2500},
  {name:"Reporting Workstations", modality:"Workstation", active_kw:2,  idle_kw:0.8, standby_kw:0.2, off_kw:0.05, active_h:160, idle_h:300, standby_h:250, off_h:34, avoidable_idle_h:120, scans:2500},
];

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

const META = {
  profiles:     ["Hospital radiology", "Outpatient imaging center", "Research imaging lab", "Teleradiology / informatics-heavy workflow"],
  intendedUses: ["Estimate annual footprint", "Compare modalities", "Track monthly sustainability KPIs", "Evaluate AI tool impact", "Estimate savings from an intervention"],
  regions:      Object.keys(CARBON_INTENSITY),
  metricTypes:  ["Energy", "Carbon", "Water", "AI net impact"],
  timePeriods:  Object.keys(TIME_MULT),
  interventions:Object.keys(INTERVENTIONS),
  cloudProviders:Object.keys(CLOUD),
  scannerStates:["Active", "Idle", "Standby", "Off"],
};

// ── Calculation functions ─────────────────────────────────────────────────────
const rnd = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

function computeDashboard(region, timePeriod) {
  const ci = CARBON_INTENSITY[region] ?? 0.25;
  const mult = TIME_MULT[timePeriod] ?? 1;

  const byEquipment = EQUIPMENT_BASE.map(eq => {
    const kwh  = (eq.active_kw*eq.active_h + eq.idle_kw*eq.idle_h + eq.standby_kw*eq.standby_h + eq.off_kw*eq.off_h) * mult;
    const kgco2e       = kwh * ci;
    const idleWasteKwh = eq.idle_kw * eq.avoidable_idle_h * mult;
    const scans        = eq.scans * mult;
    return {equipment: eq.name, modality: eq.modality, kwh: rnd(kwh), kgco2e: rnd(kgco2e),
            scans, energyPerScan: rnd(kwh / scans, 3), idleWasteKwh: rnd(idleWasteKwh), confidence:"estimated"};
  });

  const totalKwh   = byEquipment.reduce((s, e) => s + e.kwh, 0);
  const totalCo2   = byEquipment.reduce((s, e) => s + e.kgco2e, 0);
  const totalScans = byEquipment.reduce((s, e) => s + e.scans, 0);
  const totalIdle  = byEquipment.reduce((s, e) => s + e.idleWasteKwh, 0);
  const label      = TIME_LABEL[timePeriod];

  return {
    byEquipment,
    topOpportunities: [...byEquipment].sort((a, b) => b.idleWasteKwh - a.idleWasteKwh).slice(0, 5),
    totals: {
      kwh: rnd(totalKwh), mwh: rnd(totalKwh / 1000),
      tonnesCo2e: rnd(totalCo2 / 1000, 3),
      energyPerScan: rnd(totalKwh / totalScans, 3),
      idleWasteKwh: rnd(totalIdle), label,
    },
    equivalencies: {
      car_km:        rnd(totalCo2 / 0.17,    0),
      phone_charges: rnd(totalKwh / 0.012,   0),
      household_years: rnd(totalKwh / 3500,  2),
    },
    ci, region, timePeriod,
  };
}

function computeScenario(intervention, region, timePeriod) {
  const ci   = CARBON_INTENSITY[region] ?? 0.25;
  const mult = TIME_MULT[timePeriod] ?? 1;
  const eff  = INTERVENTIONS[intervention] ?? {kwh: 0};
  const base = computeDashboard(region, timePeriod);

  const kwhSaved  = rnd((eff.kwh ?? 0) * mult);
  const co2PctOff = (eff.co2Pct ?? 0) / 100;
  const projectedKwh  = rnd(base.totals.kwh - kwhSaved);
  const baseCo2kg     = rnd(base.totals.tonnesCo2e * 1000, 1);
  const projectedCo2  = rnd(baseCo2kg * (1 - co2PctOff) - kwhSaved * ci, 1);
  const co2Saved      = rnd(baseCo2kg - projectedCo2, 1);
  const pctEnergy     = base.totals.kwh > 0 ? rnd((kwhSaved / base.totals.kwh) * 100, 1) : 0;

  return {
    intervention, timePeriod, note: eff.note ?? "",
    baseline:  {kwh: base.totals.kwh, co2: baseCo2kg},
    projected: {kwh: projectedKwh,    co2: projectedCo2},
    savings:   {kwh: kwhSaved, co2: co2Saved, pctEnergy},
  };
}

function computeAI(cloudProvider, region) {
  const cf = CLOUD[cloudProvider] ?? CLOUD["Local compute"];
  const ci = CARBON_INTENSITY[region] ?? 0.25;
  // Inference energy: 0.08 kW GPU load × (2.5 s / 3600) per inference × 1800 studies/month × PUE
  // GPU load and per-study latency from Doo 2024 (10.1148/radiol.232030) and LLM-Energy PDF defaults.
  // Operational savings (12 kgCO₂e/month) estimated from avoided repeat scans (Radiol 2023, 10.1148/radiol.230441).
  const inferenceKwh  = rnd(0.08 * (2.5 / 3600) * 1800 * cf.pue, 3);
  const grossKgCo2e   = rnd(inferenceKwh * ci, 3);
  const savingsKgCo2e = 12;
  return {
    name: "Chest CT triage AI",
    deployment: cloudProvider,
    inferenceKwh,
    grossKgCo2e,
    savingsKgCo2e,
    netKgCo2e: rnd(grossKgCo2e - savingsKgCo2e, 3),
    whatThisMeans: `On ${cloudProvider} (PUE ${cf.pue}, ${cf.ci} kgCO₂e/kWh at ${region}). Net impact = AI footprint minus operational savings from fewer repeats and shorter protocols.`,
  };
}

// ── UI components ─────────────────────────────────────────────────────────────
function Logo({dark = false}) {
  return (
    <div className="brand">
      <img src="./logo.png" alt="EcoRad logo" style={{width:46, height:46, objectFit:'contain', filter: dark ? 'brightness(1.8)' : 'none'}}/>
      <div><strong>EcoRad</strong><span>Sustainable Intelligence for Radiology</span></div>
    </div>
  );
}

function Card({title, value, sub, icon}) {
  return (
    <section className="card">
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

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState('landing');

  // Shared settings — drive all calculations
  const [settings, setSettings] = useState({
    profile: "Hospital radiology",
    intendedUse: "Estimate annual footprint",
    region: "Switzerland",
    metricType: "Energy",
    timePeriod: "Monthly",
  });
  const [scen, setScen] = useState({
    intervention: "Turn MRI/CT scanners off overnight",
    cloudProvider: "Local compute",
    scannerState: "Standby",
  });

  const set = (key, val) => setSettings(s => ({...s, [key]: val}));
  const setS = (key, val) => setScen(s => ({...s, [key]: val}));

  // Recalculate whenever settings change
  const dash     = useMemo(() => computeDashboard(settings.region, settings.timePeriod), [settings.region, settings.timePeriod]);
  const scenario = useMemo(() => computeScenario(scen.intervention, settings.region, settings.timePeriod), [scen.intervention, settings.region, settings.timePeriod]);
  const ai       = useMemo(() => computeAI(scen.cloudProvider, settings.region), [scen.cloudProvider, settings.region]);

  const chartEnergy = {
    labels: dash.byEquipment.map(x => x.modality),
    datasets: [{label:`kWh${dash.totals.label}`, data: dash.byEquipment.map(x => x.kwh),
                backgroundColor:'#A5D6A7', borderColor:'#2E7D32', borderWidth:1}],
  };
  const chartCo2 = {
    labels: dash.byEquipment.map(x => x.modality),
    datasets: [{label:'kgCO₂e', data: dash.byEquipment.map(x => x.kgco2e), backgroundColor: CHART_COLORS}],
  };
  const chartScenario = {
    labels: ['Baseline', 'After intervention'],
    datasets: [
      {label:`Energy kWh${dash.totals.label}`, data:[scenario.baseline.kwh, scenario.projected.kwh], backgroundColor:['#A5D6A7','#2E7D32']},
      {label:'Carbon kgCO₂e', data:[scenario.baseline.co2, scenario.projected.co2], backgroundColor:['#80CBC4','#26A69A']},
    ],
  };

  const pages = ['landing','input','dashboard','ai','scenario','export'];

  return (
    <>
      <header>
        <Logo/>
        <nav>
          {pages.map(p => (
            <button key={p} className={page===p?'on':''} onClick={()=>setPage(p)}>{p}</button>
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
          <div className="grid">
            <Sel label="Department profile" value={settings.profile}     options={META.profiles}     onChange={v=>set('profile',v)}/>
            <Sel label="Intended use"       value={settings.intendedUse} options={META.intendedUses} onChange={v=>set('intendedUse',v)}/>
            <Sel label="Region / grid"      value={settings.region}      options={META.regions}      onChange={v=>set('region',v)}/>
            <Sel label="Metric type"        value={settings.metricType}  options={META.metricTypes}  onChange={v=>set('metricType',v)}/>
            <Sel label="Time period"        value={settings.timePeriod}  options={META.timePeriods}  onChange={v=>set('timePeriod',v)}/>
          </div>
          <div className="inputSummary">
            <p>Carbon intensity for <strong>{settings.region}</strong>: <strong>{(CARBON_INTENSITY[settings.region]??0.25)} kgCO₂e/kWh</strong> <span className="note">— Our World in Data, 2022–2023 national average. Replace with local utility data for higher accuracy.</span></p>
            <p>Showing <strong>{settings.timePeriod.toLowerCase()}</strong> figures — multiplier ×{TIME_MULT[settings.timePeriod]}</p>
            <p className="note">Equipment power defaults: MRI 30 kW active (Heye et al., JMRI 2023 · DOI 10.1002/jmri.28994); CT 60 kW active (Acra 2024 · DOI 10.1016/j.acra.2024.05.004). See <a href="https://github.com/takinci/EcoRad/blob/main/sources.md" style={{color:'#2E7D32'}} target="_blank" rel="noreferrer">sources.md</a> for all citations.</p>
            <button onClick={()=>setPage('dashboard')} style={{marginTop:16}}>View dashboard →</button>
          </div>
        </main>
      )}

      {/* ── Dashboard ── */}
      {page==='dashboard' && (
        <main>
          <h1>Demo Academic Radiology <span className="badge">{settings.region}</span> <span className="badge">{settings.timePeriod}</span></h1>
          <div className="cards">
            <Card icon={<Gauge/>}    title={`Energy ${dash.totals.label}`}        value={`${dash.totals.mwh} MWh`}          sub="Total electricity from scanners, PACS, workstations, and servers."/>
            <Card icon={<Leaf/>}     title={`Carbon ${dash.totals.label}`}         value={`${dash.totals.tonnesCo2e} tCO₂e`} sub={`Scope 2 at ${dash.ci} kgCO₂e/kWh (${settings.region}).`}/>
            <Card icon={<Activity/>} title="Per scan"                              value={`${dash.totals.energyPerScan} kWh`} sub="Modality benchmarking and protocol optimisation."/>
            <Card icon={<TrendingDown/>} title={`Avoidable idle ${dash.totals.label}`} value={`${dash.totals.idleWasteKwh} kWh`}  sub="Opportunity from standby or off policies."/>
          </div>
          <div className="charts">
            <section><h2>Energy by equipment</h2><Bar data={chartEnergy}/></section>
            <section><h2>Carbon by equipment</h2><Doughnut data={chartCo2}/></section>
          </div>
          <section>
            <h2>Top 5 improvement opportunities</h2>
            {dash.topOpportunities.map((x,i) => (
              <div key={i} className="row">
                <b>{x.equipment}</b>
                <span>{x.idleWasteKwh} kWh avoidable idle{dash.totals.label}</span>
                <small>{x.confidence}</small>
              </div>
            ))}
          </section>
          <section>
            <h2>What does this mean?</h2>
            <p>Equivalent to <strong>{dash.equivalencies.car_km.toLocaleString()}</strong> car km, <strong>{dash.equivalencies.phone_charges.toLocaleString()}</strong> phone charges, and <strong>{dash.equivalencies.household_years}</strong> household electricity years {dash.totals.label}.</p>
          </section>
        </main>
      )}

      {/* ── AI ── */}
      {page==='ai' && (
        <main>
          <h1>AI impact dashboard</h1>
          <div className="grid" style={{marginBottom:24}}>
            <Sel label="Cloud provider" value={scen.cloudProvider} options={META.cloudProviders} onChange={v=>setS('cloudProvider',v)}/>
          </div>
          <section className="card wide">
            <div className="cardHead"><Brain/><span>{ai.name} — {ai.deployment}</span></div>
            <div className="aiGrid">
              <p><b>{ai.inferenceKwh}</b><br/>Inference kWh{dash.totals.label}</p>
              <p><b>{ai.grossKgCo2e}</b><br/>Gross kgCO₂e</p>
              <p><b>{ai.savingsKgCo2e}</b><br/>Estimated savings kgCO₂e</p>
              <p><b style={{color: ai.netKgCo2e < 0 ? '#2E7D32' : '#c62828'}}>{ai.netKgCo2e}</b><br/>Net AI impact kgCO₂e</p>
            </div>
            <p className="note" style={{marginTop:12}}>{ai.whatThisMeans}</p>
          </section>
        </main>
      )}

      {/* ── Scenario ── */}
      {page==='scenario' && (
        <main>
          <h1>Scenario comparison</h1>
          <div className="grid" style={{marginBottom:24}}>
            <Sel label="Intervention"   value={scen.intervention}  options={META.interventions}   onChange={v=>setS('intervention',v)}/>
            <Sel label="Cloud provider" value={scen.cloudProvider} options={META.cloudProviders}  onChange={v=>setS('cloudProvider',v)}/>
            <Sel label="Scanner state target" value={scen.scannerState} options={META.scannerStates} onChange={v=>setS('scannerState',v)}/>
          </div>
          <p className="note" style={{marginBottom:16}}>{scenario.note}</p>
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
          <button className="download" onClick={()=>window.print()} style={{marginLeft:'12px'}}><Download/>Print / Save as PDF</button>
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

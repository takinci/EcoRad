import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Bar, Doughnut} from 'react-chartjs-2';
import {Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend} from 'chart.js';
import {Leaf, Brain, Download, Activity, Gauge} from 'lucide-react';
import './styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// ── static data (matches seed.py defaults) ───────────────────────────────────
const DASH = {
  department: "Demo Academic Radiology",
  profile: "Hospital radiology",
  region: "Switzerland",
  carbonIntensity: 0.10,
  totals: {
    kwh: 29970.58, mwh: 29.97, kgco2e: 4905.09, tonnesCo2e: 4.905,
    scans: 13000, energyPerScan: 2.305, idleWasteKwh: 3624,
    embodiedMonthlyKgCo2e: 1783.03, waterLiters: 500, wasteKg: 350,
  },
  equivalencies: {
    household_years: 8.56, car_km: 28853, phone_charges: 2497549,
    trees_one_year: 234, glasses_of_water: 2000,
  },
  byEquipment: [
    {equipment:"MRI 3T A", modality:"MRI", period:"2026-01", kwh:10567, kgco2e:1056.7, scans:1200, energyPerScan:8.806, idleWasteKwh:1800, confidence:"estimated", whatThisMeans:"Estimated operating energy by scanner state. Replace assumptions with metered values where available."},
    {equipment:"CT Scanner A", modality:"CT", period:"2026-01", kwh:12756.8, kgco2e:1275.68, scans:1800, energyPerScan:7.087, idleWasteKwh:960, confidence:"estimated", whatThisMeans:"Estimated operating energy by scanner state. Replace assumptions with metered values where available."},
    {equipment:"Digital X-ray Room", modality:"X-ray", period:"2026-01", kwh:2673.4, kgco2e:267.34, scans:2500, energyPerScan:1.069, idleWasteKwh:240, confidence:"estimated", whatThisMeans:"Estimated operating energy by scanner state. Replace assumptions with metered values where available."},
    {equipment:"Ultrasound Fleet", modality:"Ultrasound", period:"2026-01", kwh:385.68, kgco2e:38.57, scans:2500, energyPerScan:0.154, idleWasteKwh:48, confidence:"estimated", whatThisMeans:"Estimated operating energy by scanner state. Replace assumptions with metered values where available."},
    {equipment:"PACS Storage", modality:"PACS/RIS", period:"2026-01", kwh:2976, kgco2e:297.6, scans:2500, energyPerScan:1.190, idleWasteKwh:480, confidence:"estimated", whatThisMeans:"Estimated operating energy by scanner state. Replace assumptions with metered values where available."},
    {equipment:"Reporting Workstations", modality:"Workstation", period:"2026-01", kwh:611.7, kgco2e:61.17, scans:2500, energyPerScan:0.245, idleWasteKwh:96, confidence:"estimated", whatThisMeans:"Estimated operating energy by scanner state. Replace assumptions with metered values where available."},
  ],
  assumptions: [
    "All defaults are editable",
    "Values are labelled as measured, estimated, or assumed",
    "Use local metering, procurement, and waste data for formal reporting",
  ],
};
DASH.topOpportunities = [...DASH.byEquipment].sort((a, b) => b.idleWasteKwh - a.idleWasteKwh).slice(0, 5);

const AI = {
  workloads: [{
    name: "Chest CT triage AI", useCase: "Triage", deployment: "Cloud", gpuType: "T4 equivalent",
    trainingKwh: 0, inferenceKwh: 0.12, grossKgCo2e: 0.012,
    savingsKwh: 120, savingsKgCo2e: 12, netKgCo2e: -11.988,
    confidence: "estimated",
    whatThisMeans: "Net impact compares AI compute footprint with editable operational savings such as fewer repeats, shorter scans, or reduced travel.",
  }],
};

const META = {
  profiles: ["Hospital radiology", "Outpatient imaging center", "Research imaging lab", "Teleradiology / informatics-heavy workflow"],
  intendedUses: ["Estimate annual footprint", "Compare modalities", "Track monthly sustainability KPIs", "Evaluate AI tool impact", "Estimate savings from an intervention"],
  regions: ["EU average", "France", "Germany", "Switzerland", "United Kingdom", "United States", "Editable custom"],
  interventions: ["Turn MRI/CT scanners off overnight", "Use standby mode during inactive periods", "Reduce low-value imaging", "Optimize scheduling", "Shorten protocols", "Reduce repeat scans", "Move computation to lower-carbon regions", "Use renewable electricity", "Reduce paper and film printing", "Extend hardware lifetime", "Consolidate servers", "Use smaller or more efficient AI models"],
};
// ─────────────────────────────────────────────────────────────────────────────

function Logo({dark = false}) {
  return (
    <div className="brand">
      <svg width="46" height="46" viewBox="0 0 64 64" role="img">
        <circle cx="32" cy="32" r="27" fill="none" stroke={dark ? '#A5D6A7' : '#2E7D32'} strokeWidth="3"/>
        <path d="M14 34c11-13 25-14 36-5" fill="none" stroke="#26A69A" strokeWidth="3" strokeLinecap="round"/>
        <path d="M22 42c8-9 20-10 30-4" fill="none" stroke="#A5D6A7" strokeWidth="3" strokeLinecap="round"/>
        <path d="M33 17c8 8 8 18 0 27-8-9-8-19 0-27Z" fill="#2E7D32"/>
        <circle cx="33" cy="32" r="3" fill="#fff"/>
        <path d="M43 17l4-4M48 23h5M43 49l4 4" stroke="#26A69A" strokeWidth="2" strokeLinecap="round"/>
      </svg>
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

function downloadCSV(dash) {
  const headers = ["equipment", "modality", "period", "kwh", "kgco2e", "scans", "energyPerScan", "idleWasteKwh", "confidence"];
  const rows = dash.byEquipment.map(r => headers.map(h => r[h]).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
  a.download = 'ecorad_dashboard.csv';
  a.click();
}

const CHART_COLORS = ['#2E7D32', '#26A69A', '#66BB6A', '#4DB6AC', '#A5D6A7', '#80CBC4'];

function App() {
  const [page, setPage] = useState('landing');
  const dash = DASH, ai = AI, meta = META;

  const chart = {
    labels: dash.byEquipment.map(x => x.modality),
    datasets: [{label: 'kWh', data: dash.byEquipment.map(x => x.kwh), backgroundColor: '#A5D6A7', borderColor: '#2E7D32', borderWidth: 1}],
  };
  const co2 = {
    labels: dash.byEquipment.map(x => x.modality),
    datasets: [{label: 'kgCO2e', data: dash.byEquipment.map(x => x.kgco2e), backgroundColor: CHART_COLORS}],
  };

  return (
    <>
      <header>
        <Logo/>
        <nav>
          {['landing', 'input', 'dashboard', 'ai', 'scenario', 'export'].map(p => (
            <button key={p} className={page === p ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>
          ))}
        </nav>
      </header>

      {page === 'landing' && (
        <main className="hero">
          <div>
            <p className="eyebrow">Radiology + AI + Planetary Health</p>
            <h1>Measure. Optimize. Sustain.</h1>
            <p>EcoRad estimates environmental impact from imaging operations, infrastructure, consumables, patient workflows, and AI tool use, then translates results into terms hospital leaders can act on.</p>
            <button onClick={() => setPage('dashboard')}>Open dashboard</button>
          </div>
          <div className="heroVisual">
            <Logo/>
            <p>CT/MRI energy, AI workloads, cloud footprint, waste, water, and ESG reporting in one place.</p>
          </div>
        </main>
      )}

      {page === 'input' && (
        <main>
          <h1>Data input</h1>
          <div className="grid">
            <label>Department profile<select>{meta.profiles.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Intended use<select>{meta.intendedUses.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Region<select>{meta.regions.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Metric type<select><option>Energy</option><option>Carbon</option><option>Water</option><option>AI net impact</option></select></label>
          </div>
          <p className="note">All default assumptions are editable. Missing measured data should be marked as estimated or assumed.</p>
        </main>
      )}

      {page === 'dashboard' && (
        <main>
          <h1>{dash.department}</h1>
          <div className="cards">
            <Card icon={<Gauge/>} title="Energy" value={`${dash.totals.mwh} MWh`} sub="Total monthly electricity from scanners, PACS, workstations, and servers."/>
            <Card icon={<Leaf/>} title="Carbon" value={`${dash.totals.tonnesCo2e} tCO2e`} sub="Scope 2 estimate plus editable consumable assumptions."/>
            <Card icon={<Activity/>} title="Per scan" value={`${dash.totals.energyPerScan} kWh`} sub="Useful for modality benchmarking and protocol optimization."/>
            <Card icon={<Leaf/>} title="Avoidable idle" value={`${dash.totals.idleWasteKwh} kWh`} sub="Potential opportunity from standby or off policies."/>
          </div>
          <div className="charts">
            <section><h2>Energy by source</h2><Bar data={chart}/></section>
            <section><h2>Carbon by source</h2><Doughnut data={co2}/></section>
          </div>
          <section>
            <h2>Top 5 improvement opportunities</h2>
            {dash.topOpportunities.map((x, i) => (
              <div key={i} className="row">
                <b>{x.equipment}</b>
                <span>{x.idleWasteKwh} kWh avoidable idle energy</span>
                <small>{x.confidence}</small>
              </div>
            ))}
          </section>
          <section>
            <h2>What does this mean?</h2>
            <p>Equivalent to about {dash.equivalencies.car_km.toFixed(0)} car km, {dash.equivalencies.phone_charges.toFixed(0)} phone charges, and {dash.equivalencies.household_years.toFixed(2)} household electricity years.</p>
          </section>
        </main>
      )}

      {page === 'ai' && (
        <main>
          <h1>AI impact dashboard</h1>
          {ai.workloads.map((w, i) => (
            <section key={i} className="card wide">
              <div className="cardHead"><Brain/><span>{w.name}</span></div>
              <div className="aiGrid">
                <p><b>{w.inferenceKwh}</b><br/>Inference kWh</p>
                <p><b>{w.grossKgCo2e}</b><br/>Gross kgCO2e</p>
                <p><b>{w.savingsKgCo2e}</b><br/>Estimated savings kgCO2e</p>
                <p><b>{w.netKgCo2e}</b><br/>Net AI impact kgCO2e</p>
              </div>
              <p>{w.whatThisMeans}</p>
            </section>
          ))}
        </main>
      )}

      {page === 'scenario' && (
        <main>
          <h1>Scenario comparison</h1>
          <div className="grid">
            <label>Intervention scenario<select>{meta.interventions.map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Cloud provider or local compute<select><option>Local compute</option><option>AWS</option><option>Azure</option><option>Google Cloud</option></select></label>
            <label>Scanner state<select><option>Active</option><option>Idle</option><option>Standby</option><option>Off</option></select></label>
            <label>Time period<select><option>Monthly</option><option>Quarterly</option><option>Annual</option></select></label>
          </div>
          <p className="note">Compare baseline versus intervention using editable assumptions and measured data where available.</p>
        </main>
      )}

      {page === 'export' && (
        <main>
          <h1>Export report</h1>
          <p>Every report should include the assumptions table, confidence level, units, and citation fields.</p>
          <button className="download" onClick={() => downloadCSV(dash)}><Download/>Download CSV</button>
          <button className="download" onClick={() => window.print()} style={{marginLeft: '12px'}}><Download/>Print / Save as PDF</button>
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

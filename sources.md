# EcoRad — Sources and Assumption Governance

EcoRad stores uncertain literature values as transparent, editable defaults with citation fields. Local measured data — procurement records, utility bills, scanner logs, PACS/cloud invoices, and country-specific carbon factors — should replace defaults wherever available.

---

## General datasets

| ID | Source | Used for |
|----|--------|----------|
| OWID-CI | Our World in Data. *Carbon Intensity of Electricity*. https://ourworldindata.org/grapher/carbon-intensity-electricity | Regional kgCO₂e/kWh defaults in `CARBON_INTENSITY` |
| GPP | GlobalPetrolPrices. *Electricity Prices*. https://www.globalpetrolprices.com/electricity_prices/ | Optional future cost module |

**Notes on `CARBON_INTENSITY` defaults (all kgCO₂e/kWh, OWID 2022–2023):**
- Switzerland 0.10 — hydro + nuclear dominant grid
- France 0.06 — ~70 % nuclear
- Germany 0.36 — mixed fossil/renewable transition
- United States 0.38 — national average
- United Kingdom 0.20 — gas + growing offshore wind
- EU average 0.25 — Eurostat/EEA mean
- Editable custom 0.30 — placeholder; replace with local utility data

---

## Radiology sustainability and planetary health

| ID | Citation |
|----|---------|
| McKee-2024 | McKee BJ et al. *Planetary Health and Radiology: Why We Should Care and What We Can Do.* Radiology 2024. DOI: [10.1148/radiol.240219](https://doi.org/10.1148/radiol.240219). Used for intervention framing and the operational sustainability action categories. |
| Doo-2024 | Doo FX et al. *Environmental Sustainability and AI in Radiology: A Double-Edged Sword.* Radiology 2024. DOI: [10.1148/radiol.232030](https://doi.org/10.1148/radiol.232030). Used for AI footprint vs. operational benefit framework; cloud PUE and carbon intensity discussion. |
| ESR-GI | ESR Green Imaging Department self-assessment tool. https://www.myesr.org/greenid/. Intervention categories and self-assessment framing. |
| ESR-eBook | ESR. *Sustainable Imaging* (eBook 28). https://www.myesr.org/app/uploads/2025/05/ESR_Modern_eBook_28.pdf. Comprehensive practice guidance. |
| ESR-PP-2025 | *Sustainability in Radiology: Position Paper and Call to Action.* European Society of Radiology 2025. Intervention priorities and Scope 1/2/3 framing. |

---

## CT energy and carbon

| ID | Citation |
|----|---------|
| Acra-2024 | DOI: [10.1016/j.acra.2024.05.004](https://doi.org/10.1016/j.acra.2024.05.004). Academic Radiology 2024. CT energy consumption measurement; active-power reference for `EQUIPMENT_BASE`. |
| AJR-2025-CT | DOI: [10.2214/AJR.25.33951](https://doi.org/10.2214/AJR.25.33951). AJR 2025. CT and radiography sustainability review. |
| CJRS-2022 | DOI: [10.1177/08465371221133074](https://doi.org/10.1177/08465371221133074). Canadian Journal of Radiological Science 2022. CT scanner power modes including standby/idle measurements. |
| AJR-2023-CT | DOI: [10.2214/AJR.23.30189](https://doi.org/10.2214/AJR.23.30189). AJR 2023. CT carbon footprint; per-scan energy benchmarks. |
| Radiol-253128 | DOI: [10.1148/radiol.253128](https://doi.org/10.1148/radiol.253128). Radiology 2025. Multi-modality environmental footprint; covers CT + MRI. |
| Radiol-240398 | DOI: [10.1148/radiol.240398](https://doi.org/10.1148/radiol.240398). Radiology 2024. IT/PACS infrastructure power; cross-modality Scope 2 estimates. |

**CT `EQUIPMENT_BASE` defaults (60 kW active, 8 kW idle, 3 kW standby):** supported by Acra-2024 and CJRS-2022 reporting typical modern multi-detector CT active draws of 40–80 kW and significant idle consumption; 60 kW is a mid-range default. Replace with scanner-specific power meters or OEM data sheets.

---

## MRI energy and carbon

| ID | Citation |
|----|---------|
| JMRI-2023 | Heye T et al. *Energy Consumption and Carbon Footprint of MRI.* J Magn Reson Imaging 2023. DOI: [10.1002/jmri.28994](https://doi.org/10.1002/jmri.28994). Reports mean 3T MRI active draw of ~30 kW; primary reference for `EQUIPMENT_BASE` MRI active_kw. |
| EurRad-2024-MRI | DOI: [10.1007/s00330-024-11056-0](https://doi.org/10.1007/s00330-024-11056-0). European Radiology 2024. MRI energy across field strengths and clinical sites. |
| Radiol-230441 | DOI: [10.1148/radiol.230441](https://doi.org/10.1148/radiol.230441). Radiology 2023. MRI carbon footprint and per-scan energy in academic radiology. |
| Radiol-243453 | DOI: [10.1148/radiol.243453](https://doi.org/10.1148/radiol.243453). Radiology 2024. MRI operational energy; idle and standby power validation. |
| Herrmann-2012 | Herrmann C. *Energy Efficiency of MRI.* Stanford 2012. http://large.stanford.edu/courses/2012/ph240/nam2/docs/herrmann.pdf. Early detailed power-mode breakdown for clinical MRI. |
| Neurad-2024 | DOI: [10.1016/j.neurad.2023.12.001](https://doi.org/10.1016/j.neurad.2023.12.001). Journal of Neuroradiology 2024. Helium cooling and operational energy for high-field MRI. |
| IJHCQA-2016 | DOI: [10.1108/IJHCQA-10-2016-0153](https://doi.org/10.1108/IJHCQA-10-2016-0153). Int J Health Care Quality Assurance 2016. MRI operational efficiency and scheduling; supports avoidable_idle_h estimate. |
| Radiol-253128 | See CT section (multi-modality paper covering MRI). |
| Radiol-240398 | See CT section (multi-modality paper covering MRI). |

**MRI `EQUIPMENT_BASE` defaults (30 kW active, 15 kW idle, 5 kW standby):** JMRI-2023 (Heye et al.) reports a mean of 30.1 kW for active 3T scanners and substantial idle draw even when not scanning. idle_kw ≈ 50 % of active is consistent with Radiol-243453. Cryocooler draw contributes to standby. Replace with scanner logs.

---

## Angiography, fluoroscopy, and interventional radiology

| ID | Citation |
|----|---------|
| AJR-2024-Angio | DOI: [10.2214/AJR.24.30988](https://doi.org/10.2214/AJR.24.30988). AJR 2024. Energy and carbon footprint of interventional / angiography suites. |
| Radiol-240398 | See CT section (includes angiography carbon data). |

---

## Mammography

| ID | Citation |
|----|---------|
| EurRad-2026-Mammo | DOI: [10.1007/s00330-026-12373-2](https://doi.org/10.1007/s00330-026-12373-2). European Radiology 2026. Environmental footprint of mammography screening programmes. |

---

## Reviews covering multiple modalities

| ID | Citation |
|----|---------|
| EUF-2023 | DOI: [10.1016/j.euf.2023.09.009](https://doi.org/10.1016/j.euf.2023.09.009). European Urology Focus 2023. Systematic review of radiology environmental sustainability across modalities. |
| MOU-2024 | Vosshenrich R et al. DOI: [10.1097/MOU.0000000000001337](https://doi.org/10.1097/MOU.0000000000001337). Current Opinion in Urology 2024. Multi-modality carbon benchmarks; primary source for `MODALITY_BENCHMARKS` annual kWh values displayed in the Dashboard Infrastructure section, and for global average (0.473 kgCO₂e/kWh) and EU average (0.237 kgCO₂e/kWh) carbon intensity defaults cited throughout the UI. |

---

## AI sustainability, cloud infrastructure, and data centres

| ID | Citation |
|----|---------|
| Doo-2024 | See Radiology sustainability section. Primary reference for `computeAI()` footprint vs. benefit logic. |
| LLM-Energy | Doo FX, Savani D, Kanhere A, Carlos RC, Joshi A, Yi PH, Parekh VS. *Optimal Large Language Model Characteristics to Balance Accuracy and Energy Use for Sustainable Medical Applications.* Radiology 2024;312(2). DOI: [10.1148/radiol.240320](https://doi.org/10.1148/radiol.240320). Inference energy scaling with model size; underpins the model-efficiency intervention note. |
| Planet-Health | Same as McKee-2024 above (DOI: [10.1148/radiol.240219](https://doi.org/10.1148/radiol.240219)). McKee BJ et al. *Planetary Health and Radiology: Why We Should Care and What We Can Do.* Radiology 2024. Framework for scoping AI footprint inside departmental Scope 2. |
| AI-Sustainability | Same as Doo-2024 above (DOI: [10.1148/radiol.232030](https://doi.org/10.1148/radiol.232030)). Doo FX et al. *Environmental Sustainability and AI in Radiology: A Double-Edged Sword.* Radiology 2024. AI operational lifecycle, cloud carbon, and procurement guidance. |
| Clinical-AI | Kocak B, Ponsiglione A, Romeo V, Ugga L, Huisman M, Cuocolo R. *Radiology AI and sustainability paradox: environmental, economic, and social dimensions.* Insights Imaging 2025;16(1):88. DOI: [10.1186/s13244-025-01962-2](https://doi.org/10.1186/s13244-025-01962-2). AI governance, model efficiency, infrastructure carbon, and lifecycle assessment methodology. |

**Cloud `CLOUD` defaults (PUE and kgCO₂e/kWh):**
- Local compute PUE 1.50 — typical on-premise server room; ASHRAE standard reference.
- AWS PUE 1.15 — AWS 2022 Sustainability Report.
- Azure PUE 1.15 — Microsoft 2023 Environmental Sustainability Report.
- Google Cloud PUE 1.10 — Google 2023 Environmental Report (lowest industry PUE).
- Carbon intensity values are global fleet averages; regional deployments vary. See Doo-2024 for clinical AI footprint discussion.

---

## Intervention savings defaults

Baseline kWh savings in `INTERVENTIONS` are conservative departmental estimates informed by the sources below. Replace with measured before/after metering.

| Intervention | Basis |
|-------------|-------|
| Turn MRI/CT off overnight | JMRI-2023 and Radiol-243453: idle draws of 15 kW over 8 h/night on MRI alone = 120 kWh/night × ~20 nights ≈ 2 400 kWh/month. |
| Standby mode during inactive periods | Herrmann-2012 and CJRS-2022: standby typically 40–60 % lower than idle; ~1 200 kWh/month estimated saving across MRI + CT fleet. |
| Reduce low-value imaging | McKee-2024 and ESR-PP-2025: reducing 5–10 % unnecessary scans; ~800 kWh/month estimated. |
| Optimise scheduling | IJHCQA-2016: tighter scheduling reduces dead-time idle; ~600 kWh/month. |
| Shorten protocols | Radiol-230441: protocol compression reduces per-scan active time; ~450 kWh/month. |
| Reduce repeat scans | AJR-2023-CT: each avoided CT ≈ 0.5 kWh; reducing repeats by ~1 800/month = 900 kWh/month. |
| Move computation to lower-carbon region | OWID-CI: same energy, grid swap from 0.38 to 0.06–0.10 kgCO₂e/kWh = up to 80 % CO₂ reduction on compute. |
| Use renewable electricity | ESR-GI: Scope 2 decarbonisation via green tariff or PPA; effectively zeroes grid carbon. |
| Reduce paper and film printing | Radiol-240398: film processor and laser printer loads ~120 kWh/month in typical department. |
| Extend hardware lifetime | ESR-PP-2025: embodied carbon amortised over more years; ~15 % Scope 3 reduction. |
| Consolidate servers | Clinical-AI: virtualisation / right-sizing reduces physical server count; ~500 kWh/month. |
| Use smaller or more efficient AI models | LLM-Energy: lighter models use substantially less inference compute; ~80 kWh/month. |

---

## Equivalencies and human-scale comparisons

Used in the Dashboard "What it means" tab and the Home page result panel to express CO₂ in everyday terms.

| ID | Source | Factor used |
|----|--------|------------|
| DEFRA-2023 | UK Department for Environment, Food & Rural Affairs. *Greenhouse Gas Reporting: Conversion Factors 2023.* https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023 | Car transport: **0.17 kgCO₂e/km** (average petrol passenger car) |
| ICAO-2023 | International Civil Aviation Organization. *Carbon Emissions Calculator Methodology.* https://www.icao.int/environmental-protection/CarbonOffset/Pages/default.aspx | Short-haul flight: **255 kgCO₂e/seat**; long-haul: **1,200 kgCO₂e/seat** (economy, radiative forcing excluded) |
| EEA-2023 | European Environment Agency. *Final Energy Consumption by Sector.* EEA 2023. https://www.eea.europa.eu/data-and-maps/indicators/final-energy-consumption-by-sector-11 | EU average household electricity: **3,500 kWh/yr**; EU average car: **2.1 tCO₂e/yr** |
| EPA-CRF | US Environmental Protection Agency. *Emission Factors for Greenhouse Gas Inventories.* 2023. https://www.epa.gov/ghgemissions/emission-factors-ghg-inventories | Crude oil combustion: **430 kgCO₂e/barrel** |
| FAO-FRA | FAO. *Global Forest Resources Assessment 2020.* https://www.fao.org/forest-resources-assessment/ | Temperate managed forest carbon sequestration: **5.5 tCO₂/ha/yr** |
| IPCC-2006 | IPCC. *2006 IPCC Guidelines for National Greenhouse Gas Inventories,* Vol. 2, Ch. 2. https://www.ipcc-nggip.iges.or.jp/public/2006gl/ | Hard coal combustion: **2,350 kgCO₂/tonne** |
| Tree-21 | Commonly cited figure; consistent with Nowak et al. (2013), *Urban Forest & Urban Greening* and ESR Green Imaging references. | One mature tree sequesters ~**21 kgCO₂/yr** |
| Phone-12Wh | IEA. *Digitisation and Energy.* IEA 2017; hardware specs for modern smartphones. | Smartphone full charge: ~**12 Wh** |

---

## Cloud Carbon Tracker regional data

| ID | Source | Used for |
|----|--------|----------|
| ElectricityMaps-2023 | Electricity Maps. *Annual Average Carbon Intensity by Region.* 2023. https://electricitymaps.com | Regional kgCO₂e/kWh values in `CLOUD_REGIONS` for the Cloud Carbon Tracker (AWS, Azure, GCP region selector). Values represent 2023 annual average marginal/average carbon intensity per cloud region. |

---

## GPU hardware specifications

| ID | Source | Used for |
|----|--------|----------|
| NVIDIA-DC-Specs | NVIDIA. *Data Center GPU Specifications.* https://www.nvidia.com/en-us/data-center/ | TDP values (watts) for A100 SXM4 (400 W), H100 SXM5 (700 W), V100 SXM2 (300 W), A40 (300 W), L40S (350 W), RTX 4090 (450 W), RTX 3090 (350 W), RTX A6000 (300 W) used in `GPU_PRESETS` for AI energy estimation. |
| AMD-Instinct-Specs | AMD. *Instinct GPU Specifications.* https://www.amd.com/en/products/accelerators/instinct.html | TDP value for MI300X (750 W) used in `GPU_PRESETS`. |

---

## Assumption principles

1. **Prefer measured data.** Energy from scanner logs, smart meters, facility meters, or cloud invoices always overrides literature defaults.
2. **Literature values are transparent defaults**, not authoritative truth.
3. **Mark every input** as `measured`, `estimated`, or `assumed` (see confidence field in dashboard CSV).
4. **Carbon intensity must be editable and region-specific.** National averages underestimate variation by utility or time of day.
5. **Separate AI gross footprint from estimated sustainability benefits.** Net AI impact can be negative (net-positive) if AI reduces unnecessary scans.
6. **Report Scope 1, 2, and 3 separately** where the data model supports it.
7. **Update defaults annually** as grids decarbonise and scanner technology improves.

# EcoRad sources and assumption governance

EcoRad stores uncertain literature values as editable defaults with citation fields. Local measured data, procurement records, utility bills, scanner logs, PACS/cloud invoices, and country-specific carbon factors should replace defaults where available.

## General datasets
- Electricity grid carbon intensity: Our World in Data, Carbon intensity of electricity, https://ourworldindata.org/grapher/carbon-intensity-electricity. Used for editable regional `kgCO2e/kWh` defaults.
- Electricity prices, optional future cost module: GlobalPetrolPrices electricity prices, https://www.globalpetrolprices.com/electricity_prices/.

## Radiology sustainability and planetary health
- McKee et al. 2024, Planetary Health and Radiology: Why We Should Care and What We Can Do. DOI: 10.1148/radiol.240219.
- Doo et al. 2024, Environmental Sustainability and AI in Radiology: A Double-Edged Sword. DOI: 10.1148/radiol.232030.
- ESR Green Imaging Department self-assessment: https://www.myesr.org/greenid/.
- ESR Sustainable Imaging educational resource: https://www.myesr.org/app/uploads/2025/05/ESR_Modern_eBook_28.pdf.
- Sustainability in Radiology: Position Paper and Call to Action. 2025.

## CT
- https://doi.org/10.1016/j.acra.2024.05.004
- https://doi.org/10.2214/AJR.25.33951
- https://doi.org/10.1177/08465371221133074
- https://doi.org/10.2214/AJR.23.30189
- https://doi.org/10.1148/radiol.253128
- https://doi.org/10.1148/radiol.240398

## MRI
- https://doi.org/10.1002/jmri.28994
- https://doi.org/10.1007/s00330-024-11056-0
- https://doi.org/10.1148/radiol.230441
- https://doi.org/10.1148/radiol.243453
- http://large.stanford.edu/courses/2012/ph240/nam2/docs/herrmann.pdf
- https://doi.org/10.1016/j.neurad.2023.12.001
- https://doi.org/10.1108/IJHCQA-10-2016-0153
- https://doi.org/10.1148/radiol.253128
- https://doi.org/10.1148/radiol.240398

## Angiography, fluoroscopy, and intervention
- https://doi.org/10.2214/AJR.24.30988
- https://doi.org/10.1148/radiol.240398

## Mammography
- https://doi.org/10.1007/s00330-026-12373-2

## Reviews including multiple modalities
- https://doi.org/10.1016/j.euf.2023.09.009
- https://doi.org/10.1097/MOU.0000000000001337

## AI sustainability, cloud, and data centers
- Optimal large language model characteristics to balance accuracy and energy use for sustainable medical AI. Use to structure AI training and inference assumptions, not as hard-coded universal values.
- Environmental sustainability and AI in radiology. Use for the AI footprint versus operational benefit framing.
- Sustainability in clinical AI. Use for AI governance, lifecycle, model efficiency, and infrastructure assumptions.
- Cloud PUE, carbon intensity, and water use should be treated as provider-region-specific and editable.

## Assumption principles
1. Prefer measured energy from scanner logs, smart meters, facility meters, or cloud invoices.
2. Use literature values only as transparent defaults.
3. Mark every input as measured, estimated, or assumed.
4. Keep carbon intensity editable and region-specific.
5. Separate AI gross footprint from estimated sustainability benefits.
6. Report Scope 1, Scope 2, and Scope 3 categories where the data model supports them.

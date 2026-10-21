#!/usr/bin/env node
// Writes fictional S/4HANA-shaped QM/MM seed data to db/data as CAP CSV files.
// Seeded PRNG: the same data on every run, so tests and demo answers stay stable.
//
// Built-in story the copilot should find:
//   V200 Härterei Weser GmbH (heat treater for the 8.0 mm axle) has a tempering
//   furnace thermocouple drift from 2026-07-06 to 2026-08-21. HV10 rises above
//   650, bending force drops, lots are rejected, a customer complaint (Q1) follows.
//   Corrective action closes it; lots after 2026-08-24 are back in spec.

const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'db', 'data')

let seed = 20260721
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
function normal(mu, sd) {
  const u = Math.max(rand(), 1e-12), v = rand()
  return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const round = (x, d) => Number(x.toFixed(d))
const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)

function csv(name, rows) {
  const cols = Object.keys(rows[0])
  const esc = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n')
  fs.writeFileSync(path.join(OUT, `sap.quality-${name}.csv`), body + '\n')
  return rows.length
}

const plants = [{ ID: 'DE10', name: 'Axle & Drive Plant Bielefeld', city: 'Bielefeld' }]

const suppliers = [
  { ID: 'V100', name: 'Nordstahl Edelstahl GmbH', city: 'Duisburg', country: 'DE', category: 'Steel bar (raw material)' },
  { ID: 'V200', name: 'Härterei Weser GmbH', city: 'Minden', country: 'DE', category: 'Heat treatment (subcontracting)' },
  { ID: 'V300', name: 'AluGuss Süd GmbH', city: 'Ulm', country: 'DE', category: 'HPDC aluminium castings' },
  { ID: 'V400', name: 'Präzisionsteile Lippe KG', city: 'Detmold', country: 'DE', category: 'Finished precision axles' },
]

const materials = [
  { ID: 'BAR-4CR13-10', description: 'Round bar 4Cr13, 10 mm, annealed', materialType: 'ROH', baseUnit: 'KG', alloy: '4Cr13 (X40Cr13)', plant_ID: 'DE10' },
  { ID: 'AX-4CR13-080', description: 'Drive axle 8.00 mm, 4Cr13, hardened and tempered', materialType: 'HALB', baseUnit: 'PC', alloy: '4Cr13 (X40Cr13)', plant_ID: 'DE10' },
  { ID: 'AX-4CR13-078', description: 'Drive axle 7.80 mm, 4Cr13, hardened and tempered', materialType: 'HALB', baseUnit: 'PC', alloy: '4Cr13 (X40Cr13)', plant_ID: 'DE10' },
  { ID: 'HSG-AC44300', description: 'Motor housing, high-pressure die cast', materialType: 'HALB', baseUnit: 'PC', alloy: 'EN AC-44300 (AlSi12Fe)', plant_ID: 'DE10' },
]

// Demo control-plan limits (plant-specific, not a published standard).
const specs = [
  { material_ID: 'BAR-4CR13-10', characteristic: 'C_PCT', description: 'Carbon content', unit: '%', lowerLimit: 0.36, upperLimit: 0.45, target: 0.40, method: 'Mill certificate 3.1 + spark OES check' },
  { material_ID: 'BAR-4CR13-10', characteristic: 'CR_PCT', description: 'Chromium content', unit: '%', lowerLimit: 12.0, upperLimit: 14.0, target: 13.0, method: 'Mill certificate 3.1 + spark OES check' },
  { material_ID: 'AX-4CR13-080', characteristic: 'HV10', description: 'Vickers hardness HV10', unit: 'HV10', lowerLimit: 450, upperLimit: 650, target: 560, method: 'Vickers HV10 (ISO 6507-1 method), 5 parts per lot' },
  { material_ID: 'AX-4CR13-080', characteristic: 'BEND_F', description: 'Bending force at break', unit: 'N', lowerLimit: 4000, upperLimit: 6000, target: 4600, method: '3-point bending, 5 parts per lot' },
  { material_ID: 'AX-4CR13-080', characteristic: 'DIAM', description: 'Bearing seat diameter', unit: 'mm', lowerLimit: 7.98, upperLimit: 8.02, target: 8.00, method: 'Laser micrometer, 5 parts per lot' },
  { material_ID: 'AX-4CR13-078', characteristic: 'HV10', description: 'Vickers hardness HV10', unit: 'HV10', lowerLimit: 450, upperLimit: 650, target: 560, method: 'Vickers HV10 (ISO 6507-1 method), 5 parts per lot' },
  { material_ID: 'AX-4CR13-078', characteristic: 'BEND_F', description: 'Bending force at break', unit: 'N', lowerLimit: 3800, upperLimit: 5800, target: 4400, method: '3-point bending, 5 parts per lot' },
  { material_ID: 'AX-4CR13-078', characteristic: 'DIAM', description: 'Bearing seat diameter', unit: 'mm', lowerLimit: 7.78, upperLimit: 7.82, target: 7.80, method: 'Laser micrometer, 5 parts per lot' },
  { material_ID: 'HSG-AC44300', characteristic: 'SI_PCT', description: 'Silicon content', unit: '%', lowerLimit: 10.5, upperLimit: 13.5, target: 12.0, method: 'Spark OES per melt' },
  { material_ID: 'HSG-AC44300', characteristic: 'POROSITY', description: 'Porosity area in X-ray zone A', unit: '%', lowerLimit: 0, upperLimit: 1.5, target: 0.5, method: 'X-ray, zone A evaluation' },
  { material_ID: 'HSG-AC44300', characteristic: 'WALL_MM', description: 'Wall thickness at flange', unit: 'mm', lowerLimit: 3.4, upperLimit: 3.8, target: 3.6, method: 'Ultrasonic thickness gauge' },
]
const specOf = (m, c) => specs.find((s) => s.material_ID === m && s.characteristic === c)

const START = new Date('2026-02-02T00:00:00Z')
const END = new Date('2026-09-25T00:00:00Z')
const DRIFT_FROM = new Date('2026-07-06T00:00:00Z')
const DRIFT_TO = new Date('2026-08-21T00:00:00Z')
const POROSITY_FROM = new Date('2026-05-04T00:00:00Z')
const POROSITY_TO = new Date('2026-05-29T00:00:00Z')

// Per-characteristic process model: (date) => [mean, within-lot sd]
const model = {
  'BAR-4CR13-10': {
    C_PCT: () => [normal(0.405, 0.008), 0.004],
    CR_PCT: (d, lotNo) => [lotNo === 4 ? 11.82 : normal(13.0, 0.14), 0.05],
  },
  'AX-4CR13-080': {
    HV10: (d, n, ctx) => (ctx.underTempered ? [normal(664, 7), 9] : [normal(565, 14), 12]),
    BEND_F: (d, n, ctx) => (ctx.underTempered ? [normal(4060, 70), 110] : [normal(4650, 90), 120]),
    DIAM: () => [normal(8.001, 0.0018), 0.0035],
  },
  'AX-4CR13-078': {
    HV10: () => [normal(555, 10), 10],
    BEND_F: () => [normal(4450, 70), 100],
    DIAM: () => [normal(7.8, 0.0015), 0.003],
  },
  'HSG-AC44300': {
    SI_PCT: () => [normal(11.9, 0.16), 0.1],
    POROSITY: (d) => (d >= POROSITY_FROM && d <= POROSITY_TO ? [normal(1.45, 0.15), 0.18] : [normal(0.55, 0.12), 0.1]),
    WALL_MM: () => [normal(3.6, 0.025), 0.03],
  },
}

const decimals = { C_PCT: 3, CR_PCT: 2, HV10: 0, BEND_F: 0, DIAM: 4, SI_PCT: 2, POROSITY: 2, WALL_MM: 3 }

const supplyPlan = [
  { supplier: 'V100', material: 'BAR-4CR13-10', everyDays: 14, offset: 1, qty: () => 2000 + Math.round(rand() * 4) * 500, unit: 'KG', price: 4.85, sample: 3 },
  { supplier: 'V200', material: 'AX-4CR13-080', everyDays: 4, offset: 0, qty: () => 4000 + Math.round(rand() * 4) * 500, unit: 'PC', price: 0.62, sample: 5 },
  { supplier: 'V400', material: 'AX-4CR13-078', everyDays: 7, offset: 2, qty: () => 3000 + Math.round(rand() * 2) * 500, unit: 'PC', price: 1.94, sample: 5 },
  { supplier: 'V300', material: 'HSG-AC44300', everyDays: 7, offset: 3, qty: () => 1200 + Math.round(rand() * 4) * 100, unit: 'PC', price: 7.4, sample: 5 },
]

const purchaseOrders = []
const lots = []
const results = []
const notifications = []
let poNo = 4500012000
let lotNo = 10000004000
let qmNo = 200001000
const lotCount = {}

for (const plan of supplyPlan) {
  for (let d = addDays(START, plan.offset); d <= END; d = addDays(d, plan.everyDays)) {
    if (d.getUTCDay() === 0) d = addDays(d, 1)
    if (d.getUTCDay() === 6) d = addDays(d, 2)
    const qty = plan.qty()
    const po = {
      ID: String(++poNo), supplier_ID: plan.supplier, material_ID: plan.material,
      orderDate: iso(addDays(d, -21)), deliveryDate: iso(d), quantity: qty, unit: plan.unit,
      netPrice: plan.price, currency: 'EUR',
    }
    purchaseOrders.push(po)
    lotCount[plan.material] = (lotCount[plan.material] || 0) + 1
    const n = lotCount[plan.material]
    const lot = {
      ID: '0' + String(++lotNo), origin: '01', originText: 'Goods receipt', material_ID: plan.material,
      supplier_ID: plan.supplier, purchaseOrder_ID: po.ID, plant_ID: 'DE10',
      batch: `B${iso(d).slice(2, 4)}${iso(d).slice(5, 7)}-${String(n).padStart(3, '0')}`,
      createdOn: iso(d), lotSize: qty, sampleSize: plan.sample, usageDecision: 'A', usageDecisionText: 'Accepted',
    }
    const failed = []
    const ctx = { underTempered: plan.material === 'AX-4CR13-080' && d >= DRIFT_FROM && d <= DRIFT_TO && rand() < 0.7 }
    for (const [ch, fn] of Object.entries(model[plan.material])) {
      const spec = specOf(plan.material, ch)
      const [mu, sd] = fn(d, n, ctx)
      const dp = decimals[ch]
      const s = Math.abs(normal(sd, sd * 0.15))
      const lo = mu - 1.5 * s, hi = mu + 1.5 * s
      const ok = lo >= spec.lowerLimit && hi <= spec.upperLimit
      if (!ok) failed.push({ ch, spec, mu, lo, hi })
      results.push({
        lot_ID: lot.ID, characteristic: ch, n: plan.sample, mean: round(mu, dp), stdDev: round(s, dp + 1),
        minValue: round(lo, dp), maxValue: round(hi, dp), unit: spec.unit, valuation: ok ? 'A' : 'R',
      })
    }
    if (failed.length) {
      lot.usageDecision = 'R'
      lot.usageDecisionText = 'Rejected - return to vendor'
      notifications.push(vendorComplaint(lot, failed, d))
    }
    lots.push(lot)
  }
}

function vendorComplaint(lot, failed, d) {
  const f = failed[0]
  const sup = suppliers.find((s) => s.ID === lot.supplier_ID)
  const dp = decimals[f.ch]
  const measured = `${f.ch} mean ${round(f.mu, dp)} ${f.spec.unit} (sample range ${round(f.lo, dp)} to ${round(f.hi, dp)}), limits ${f.spec.lowerLimit} to ${f.spec.upperLimit}`
  const base = {
    ID: String(++qmNo), type: 'Q2', typeText: 'Complaint against vendor', priority: '2',
    material_ID: lot.material_ID, supplier_ID: lot.supplier_ID, lot_ID: lot.ID, batch: lot.batch,
    createdOn: iso(addDays(d, 1)), defectQuantity: lot.lotSize,
  }
  if (f.ch === 'HV10' || f.ch === 'BEND_F') {
    const closed = d <= DRIFT_TO
    return {
      ...base, status: closed ? 'Completed' : 'Open', closedOn: closed ? '2026-08-28' : '',
      defectCode: 'HT-HARD', defectText: 'Hardness above specification after heat treatment',
      shortText: `GR lot ${lot.ID}: HV10 out of spec, ${sup.name}`,
      rootCause: 'Tempering furnace TO-3 thermocouple drift at Härterei Weser: furnace read about 40 °C high, so parts were tempered below set point (under-tempered martensite, high hardness, low toughness).',
      longText: `Goods receipt inspection of batch ${lot.batch} from ${sup.name}. ${measured}. ` +
        `Bending force also low, fracture surfaces bright and flat (brittle). Lot blocked and returned to vendor. ` +
        `Supplier informed, 8D requested. Containment: 100% HV10 check on stock and WIP of AX-4CR13-080.`,
    }
  }
  if (f.ch === 'POROSITY') {
    return {
      ...base, status: 'Completed', closedOn: '2026-06-12', defectCode: 'CAST-POR',
      defectText: 'Porosity above limit in X-ray zone A', defectQuantity: Math.round(lot.lotSize * 0.18),
      shortText: `GR lot ${lot.ID}: porosity zone A over 1.5 %, ${sup.name}`,
      rootCause: 'Die temperature control unit on cell 4 failed; die ran cold and vacuum valve was partly blocked, increasing gas porosity.',
      longText: `X-ray of 5 housings from batch ${lot.batch}: ${measured}. Porosity clusters near the bearing bore. ` +
        `Sorting at supplier (X-ray 100%), rejected parts scrapped. Supplier repaired the die thermal unit and cleaned the vacuum valve.`,
    }
  }
  if (f.ch === 'CR_PCT') {
    return {
      ...base, status: 'Completed', closedOn: '2026-03-27', defectCode: 'MAT-CHEM',
      defectText: 'Chemical composition out of specification',
      shortText: `GR lot ${lot.ID}: chromium below 12.0 %, ${sup.name}`,
      rootCause: 'Mix-up at the mill: one bundle from a lower-chromium heat was tagged with the 4Cr13 heat number.',
      longText: `Spark OES check of batch ${lot.batch}: ${measured}. Mill certificate showed 13.1 % Cr, so the certificate did not match the material. ` +
        `Whole bundle returned. Mill added a PMI check before tagging.`,
    }
  }
  return {
    ...base, status: 'Completed', closedOn: iso(addDays(d, 14)), defectCode: 'DIM',
    defectText: 'Dimension out of tolerance', shortText: `GR lot ${lot.ID}: ${f.ch} out of tolerance`,
    rootCause: 'Grinding wheel dressing interval exceeded.', longText: `${measured}. Lot sorted 100%.`,
  }
}

// Customer complaint (Q1) and internal problem (Q3) that close the V200 story.
// The escaped batch is the last accepted 8.0 mm lot inside the drift window.
const escaped = lots.filter((l) => l.material_ID === 'AX-4CR13-080' && l.usageDecision === 'A' &&
  l.createdOn >= iso(DRIFT_FROM) && l.createdOn < '2026-08-11').pop()
notifications.push({
  ID: String(++qmNo), type: 'Q1', typeText: 'Customer complaint', priority: '1', status: 'Completed',
  material_ID: 'AX-4CR13-080', supplier_ID: 'V200', lot_ID: escaped.ID, batch: escaped.batch, createdOn: '2026-08-12', closedOn: '2026-09-04',
  defectCode: 'FRAC-BRIT', defectText: 'Axle fractured at shaft shoulder (brittle)', defectQuantity: 3,
  shortText: 'Customer 0002100 (window-lift drives): 3 axles cracked at end-of-line test',
  rootCause: `Part of heat-treat batch ${escaped.batch} was under-tempered (thermocouple drift at Härterei Weser furnace TO-3). The 5 sampled parts came from a correctly tempered basket, so the lot passed goods receipt.`,
  longText: 'Customer end-of-line test found 3 cracked axles at the shaft shoulder. Lab: HV10 671, 668, 675. SEM fractography: flat cleavage facets, no dimples, so brittle fracture. ' +
    'Containment: customer stock sorted, 100% HV10 at our goods receipt for 6 lots. 8D with Härterei Weser: thermocouple replaced 2026-08-20, temper temperature now logged with SPC, ' +
    'second independent thermocouple added, verification lots after 2026-08-24 all within 450 to 650 HV10.',
})
notifications.push({
  ID: String(++qmNo), type: 'Q3', typeText: 'Internal problem', priority: '2', status: 'Completed',
  material_ID: 'AX-4CR13-080', supplier_ID: '', lot_ID: '', batch: '', createdOn: '2026-08-13', closedOn: '2026-08-28',
  defectCode: 'PROC-CTRL', defectText: 'Sampling plan not tightened after first HV10 reject', defectQuantity: 0,
  shortText: 'Internal: GR sampling stayed at 5 parts after first HV10 rejection',
  rootCause: 'Control plan reaction step (switch to tightened inspection after a rejected lot) was not linked to the inspection plan in QM.',
  longText: `After the first HV10 rejection in July, sampling stayed at 5 parts per lot, which let batch ${escaped.batch} pass. ` +
    'Action: dynamic modification rule added so the next 5 lots after a rejection use tightened inspection.',
})
notifications.push({
  ID: String(++qmNo), type: 'Q2', typeText: 'Complaint against vendor', priority: '3', status: 'Open',
  material_ID: 'HSG-AC44300', supplier_ID: 'V300', lot_ID: '', batch: 'B2609-033', createdOn: '2026-09-18', closedOn: '',
  defectCode: 'PACK', defectText: 'Packaging damage, housings scratched', defectQuantity: 40,
  shortText: 'Housings scratched in transport, KLT separator missing',
  rootCause: 'Under investigation.',
  longText: '40 housings in batch B2609-033 scratched on the sealing face because KLT separators were missing. Parts sorted, sealing face OK on 1160 parts. Supplier asked to confirm packaging instruction.',
})

fs.mkdirSync(OUT, { recursive: true })
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.csv')) fs.unlinkSync(path.join(OUT, f))
const counts = {
  Plants: csv('Plants', plants),
  Suppliers: csv('Suppliers', suppliers),
  Materials: csv('Materials', materials),
  Specifications: csv('Specifications', specs),
  PurchaseOrders: csv('PurchaseOrders', purchaseOrders),
  InspectionLots: csv('InspectionLots', lots),
  InspectionResults: csv('InspectionResults', results),
  QualityNotifications: csv('QualityNotifications', notifications),
}
console.log('Wrote db/data:', counts)
console.log('Rejected lots:', lots.filter((l) => l.usageDecision === 'R').map((l) => `${l.ID} ${l.material_ID} ${l.createdOn}`).join(', '))

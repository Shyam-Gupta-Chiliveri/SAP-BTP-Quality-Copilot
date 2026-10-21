// Specialist tools. Each one runs CQL against the CDS model and returns plain facts
// with references, so the synthesizer and critic only work with retrieved numbers.

const ns = 'sap.quality'
const E = (name) => `${ns}.${name}`
const r = (x, d = 2) => (x === null || x === undefined || Number.isNaN(x) ? null : Number(Number(x).toFixed(d)))
const DAY = 86400000

const DECIMALS = { C_PCT: 3, CR_PCT: 2, HV10: 0, BEND_F: 0, DIAM: 4, SI_PCT: 2, POROSITY: 2, WALL_MM: 3 }

function capability(rows, spec) {
  if (!rows.length) return null
  const means = rows.map((x) => Number(x.mean))
  const mu = means.reduce((a, b) => a + b, 0) / means.length
  const within = rows.reduce((a, x) => a + Number(x.stdDev) ** 2, 0) / rows.length
  const between = means.length > 1 ? means.reduce((a, m) => a + (m - mu) ** 2, 0) / (means.length - 1) : 0
  const sigma = Math.sqrt(within + between)
  const lsl = Number(spec.lowerLimit), usl = Number(spec.upperLimit)
  // A lower limit of 0 on a "less is better" characteristic (porosity) is a natural bound, so only Cpu applies.
  const oneSided = lsl === 0
  const cpk = sigma > 0 ? (oneSided ? usl - mu : Math.min(usl - mu, mu - lsl)) / (3 * sigma) : null
  return { mean: mu, sigma, cpk, lsl, usl }
}

async function latestDate() {
  const [row] = await SELECT.from(E('InspectionLots')).columns('max(createdOn) as d')
  return row && row.d ? new Date(row.d + 'T00:00:00Z') : new Date()
}

const select = (entity, where) => (where ? SELECT.from(E(entity)).where(where) : SELECT.from(E(entity)))

async function specs(materials) {
  return select('Specifications', materials && materials.length ? { material_ID: { in: materials } } : null)
}

async function inspection({ materials = [], characteristics = [], suppliers = [], recent = false }) {
  const t0 = Date.now()
  const specRows = await specs(materials)
  const facts = [], citations = [], data = []
  const end = await latestDate()
  const since = new Date(end.getTime() - 30 * DAY).toISOString().slice(0, 10)

  for (const material of [...new Set(specRows.map((s) => s.material_ID))]) {
    const lotWhere = { material_ID: material }
    if (suppliers.length) lotWhere.supplier_ID = { in: suppliers }
    const lots = await SELECT.from(E('InspectionLots')).where(lotWhere).orderBy('createdOn')
    if (!lots.length) continue
    const lotById = Object.fromEntries(lots.map((l) => [l.ID, l]))
    const chars = specRows.filter((s) => s.material_ID === material &&
      (!characteristics.length || characteristics.includes(s.characteristic)))
    for (const spec of chars) {
      const res = await SELECT.from(E('InspectionResults'))
        .where({ lot_ID: { in: lots.map((l) => l.ID) }, characteristic: spec.characteristic })
      res.sort((a, b) => lotById[a.lot_ID].createdOn.localeCompare(lotById[b.lot_ID].createdOn))
      const all = capability(res, spec)
      const recentRows = res.filter((x) => lotById[x.lot_ID].createdOn >= since)
      const rec = capability(recentRows, spec)
      const rejected = res.filter((x) => x.valuation === 'R')
      const recentRejected = recentRows.filter((x) => x.valuation === 'R').length
      const worst = res.reduce((w, x) => (Math.max(Number(x.maxValue) - spec.upperLimit, spec.lowerLimit - Number(x.minValue)) >
        Math.max(Number(w.maxValue) - spec.upperLimit, spec.lowerLimit - Number(w.minValue)) ? x : w), res[0])
      const dp = DECIMALS[spec.characteristic] ?? 2
      const row = {
        material, characteristic: spec.characteristic, unit: spec.unit, lsl: Number(spec.lowerLimit), usl: Number(spec.upperLimit),
        lots: res.length, rejectedLots: rejected.length, mean: r(all.mean, dp + 1), cpk: r(all.cpk, 2),
        recentLots: recentRows.length, recentMean: rec ? r(rec.mean, dp + 1) : null, recentCpk: rec ? r(rec.cpk, 2) : null,
        recentSince: since, worstLot: worst.lot_ID, worstMin: Number(worst.minValue), worstMax: Number(worst.maxValue),
        rejectedLotIds: rejected.map((x) => x.lot_ID),
      }
      data.push(row)
      const ref = `SPEC ${material}/${spec.characteristic}`
      facts.push(`${material} ${spec.characteristic} (${spec.description}): limits ${row.lsl} to ${row.usl} ${spec.unit}; ` +
        `${row.lots} lots, mean ${row.mean}, Cpk ${row.cpk}, rejected lots ${row.rejectedLots}` +
        (rec ? `; last 30 days (since ${since}): ${row.recentLots} lots, ${recentRejected} rejected, mean ${row.recentMean}, Cpk ${row.recentCpk}` : '') +
        (rejected.length ? `; rejected lot IDs (all time) ${row.rejectedLotIds.join(', ')}` : '') + ` [${ref}]`)
      citations.push({ ref, title: `${material} ${spec.characteristic} capability`, kind: 'CDS: InspectionResults',
        snippet: `${row.lots} lots, Cpk ${row.cpk}, recent Cpk ${row.recentCpk ?? 'n/a'}` })
    }
  }
  return { tool: 'inspection', facts, citations, data, ms: Date.now() - t0,
    summary: data.length ? `${data.length} characteristic(s) analysed from InspectionResults` : 'no inspection data matched' }
}

async function trend({ materials = [], characteristics = [] }) {
  const t0 = Date.now()
  const material = materials[0] || 'AX-4CR13-080'
  const characteristic = characteristics[0] || (material.startsWith('HSG') ? 'POROSITY' : material.startsWith('BAR') ? 'CR_PCT' : 'HV10')
  const [spec] = await SELECT.from(E('Specifications')).where({ material_ID: material, characteristic })
  if (!spec) return { tool: 'trend', facts: [], citations: [], data: [], ms: Date.now() - t0, summary: 'no spec for trend' }
  const lots = await SELECT.from(E('InspectionLots')).where({ material_ID: material })
  const lotById = Object.fromEntries(lots.map((l) => [l.ID, l]))
  const res = await SELECT.from(E('InspectionResults')).where({ lot_ID: { in: lots.map((l) => l.ID) }, characteristic })
  const months = {}
  for (const x of res) {
    const m = lotById[x.lot_ID].createdOn.slice(0, 7)
    ;(months[m] ||= []).push(x)
  }
  const dp = DECIMALS[characteristic] ?? 2
  const data = Object.keys(months).sort().map((m) => {
    const rows = months[m]
    const mean = rows.reduce((a, x) => a + Number(x.mean), 0) / rows.length
    return { month: m, lots: rows.length, mean: r(mean, dp + 1), max: Math.max(...rows.map((x) => Number(x.maxValue))),
      min: Math.min(...rows.map((x) => Number(x.minValue))), rejected: rows.filter((x) => x.valuation === 'R').length }
  })
  const ref = `TREND ${material}/${characteristic}`
  const status = recovery(data)
  const facts = [`Monthly ${characteristic} for ${material} (limits ${spec.lowerLimit} to ${spec.upperLimit} ${spec.unit}): ` +
    data.map((d) => `${d.month} mean ${d.mean}, max ${d.max}, min ${d.min}, rejected ${d.rejected}/${d.lots}`).join('; ') + ` [${ref}]`,
    (status.lastBad
      ? `Last month with a rejected ${characteristic} lot: ${status.lastBad}. Since then ${status.lotsAfter} lot(s) in ${status.monthsAfter} month(s), all accepted. Status: ${status.solved ? 'SOLVED (no recurrence)' : 'NOT PROVEN (too few months since)'}`
      : `No rejected ${characteristic} lot in any month. Status: NO PROBLEM RECORDED`) + ` [${ref}]`]
  return { tool: 'trend', facts, data, status, characteristic, material, ms: Date.now() - t0, summary: `${data.length} months of ${characteristic} for ${material}`,
    citations: [{ ref, title: `${material} ${characteristic} by month`, kind: 'CDS: InspectionResults', snippet: data.map((d) => `${d.month}: ${d.mean}`).join(', ') }] }
}

function recovery(months) {
  const lastBad = [...months].reverse().find((m) => m.rejected > 0)
  const after = lastBad ? months.filter((m) => m.month > lastBad.month) : months
  return {
    lastBad: lastBad ? lastBad.month : null,
    monthsAfter: after.length,
    lotsAfter: after.reduce((a, m) => a + m.lots, 0),
    solved: !lastBad || after.length >= 2,
  }
}

async function scorecards({ suppliers = [] } = {}) {
  const t0 = Date.now()
  const sups = await select('Suppliers', suppliers.length ? { ID: { in: suppliers } } : null)
  const data = []
  for (const s of sups) {
    const lots = await SELECT.from(E('InspectionLots')).where({ supplier_ID: s.ID })
    const notes = await SELECT.from(E('QualityNotifications')).where({ supplier_ID: s.ID, type: 'Q2' })
    const delivered = lots.reduce((a, l) => a + Number(l.lotSize), 0)
    const rejected = lots.filter((l) => l.usageDecision === 'R')
    const defectQty = notes.reduce((a, n) => a + Number(n.defectQuantity || 0), 0)
    const openQ2 = notes.filter((n) => n.status !== 'Completed').length
    const rate = lots.length ? (100 * rejected.length) / lots.length : 0
    const rating = rate <= 2 && openQ2 === 0 ? 'A' : rate <= 6 ? 'B' : 'C'
    data.push({ supplier: s.ID, name: s.name, category: s.category, lots: lots.length, rejectedLots: rejected.length,
      lotRejectRate: r(rate, 1), defectPpm: delivered ? Math.round((defectQty / delivered) * 1e6) : 0, openQ2, rating })
  }
  data.sort((a, b) => b.lotRejectRate - a.lotRejectRate || b.defectPpm - a.defectPpm)
  const facts = data.map((d) => `Supplier ${d.supplier} ${d.name} (${d.category}): ${d.lots} lots, ${d.rejectedLots} rejected, ` +
    `lot reject rate ${d.lotRejectRate} %, defect PPM ${d.defectPpm}, open Q2 ${d.openQ2}, rating ${d.rating} [SUP ${d.supplier}]`)
  const citations = data.map((d) => ({ ref: `SUP ${d.supplier}`, title: `${d.name} scorecard`, kind: 'CDS: Suppliers + InspectionLots',
    snippet: `reject rate ${d.lotRejectRate} %, PPM ${d.defectPpm}, rating ${d.rating}` }))
  return { tool: 'scorecard', facts, citations, data, ms: Date.now() - t0, summary: `${data.length} supplier scorecard(s)` }
}

async function notifications({ suppliers = [], materials = [], notificationIds = [], lotIds = [], batches = [], limit = 6 }) {
  const t0 = Date.now()
  let rows
  if (notificationIds.length) rows = await SELECT.from(E('QualityNotifications')).where({ ID: { in: notificationIds } })
  else {
    rows = await SELECT.from(E('QualityNotifications'))
    rows = rows.filter((n) =>
      (!suppliers.length || suppliers.includes(n.supplier_ID) || (!n.supplier_ID && materials.includes(n.material_ID))) &&
      (!materials.length || materials.includes(n.material_ID)) &&
      (!lotIds.length || lotIds.includes(n.lot_ID)) &&
      (!batches.length || batches.includes(n.batch)))
  }
  const rank = (n) => (n.type === 'Q1' ? 0 : n.status !== 'Completed' ? 1 : n.type === 'Q3' ? 2 : 3)
  rows.sort((a, b) => rank(a) - rank(b) || b.createdOn.localeCompare(a.createdOn))
  const total = rows.length
  const open = rows.filter((n) => n.status !== 'Completed').length
  const shown = rows.slice(0, limit)
  const facts = [`${total} quality notification(s) match, ${open} open [QM list]`, ...shown.map((n) =>
    `${n.type} ${n.ID} (${n.status}, created ${n.createdOn}${n.closedOn ? `, closed ${n.closedOn}` : ''}) ${n.shortText}. ` +
    `Defect ${n.defectCode}: ${n.defectText}, quantity ${n.defectQuantity}. Root cause: ${n.rootCause} [QM ${n.ID}]`)]
  const citations = shown.map((n) => ({ ref: `QM ${n.ID}`, title: `${n.type} ${n.ID} - ${n.shortText}`, kind: 'CDS: QualityNotifications',
    snippet: n.longText.slice(0, 220) }))
  return { tool: 'notifications', facts, citations, data: rows, ms: Date.now() - t0, summary: `${total} notification(s), ${open} open` }
}

async function lookup({ lotIds = [], batches = [] }) {
  const t0 = Date.now()
  const facts = [], citations = [], data = []
  const lotWhere = lotIds.length ? { ID: { in: lotIds } } : batches.length ? { batch: { in: batches } } : null
  if (lotWhere) {
    const lots = await SELECT.from(E('InspectionLots')).where(lotWhere)
    for (const l of lots) {
      const res = await SELECT.from(E('InspectionResults')).where({ lot_ID: l.ID })
      data.push({ ...l, results: res })
      const ref = `LOT ${l.ID}`
      facts.push(`Inspection lot ${l.ID} (origin ${l.origin} ${l.originText}), material ${l.material_ID}, supplier ${l.supplier_ID}, ` +
        `batch ${l.batch}, PO ${l.purchaseOrder_ID}, created ${l.createdOn}, lot size ${l.lotSize}, usage decision ${l.usageDecision} ${l.usageDecisionText}. ` +
        `Results: ` + res.map((x) => `${x.characteristic} mean ${Number(x.mean)} (${Number(x.minValue)} to ${Number(x.maxValue)}) ${x.valuation}`).join('; ') + ` [${ref}]`)
      citations.push({ ref, title: `Inspection lot ${l.ID}`, kind: 'CDS: InspectionLots', snippet: `${l.material_ID}, ${l.batch}, UD ${l.usageDecision}` })
    }
  }
  return { tool: 'lookup', facts, citations, data, ms: Date.now() - t0, summary: `${data.length} lot(s) found` }
}

async function cockpitKpis() {
  const lots = await SELECT.from(E('InspectionLots'))
  const notes = await SELECT.from(E('QualityNotifications'))
  const rejected = lots.filter((l) => l.usageDecision === 'R').length
  const open = notes.filter((n) => n.status !== 'Completed').length
  const q1 = notes.filter((n) => n.type === 'Q1').length
  const insp = await inspection({ materials: [], characteristics: [] })
  const worst = insp.data.filter((d) => d.recentCpk !== null).sort((a, b) => a.recentCpk - b.recentCpk)[0]
  const rate = (100 * rejected) / lots.length
  return [
    { id: 'lots', label: 'Inspection lots (GR)', value: String(lots.length), unit: '', state: 'Information', hint: 'Origin 01, Feb to Sep 2026' },
    { id: 'reject', label: 'Lot reject rate', value: r(rate, 1).toFixed(1), unit: '%', state: rate > 5 ? 'Error' : rate > 2 ? 'Critical' : 'Success', hint: `${rejected} lots with usage decision R` },
    { id: 'open', label: 'Open Q-notifications', value: String(open), unit: '', state: open ? 'Critical' : 'Success', hint: `${q1} customer complaint(s) this year` },
    { id: 'cpk', label: 'Lowest Cpk, last 30 days', value: worst ? worst.recentCpk.toFixed(2) : 'n/a', unit: '', state: worst && worst.recentCpk < 1.33 ? 'Critical' : 'Success',
      hint: worst ? `${worst.material} ${worst.characteristic}` : '' },
  ]
}

module.exports = { inspection, trend, scorecards, notifications, lookup, cockpitKpis, capability }

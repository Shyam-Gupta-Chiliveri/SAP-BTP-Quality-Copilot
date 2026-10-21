// Phase 0 readiness assessment: recommends an S/4HANA transition path
// (Greenfield = new implementation, Brownfield = system conversion,
// Hybrid = selective data transition) with weighted, explainable rules.
// Weights are an architect's heuristics for discussion, not SAP guidance.

const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x))
const r0 = (x) => Math.round(x)

const DEFAULTS = {
  sourceSystem: 'ECC6',          // ECC6 | S4_ONPREM | NON_SAP
  deployment: 'RISE_PRIVATE',    // RISE_PRIVATE | RISE_PUBLIC | ONPREM
  customCodeObjects: 6000,
  customCodeUsagePct: 45,
  dataVolumeTB: 8,
  historyYears: 5,
  processChange: 'MEDIUM',       // LOW | MEDIUM | HIGH
  companyCodes: 12,
  mergersOrCarveOuts: false,
  analytics: 'BW_ONPREM',        // BW_ONPREM | BW4HANA | DATASPHERE | NONE
  integrations: 60,
  dataQuality: 3,                // 1 (poor) .. 5 (excellent)
  btpInPlace: false,
  targetMonths: 18,
}

function normalise(input = {}) {
  const x = { ...DEFAULTS }
  for (const [k, v] of Object.entries(input)) if (v !== null && v !== undefined && v !== '') x[k] = v
  for (const k of ['customCodeObjects', 'customCodeUsagePct', 'dataVolumeTB', 'historyYears', 'companyCodes', 'integrations', 'dataQuality', 'targetMonths']) x[k] = Number(x[k])
  x.mergersOrCarveOuts = x.mergersOrCarveOuts === true || x.mergersOrCarveOuts === 'true'
  x.btpInPlace = x.btpInPlace === true || x.btpInPlace === 'true'
  x.customCodeUsagePct = clamp(x.customCodeUsagePct)
  x.dataQuality = clamp(x.dataQuality, 1, 5)
  return x
}

function assess(input) {
  const x = normalise(input)
  const s = { GREENFIELD: 50, BROWNFIELD: 50, HYBRID: 50 }
  const rules = []
  const add = (path, pts, why) => { s[path] += pts; rules.push({ path, points: pts, reason: why }) }

  const usedObjects = r0(x.customCodeObjects * x.customCodeUsagePct / 100)
  const retireObjects = x.customCodeObjects - usedObjects

  if (x.processChange === 'HIGH') { add('GREENFIELD', 25, 'High appetite for process redesign favours a new implementation on SAP standard'); add('BROWNFIELD', -15, 'Conversion keeps today\'s processes, which works against a redesign goal') }
  if (x.processChange === 'LOW') { add('BROWNFIELD', 25, 'Low appetite for process change: a conversion keeps processes and limits business disruption'); add('GREENFIELD', -15, 'A new implementation forces process change the business does not want') }
  if (x.processChange === 'MEDIUM') add('HYBRID', 10, 'Medium process change: redesign selected processes, keep the rest')

  if (x.historyYears >= 7) { add('BROWNFIELD', 15, `${x.historyYears} years of history needed: a conversion keeps all history`); add('GREENFIELD', -10, 'A new implementation normally migrates open items and balances only') }
  else if (x.historyYears <= 2) add('GREENFIELD', 10, `Only ${x.historyYears} year(s) of history needed: open items and balances are enough`)
  else add('HYBRID', 8, `${x.historyYears} years of history: selective transition can move chosen history`)

  if (x.customCodeUsagePct < 35) add('GREENFIELD', 12, `Only ${x.customCodeUsagePct} % of custom code is used: ${retireObjects} objects can be retired`)
  if (x.customCodeUsagePct >= 60 && x.processChange !== 'HIGH') add('BROWNFIELD', 10, `${x.customCodeUsagePct} % of custom code is in use and must be kept or remediated`)
  if (x.customCodeObjects > 15000) add('HYBRID', 8, `${x.customCodeObjects} custom objects: selective transition allows a clean-up while keeping key logic`)

  if (x.mergersOrCarveOuts) { add('HYBRID', 25, 'Mergers or carve-outs: selective data transition can split or merge company codes'); add('BROWNFIELD', -10, 'Conversion moves the whole system, which does not fit a carve-out') }
  if (x.companyCodes >= 40) add('HYBRID', 12, `${x.companyCodes} company codes: a phased, selective approach lowers cut-over risk`)
  if (x.dataVolumeTB >= 20) { add('HYBRID', 8, `${x.dataVolumeTB} TB: selective transition and archiving reduce the data moved`); add('BROWNFIELD', -5, 'Large database means a long conversion downtime without downtime-optimised options') }
  if (x.dataQuality <= 2) { add('GREENFIELD', 12, `Data quality ${x.dataQuality}/5: a new implementation with cleansed load is safer`); add('BROWNFIELD', -8, 'Poor data quality would be carried over by a conversion') }
  if (x.targetMonths <= 12) { add('BROWNFIELD', 12, `Target ${x.targetMonths} months: a technical conversion is usually the fastest path`); add('GREENFIELD', -8, 'A short timeline is hard for a full new implementation') }
  if (x.targetMonths >= 24) add('GREENFIELD', 6, `${x.targetMonths} months allow a full redesign`)

  const hard = []
  if (x.sourceSystem === 'NON_SAP') { s.GREENFIELD += 100; hard.push('Source is not SAP, so only a new implementation is possible') }
  if (x.deployment === 'RISE_PUBLIC') { s.GREENFIELD += 100; hard.push('S/4HANA Cloud Public Edition only supports a new implementation') }
  if (x.sourceSystem === 'S4_ONPREM') { s.BROWNFIELD += 60; hard.push('Source is already S/4HANA: move to RISE with SAP Private Edition as a technical migration, not a functional re-implementation') }

  for (const k of Object.keys(s)) s[k] = clamp(r0(s[k]))
  const ranking = Object.entries(s).sort((a, b) => b[1] - a[1])
  const recommendation = ranking[0][0]
  const margin = ranking[0][1] - ranking[1][1]

  // Clean core: share of custom code that would remain classic (non-released-API) extensions.
  const cleanCore = clamp(r0(100 - (usedObjects / 120) - (x.processChange === 'LOW' ? 10 : 0) + (x.btpInPlace ? 8 : 0)))
  const aiReadiness = clamp(r0(
    x.dataQuality * 12 +
    cleanCore * 0.25 +
    (x.btpInPlace ? 12 : 0) +
    ({ DATASPHERE: 14, BW4HANA: 8, BW_ONPREM: 4, NONE: 0 }[x.analytics] || 0) +
    (x.deployment !== 'ONPREM' ? 8 : 0)))

  return {
    input: x,
    recommendation,
    label: LABEL[recommendation],
    confidence: hard.length ? 'High (hard constraint)' : margin >= 20 ? 'High' : margin >= 8 ? 'Medium' : 'Low: run a deeper Phase 0 study',
    scores: s,
    hardConstraints: hard,
    rules: rules.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    customCode: { total: x.customCodeObjects, used: usedObjects, retire: retireObjects },
    cleanCore,
    aiReadiness,
    dataStrategy: dataStrategy(x),
    rise: riseScope(x, recommendation),
    toolchain: toolchain(x, recommendation),
    roadmap: roadmap(x, recommendation),
    risks: risks(x, recommendation, cleanCore),
  }
}

const LABEL = {
  GREENFIELD: 'Greenfield: new implementation',
  BROWNFIELD: 'Brownfield: system conversion',
  HYBRID: 'Hybrid: selective data transition',
}

function dataStrategy(x) {
  const m = {
    BW_ONPREM: 'Move classic BW to SAP Business Data Cloud: lift reports to BW private cloud edition first, then replace them step by step with SAP Datasphere models on SAP-managed data products.',
    BW4HANA: 'Bring BW/4HANA into SAP Business Data Cloud as BW private cloud edition and expose its models to SAP Datasphere, so new analytics and AI use data products without copying data.',
    DATASPHERE: 'Datasphere is in place: activate SAP Business Data Cloud data products for S/4HANA and connect AI and planning use cases to the same semantic layer.',
    NONE: 'Start directly on SAP Business Data Cloud with SAP Datasphere and SAP Analytics Cloud; no BW migration needed.',
  }
  return m[x.analytics] || m.NONE
}

function riseScope(x, path) {
  const items = [
    { item: x.deployment === 'RISE_PUBLIC' ? 'SAP S/4HANA Cloud Public Edition' : 'SAP S/4HANA Cloud Private Edition', why: 'Core ERP under RISE with SAP' },
    { item: 'SAP Business Technology Platform credits', why: 'CAP side-by-side extensions, Integration Suite, AI Core / Generative AI Hub' },
    { item: 'SAP Signavio Process Insights', why: 'Fact-based process analysis for Phase 0 and the fit-to-standard workshops' },
    { item: 'SAP Cloud ALM', why: 'Implementation and operations tooling for the program' },
    { item: 'SAP Business Network starter pack', why: 'Supplier collaboration for procurement and quality' },
  ]
  if (path !== 'BROWNFIELD') items.push({ item: 'SAP LeanIX', why: 'Application portfolio and integration landscape for the target architecture' })
  return items
}

function toolchain(x, path) {
  const common = [
    { phase: 'Discover', tool: 'SAP Readiness Check for SAP S/4HANA', purpose: 'Simplification items, add-ons, sizing, custom code impact' },
    { phase: 'Discover', tool: 'SAP Signavio Process Insights', purpose: 'Process performance baseline and improvement potential' },
    { phase: 'Prepare', tool: 'SAP Cloud ALM', purpose: 'Project plan, requirements, test and cut-over management' },
    { phase: 'Prepare', tool: 'SAP Activate roadmap', purpose: 'Phase deliverables and quality gates' },
    { phase: 'Explore', tool: 'ABAP Test Cockpit (ATC) with custom code checks', purpose: `Analyse ${x.customCodeObjects} custom objects, retire the unused share` },
  ]
  const byPath = {
    BROWNFIELD: [
      { phase: 'Prepare', tool: 'Maintenance Planner', purpose: 'Target stack and add-on compatibility' },
      { phase: 'Realize', tool: 'Software Update Manager (SUM) with DMO', purpose: 'Database migration and conversion in one step, with downtime-optimised options' },
      { phase: 'Realize', tool: 'Simplification Item Check', purpose: 'Mandatory pre-checks before conversion' },
    ],
    GREENFIELD: [
      { phase: 'Explore', tool: 'Fit-to-standard workshops with SAP Best Practices', purpose: 'Adopt standard processes first' },
      { phase: 'Realize', tool: 'SAP S/4HANA Migration Cockpit', purpose: 'Load master data and open items from staging tables' },
    ],
    HYBRID: [
      { phase: 'Explore', tool: 'Selective data transition approach (SAP DMLT or partner tooling)', purpose: 'Choose company codes, history and data to move' },
      { phase: 'Realize', tool: 'Shell conversion plus selective data load', purpose: 'Keep chosen configuration and custom code, move chosen data' },
    ],
  }
  return [...common, ...byPath[path]]
}

function roadmap(x, path) {
  const base = { GREENFIELD: 1.15, BROWNFIELD: 0.85, HYBRID: 1.0 }[path]
  const size = 1 + Math.min(0.6, x.companyCodes / 100) + Math.min(0.3, x.integrations / 400)
  const m = (w) => Math.max(1, Math.round(w * base * size * 10) / 10)
  return [
    { phase: 'Discover', months: 1, deliverables: 'Value case, Readiness Check, process insights, AI use-case shortlist' },
    { phase: 'Prepare', months: m(1.5), deliverables: 'Program plan, architecture runway, BTP account model, toolchain set up' },
    { phase: 'Explore', months: m(3), deliverables: path === 'BROWNFIELD' ? 'Delta design, custom code worklist, simplification items' : 'Fit-to-standard, backlog, data migration design' },
    { phase: 'Realize', months: m(6), deliverables: 'Build in sprints, extensions on BTP (CAP / RAP clean core), integrations, test cycles' },
    { phase: 'Deploy', months: m(1.5), deliverables: 'Dress rehearsals, cut-over, go-live' },
    { phase: 'Run', months: 2, deliverables: 'Hypercare, Embedded AI and Joule activation, continuous improvement' },
  ]
}

function risks(x, path, cleanCore) {
  const out = []
  if (cleanCore < 50) out.push(`Clean-core score ${cleanCore}/100: move modifications to released APIs (RAP, key-user, BTP side-by-side) or they block upgrades and AI features`)
  if (x.dataQuality <= 2) out.push('Poor data quality reduces AI value: start data cleansing in Prepare, not in Realize')
  if (x.integrations > 100) out.push(`${x.integrations} interfaces: plan an SAP Integration Suite migration factory and early interface testing`)
  if (path === 'BROWNFIELD' && x.dataVolumeTB >= 15) out.push(`${x.dataVolumeTB} TB conversion: test downtime early and archive before conversion`)
  if (!x.btpInPlace) out.push('No BTP landscape yet: set up the global account, directories and security model in Prepare')
  if (x.analytics === 'BW_ONPREM') out.push('Classic BW extractors need review against S/4HANA: plan analytics in the same roadmap')
  return out
}

module.exports = { assess, normalise, DEFAULTS, LABEL }

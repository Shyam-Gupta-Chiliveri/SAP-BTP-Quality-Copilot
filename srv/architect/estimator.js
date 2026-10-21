// Rough-order-of-magnitude (ROM) effort estimate for a proposal, built from the
// Phase 0 assessment. Every line shows its driver so the number can be challenged.

const { assess } = require('./assessment')
const { USE_CASES, TIERS } = require('./portfolio')

const r0 = (x) => Math.round(x)

function estimate({ assessmentInput = {}, useCaseIds = [], dayRate = 900, contingencyPct = 15 } = {}) {
  const a = assess(assessmentInput)
  const x = a.input
  const path = a.recommendation
  const lines = []
  const add = (workstream, pd, driver) => lines.push({ workstream, personDays: r0(pd), driver })

  const scale = 1 + Math.min(1.5, (x.companyCodes - 1) * 0.03)
  add('Phase 0 and program setup', 40 + 4 * x.companyCodes, `40 base + 4 per company code (${x.companyCodes})`)
  add('Process design and configuration', { GREENFIELD: 900, BROWNFIELD: 420, HYBRID: 700 }[path] * scale,
    `${{ GREENFIELD: 900, BROWNFIELD: 420, HYBRID: 700 }[path]} base for ${path.toLowerCase()} x ${scale.toFixed(2)} scale`)
  add('Custom code and clean-core extensions',
    path === 'BROWNFIELD' ? a.customCode.used * 0.12 : a.customCode.used * 0.07,
    path === 'BROWNFIELD' ? `${a.customCode.used} used objects x 0.12 pd remediation`
      : `${a.customCode.used} used objects x 0.07 pd: rebuild what is needed on RAP / BTP`)
  add('Data migration', { GREENFIELD: 160 + 6 * x.dataVolumeTB, BROWNFIELD: 90 + 12 * x.dataVolumeTB, HYBRID: 220 + 15 * x.dataVolumeTB }[path],
    `${path === 'GREENFIELD' ? '160 + 6' : path === 'BROWNFIELD' ? '90 + 12' : '220 + 15'} per TB (${x.dataVolumeTB} TB)`)
  add('Integration (SAP Integration Suite)', x.integrations * 6, `${x.integrations} interfaces x 6 pd`)
  add('Analytics: BW / Datasphere / Business Data Cloud', { BW_ONPREM: 260, BW4HANA: 160, DATASPHERE: 80, NONE: 120 }[x.analytics],
    `analytics start point ${x.analytics}`)
  add('BTP foundation and security', x.btpInPlace ? 25 : 60, x.btpInPlace ? 'existing BTP landscape' : 'new global account, directories, IAS / XSUAA')

  const chosen = USE_CASES.filter((u) => useCaseIds.includes(u.id))
  for (const u of chosen) add(`AI: ${u.title}`, u.effortPd, `${TIERS[u.tier].name} use case ${u.id}`)

  const build = lines.reduce((s, l) => s + l.personDays, 0)
  add('Testing (SIT, UAT, regression)', build * 0.2, '20 % of build effort')
  add('Cut-over and hypercare', build * 0.08, '8 % of build effort')
  add('Program and change management', build * 0.1, '10 % of build effort')

  const base = lines.reduce((s, l) => s + l.personDays, 0)
  const contingency = r0(base * contingencyPct / 100)
  const total = base + contingency
  const months = a.roadmap.reduce((s, p) => s + p.months, 0)
  const weeks = r0(months * 4.33)
  const avgFte = Math.round((total / (weeks * 5)) * 10) / 10
  const cost = total * dayRate

  return {
    path, label: a.label,
    lines, basePersonDays: base, contingencyPct, contingencyPersonDays: contingency, totalPersonDays: total,
    months: Math.round(months * 10) / 10, weeks, averageFte: avgFte,
    dayRate, costEur: r0(cost), costLowEur: r0(cost * 0.75), costHighEur: r0(cost * 1.25),
    team: team(avgFte, path, chosen),
    useCases: chosen.map((u) => u.id),
    accuracy: 'ROM estimate, -25 % to +25 %. Refine after Explore with a bottom-up plan.',
    assessment: { recommendation: a.recommendation, cleanCore: a.cleanCore, aiReadiness: a.aiReadiness },
  }
}

function team(fte, path, chosen) {
  const roles = [
    ['Solution / enterprise architect', 0.06], ['Functional consultants (FI/CO, MM, QM, PP, SD)', 0.34],
    ['ABAP / RAP developers', path === 'BROWNFIELD' ? 0.16 : 0.1], ['BTP / CAP developers', 0.08],
    ['Integration consultants', 0.1], ['Data migration specialists', 0.08], ['Analytics (Datasphere / BW)', 0.06],
    ['Test and quality', 0.1], ['PMO and change', 0.06],
  ]
  if (chosen.length) roles.push(['AI engineers (Gen AI Hub, Joule Studio)', 0.04 + 0.01 * chosen.length])
  const sum = roles.reduce((s, [, w]) => s + w, 0)
  return roles.map(([role, w]) => ({ role, fte: Math.max(0.5, Math.round((fte * w / sum) * 2) / 2) }))
}

module.exports = { estimate }

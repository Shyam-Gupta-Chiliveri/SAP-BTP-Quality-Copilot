const cds = require('@sap/cds')
const { assess } = require('./architect/assessment')
const { estimate } = require('./architect/estimator')
const { proposal } = require('./architect/proposal')
const { portfolio } = require('./architect/portfolio')
const { architecture } = require('./architect/architecture')
const governance = require('./architect/governance')

const bound = (n, lo, hi, dflt) => (Number.isFinite(Number(n)) && n !== null ? Math.max(lo, Math.min(hi, Number(n))) : dflt)

function cleanInput(input = {}) {
  const x = { ...(input || {}) }
  const limits = { customCodeObjects: [0, 200000], customCodeUsagePct: [0, 100], dataVolumeTB: [0, 500], historyYears: [0, 30],
    companyCodes: [1, 500], integrations: [0, 2000], dataQuality: [1, 5], targetMonths: [3, 60] }
  for (const [k, [lo, hi]] of Object.entries(limits)) if (x[k] !== undefined && x[k] !== null) x[k] = bound(x[k], lo, hi, undefined)
  return x
}

const { USE_CASES } = require('./architect/portfolio')
const KNOWN = new Set(USE_CASES.map((u) => u.id))

function ids(req) {
  const list = req.data.useCaseIds || []
  const bad = list.filter((s) => !KNOWN.has(s))
  if (bad.length) req.reject(400, `Unknown use case id: ${String(bad[0]).slice(0, 20)}`)
  return list.slice(0, 20)
}

module.exports = class ArchitectService extends cds.ApplicationService {
  init() {
    this.on('assess', (req) => assess(cleanInput(req.data.input)))
    this.on('estimate', (req) => estimate({
      assessmentInput: cleanInput(req.data.input), useCaseIds: ids(req),
      dayRate: bound(req.data.dayRate, 300, 3000, 900), contingencyPct: bound(req.data.contingencyPct, 0, 50, 15),
    }))
    this.on('proposal', async (req) => {
      const out = await proposal({
        client: req.data.client, assessmentInput: cleanInput(req.data.input), useCaseIds: ids(req),
        dayRate: bound(req.data.dayRate, 300, 3000, 900), contingencyPct: bound(req.data.contingencyPct, 0, 50, 15),
      })
      governance.record({ kind: 'proposal', question: `Proposal: ${String(req.data.client || 'client').slice(0, 40)}`, verdict: out.verdict, provider: out.provider, ms: out.ms })
      return out
    })
    this.on('portfolio', () => portfolio())
    this.on('architecture', () => architecture())
    this.on('governance', () => governance.snapshot())
    return super.init()
  }
}

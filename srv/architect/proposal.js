// Proposal generator: deterministic sections from the assessment and estimate,
// plus an executive summary written by the LLM and checked by the same critic.

const { assess } = require('./assessment')
const { estimate } = require('./estimator')
const { USE_CASES, TIERS } = require('./portfolio')
const llm = require('../agent/llm')
const { grounding } = require('../agent/critic')

const SPELLED = /\b(eleven|twelve|(?:thir|four|fif|six|seven|eigh|nine)teen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)\b/i
const eur = (n) => `EUR ${Math.round(n / 1000).toLocaleString('en-US')}k`

async function proposal({ client = 'the client', assessmentInput = {}, useCaseIds = [], dayRate = 900, contingencyPct = 15 } = {}) {
  const t0 = Date.now()
  const a = assess(assessmentInput)
  const e = estimate({ assessmentInput, useCaseIds, dayRate, contingencyPct })
  const ucs = USE_CASES.filter((u) => useCaseIds.includes(u.id))
  const name = String(client).slice(0, 60).replace(/[<>]/g, '') || 'the client'

  const facts = [
    `Client: ${name}. Source system ${a.input.sourceSystem}, target deployment ${a.input.deployment}, ${a.input.companyCodes} company codes, ${a.input.integrations} interfaces, ${a.input.dataVolumeTB} TB.`,
    `Recommended path: ${a.label}. Scores: Greenfield ${a.scores.GREENFIELD}, Brownfield ${a.scores.BROWNFIELD}, Hybrid ${a.scores.HYBRID}. Confidence ${a.confidence}.`,
    `Top reasons: ${a.rules.slice(0, 3).map((r) => r.reason).join('; ')}.`,
    `Clean-core score ${a.cleanCore}/100. AI readiness ${a.aiReadiness}/100. Custom code: ${a.customCode.used} of ${a.customCode.total} objects in use, ${a.customCode.retire} can be retired.`,
    `Effort ${e.totalPersonDays} person-days including ${e.contingencyPct} % contingency, about ${e.months} months, average ${e.averageFte} FTE.`,
    `Indicative cost ${eur(e.costLowEur)} to ${eur(e.costHighEur)} at EUR ${dayRate} per day (ROM, -25 % to +25 %).`,
    `Data strategy: ${a.dataStrategy}`,
    `Business AI use cases in scope: ${ucs.map((u) => `${u.id} ${u.title} (${TIERS[u.tier].name})`).join('; ') || 'none selected'}.`,
    `Main risks: ${a.risks.slice(0, 3).join('; ') || 'none flagged'}.`,
  ]

  const out = await llm.complete([
    { role: 'system', content: 'You are a senior SAP Business AI architect writing the executive summary of a proposal for business and IT managers. Use only the FACTS. Write every number in digits exactly as it appears in FACTS, never in words. 120 to 170 words, 2 short paragraphs, no headings, no bullet points, no thousands separators. Do not invent products, dates or prices.' },
    { role: 'user', content: `FACTS:\n${facts.join('\n')}` },
  ])
  const fallback = `${name} should take the ${a.label.toLowerCase()} path to SAP S/4HANA ${a.input.deployment === 'RISE_PUBLIC' ? 'Cloud Public Edition' : 'Cloud Private Edition'} under RISE with SAP. ` +
    `The assessment scores it ${a.scores[a.recommendation]} out of 100 (confidence: ${a.confidence.toLowerCase()}), mainly because ${a.rules[0] ? a.rules[0].reason.toLowerCase() : 'of the hard constraints'}. ` +
    `The clean-core score is ${a.cleanCore}/100 and AI readiness is ${a.aiReadiness}/100; ${a.customCode.retire} unused custom objects can be retired.\n\n` +
    `We estimate ${e.totalPersonDays} person-days over about ${e.months} months with an average team of ${e.averageFte} FTE, an indicative ${eur(e.costLowEur)} to ${eur(e.costHighEur)}. ` +
    (ucs.length ? `Business AI starts with ${ucs.length} use case(s), led by ${ucs[0].title}, so value arrives during the program and not after it.` : 'Business AI use cases can be added once the clean core is in place.')
  let summary = fallback, provider = 'Deterministic composer', verdict = 'pass', ungrounded = []
  if (out.text) {
    const g = grounding(out.text, facts.concat(fallback))
    const spelled = out.text.match(SPELLED)
    if (spelled) { g.grounded = false; g.ungrounded.push(`number written as a word: ${spelled[0]}`) }
    if (g.grounded) { summary = out.text.trim(); provider = `${out.provider} (${out.model})` }
    else { verdict = 'revised'; ungrounded = g.ungrounded; provider = `${out.provider} (replaced by deterministic composer)` }
  }

  const md = [
    `# SAP S/4HANA and Business AI proposal for ${name}`,
    `*Prepared with the SAP Business AI Architect Workbench. ROM estimate for discussion; refine after the Explore phase.*`,
    `## Executive summary`, summary,
    `## Recommended approach`,
    `**${a.label}** (Greenfield ${a.scores.GREENFIELD} / Brownfield ${a.scores.BROWNFIELD} / Hybrid ${a.scores.HYBRID}, confidence: ${a.confidence})`,
    ...a.hardConstraints.map((h) => `- Constraint: ${h}`),
    ...a.rules.slice(0, 6).map((r) => `- ${r.points > 0 ? '+' : ''}${r.points} ${r.path.toLowerCase()}: ${r.reason}`),
    `## RISE with SAP scope`, ...a.rise.map((r) => `- **${r.item}**: ${r.why}`),
    `## Data and analytics`, a.dataStrategy,
    `## Business AI roadmap`, ...(ucs.length ? ucs.map((u) => `- **${u.id} ${u.title}** (${TIERS[u.tier].name}): ${u.sap}. KPI: ${u.kpi}. ${u.effortPd} pd.`) : ['- No use case selected yet.']),
    `## SAP Activate roadmap`, `| Phase | Months | Key deliverables |`, `|---|---|---|`,
    ...a.roadmap.map((p) => `| ${p.phase} | ${p.months} | ${p.deliverables} |`),
    `## Effort estimate`, `| Workstream | Person-days | Driver |`, `|---|---|---|`,
    ...e.lines.map((l) => `| ${l.workstream} | ${l.personDays} | ${l.driver} |`),
    `| Contingency (${e.contingencyPct} %) | ${e.contingencyPersonDays} | risk buffer |`,
    `| **Total** | **${e.totalPersonDays}** | about ${e.months} months, ${e.averageFte} FTE average |`,
    `Indicative cost: **${eur(e.costLowEur)} to ${eur(e.costHighEur)}** (EUR ${dayRate}/day blended).`,
    `## Team`, ...e.team.map((t) => `- ${t.role}: ${t.fte} FTE`),
    `## Phase 0 toolchain`, ...a.toolchain.map((t) => `- ${t.phase}: **${t.tool}**, ${t.purpose}`),
    `## Risks and mitigations`, ...(a.risks.length ? a.risks.map((r) => `- ${r}`) : ['- No major risk flagged by the assessment.']),
    `## Assumptions`,
    '- Estimate is rough order of magnitude (-25 % to +25 %), based on the questionnaire only.',
    '- Client provides process owners and key users for fit-to-standard and testing.',
    '- SAP licences, RISE subscription and BTP credits are not included in the cost.',
  ].join('\n\n').replace(/\n\n(- |\| )/g, '\n$1')

  return { markdown: md, summary, provider, verdict, ungrounded, ms: Date.now() - t0, totalPersonDays: e.totalPersonDays, recommendation: a.recommendation }
}

module.exports = { proposal }

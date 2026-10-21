// Critic: (1) release gate from the control plan, computed from tool data, never
// from the LLM; (2) numeric grounding check on the final answer.

const CPK_MIN = 1.33

function releaseGate(routed, results) {
  const insp = results.inspection?.data || []
  const notes = results.notifications?.data || []
  const lots = results.lookup?.data || []
  const cards = results.scorecard?.data || []
  const { materials, suppliers } = routed.entities
  const reasons = [], warnings = []

  for (const l of lots) {
    if (l.usageDecision !== 'A') reasons.push(`Inspection lot ${l.ID} has usage decision ${l.usageDecision} (${l.usageDecisionText}) [LOT ${l.ID}]`)
  }
  for (const d of insp) {
    const cpk = d.recentCpk ?? d.cpk
    if (cpk !== null && cpk < CPK_MIN) {
      reasons.push(`${d.material} ${d.characteristic} Cpk ${cpk} in the last 30 days is below ${CPK_MIN} [SPEC ${d.material}/${d.characteristic}]`)
    } else if (d.cpk !== null && d.cpk < CPK_MIN) {
      warnings.push(`${d.material} ${d.characteristic} Cpk over all ${d.lots} lots is ${d.cpk}, recent ${d.recentCpk} [SPEC ${d.material}/${d.characteristic}]`)
    }
  }
  for (const n of notes.filter((n) => n.status !== 'Completed')) {
    reasons.push(`Open ${n.type} notification ${n.ID}: ${n.shortText} [QM ${n.ID}]`)
  }
  for (const c of cards.filter((c) => c.rating === 'C')) {
    warnings.push(`Supplier ${c.supplier} is rated C (lot reject rate ${c.lotRejectRate} %), escalation level 2 applies [SUP ${c.supplier}]`)
  }

  const scope = lots.length ? `inspection lot ${lots.map((l) => l.ID).join(', ')}`
    : [materials.join(', '), suppliers.length ? `from ${suppliers.join(', ')}` : ''].filter(Boolean).join(' ') || 'requested scope'
  const evaluated = insp.length > 0 || lots.length > 0
  return {
    evaluated,
    releaseAllowed: evaluated ? reasons.length === 0 : null,
    scope,
    reasons,
    warnings,
    rule: 'Release needs usage decision A, no open Q-notification, and Cpk >= 1.33 over the last 30 days [DOC CP-AX-4CR13#6]',
  }
}

const NUM = /(?<![A-Za-z0-9-])\d+(?:[.,]\d+)?(?![A-Za-z0-9-]*\d)/g

function numbersIn(text) {
  return (String(text).match(NUM) || []).map((s) => s.replace(',', '.'))
}

function normalise(text) {
  return String(text)
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/(\d)[\u00a0\u202f\u2009 ,'](?=\d{3}(?!\d))/g, '$1')
}

function grounding(answer, factTexts, question = '') {
  answer = normalise(answer)
  const pool = new Set()
  for (const t of [...factTexts, question]) {
    for (const tok of String(t).match(/\d+(?:[.,]\d+)?/g) || []) pool.add(tok.replace(',', '.'))
  }
  const poolNums = [...pool].map(Number)
  const ungrounded = []
  for (const s of numbersIn(answer.replace(/\[[^\]]*\]/g, ' '))) {
    const a = Number(s)
    if (pool.has(s)) continue
    if (Number.isInteger(a) && a <= 10) continue
    const dp = (s.split('.')[1] || '').length
    const ok = poolNums.some((f) => Number(f.toFixed(dp)) === a)
    if (!ok) ungrounded.push(s)
  }
  return { grounded: ungrounded.length === 0, ungrounded: [...new Set(ungrounded)] }
}

// Stance check: the first line of the answer must agree with the decision the
// rules computed (release allowed or not, problem solved or not).
function contradicts(answer, expected) {
  if (!expected) return false
  const head = String(answer).split('\n').find((l) => l.trim()) || ''
  const negative = /\b(not|cannot|can't|do not|don't|isn't|unresolved|blocked|on hold)\b/i.test(head)
  const want = 'releaseAllowed' in expected ? expected.releaseAllowed : expected.solved
  return want ? negative : !negative
}

module.exports = { releaseGate, grounding, contradicts, numbersIn, CPK_MIN }

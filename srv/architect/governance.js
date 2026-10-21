// In-memory AI governance metrics: every answer is recorded with its verdict,
// provider and latency. The question text is truncated; no user identity is stored.

const MAX_LOG = 50
const state = { startedAt: new Date().toISOString(), total: 0, byVerdict: {}, byProvider: {}, latencyMs: [], log: [] }

function record({ question, verdict, provider, ms, releaseAllowed, kind = 'ask' }) {
  state.total++
  state.byVerdict[verdict] = (state.byVerdict[verdict] || 0) + 1
  const p = String(provider || 'unknown').replace(/ \(replaced.*\)$/, '')
  state.byProvider[p] = (state.byProvider[p] || 0) + 1
  state.latencyMs.push(ms)
  if (state.latencyMs.length > 500) state.latencyMs.shift()
  state.log.unshift({ at: new Date().toISOString(), kind, question: String(question).slice(0, 90), verdict, provider: p, ms, releaseAllowed })
  if (state.log.length > MAX_LOG) state.log.pop()
}

function pct(arr, p) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}

function snapshot() {
  const v = state.byVerdict
  const answered = (v.pass || 0) + (v.revised || 0)
  return {
    startedAt: state.startedAt,
    total: state.total,
    pass: v.pass || 0,
    revised: v.revised || 0,
    blocked: v.blocked || 0,
    llmAcceptedRate: answered ? Math.round((100 * (v.pass || 0)) / answered) : 0,
    p50Ms: pct(state.latencyMs, 50),
    p95Ms: pct(state.latencyMs, 95),
    providers: Object.entries(state.byProvider).map(([provider, count]) => ({ provider, count })),
    log: state.log.slice(0, 25),
    guardrails: [
      'Answers use only retrieved facts; every number is checked against them',
      'Release decisions come from control-plan rules in code, never from the LLM',
      'Conclusion (release, solved) must match the rule decision or the answer is replaced',
      'Prompt-injection patterns are blocked in questions and removed from the index',
      'Text inside documents is treated as data, not instructions',
      'Keys come only from environment or service bindings; nothing is logged',
      'Every answer shows its provider, model, steps and sources',
    ],
  }
}

module.exports = { record, snapshot }

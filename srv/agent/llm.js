// Provider chain for the synthesizer step:
//   1. SAP AI Core - Generative AI Hub (orchestration service), when an AI Core
//      binding (VCAP_SERVICES) or AICORE_SERVICE_KEY is present
//   2. Groq (OpenAI-compatible API), when GROQ_API_KEY is set
//   3. none: the orchestrator falls back to its deterministic composer
// Keys come only from the environment or service bindings.

const AICORE_MODEL = process.env.AICORE_MODEL || 'gpt-4.1-mini'
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const GROQ_MODELS = [GROQ_MODEL, ...(process.env.GROQ_FALLBACK_MODELS ?? 'openai/gpt-oss-20b').split(',').map((m) => m.trim()).filter(Boolean)]
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 25000)

function hasAiCore() {
  if (process.env.AICORE_SERVICE_KEY) return true
  try { return Boolean(JSON.parse(process.env.VCAP_SERVICES || '{}').aicore) } catch { return false }
}

function activeProvider() {
  if (hasAiCore()) return { provider: 'SAP AI Core - Generative AI Hub', model: AICORE_MODEL }
  if (process.env.GROQ_API_KEY) return { provider: 'Groq', model: GROQ_MODEL }
  return { provider: 'Deterministic composer (no LLM key)', model: 'rules' }
}

function withTimeout(promise, ms, label) {
  let timer
  return Promise.race([promise, new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`${label} timeout after ${ms} ms`)), ms) })])
    .finally(() => clearTimeout(timer))
}

async function aiCore(messages) {
  const { OrchestrationClient } = await import('@sap-ai-sdk/orchestration')
  const client = new OrchestrationClient({
    promptTemplating: { model: { name: AICORE_MODEL, params: { temperature: 0.1, max_tokens: 700 } } },
  })
  const res = await withTimeout(client.chatCompletion({ messages }), TIMEOUT_MS, 'AI Core')
  return res.getContent()
}

async function groq(messages, model) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 2000,
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}) }),
    })
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`)
    const body = await res.json()
    return body.choices?.[0]?.message?.content || ''
  } finally {
    clearTimeout(timer)
  }
}

async function complete(messages) {
  const errors = []
  if (hasAiCore()) {
    try {
      const text = await aiCore(messages)
      if (text) return { text, provider: 'SAP AI Core - Generative AI Hub', model: AICORE_MODEL, errors }
    } catch (e) { errors.push(`AI Core: ${e.message}`) }
  }
  if (process.env.GROQ_API_KEY) {
    for (const model of GROQ_MODELS) {
      try {
        const text = await groq(messages, model)
        if (text) return { text, provider: 'Groq', model, errors }
      } catch (e) { errors.push(`Groq ${model}: ${e.message}`) }
    }
  }
  return { text: null, provider: null, model: null, errors }
}

module.exports = { complete, activeProvider, hasAiCore }

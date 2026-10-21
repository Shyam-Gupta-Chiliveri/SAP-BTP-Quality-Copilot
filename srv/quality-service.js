const cds = require('@sap/cds')
const orchestrator = require('./agent/orchestrator')
const tools = require('./agent/tools')
const { activeProvider } = require('./agent/llm')
const governance = require('./architect/governance')

module.exports = class QualityService extends cds.ApplicationService {
  init() {
    this.on('ask', async (req) => {
      const question = String(req.data.question || '').trim()
      if (!question) return req.reject(400, 'Please enter a question.')
      if (question.length > 1000) return req.reject(400, 'Question is too long (max 1000 characters).')
      const out = await orchestrator.ask(question)
      governance.record({ question, verdict: out.critic.verdict, provider: out.provider,
        ms: out.steps.reduce((s, x) => s + (x.ms || 0), 0), releaseAllowed: out.critic.releaseAllowed })
      return out
    })
    this.on('cockpit', () => tools.cockpitKpis())
    this.on('scorecards', async () => (await tools.scorecards()).data)
    this.on('providerInfo', () => activeProvider())
    return super.init()
  }
}

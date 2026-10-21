const cds = require('@sap/cds')
const orchestrator = require('./agent/orchestrator')
const tools = require('./agent/tools')
const { activeProvider } = require('./agent/llm')

module.exports = class QualityService extends cds.ApplicationService {
  init() {
    this.on('ask', async (req) => {
      const question = String(req.data.question || '').trim()
      if (!question) return req.reject(400, 'Please enter a question.')
      if (question.length > 1000) return req.reject(400, 'Question is too long (max 1000 characters).')
      return orchestrator.ask(question)
    })
    this.on('cockpit', () => tools.cockpitKpis())
    this.on('scorecards', async () => (await tools.scorecards()).data)
    this.on('providerInfo', () => activeProvider())
    return super.init()
  }
}

// SAP Business AI use-case portfolio for quality and supply chain.
// Tiers follow how SAP packages Business AI:
//   EMBEDDED  - AI features delivered inside SAP applications (S/4HANA, Ariba, ...)
//   JOULE     - the SAP copilot, standard skills and custom skills via Joule Studio
//   PREMIUM   - Business AI capabilities licensed separately (AI units)
//   CUSTOM    - your own scenarios on BTP: CAP + SAP AI Core / Generative AI Hub
// Effort (person-days) and value are planning assumptions for this demo.

const TIERS = {
  EMBEDDED: { name: 'Embedded AI', blurb: 'AI that ships inside SAP applications; activate and configure, no build.' },
  JOULE: { name: 'Joule', blurb: 'SAP copilot across applications; extend with custom skills and agents in Joule Studio.' },
  PREMIUM: { name: 'Premium AI', blurb: 'Business AI capabilities licensed separately and consumed as AI units.' },
  CUSTOM: { name: 'Custom AI on BTP', blurb: 'Side-by-side scenarios on CAP with SAP AI Core and the Generative AI Hub.' },
}

const USE_CASES = [
  { id: 'UC01', title: 'Quality Copilot: release decisions and root cause', tier: 'CUSTOM', area: 'Quality', status: 'Live in this demo',
    sap: 'CAP on BTP, Generative AI Hub orchestration, OData V4', data: 'Inspection lots, results, Q-notifications, procedures',
    value: 5, feasibility: 4, effortPd: 60, kpi: 'Time to release decision, escaped defects' },
  { id: 'UC02', title: 'Supplier quality scorecard with explanations', tier: 'CUSTOM', area: 'Procurement', status: 'Live in this demo',
    sap: 'CAP analytical service, Datasphere consumption', data: 'Goods receipts, inspection lots, Q2 notifications',
    value: 4, feasibility: 5, effortPd: 25, kpi: 'Lot reject rate, defect PPM' },
  { id: 'UC03', title: 'Joule skill: "Can I release this batch?"', tier: 'JOULE', area: 'Quality', status: 'Designed (Joule Studio)',
    sap: 'Joule Studio skill calling the CAP ask action through a BTP destination', data: 'Same CAP service',
    value: 5, feasibility: 3, effortPd: 30, kpi: 'Adoption by quality engineers' },
  { id: 'UC04', title: 'Predictive quality on inspection results', tier: 'EMBEDDED', area: 'Quality', status: 'Target',
    sap: 'Intelligent Scenario Lifecycle Management (ISLM) in S/4HANA', data: 'Historic results and usage decisions',
    value: 4, feasibility: 3, effortPd: 35, kpi: 'Skip-lot rate, inspection cost' },
  { id: 'UC05', title: 'Document extraction for supplier certificates (3.1)', tier: 'PREMIUM', area: 'Quality', status: 'Target',
    sap: 'SAP Document AI / Document Information Extraction', data: 'Mill certificates PDF',
    value: 4, feasibility: 4, effortPd: 25, kpi: 'Manual data entry hours' },
  { id: 'UC06', title: '8D report drafting from notification history', tier: 'CUSTOM', area: 'Quality', status: 'Target',
    sap: 'Generative AI Hub with grounding on notifications, HANA Cloud vector engine', data: 'Q-notifications, tasks, root causes',
    value: 4, feasibility: 4, effortPd: 40, kpi: '8D cycle time' },
  { id: 'UC07', title: 'Demand and supply risk signals', tier: 'PREMIUM', area: 'Supply chain', status: 'Target',
    sap: 'SAP Integrated Business Planning with Business AI features', data: 'Orders, forecasts, supplier lead times',
    value: 5, feasibility: 2, effortPd: 80, kpi: 'Forecast accuracy, stock-outs' },
  { id: 'UC08', title: 'Joule for S/4HANA standard skills in procurement', tier: 'JOULE', area: 'Procurement', status: 'Target',
    sap: 'Joule standard skills, activated with S/4HANA Cloud', data: 'Purchase orders, contracts',
    value: 3, feasibility: 5, effortPd: 10, kpi: 'Clicks per transaction' },
]

function portfolio() {
  return {
    tiers: Object.entries(TIERS).map(([id, t]) => ({ id, ...t, count: USE_CASES.filter((u) => u.tier === id).length })),
    useCases: USE_CASES.map((u) => ({ ...u, tierName: TIERS[u.tier].name, priority: u.value * u.feasibility })),
  }
}

module.exports = { portfolio, USE_CASES, TIERS }

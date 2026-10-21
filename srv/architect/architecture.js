// Reference architecture for SAP Business AI on a RISE with SAP landscape.
// status: LIVE     - runs in this demo
//         ARTIFACT - implemented as code or config in this repo, needs an SAP tenant to run
//         TARGET   - part of the target architecture, not built here

const LAYERS = [
  { id: 'experience', name: 'Experience', items: [
    { id: 'cockpit', name: 'Quality workbench (this app)', status: 'LIVE', detail: 'Static UI served by CAP from app/; calls OData V4 actions and functions.' },
    { id: 'joule', name: 'Joule', status: 'ARTIFACT', detail: 'docs/joule-skill.md: a Joule Studio skill that calls the CAP action ask through a BTP destination, so the same agent answers inside Joule.' },
    { id: 'fiori', name: 'SAP Fiori elements', status: 'LIVE', detail: 'List report and object page generated from app/annotations.cds (Fiori preview link in the footer).' },
    { id: 'workzone', name: 'SAP Build Work Zone', status: 'TARGET', detail: 'Launchpad entry for the workbench and Fiori apps, with role-based tiles.' },
  ]},
  { id: 'ai', name: 'Business AI', items: [
    { id: 'genaihub', name: 'SAP AI Core: Generative AI Hub', status: 'ARTIFACT', detail: '@sap-ai-sdk/orchestration client in srv/agent/llm.js; activates with an aicore binding (mta-aicore.mtaext). Trial accounts have no AI Core, so the live demo uses Groq.' },
    { id: 'agent', name: 'Agent runtime (router, tools, critic)', status: 'LIVE', detail: 'srv/agent: rule router, CQL tools, BM25 retrieval, release gate, grounding and stance checks.' },
    { id: 'embedded', name: 'Embedded AI in S/4HANA', status: 'TARGET', detail: 'Intelligent scenarios (ISLM) such as predictive quality, activated in S/4HANA Cloud Private Edition.' },
    { id: 'premium', name: 'Premium AI (AI units)', status: 'TARGET', detail: 'Document information extraction for supplier certificates, consumed through BTP.' },
  ]},
  { id: 'app', name: 'Application and extension', items: [
    { id: 'cap', name: 'SAP CAP on BTP Cloud Foundry', status: 'LIVE', detail: 'Node.js CAP services QualityService, AnalyticsService, ArchitectService. mta.yaml for Cloud Foundry.' },
    { id: 'rap', name: 'ABAP RAP (clean core, on-stack)', status: 'ARTIFACT', detail: 'abap/: managed RAP business object for AI recommendations with an approve action, published as OData V4 UI service.' },
    { id: 'integration', name: 'SAP Integration Suite / Event Mesh', status: 'TARGET', detail: 'Inspection-lot and usage-decision events from S/4HANA trigger the copilot; released OData APIs for read access.' },
  ]},
  { id: 'data', name: 'Data', items: [
    { id: 's4', name: 'SAP S/4HANA Cloud Private Edition (RISE)', status: 'TARGET', detail: 'System of record for QM and MM. This demo uses an S/4HANA-shaped CDS model with seeded CSV data instead.' },
    { id: 'bdc', name: 'SAP Business Data Cloud', status: 'TARGET', detail: 'SAP-managed data products for quality and procurement, shared with AI scenarios without copying data.' },
    { id: 'datasphere', name: 'SAP Datasphere', status: 'ARTIFACT', detail: 'AnalyticsService exposes an aggregatable OData model ($apply) that Datasphere or SAP Analytics Cloud can consume; docs/datasphere-bdc.md has the model mapping.' },
    { id: 'bw', name: 'SAP BW private cloud edition', status: 'TARGET', detail: 'Existing BW models lifted into Business Data Cloud during the transition, replaced step by step.' },
    { id: 'hana', name: 'SAP HANA Cloud vector engine', status: 'TARGET', detail: 'Replaces the in-memory BM25 index with embeddings from the Generative AI Hub.' },
  ]},
  { id: 'ops', name: 'Security, governance and operations', items: [
    { id: 'xsuaa', name: 'SAP Cloud Identity / XSUAA', status: 'TARGET', detail: 'Roles QualityViewer and QualityApprover via @requires; the public demo is read-only.' },
    { id: 'governance', name: 'AI governance and audit', status: 'LIVE', detail: 'Per-answer trace, critic verdicts, injection blocking and live metrics (AI Governance view).' },
    { id: 'calm', name: 'SAP Cloud ALM', status: 'TARGET', detail: 'Requirements, tests and operations monitoring for the program.' },
    { id: 'cicd', name: 'CI/CD', status: 'LIVE', detail: 'GitHub Actions: reproducible seed data, 19+ tests, cds build, Docker build; deploy to k3s and MTA to Cloud Foundry.' },
  ]},
]

function architecture() {
  const all = LAYERS.flatMap((l) => l.items)
  return {
    layers: LAYERS,
    counts: { LIVE: all.filter((i) => i.status === 'LIVE').length, ARTIFACT: all.filter((i) => i.status === 'ARTIFACT').length, TARGET: all.filter((i) => i.status === 'TARGET').length },
  }
}

module.exports = { architecture }

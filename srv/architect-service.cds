// Architect workbench: Phase 0 assessment, ROM estimate, proposal, Business AI
// portfolio, reference architecture and AI governance metrics.
@path: '/odata/v4/architect'
service ArchitectService {

  type AssessmentInput {
    sourceSystem       : String enum { ECC6; S4_ONPREM; NON_SAP };
    deployment         : String enum { RISE_PRIVATE; RISE_PUBLIC; ONPREM };
    customCodeObjects  : Integer;
    customCodeUsagePct : Integer;
    dataVolumeTB       : Decimal(8, 2);
    historyYears       : Integer;
    processChange      : String enum { LOW; MEDIUM; HIGH };
    companyCodes       : Integer;
    mergersOrCarveOuts : Boolean;
    analytics          : String enum { BW_ONPREM; BW4HANA; DATASPHERE; NONE };
    integrations       : Integer;
    dataQuality        : Integer;
    btpInPlace         : Boolean;
    targetMonths       : Integer;
  }

  type Scores       { GREENFIELD : Integer; BROWNFIELD : Integer; HYBRID : Integer; }
  type Rule         { path : String; points : Integer; reason : String; }
  type CustomCode   { total : Integer; used : Integer; retire : Integer; }
  type RiseItem     { item : String; why : String; }
  type Tool         { phase : String; tool : String; purpose : String; }
  type Phase        { phase : String; months : Decimal(5, 1); deliverables : String; }

  type Assessment {
    recommendation  : String;
    label           : String;
    confidence      : String;
    scores          : Scores;
    hardConstraints : array of String;
    rules           : array of Rule;
    customCode      : CustomCode;
    cleanCore       : Integer;
    aiReadiness     : Integer;
    dataStrategy    : String;
    rise            : array of RiseItem;
    toolchain       : array of Tool;
    roadmap         : array of Phase;
    risks           : array of String;
  }

  type EstimateLine { workstream : String; personDays : Integer; driver : String; }
  type TeamRole     { role : String; fte : Decimal(5, 1); }

  type Estimate {
    path                  : String;
    label                 : String;
    lines                 : array of EstimateLine;
    basePersonDays        : Integer;
    contingencyPct        : Integer;
    contingencyPersonDays : Integer;
    totalPersonDays       : Integer;
    months                : Decimal(5, 1);
    weeks                 : Integer;
    averageFte            : Decimal(5, 1);
    dayRate               : Integer;
    costEur               : Integer;
    costLowEur            : Integer;
    costHighEur           : Integer;
    team                  : array of TeamRole;
    useCases              : array of String;
    accuracy              : String;
  }

  type Proposal {
    markdown        : LargeString;
    summary         : LargeString;
    provider        : String;
    verdict         : String;
    ungrounded      : array of String;
    ms              : Integer;
    totalPersonDays : Integer;
    recommendation  : String;
  }

  type Tier    { id : String; name : String; blurb : String; count : Integer; }
  type UseCase {
    id : String; title : String; tier : String; tierName : String; area : String; status : String;
    sap : String; data : String; value : Integer; feasibility : Integer; priority : Integer; effortPd : Integer; kpi : String;
  }
  type Portfolio { tiers : array of Tier; useCases : array of UseCase; }

  type ArchItem  { id : String; name : String; status : String; detail : String; }
  type ArchLayer { id : String; name : String; items : array of ArchItem; }
  type Architecture { layers : array of ArchLayer; counts : { LIVE : Integer; ARTIFACT : Integer; TARGET : Integer; }; }

  type ProviderCount { provider : String; count : Integer; }
  type AuditEntry    { at : String; kind : String; question : String; verdict : String; provider : String; ms : Integer; releaseAllowed : Boolean; }
  type Governance {
    startedAt       : String;
    total           : Integer;
    pass            : Integer;
    revised         : Integer;
    blocked         : Integer;
    llmAcceptedRate : Integer;
    p50Ms           : Integer;
    p95Ms           : Integer;
    providers       : array of ProviderCount;
    log             : array of AuditEntry;
    guardrails      : array of String;
  }

  action   assess(input : AssessmentInput)                                   returns Assessment;
  action   estimate(input : AssessmentInput, useCaseIds : array of String,
                    dayRate : Integer, contingencyPct : Integer)            returns Estimate;
  action   proposal(client : String, input : AssessmentInput, useCaseIds : array of String,
                    dayRate : Integer, contingencyPct : Integer)            returns Proposal;
  function portfolio()                                                       returns Portfolio;
  function architecture()                                                    returns Architecture;
  function governance()                                                      returns Governance;
}

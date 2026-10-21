using sap.quality as q from '../db/schema';

@path: '/odata/v4/quality'
service QualityService {
  @readonly entity Plants               as projection on q.Plants;
  @readonly entity Suppliers            as projection on q.Suppliers;
  @readonly entity Materials            as projection on q.Materials;
  @readonly entity Specifications       as projection on q.Specifications;
  @readonly entity PurchaseOrders       as projection on q.PurchaseOrders;
  @readonly entity InspectionLots       as projection on q.InspectionLots;
  @readonly entity InspectionResults    as projection on q.InspectionResults;
  @readonly entity QualityNotifications as projection on q.QualityNotifications;

  type Step {
    agent   : String;
    tool    : String;
    summary : String;
    ms      : Integer;
  }

  type Citation {
    ref     : String;
    title   : String;
    kind    : String;
    snippet : String;
  }

  type CriticResult {
    verdict        : String;
    grounded       : Boolean;
    releaseAllowed : Boolean;
    releaseScope   : String;
    reasons        : array of String;
    ungrounded     : array of String;
  }

  type Answer {
    answer    : LargeString;
    provider  : String;
    model     : String;
    plan      : array of String;
    steps     : array of Step;
    citations : array of Citation;
    critic    : CriticResult;
  }

  type Kpi {
    id    : String;
    label : String;
    value : String;
    unit  : String;
    state : String;
    hint  : String;
  }

  type Scorecard {
    supplier        : String;
    name            : String;
    category        : String;
    lots            : Integer;
    rejectedLots    : Integer;
    lotRejectRate   : Decimal(6, 2);
    defectPpm       : Integer;
    openQ2          : Integer;
    rating          : String;
  }

  action   ask(question : String) returns Answer;
  function cockpit()              returns array of Kpi;
  function scorecards()           returns array of Scorecard;
  function providerInfo()         returns { provider : String; model : String; };
}

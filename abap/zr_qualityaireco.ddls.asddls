@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Quality AI recommendation'
define root view entity ZR_QualityAIReco
  as select from zqai_reco
{
  key reco_uuid             as RecoUUID,
      inspection_lot        as InspectionLot,
      material              as Material,
      supplier              as Supplier,
      recommendation        as Recommendation,
      rationale             as Rationale,
      provider              as Provider,
      status                as Status,
      @Semantics.user.createdBy: true
      created_by            as CreatedBy,
      @Semantics.systemDateTime.createdAt: true
      created_at            as CreatedAt,
      @Semantics.user.localInstanceLastChangedBy: true
      last_changed_by       as LastChangedBy,
      @Semantics.systemDateTime.lastChangedAt: true
      last_changed_at       as LastChangedAt,
      @Semantics.systemDateTime.localInstanceLastChangedAt: true
      local_last_changed_at as LocalLastChangedAt
}

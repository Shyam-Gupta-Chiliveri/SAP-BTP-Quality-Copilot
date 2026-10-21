@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Quality AI recommendation - projection'
@Metadata.allowExtensions: true
define root view entity ZC_QualityAIReco
  provider contract transactional_query
  as projection on ZR_QualityAIReco
{
  key RecoUUID,
      InspectionLot,
      Material,
      Supplier,
      Recommendation,
      Rationale,
      Provider,
      Status,
      CreatedBy,
      CreatedAt,
      LastChangedAt,
      LocalLastChangedAt
}

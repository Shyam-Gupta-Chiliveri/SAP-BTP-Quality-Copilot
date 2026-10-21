using sap.quality as q from '../db/schema';

// Analytical model over goods-receipt inspection lots: dimensions and measures with
// OData $apply support, so SAP Datasphere, SAP Analytics Cloud or any OData V4
// client can group and aggregate without custom code.
@path: '/odata/v4/analytics'
service AnalyticsService {

  @readonly
  @Aggregation.ApplySupported: {
    Transformations       : ['aggregate', 'groupby', 'filter', 'orderby', 'top', 'skip'],
    GroupableProperties   : [supplier, supplierName, material, period, plant, usageDecision],
    AggregatableProperties: [{ Property: lots }, { Property: rejectedLots }, { Property: lotSize }, { Property: rejectedQty }]
  }
  entity GoodsReceiptQuality as select from q.InspectionLots {
    key ID,
        @Analytics.Dimension supplier.ID        as supplier     : String(10),
        @Analytics.Dimension supplier.name      as supplierName : String(80),
        @Analytics.Dimension material.ID        as material     : String(18),
        @Analytics.Dimension plant.ID           as plant        : String(4),
        @Analytics.Dimension substring(createdOn, 0, 7) as period : String(7),
        @Analytics.Dimension usageDecision,
        @Analytics.Measure @Aggregation.default: #SUM 1 as lots : Integer,
        @Analytics.Measure @Aggregation.default: #SUM (case when usageDecision = 'R' then 1 else 0 end) as rejectedLots : Integer,
        @Analytics.Measure @Aggregation.default: #SUM lotSize,
        @Analytics.Measure @Aggregation.default: #SUM (case when usageDecision = 'R' then lotSize else 0 end) as rejectedQty : Integer
  };
}

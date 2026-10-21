# Analytics: BW, Datasphere and SAP Business Data Cloud

## What runs in this repo

`srv/analytics-service.cds` publishes `GoodsReceiptQuality` as an analytical OData V4 entity:

- Dimensions: supplier, supplierName, material, plant, period (YYYY-MM), usageDecision
- Measures (default SUM): lots, rejectedLots, lotSize, rejectedQty
- `@Aggregation.ApplySupported` lets any OData V4 client aggregate on the server:

```
GET /odata/v4/analytics/GoodsReceiptQuality?$apply=groupby((supplier,period),aggregate(lots with sum as lots,rejectedLots with sum as rejectedLots))
```

## Target mapping

| Layer | Object | Notes |
|---|---|---|
| Source | S/4HANA released CDS views for inspection lots and usage decisions | Replicated with Datasphere replication flows, or delivered as SAP-managed data products in Business Data Cloud |
| Datasphere | Fact view `GoodsReceiptQuality`, dimension views Supplier and Material, analytic model with measures lots, rejectedLots, lot reject rate | The same semantics as this CAP model |
| BW | Existing BW quality InfoProviders | Lifted into Business Data Cloud as BW private cloud edition, then replaced with Datasphere models step by step |
| Consumption | SAP Analytics Cloud stories, the CAP copilot (reads facts), Joule | AI and BI use the same numbers |

## Architect's point

AI answers are only trusted if they match the KPIs in BI. Defining lot reject rate and PPM once in the semantic layer (Datasphere / BDC), and having both the copilot and SAP Analytics Cloud read from it, gives one version of the truth.

---
id: PN-SAP-QM
title: Process notes - SAP S/4HANA Quality Management at plant DE10
category: SAP process
---
Inspection lots: a goods receipt against a purchase order creates an inspection lot with origin 01. Production inspection uses origin 04. Results are recorded per inspection characteristic (for example HV10, BEND_F, DIAM) with a valuation A (accepted) or R (rejected).

Usage decision: closes the inspection lot. Code A accepts the lot and posts stock to unrestricted use. Code R rejects it and the stock is returned to vendor or scrapped. Only lots with usage decision A can be released to production.

Quality notifications: Q1 is a customer complaint, Q2 is a complaint against a vendor, Q3 is an internal problem. A notification holds the defect code from the catalog, defect quantity, root cause and the long text with containment and corrective actions. Status Open means actions are still running. Status Completed means the corrective action was verified.

Dynamic modification: an inspection plan can tighten sampling automatically after a rejected lot and relax it after a number of good lots. Plant DE10 uses 5 parts normal, 20 parts tightened for the next 5 lots after a rejection.

Supplier evaluation: the quality score uses the lot reject rate (rejected lots divided by inspected lots), defect PPM (defect quantity divided by delivered quantity, times one million) and the number of open Q2 notifications. Rating A: lot reject rate 2 percent or less and no open Q2. Rating B: up to 6 percent. Rating C: above 6 percent, which triggers a supplier escalation.

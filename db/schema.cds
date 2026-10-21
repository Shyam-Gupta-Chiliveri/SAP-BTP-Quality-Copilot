namespace sap.quality;

// Field names follow S/4HANA Quality Management (QM) and Materials Management (MM)
// concepts: inspection lot, usage decision, Q-notification, purchase order.
// All records are fictional demo data.

entity Plants {
  key ID   : String(4);
      name : String(60);
      city : String(40);
}

entity Suppliers {
  key ID       : String(10);
      name     : String(80);
      city     : String(40);
      country  : String(2);
      category : String(40);
}

entity Materials {
  key ID           : String(18);
      description  : String(80);
      materialType : String(4);
      baseUnit     : String(3);
      alloy        : String(40);
      plant        : Association to Plants;
}

entity Specifications {
  key material       : Association to Materials;
  key characteristic : String(20);
      description    : String(80);
      unit           : String(10);
      lowerLimit     : Decimal(10, 3);
      upperLimit     : Decimal(10, 3);
      target         : Decimal(10, 3);
      method         : String(80);
}

entity PurchaseOrders {
  key ID           : String(10);
      supplier     : Association to Suppliers;
      material     : Association to Materials;
      orderDate    : Date;
      deliveryDate : Date;
      quantity     : Integer;
      unit         : String(3);
      netPrice     : Decimal(10, 2);
      currency     : String(3);
}

entity InspectionLots {
  key ID                : String(12);
      origin            : String(2);
      originText        : String(40);
      material          : Association to Materials;
      supplier          : Association to Suppliers;
      purchaseOrder     : Association to PurchaseOrders;
      plant             : Association to Plants;
      batch             : String(10);
      createdOn         : Date;
      lotSize           : Integer;
      sampleSize        : Integer;
      usageDecision     : String(1);
      usageDecisionText : String(40);
      results           : Composition of many InspectionResults
                            on results.lot = $self;
}

entity InspectionResults {
  key lot            : Association to InspectionLots;
  key characteristic : String(20);
      n              : Integer;
      mean           : Decimal(10, 3);
      stdDev         : Decimal(10, 4);
      minValue       : Decimal(10, 3);
      maxValue       : Decimal(10, 3);
      unit           : String(10);
      valuation      : String(1);
}

entity QualityNotifications {
  key ID             : String(9);
      type           : String(2);
      typeText       : String(40);
      priority       : String(1);
      status         : String(12);
      material       : Association to Materials;
      supplier       : Association to Suppliers;
      lot            : Association to InspectionLots;
      batch          : String(10);
      createdOn      : Date;
      closedOn       : Date;
      defectCode     : String(12);
      defectText     : String(80);
      defectQuantity : Integer;
      shortText      : String(120);
      rootCause      : String(400);
      longText       : String(2000);
}

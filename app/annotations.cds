using QualityService as service from '../srv/quality-service';

annotate service.QualityNotifications with @(
  UI.HeaderInfo      : {
    TypeName       : 'Quality notification',
    TypeNamePlural : 'Quality notifications',
    Title          : { Value: ID },
    Description    : { Value: shortText }
  },
  UI.SelectionFields : [type, status, supplier_ID, material_ID],
  UI.LineItem        : [
    { Value: ID,          Label: 'Notification' },
    { Value: type,        Label: 'Type' },
    { Value: status,      Label: 'Status' },
    { Value: supplier_ID, Label: 'Supplier' },
    { Value: material_ID, Label: 'Material' },
    { Value: batch,       Label: 'Batch' },
    { Value: createdOn,   Label: 'Created on' },
    { Value: defectText,  Label: 'Defect' }
  ],
  UI.FieldGroup #Detail : { Data: [
    { Value: defectCode,     Label: 'Defect code' },
    { Value: defectQuantity, Label: 'Defect quantity' },
    { Value: rootCause,      Label: 'Root cause' },
    { Value: longText,       Label: 'Long text' }
  ]},
  UI.Facets : [{ $Type: 'UI.ReferenceFacet', Label: 'Details', Target: '@UI.FieldGroup#Detail' }]
);

annotate service.InspectionLots with @(
  UI.HeaderInfo      : {
    TypeName       : 'Inspection lot',
    TypeNamePlural : 'Inspection lots',
    Title          : { Value: ID },
    Description    : { Value: material_ID }
  },
  UI.SelectionFields : [usageDecision, supplier_ID, material_ID],
  UI.LineItem        : [
    { Value: ID,                Label: 'Inspection lot' },
    { Value: originText,        Label: 'Origin' },
    { Value: material_ID,       Label: 'Material' },
    { Value: supplier_ID,       Label: 'Supplier' },
    { Value: batch,             Label: 'Batch' },
    { Value: createdOn,         Label: 'Created on' },
    { Value: lotSize,           Label: 'Lot size' },
    { Value: usageDecisionText, Label: 'Usage decision' }
  ],
  UI.Facets : [{ $Type: 'UI.ReferenceFacet', Label: 'Results', Target: 'results/@UI.LineItem' }]
);

annotate service.InspectionResults with @(
  UI.LineItem : [
    { Value: characteristic, Label: 'Characteristic' },
    { Value: n,              Label: 'n' },
    { Value: mean,           Label: 'Mean' },
    { Value: stdDev,         Label: 'Std dev' },
    { Value: minValue,       Label: 'Min' },
    { Value: maxValue,       Label: 'Max' },
    { Value: unit,           Label: 'Unit' },
    { Value: valuation,      Label: 'Valuation' }
  ]
);

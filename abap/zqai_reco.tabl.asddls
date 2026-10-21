@EndUserText.label : 'Quality AI recommendation'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zqai_reco {
  key client            : abap.clnt not null;
  key reco_uuid         : sysuuid_x16 not null;
  inspection_lot        : abap.char(12);
  material              : abap.char(40);
  supplier              : abap.char(10);
  recommendation        : abap.char(1);
  rationale             : abap.string(0);
  provider              : abap.char(60);
  status                : abap.char(1);
  created_by            : abp_creation_user;
  created_at            : abp_creation_tstmpl;
  last_changed_by       : abp_locinst_lastchange_user;
  last_changed_at       : abp_lastchange_tstmpl;
  local_last_changed_at : abp_locinst_lastchange_tstmpl;
}

CLASS lhc_reco DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    CONSTANTS:
      BEGIN OF status,
        new      TYPE c LENGTH 1 VALUE 'N',
        approved TYPE c LENGTH 1 VALUE 'A',
        rejected TYPE c LENGTH 1 VALUE 'X',
      END OF status.

    METHODS get_instance_features FOR INSTANCE FEATURES
      IMPORTING keys REQUEST requested_features FOR Reco RESULT result.
    METHODS get_instance_authorizations FOR INSTANCE AUTHORIZATION
      IMPORTING keys REQUEST requested_authorizations FOR Reco RESULT result.
    METHODS approve FOR MODIFY
      IMPORTING keys FOR ACTION Reco~approve RESULT result.
    METHODS reject FOR MODIFY
      IMPORTING keys FOR ACTION Reco~reject RESULT result.
    METHODS setInitialStatus FOR DETERMINE ON MODIFY
      IMPORTING keys FOR Reco~setInitialStatus.
    METHODS validateRecommendation FOR VALIDATE ON SAVE
      IMPORTING keys FOR Reco~validateRecommendation.
ENDCLASS.

CLASS lhc_reco IMPLEMENTATION.

  METHOD get_instance_features.
    READ ENTITIES OF ZR_QualityAIReco IN LOCAL MODE
      ENTITY Reco FIELDS ( Status ) WITH CORRESPONDING #( keys )
      RESULT DATA(recos).
    result = VALUE #( FOR r IN recos (
      %tky            = r-%tky
      %action-approve = COND #( WHEN r-Status = status-new THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled )
      %action-reject  = COND #( WHEN r-Status = status-new THEN if_abap_behv=>fc-o-enabled ELSE if_abap_behv=>fc-o-disabled ) ) ).
  ENDMETHOD.

  METHOD get_instance_authorizations.
    " Approval is a human decision: real systems check an authorization object for quality approvers here.
    result = VALUE #( FOR k IN keys ( %tky = k-%tky %action-approve = if_abap_behv=>auth-allowed %action-reject = if_abap_behv=>auth-allowed ) ).
  ENDMETHOD.

  METHOD approve.
    MODIFY ENTITIES OF ZR_QualityAIReco IN LOCAL MODE
      ENTITY Reco UPDATE FIELDS ( Status )
      WITH VALUE #( FOR k IN keys ( %tky = k-%tky Status = status-approved ) ).
    READ ENTITIES OF ZR_QualityAIReco IN LOCAL MODE
      ENTITY Reco ALL FIELDS WITH CORRESPONDING #( keys ) RESULT DATA(recos).
    result = VALUE #( FOR r IN recos ( %tky = r-%tky %param = r ) ).
  ENDMETHOD.

  METHOD reject.
    MODIFY ENTITIES OF ZR_QualityAIReco IN LOCAL MODE
      ENTITY Reco UPDATE FIELDS ( Status )
      WITH VALUE #( FOR k IN keys ( %tky = k-%tky Status = status-rejected ) ).
    READ ENTITIES OF ZR_QualityAIReco IN LOCAL MODE
      ENTITY Reco ALL FIELDS WITH CORRESPONDING #( keys ) RESULT DATA(recos).
    result = VALUE #( FOR r IN recos ( %tky = r-%tky %param = r ) ).
  ENDMETHOD.

  METHOD setInitialStatus.
    MODIFY ENTITIES OF ZR_QualityAIReco IN LOCAL MODE
      ENTITY Reco UPDATE FIELDS ( Status Provider )
      WITH VALUE #( FOR k IN keys ( %tky = k-%tky Status = status-new Provider = 'BTP Quality Copilot' ) ).
  ENDMETHOD.

  METHOD validateRecommendation.
    READ ENTITIES OF ZR_QualityAIReco IN LOCAL MODE
      ENTITY Reco FIELDS ( Recommendation ) WITH CORRESPONDING #( keys ) RESULT DATA(recos).
    LOOP AT recos INTO DATA(r) WHERE Recommendation <> 'R' AND Recommendation <> 'B'.
      APPEND VALUE #( %tky = r-%tky ) TO failed-reco.
      APPEND VALUE #( %tky = r-%tky
                      %msg = new_message_with_text( severity = if_abap_behv_message=>severity-error
                                                    text     = 'Recommendation must be R (release) or B (block)' )
                      %element-Recommendation = if_abap_behv=>mk-on ) TO reported-reco.
    ENDLOOP.
  ENDMETHOD.

ENDCLASS.

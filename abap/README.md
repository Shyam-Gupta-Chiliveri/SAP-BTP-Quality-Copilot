# RAP business object: AI recommendations with human approval (clean core)

This folder holds the S/4HANA side of the architecture. It is an ABAP RESTful Application Programming Model (RAP) business object. The BTP copilot writes its release or block recommendation here, and a quality engineer approves or rejects it in a Fiori elements app. Nothing in standard SAP tables is modified, and the object only uses released ABAP Cloud APIs.

| File | Object |
|---|---|
| `zqai_reco.tabl.asddls` | Table `ZQAI_RECO` |
| `zr_qualityaireco.ddls.asddls` | Root view entity `ZR_QualityAIReco` |
| `zr_qualityaireco.bdef.asbdef` | Managed behavior: create, approve and reject actions, determination, validation |
| `zbp_r_qualityaireco.clas.locals_imp.abap` | Behavior handler (local types of class `ZBP_R_QUALITYAIRECO`) |
| `zc_qualityaireco.*` | Projection view and projection behavior |
| `zui_qualityai.srvd.srvdsrv` | Service definition; create an OData V4 UI service binding in ADT |

Flow:

1. The CAP agent decides with its release gate (code, not the LLM).
2. CAP calls `POST /Recommendation` on this service through a BTP destination (Principal Propagation or OAuth2SAMLBearer).
3. The determination sets status N (new). The validation accepts only R (release) or B (block).
4. A quality engineer approves or rejects in the Fiori app. The S/4HANA usage decision stays a human step.

Status: written for SAP S/4HANA Cloud Private Edition or the BTP ABAP environment (ABAP Cloud, strict mode 2). It has **not been compiled in this repo**; import it with ABAP Development Tools and abapGit, then activate.

# Bringing the copilot into Joule

Goal: a quality engineer asks Joule "Can I release batch B2608-041?" and gets the same grounded answer, gate decision and sources as in the workbench.

## Design

1. **BTP destination** `QUALITY_COPILOT` points to the CAP app (`https://<app>.cfapps.<region>.hana.ondemand.com`). It uses OAuth2 client credentials or principal propagation through XSUAA.
2. **Joule Studio** (in SAP Build) gets a custom skill, *Quality release check*:
   - Input parameter: `question` (free text), or `material` plus `supplier`.
   - Action: call `POST /odata/v4/quality/ask` through destination `QUALITY_COPILOT` with body `{ "question": "<question>" }`.
   - Response mapping: `answer` becomes the message text. `critic.releaseAllowed` becomes a status card ("Release allowed" or "Do not release"). `citations` become links.
3. **Joule agent** (optional): wrap the skill together with a second action that creates a recommendation in the RAP object (`abap/`), so the engineer can say "send this for approval".
4. **Authorization**: the skill is assigned to the role collection *QualityViewer*. Creating recommendations needs *QualityApprover*.

## Why the agent logic stays in CAP

- One agent, many channels: the workbench, Joule, Fiori and the API all use the same router, tools and critic.
- The release gate and grounding checks are code with tests. Joule handles conversation, identity and channel.
- The model can be swapped through the Generative AI Hub without touching the Joule skill.

Status: design only. Joule Studio needs a BTP account with SAP Build and Joule entitlements, which the trial used for this demo does not have.

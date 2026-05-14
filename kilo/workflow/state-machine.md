# High-Assurance Workflow State Machine

## Pre-Workflow: Plan Mode (`/plan`)

PLAN is a mandatory pre-workflow intake phase. It does not have its own state in the formal state machine — it feeds into classification. Every request begins with `/plan` for requirements clarification and task deconstruction before any state transition occurs.

**Output:** Structured plan file at `.kilo/plans/<timestamp>-<slug>.md`

**Exit:** PLAN → IDLE (then classification)

## Valid States

IDLE
GROUNDING
DEBUGGING
AWAITING_USER_DECISION        ← user must choose fallback or pause (Joern missing, Class 2+)
DEGRADED_PROCEED              ← user opted for LLM fallback; continue with degraded truth
READY_FOR_IMPLEMENTATION
IMPLEMENTATION
READY_FOR_VERIFICATION
VERIFICATION
PASSED
FAILED
BLOCKED
RETURN_TO_GROUNDING
DEPLOY                         ← external state; never entered by agent autonomously

## Valid Transitions

IDLE → GROUNDING
IDLE → DEBUGGING
IDLE → IMPLEMENTATION for Class 0 only

GROUNDING → BLOCKED
GROUNDING → AWAITING_USER_DECISION           ← Joern unavailable AND change_class >= 2
GROUNDING → READY_FOR_IMPLEMENTATION

AWAITING_USER_DECISION → DEGRADED_PROCEED    ← user chose Option A (LLM fallback)
AWAITING_USER_DECISION → BLOCKED             ← user chose Option B (pause & resolve)

DEGRADED_PROCEED → GROUNDING                 ← continue grounding with degraded structural truth

DEBUGGING → IMPLEMENTATION                  ← IN_SCOPE_IMPLEMENTATION_DEFECT only (narrow fix)
DEBUGGING → GROUNDING                       ← OUT_OF_SCOPE_NEW_FEATURE, MISSED_GROUNDING, or HUMAN_ASSUMPTION
DEBUGGING → VERIFICATION                    ← TOOLING_OR_TEST_CONFIG_ISSUE (fix directly)
DEBUGGING → BLOCKED                         ← no valid resolution path found

READY_FOR_IMPLEMENTATION → IMPLEMENTATION

READY_FOR_IMPLEMENTATION → IMPLEMENTATION

IMPLEMENTATION → BLOCKED
IMPLEMENTATION → READY_FOR_VERIFICATION

READY_FOR_VERIFICATION → VERIFICATION

VERIFICATION → PASSED
VERIFICATION → FAILED
VERIFICATION → RETURN_TO_GROUNDING

FAILED → GROUNDING
BLOCKED → GROUNDING
RETURN_TO_GROUNDING → GROUNDING

## Illegal Transitions

IMPLEMENTATION → PASSED
IMPLEMENTATION → DEPLOY
GROUNDING → VERIFICATION
VERIFICATION → IMPLEMENTATION without grounding refresh
CLASS_3 → IMPLEMENTATION without Formal Work Package
CLASS_2 → IMPLEMENTATION without Regression Addendum
DEBUGGING → IMPLEMENTATION for OUT_OF_SCOPE or MISSED_GROUNDING classification
DEBUGGING → VERIFICATION for anything other than TOOLING_OR_TEST_CONFIG_ISSUE

## Mandatory Artifacts Per State

PLAN (pre-workflow):
- Structured Plan File (`.kilo/plans/<timestamp>-<slug>.md`)

GROUNDING:
- Freshness Report
- Structural Truth
- Alloy Validation
- Human-Readable Handoff
- Formal Work Package

DEBUGGING:
- Debugging Report
- Regression Test Result where practical

IMPLEMENTATION:
- Scope Confirmation
- Test Plan
- Implementation Summary

VERIFICATION:
- Traceability Report
- Drift Analysis
- CI Results

BLOCKED:
- Blocking Reason Report (artifact explaining what blocked progress and why)

## BLOCKED Triggers

| Trigger | Blocking Reason | Resolution |
|---|---|---|
| User chose Option B at Joern decision point | `missing_joern_user_paused` | Install Joern CLI, reload Kilo, re-run Grounding |
| `build_cpg` returns `status: "FAIL"` AND `change_class >= 2` | `cpg_build_failed` | Debug joern-parse invocation, check Java version |
| `joern_status.available === false` AND `change_class >= 2` AND user has NOT yet been prompted | `missing_joern` (should transition to AWAITING_USER_DECISION instead) | Prompt user with Options A/B; only block if user explicitly chooses B |

## BLOCKED State Rules

- BLOCKED is entered when an agent cannot proceed due to: missing human approval, unavailable MCP tools, conflicting artifacts, or unresolved assumptions.
- The agent MUST produce a Blocking Reason Report before exiting.
- **Timeout:** If BLOCKED persists for more than 7 days, the state should be escalated to human attention. The agent-manager or operator should review and either provide approval or close the workflow.
- **Exit paths:** BLOCKED → GROUNDING (when the blocking condition is resolved) or manual closure.

## DEBUGGING State Rules

- Entered when a defect is found during or after implementation.
- The agent MUST classify the issue relationship as one of the five types before proposing any fix.
- The agent MUST review the current Formal Work Package and Implementation Summary to determine scope.
- **IN_SCOPE_IMPLEMENTATION_DEFECT:** may produce a narrow Implementation Fix Handoff and route to IMPLEMENTATION. Fix must stay inside allowed files.
- **OUT_OF_SCOPE_NEW_FEATURE:** must route to GROUNDING via New Grounding Handoff. Do NOT implement.
- **MISSED_GROUNDING_REQUIREMENT:** must route to GROUNDING as Class 2 Formal Regression.
- **HUMAN_ASSUMPTION_FAILURE:** must escalate to human approval before routing to GROUNDING.
- **TOOLING_OR_TEST_CONFIG_ISSUE:** may fix directly and route to VERIFICATION (no scope expansion).
- **Mandatory Artifacts:** Debugging Report, Debugging Next-Steps Handoff, plus the appropriate handoff based on scope classification (Implementation Fix, New Grounding, or Formal Regression Addendum).
- **Core rule:** Diagnose broadly, recommend narrowly.

## AWAITING_USER_DECISION State Rules

- Entered when `joern_status.available === false` AND `change_class >= 2` during Grounding.
- The agent MUST NOT proceed to structural truth gathering.
- The agent MUST produce a grounding handoff containing the Warning Banner + Inline Decision Prompt (Options A and B).
- The agent MUST wait for the user's explicit choice before transitioning.
- No workflow progress occurs until the user responds.
- **Timeout:** If AWAITING_USER_DECISION persists for more than 7 days without a user response, escalate to human attention.

## DEGRADED_PROCEED State Rules

- Entered when the user chooses Option A (LLM fallback) at the Joern decision point.
- The agent may proceed with FILE-SCAN + LLM-based structural analysis.
- All downstream artifacts must carry `joern_status: "DEGRADED_WITH_CONSENT"`.
- Structural confidence must be lowered in the confidence assessment.
- Verification Mode must flag `risk_elevation: "structural_truth_degraded_user_consented"`.
- DEGRADED_PROCEED does NOT bypass verification — Verification Mode will still flag structural_confidence as LOW.
- **Mandatory Artifacts:** Same as GROUNDING, but all structural truth artifacts carry the consent marker.

## DEPLOY State Rules

- DEPLOY is entered only by human decision, never by an agent autonomously.
- Before deploying, the operator should:
  1. Verify the Traceability Report's final decision is PASS.
  2. Review all unresolved assumptions.
  3. Record the deployment decision (date, environment, approver, traceability report ID).
- A deployment-decision artifact may be recorded in `.kilo/artifacts/deployment-decisions/`.

# User Actionable Output Rule

Every mode session must end with a user-actionable handoff.

## Rationale

The workflow is designed for both autonomous agents and human operators. Without a structured handoff, the user is left wondering:
- What just happened?
- What's the next step?
- Do I need to review anything?
- Is this safe to proceed?

## Required Fields

Every handoff must contain:

| Field | Description | Required |
|---|---|---|
| **What was completed** | Summary of actions taken this session | Yes |
| **What was NOT completed** | Known gaps, deferred items, or out-of-scope work | Yes |
| **What needs user review** | Things the user should inspect or approve | Yes |
| **Assumptions needing sign-off** | Assumptions that require human confirmation | Yes |
| **Current gate status** | What gates have been cleared, what remains | Yes |
| **Next recommended mode** | Which mode should run next | Yes |
| **Copy/paste prompt for next agent** | Ready-to-use prompt for the next mode | Yes |

## Hard Rule

Do NOT end a session without producing a handoff matching the template for the current mode.

## Relation to Mode Skills

Each mode has a corresponding handoff template in `.kilo/templates/`:
- `grounding-next-steps-handoff.md`
- `debugging-next-steps-handoff.md`
- `implementation-next-steps-handoff.md`
- `verification-next-steps-handoff.md`

The `user-handoff` skill loads and renders the correct template based on the current mode.

## Handoff Escalation

If any of the following are true, the handoff must flag "Requires Human Approval" in the gate status:

- Authentication changes
- Payment changes
- Permission/role changes
- PII access changes
- Public API behavior changes
- Safety-critical behavior changes
- Alloy assumptions are low confidence
- Architecture drift is REVIEW_REQUIRED or CRITICAL

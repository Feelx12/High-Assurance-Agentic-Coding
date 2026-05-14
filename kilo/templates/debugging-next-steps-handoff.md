# Debugging Next-Steps Handoff

## 1. What was completed

{Filled by agent — summary of debugging session actions: change classification, failure identification, root cause analysis, scope classification, routing decision}

## 2. What was NOT completed

{Filled by agent — deferred fixes, unresolved root causes, issues routed to Grounding, features deliberately excluded}

## 3. What needs user review

- [ ] Change classification: {class} — confirm correct
- [ ] Issue classification: {IN_SCOPE / OUT_OF_SCOPE / MISSED_GROUNDING / HUMAN_ASSUMPTION / TOOLING} — confirm correct
- [ ] Root cause analysis — confirm the diagnosis
- [ ] Routing decision — confirm the next step is correct
- [ ] Fix (if in-scope) — inspect the code change
- [ ] Test added/updated (if in-scope) — confirm test coverage

## 4. Assumptions needing sign-off

| # | Assumption | Confidence | Requires Sign-Off |
|---|---|---|---|
| A1 | {assumption text} | {high/medium/low} | Yes/No |

## 5. Current gate status

- Completed:
  - Change classification: {class}
  - Issue classification: {IN_SCOPE / OUT_OF_SCOPE / MISSED_GROUNDING / HUMAN_ASSUMPTION / TOOLING}
  - Failure identified
  - Root cause: {root cause}
  - Routing decision made: {routing decision}
- If in-scope:
  - Fix applied
  - Regression verification: {status}
- Remaining:
  - {any remaining items}
- Human approval required: Yes/No

## 6. Next recommended mode

{implementation | grounding | verification | traditional-feature-plan} — based on routing decision

- If IN_SCOPE_IMPLEMENTATION_DEFECT → implementation (narrow fix)
- If OUT_OF_SCOPE_NEW_FEATURE → traditional-feature-plan → grounding
- If MISSED_GROUNDING_REQUIREMENT → grounding (Class 2 Formal Regression)
- If HUMAN_ASSUMPTION_FAILURE → human escalation → grounding
- If TOOLING_OR_TEST_CONFIG_ISSUE → fix directly → verification

## 7. Copy/paste prompt for next agent

```
{Ready-to-use prompt for the next mode, scoped to the routing decision}
```

# Verification Next-Steps Handoff

## 1. What was completed

{Filled by agent — summary of verification session actions: Alloy checks, test runs, typecheck, build, drift check, security audit, traceability report}

## 2. What was NOT completed

{Filled by agent — checks skipped due to environment constraints, deferred items, known gaps}

## 3. What needs user review

- [ ] Traceability Report — verify the report represents the complete state
- [ ] Build output — review any build warnings
- [ ] Audit baseline — confirm no NEW vulnerabilities were introduced
- [ ] Architecture drift result — review any WARN-level items

## 4. Assumptions needing sign-off

| # | Assumption | Confidence | Requires Sign-Off |
|---|---|---|---|
| A1 | {assumption text} | {high/medium/low} | Yes/No |

## 5. Current gate status

- Completed:
  - Alloy assertions: {pass_count}/{total_count} PASS
  - Unit tests: {pass_count}/{total_count} PASS
  - TypeScript typecheck: {status}
  - Build: {status}
  - Architecture drift check: {status}
  - Security audit: {status}
  - Traceability Report: {artifact id}
- Remaining:
  - {any remaining items}
- Human approval required: Yes/No

## 6. Next recommended mode

{no further mode needed | return to grounding if regression found | return to implementation if fix needed}

## 7. Final Decision

**PASS / FAIL**

{Reason for decision}

## 8. Copy/paste prompt for next agent

```
{If next mode is Grounding, paste-ready grounding prompt. If PASS, leave empty or say "No further mode needed."}
```

# Implementation Next-Steps Handoff

## 1. What was completed

{Filled by agent — summary of implementation session actions: files created/modified, tests written, verification run}

## 2. What was NOT completed

{Filled by agent — deferred features, known gaps, files omitted from the implementation}

## 3. What needs user review

- [ ] Implementation Summary — confirm scope matches the Formal Work Package
- [ ] Test coverage — verify new tests cover the behavior requirements
- [ ] Code changes — inspect critical paths

## 4. Assumptions needing sign-off

| # | Assumption | Confidence | Requires Sign-Off |
|---|---|---|---|
| A1 | {assumption text} | {high/medium/low} | Yes/No |

## 5. Current gate status

- Completed:
  - Implementation per Formal Work Package
  - Unit tests pass: {pass_count}/{total_count}
  - Typecheck: {status}
  - All files within allowed scope
- Remaining:
  - Verification Mode (Alloy checks, build, security audit, drift check, traceability report)
- Human approval required: Yes/No

## 6. Next recommended mode

**Verification Mode** — the implementation is ready for full verification against the Alloy model and Formal Work Package.

## 7. Copy/paste prompt for next agent

```
Execute Verification Mode on the {feature name} feature.

Use the Formal Work Package at:
  {path to FWP}

And the verified Alloy model at:
  {path to Alloy model}

### Key References
Grounding report: {path}
Alloy model: {path}
Implementation summary: {path}
Verification mode rules: .kilo/modes/verification-mode.md

### Pre-Verification Status
{list all cleared gates from implementation mode}

### Alloy Assertions to Verify
{list}

### Allowed Files
{list from FWP}

### Forbidden Files
{list from FWP}

### Required Verification Checks
1. Alloy check — rerun all assertions
2. Unit tests — run all test files
3. TypeScript typecheck
4. Build
5. Architecture drift check (`git diff --name-only HEAD` against FWP allowed/forbidden lists)
6. Security audit (run `commands.security_scan` from verification config)
7. Traceability Report
```

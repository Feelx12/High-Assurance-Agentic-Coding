# Change Class Policy

Every request must be classified before work begins.

## Class 0 — Trivial Product/UI Change

Examples:
- color change
- copy text change
- spacing adjustment
- icon swap
- non-functional UI polish

Required workflow:
- Implementation Mode may run directly.
- No Joern refresh required unless touching shared architecture.
- No Alloy required.
- Verification required: targeted UI check, snapshot/golden test if available, lint/typecheck.

Must produce:
- Change summary
- Files changed
- Verification run
- Final decision

Escalate to Class 1+ if:
- component behavior changes
- state changes
- navigation changes
- permissions/payments/auth/data access affected
- form validation changes
- scoring/test-taking behavior changes

## Class 1 — Small Bug Fix / Existing Problem

Examples:
- broken button
- incorrect label
- failed validation
- local runtime bug
- isolated function defect

Required workflow:
1. Debugging Mode
2. Minimal structural lookup
3. Root cause hypothesis
4. Targeted fix
5. Regression test where practical

Joern:
- Use targeted graph query only.
- Full graph refresh optional unless dependency/call-path uncertainty exists.

Alloy:
- Required only if bug touches business rules, invariants, data integrity, permissions, scoring, payments, scheduling, safety, or formalized behavior.

Must produce:
- Problem statement
- Root cause
- Impacted files
- Fix summary
- Test added/updated
- Verification result

## Class 2 — Workflow Regression / Problem After Formal Workflow

Examples:
- implementation passed workflow but new defect appears
- graph drift missed something
- Alloy model incomplete
- tests insufficient
- human assumption was wrong

Required workflow:
1. Return to Grounding Mode
2. Mark as Formal Regression
3. Refresh Joern graph
4. Compare intended work package vs actual implementation
5. Update Alloy or tests if coverage gap exists
6. Produce amended Formal Work Package
7. Re-implement narrowly
8. Re-verify

Must produce:
- Regression cause
- Missed truth layer: Structural / Behavioral / Verification / Human assumption
- Updated artifacts
- New prevention test
- Traceability addendum

## Class 3 — Non-Trivial Feature / Architecture or Behavior Change

Examples:
- new feature
- new state transition
- new data model
- new API
- auth/payment/permission/scoring/scheduling logic
- cross-module change

Required workflow:
- Full High-Assurance Workflow
- Fresh Joern graph
- Alloy reconciliation
- Formal Work Package
- Verification Mode
- Traceability Report

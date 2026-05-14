# Fast Path Verification

## Class 0

Required:
- lint
- typecheck
- targeted UI check if UI
- snapshot/golden test if available

Do not run:
- full CI
- Alloy
- full graph refresh

Unless escalation triggers exist.

## Class 1

Required:
- targeted regression test where practical
- lint
- typecheck

Use targeted Joern query only if:
- shared component affected,
- dependency uncertainty exists,
- state mutation exists,
- navigation changes,
- persistence changes,
- auth/data flow risk exists.

Do not run full formal workflow unless escalation occurs.

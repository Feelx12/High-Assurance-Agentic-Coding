# Risk Classification

## Risk Levels

LOW:
- cosmetic or isolated change
- no state, auth, payments, permissions, public API, or data mutation

MODERATE:
- localized behavior change
- contained data/state effect
- limited user-visible behavior

HIGH:
- business rule change
- scoring, scheduling, data integrity, formalized behavior
- cross-module behavior

CRITICAL:
- auth, payments, permissions, PII, safety-critical behavior, public API security

## Verification Levels

STANDARD:
- targeted tests
- lint/typecheck

ELEVATED:
- targeted tests
- regression tests
- static analysis
- related integration tests

SAFETY_CRITICAL:
- full formal workflow
- Alloy check
- generated fixtures
- full relevant CI
- human approval
- traceability report

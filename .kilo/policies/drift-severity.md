# Drift Severity Policy

## Drift Levels

NONE:
- No unauthorized graph changes.

EXPECTED:
- Test-only changes.
- Approved helper function inside allowed scope.

REVIEW_REQUIRED:
- Internal dependency changed.
- Shared component touched.
- New call path within approved domain.

CRITICAL:
- New external dependency.
- Auth/payment/permission path changed.
- Public API changed.
- Cross-module dependency introduced.
- Formalized behavior changed without Alloy update.

## Rule

CRITICAL drift fails verification.
REVIEW_REQUIRED drift requires human approval or return to Grounding Mode.

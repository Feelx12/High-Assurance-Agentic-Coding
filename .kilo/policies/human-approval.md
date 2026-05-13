# Human Approval Policy

Human approval is required when:

- authentication changes,
- payment logic changes,
- permission or role logic changes,
- PII access changes,
- public API behavior changes,
- safety-critical behavior changes,
- Alloy assumptions are low confidence,
- architecture drift is REVIEW_REQUIRED or CRITICAL,
- generated tests disagree with existing behavior,
- formal model changes weaken an invariant.

Approval must reference:

- artifact ID,
- work package ID,
- graph snapshot ID,
- Alloy validation ID,
- risk level,
- approval decision.

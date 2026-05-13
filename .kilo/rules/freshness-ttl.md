# Truth Freshness TTL

Truth artifacts expire when:

- commit hash changes,
- dependencies change,
- lockfiles change,
- generated code changes,
- migrations change,
- public APIs change,
- formal model files change,
- tests related to the domain change,
- MCP tool versions change.

Expired truth artifacts must be regenerated or reconciled before implementation.

Class 3 always requires fresh structural truth.
Class 2 always requires graph comparison.
Class 0 and Class 1 may use fast-path rules unless escalation triggers exist.

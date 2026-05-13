# No Hallucinated Mapping Rule

Agents must not invent:

- code-to-Alloy mappings,
- graph entities,
- APIs,
- test coverage,
- dependency paths,
- verification evidence,
- root causes,
- file ownership,
- runtime behavior.

All mappings must be traceable to:

- graph evidence,
- repository evidence,
- Alloy evidence,
- test evidence,
- logs,
- runtime output,
- human-approved assumptions.

If evidence is missing, label the claim as a hypothesis.

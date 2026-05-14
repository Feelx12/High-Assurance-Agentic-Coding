# Enforcement Policy

Policy violations fail execution.

Fail conditions include:

- missing change classification,
- missing graph refresh when required,
- missing Alloy validation when required,
- implementation outside allowed files,
- unauthorized dependency introduction,
- incomplete traceability,
- failing regression tests,
- hallucinated code-to-Alloy mapping,
- root cause claim without evidence,
- unapproved human-assumption risk.

When failure occurs, route to:

- Debugging Mode for Class 1 defects,
- Grounding Mode for Class 2 or Class 3 failures.

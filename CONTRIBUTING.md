# Contributing to the Kilo Code Governance Framework

First off, thank you for taking the time to contribute! This project aims to bring formal discipline and high-assurance workflows to agentic software engineering. Because we focus on eliminating architecture drift and ensuring deterministic code generation, we ask that our contributors follow a rigorous, structured pipeline.

By participating in this project, you agree to abide by our Code of Conduct.

---

## 🔍 How to Contribute

### 1. Opening an Issue
Before writing code, please check existing issues to ensure your topic hasn't already been covered. If you find a bug or have a feature request:
*   **Use a descriptive title:** Clearly isolate the component or policy layer affected.
*   **Provide context:** Describe the specific Kilo Code behavior (Architect mode vs. Code mode) or policy mismatch you encountered.
*   **Include reproduction steps:** If applicable, provide the exact prompt constraints or system configuration that caused the issue.

### 2. The High-Assurance Development Workflow
To stay aligned with our goal of zero-drift engineering, all code and policy contributions must follow this sequential lifecycle:

1.  **Fork & Branch:** Fork the repository and create a feature branch named descriptive of your changes (e.g., `feature/architect-mode-gate` or `fix/hallucination-policy`).
2.  **Define the Specification First:** Modify or add matching architectural documentation *before* changing functional code or policies.
3.  **Local Verification:** Run all local continuous-integration scripts and validation tests to ensure your changes do not introduce collateral regressions.
4.  **Keep Diffs Minimal:** Avoid sweeping, multi-file changes. Keep your commits atomic, targeted, and focused strictly on the scope of the issue.

### 3. Submitting a Pull Request (PR)
When your changes are ready for review:
*   **Base Branch:** File your PR against the `main` branch.
*   **PR Template Checklist:** Ensure your PR description clearly states:
    *   What problem this solves.
    *   Which specific policy or workflow layer is modified.
    *   Confirmation that all localized validation tests pass.
*   **Review Process:** At least one maintainer must review and approve the PR. If structural changes are requested, ensure you resolve them on your feature branch before requesting a re-review.

---

## 🛠️ Style & Formatting Guidelines

*   **Policy & Documentation:** Keep text concise, direct, and focused on operational enforcement. Use standard Markdown formatting with clean, scannable hierarchies.
*   **Commit Messages:** Write short, imperative commit messages describing *what* the commit changes (e.g., `Add deterministic verification rule for Code Mode output`).

## ❓ Need Help?
If you have questions about implementing a specific high-assurance workflow or mapping a new agentic behavioral guardrail, please open an exploratory issue with the label `discussion`.

# High-Assurance Agentic Coding — Constitution

The LLM is not the source of truth.

## Four Sources of Truth

1. **Structural Truth** — Joern / Code Property Graph / architecture graph
2. **Behavioral Truth** — Alloy / formal model / invariants
3. **Verification Truth** — tests / fixtures / CI evidence
4. **Human Operational Truth** — assumptions, handoffs, and approval decisions

## Core Principle

Use the lightest safe workflow. Do not force the full formal workflow for trivial changes.

## Change Classes

| Class | Label | Workflow |
|---|---|---|
| 0 | Trivial Product/UI Change | Implementation Mode (fast path) |
| 1 | Small Bug Fix / Existing Problem | Debugging Mode |
| 2 | Formal Regression | Grounding Mode (regression path) |
| 3 | Non-Trivial Feature / Architecture Change | Full High-Assurance Workflow |

→ Full rule detail: `.kilo/rules/change-classification.md`

## Acceptance Gate

A change is accepted only when:

- the correct change class was selected,
- required artifacts exist,
- required verification passed,
- no unauthorized architecture drift occurred,
- final report is complete.

→ Full gate detail: `.kilo/rules/high-assurance-agentic-coding.md`

## Motto

```
Joern scopes it.
Alloy constrains it.
Tests prove it.
RAG remembers it.
MCP automates it.
Modes enforce it.
```

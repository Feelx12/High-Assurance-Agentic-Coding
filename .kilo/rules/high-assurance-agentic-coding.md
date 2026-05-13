# High-Assurance Agentic Coding — Master Rule Set

The LLM is not the source of truth.

## Four Sources of Truth

1. **Structural Truth** — Joern / Code Property Graph / architecture graph
2. **Behavioral Truth** — Alloy / formal model / invariants
3. **Verification Truth** — tests / fixtures / CI evidence
4. **Human Operational Truth** — assumptions, handoffs, and approval decisions

## Operating Principle

Use the lightest safe workflow.

Do not force the full formal workflow for trivial changes.

## Workflow Routing

Every request must be classified before work begins.

```
Class 0 → Implementation Mode (fast path)
Class 1 → Debugging Mode
Class 2 → Grounding Mode (Formal Regression)
Class 3 → Full High-Assurance Workflow
```

## Core Rules

1. Classify every change before work begins.
2. Never skip graph refresh for Class 3.
3. Never trust stale Alloy mappings.
4. Never hallucinate evidence, mappings, or root causes.
5. Never implement outside the approved scope.
6. Never weaken formal rules silently.
7. Always produce required artifacts before proceeding.
8. Always route to Grounding Mode when in doubt.
9. Reject unauthorized architecture drift.
10. Record evidence for every accepted change.

## Motto

```
Joern scopes it.
Alloy constrains it.
Tests prove it.
RAG remembers it.
MCP automates it.
Modes enforce it.
```

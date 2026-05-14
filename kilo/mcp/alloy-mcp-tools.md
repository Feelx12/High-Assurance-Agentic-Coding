# Alloy MCP Tool Requirements

The Alloy MCP server provides behavioral truth via formal model analysis.

## Required Tools

### Entry-Point Tools (must return FAIL when backend unavailable)

alloy_status()                                     — Pre-condition health check
list_models()                                      — List .als files in formal/

### Query Tools (require Alloy Analyzer runtime)

find_related_model(domain)                         — Search models by domain name
validate_model_mapping(model, graph_snapshot)       — Structural parse and syntax check
run_predicate(model, predicate, scope)             — Run predicate, return satisfiability
check_assertion(model, assertion, scope)            — Check assertion, find counterexample
generate_instance(model, predicate, scope)          — Generate SAT instance from predicate
generate_counterexample(model, assertion, scope)    — Generate counterexample from failed assertion
export_instance_json(instance_id)                   — Export saved instance as JSON fixture

## Required Outputs

Each tool must return:

- status,
- timestamp,
- commit hash,
- tool version,
- alloy_available,
- inputs,
- result fields as documented per tool.

## FAIL Contract

The following tools are **entry-point** tools — they MUST return `status: "FAIL"` (never STUB) when the Alloy backend is unavailable or when inputs are invalid:

- `alloy_status` — always returns `status: "PASS"`; reports `alloy_available: boolean`.
- `list_models` — always returns `status: "PASS"` (no Alloy needed — file listing only).
- `validate_model_mapping` — may return FAIL if model file not found.

Query tools (`run_predicate`, `check_assertion`, `generate_instance`, `generate_counterexample`, `export_instance_json`) return `status: "PARTIAL"` when the Alloy Analyzer runtime is not available. PARTIAL means the tool could not execute the query but the workflow may proceed with degraded behavioral truth.

## Backend Requirements

Alloy Analyzer runtime is required for query execution. Detection order:
1. `ALLOY_JAR` environment variable (any OS)
2. `alloy` CLI wrapper on PATH (Homebrew: `brew install alloy-analyzer`)
3. Common jar locations (`~/.alloy/alloy.jar`, `.kilo/alloy.jar`)
4. Windows-specific: `%USERPROFILE%\bin\alloy\alloy.jar`, `%PROGRAMFILES%\alloy\alloy.jar`

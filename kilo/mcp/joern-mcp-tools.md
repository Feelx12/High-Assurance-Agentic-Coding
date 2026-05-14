# Joern MCP Tool Requirements

The Joern MCP server provides structural truth via Code Property Graph (CPG) analysis.

## Required Tools

### Entry-Point Tools (must return FAIL when backend unavailable)

build_cpg(repo_path)                 — Parse repo + run full query, save snapshot
create_graph_snapshot(repo_path)     — Parse only, save snapshot (lightweight)
joern_status()                       — Pre-condition health check

### Snapshot Tools

compare_graph_snapshots(before_id, after_id)  — Structural delta between two snapshots
register_cpg(cpg_path, repo_path)             — Register externally-built CPG

### Query Tools (require a snapshot)

find_symbols(query)                  — Search CPG for symbols matching query
get_call_graph(symbol)               — Return callers and callees for a symbol
get_data_flow(symbol)                — Trace parameter sources and return sinks
get_dependency_cone(symbol)          — Direct and transitive dependency cone
get_mutation_points(entity)          — Assignment and state-write points
get_related_tests(symbol)            — Test files related to a symbol
detect_unapproved_dependencies(scope) — Detect files outside allowed scope

## Required Outputs

Each tool must return:

- status,
- timestamp,
- commit hash,
- tool version,
- joern_available,
- inputs,
- result fields as documented per tool.

## FAIL Contract

The following tools are **entry-point** tools — they MUST return `status: "FAIL"` (never STUB) when the Joern backend is unavailable:

- `build_cpg` — returns `status: "FAIL"`, `error: "Joern CLI not found on PATH..."` when `joern-parse` is not on PATH.
- `create_graph_snapshot` — same FAIL contract as `build_cpg`.
- `joern_status` — always returns `status: "PASS"`; reports `joern_available: boolean`.

### Query Tools

Query tools (`find_symbols`, `get_call_graph`, `get_data_flow`, `get_dependency_cone`, `get_mutation_points`, `get_related_tests`, `detect_unapproved_dependencies`) return `status: "PARTIAL"` when no CPG snapshot exists or when the Joern backend is unavailable. PARTIAL means the tool could not complete but the workflow may proceed with degraded data.

### Implemented Query Tools

`get_call_graph(symbol)` — Runs a Scala query against the latest CPG snapshot. Returns `callers` and `callees` arrays. Falls back to PARTIAL if no CPG or Joern unavailable.

`get_dependency_cone(symbol)` — Runs a Scala query to find direct and transitive dependencies (callees of callees). Returns `direct_dependencies` and `transitive_dependencies` arrays.

`get_data_flow(symbol)` — Runs a Scala query to trace method parameters (sources) and return types (sinks). Returns `sources` and `sinks` arrays.

`get_mutation_points(entity)` — Runs a Scala query to find assignment statements within the entity's scope. Returns `mutation_points` array.

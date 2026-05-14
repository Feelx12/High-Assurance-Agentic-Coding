# Artifact Storage Convention

## Run-Based Structure

All workflow artifacts are organized under a run-based hierarchy:

```
.kilo/artifacts/
  runs/
    RUN-YYYY-MM-DD-NNN-[slug]/
      00-intake/            ← Plan output from /plan mode, change classification, intent parsing, initial prompt
      01-grounding/         ← Freshness report, structural truth, Alloy validation, FWP
      02-implementation/    ← Implementation summary, scope confirmation
      03-verification/      ← Traceability report, drift analysis, CI results
      04-deployment/        ← Deployment decision (human-entered)
  indexes/
    run-index.jsonl         ← One JSON line per run: run_id, slug, feature, change_class, created_at, status
    artifact-index.jsonl    ← One JSON line per artifact: artifact_id, run_id, artifact_type, file_path, created_at
  baselines/
    audit-baseline.json     ← Security audit baseline (npm audit --json snapshot)
    latest-run.json         ← Points to the most recent run folder (no symlinks; Windows-safe)
```

## Artifact Metadata (Required)

Every artifact JSON file MUST include these top-level fields:

| Field | Type | Description |
|---|---|---|
| `artifact_id` | string | Unique ID (e.g., `FWP-fairball-opt-001`) |
| `run_id` | string | Parent run ID (e.g., `RUN-2026-05-14-001-fairball-opt`) |
| `artifact_type` | string | One of: `intake`, `grounding_report`, `fwp`, `implementation_summary`, `traceability_report`, `handoff`, `deployment_decision` |
| `parent_artifact_id` | string? | Previous artifact in the chain, if applicable |
| `commit_hash` | string | Git commit at time of creation |
| `workflow_state` | string | Current state: `GROUNDING`, `IMPLEMENTATION`, `VERIFICATION`, `PASSED`, `FAILED`, `BLOCKED` |
| `change_class` | string | `CLASS_0`, `CLASS_1`, `CLASS_2`, or `CLASS_3` |
| `created_at` | string | ISO-8601 timestamp |
| `tool_versions` | object | `{ "alloy": "6.2.0", "vitest": "4.1.5", ... }` |
| `mcp_tool_versions` | object | Alias for `tool_versions`; either field accepted |

## Index File Format

`run-index.jsonl` — one JSON object per line:
```jsonl
{"run_id":"RUN-2026-05-14-001-fairball-opt","slug":"fairball-opt","feature":"FairBall Optimization","change_class":"CLASS_3","created_at":"2026-05-14T12:20:00Z","status":"PASSED"}
```

`artifact-index.jsonl` — one JSON object per line:
```jsonl
{"artifact_id":"FWP-fairball-opt-001","run_id":"RUN-2026-05-14-001-fairball-opt","artifact_type":"fwp","file_path":"runs/RUN-2026-05-14-001-fairball-opt/01-grounding/FWP-fairball-opt-001.json","created_at":"2026-05-13T19:45:00Z"}
```

## Naming Convention

- Run folders: `RUN-YYYY-MM-DD-NNN-[slug]` where NNN is a zero-padded daily counter and slug is a short feature name.
- Example: `RUN-2026-05-14-001-fairball-opt`

## Versioning (Hard Rule)

- Artifacts are **append-only**. Do not overwrite an existing artifact ID.
- If an artifact must be updated, create a new artifact with a new ID and `parent_artifact_id` pointing to the previous version.
- Each artifact contains `parent_artifact_id` to form a lineage chain.
- Use `derived_from` to reference the work package that produced a traceability report.

## What to Commit

| Artifact | Commit? |
|---|---|
| Traceability reports (`.traceability.json`) | Yes — audit trail |
| Work packages (`.work-package.json` / `.json`) | Yes — implementation contract |
| Run index (`run-index.jsonl`) | Yes — discoverable history |
| Artifact index (`artifact-index.jsonl`) | Yes — discoverable history |
| `latest-run.json` | Yes — current state pointer |
| CPG binaries (`.bin`) | No — regenerate from source |
| CPG snapshots (`.snapshot.json`) | Yes — lightweight diff history |
| Alloy instances (`.json`) | Yes — formal evidence |
| Alloy counterexamples | Yes — formal evidence |
| Audit baselines | Yes — security drift detection |
| `node_modules/` | Never |

## Replay

To replay a workflow from a traceability report:

```bash
# 1. Check out the commit
git checkout <commit_hash>

# 2. Restore the graph snapshot from the run folder or .kilo/snapshots/

# 3. Re-run Alloy checks using the recorded alloy_model files
java -jar .kilo/alloy.jar exec formal/<model>.als

# 4. Re-run tests using the recorded test_commands from replay_inputs
npx vitest run --reporter verbose
```

All inputs needed for replay are stored in the `replay_inputs` section of each traceability report, including `mcp_tool_versions` for tool version compatibility checks.

---

## `.kilo/plans/` — Plan Files

Plan files are produced by `/plan` mode (`kilo.jsonc` → `command` → `plan`). Each plan is a Markdown file with the format `<timestamp>-<slug>.md` containing:

- Clarified requirements
- Sub-task table with classification and routing
- Implementation order
- Escalation triggers

Example: `.kilo/plans/1778699953180-quick-nebula.md`

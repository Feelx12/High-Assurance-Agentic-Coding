<img width="1536" height="1024" alt="High-Assurance Agentic Coding" src="https://github.com/user-attachments/assets/a308d15f-eac3-4042-aed2-dc32477f9209" />
[![Connect with me on LinkedIn](https://img.shields.io/badge/Connect%20with%20me%20on-LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/felix-cortez)

# High-Assurance Agentic Coding

> **The Future Is Formally Verified.**

A structured, formally-grounded workflow for AI-assisted software development using [Kilo Code](https://kilo.ai). Designed to prevent hallucination, scope creep, unauthorized architecture drift, and unverified changes.

---

## What This Is

This repository provides a complete Kilo Code workflow configuration that enforces:

- **Class-aware planning workflow** — broad, ambiguous, Class 2, and Class 3 requests start with requirements clarification and task deconstruction; trivial Class 0/1 work may use the lightest safe path.
- **Change classification** before any work begins (Class 0–3)
- **Formal grounding** via Joern / Code Property Graph (CPG) for structural truth
- **Behavioral constraints** via Alloy formal models
- **Evidence-based verification** before accepting any change
- **Human approval gates** for high-risk domains (auth, payments, permissions, scoring, PII, safety-critical)

---

## Workflow Summary

```
User request
  ↓
/High Assurance Plan ──► Requirements clarification + deconstruction
  ↓
/classify ───► Class 0  ──► /implementation (fast path)
  │
  ├──► Class 1  ──► /debugging + minimal truth check
  │                    scope gate classifies issue:
  │                    ├─ IN_SCOPE defect  → narrow fix → /implementation
  │                    ├─ OUT_OF_SCOPE     → /grounding (new feature)
  │                    └─ MISSED_REQUIREMENT → /grounding (Class 2)
  │
  ├──► Class 2  ──► /grounding (Formal Regression)
  │
  └──► Class 3  ──► Full High-Assurance Workflow
                       /grounding → /implementation → /verification
```

### Plan Mode (`/High Assurance Plan`)

**Purpose:** Clarify intent and deconstruct requests with the lightest safe planning depth. Mandatory for Class 3, recommended for Class 2, optional/lightweight for Class 0/1. For grouped requests, splits into independently-classified sub-tasks and routes each workstream to the correct mode. Does NOT replace Grounding Mode — Plan Mode is an intake layer only.

0. **Freshness Pre-Check** — verify `.kilo/project-context.md` commit hash matches `HEAD`; call `rag-index_index_status` and inspect both `indexed_vectors_count` and `last_indexed_commit`. If vectors are empty (`indexed_vectors_count: 0`) or the index is stale and semantic retrieval is needed, reindex via `rag-index_index_workspace` (up to 3 retries; on total failure, proceed with `rag_index_status: unavailable` documented in the Freshness Report)
1. Discover project context (`.kilo/project-context.md`) — create if missing
2. Parse intent — identify ambiguities in the user request
3. Ask clarifying questions (scope, constraints, edge cases, priorities) — max 2 rounds via `ask_followup_question` XML widget (selectable dialog — never plain text)
4. Rewrite clarified requirements into EARS format (5 patterns: Ubiquitous, Event-driven, State-driven, Unwanted behavior, Optional feature)
5. Deconstruct into discrete, ordered, classifiable sub-tasks (split grouped requests into atomic items)
6. Cross-reference each sub-task against 15 policy/rules/coverage systems
7. Group related sub-tasks into workstreams and route each to the correct downstream mode
8. Save the structured plan to `.kilo/artifacts/runs/<RUN>/00-intake/PLAN-<slug>-001.md`

### Full Class 3 Workflow

```
/High Assurance Plan ────► Requirements deconstruction + task classification
  ↓
/classify ────► confirms Class 3
  ↓
/grounding
  ↓ Fresh Joern graph snapshot
  ↓ Graph delta + impact analysis
  ↓ Assumptions + behavior requirements
  ↓ Alloy reconciliation / creation
  ↓ Alloy assertions (must all pass)
  ↓ Formal fixture generation (Alloy → formal-behavioral contracts;
  ↓   Joern mutation points → formal-structural contracts)
  ↓ Human-readable handoff
  ↓ Formal Work Package (JSON, schema-validated; includes test_contracts[])
/implementation  ← Contract Lifecycle: CONTRACT_DEFINED → TEST_WRITTEN_RED → TEST_PASSING
  ↓ Create test files + confirm RED (failing) per contract before any source edit
  ↓ Constrained implementation (allowed files only)
  ↓ Confirm GREEN (passing) per contract; capture red_evidence + green_evidence
/verification
  ↓ Alloy re-check + tests + drift analysis + build + security audit
  ↓ validate-contracts.mjs — blocks PASS if any contract not TEST_PASSING
  ↓ Traceability Report (persisted to run-based artifact structure)
```

### Motto

```
Joern scopes it.
Alloy constrains it.
Contracts gate it.
Tests prove it.
Humans decide it.
RAG discovers it.
Files confirm it.
MCP automates it.
Modes enforce it.
```

---

## Mode Model Tiering

Each mode runs at the model tier matching its cognitive demand.

| Mode           | Tier     | Why                                                                    |
| -------------- | -------- | ---------------------------------------------------------------------- |
| Plan           | Frontier | Intent capture — errors here corrupt all downstream work               |
| Grounding      | Frontier | Formal specification — errors here corrupt all downstream contracts    |
| Implementation | Standard | Template-driven — discipline enforced by validators, not free reasoning |
| Debugging      | Standard | Classification gate matters — misrouting is expensive                  |
| Verification   | Fast     | Mechanical — tool-calling matters more than reasoning                  |

**Frontier** (e.g., Claude Opus): highest reasoning quality.
**Standard** (e.g., Claude Sonnet): strong reasoning at lower cost.
**Fast** (e.g., Claude Haiku): rapid tool execution for mechanical tasks.

---

## Prerequisites

- [Kilo Code](https://kilo.ai) VS Code extension installed
- [Node.js](https://nodejs.org) v18+ (for MCP servers and plan runner)
- [Java](https://adoptium.net) 11+ (required for Alloy and Joern)

### Alloy Analyzer

| Platform | Install |
|---|---|
| **macOS** | `brew install alloy-analyzer` |
| **Windows** | Download `alloy.jar` from [alloytools.org](https://alloytools.org). Place at `.kilo/alloy.jar` and set environment variable: `$env:ALLOY_JAR = "$PWD\.kilo\alloy.jar"` |
| **Windows** (permanent) | `[Environment]::SetEnvironmentVariable('ALLOY_JAR', 'C:\path\to\alloy.jar', 'User')` |
| **macOS / Linux** (manual) | `export ALLOY_JAR=/path/to/alloy.jar` |

### Joern Installation

| Platform | Command |
|---|---|
| **macOS / Linux / WSL** | `./.kilo/joern-install.sh` |
| **Windows (PowerShell)** | `.\.kilo\joern-install.ps1` |

> **Windows note:** PowerShell uses single backslashes. If execution policy blocks the script, run: `powershell -ExecutionPolicy Bypass -File .\.kilo\joern-install.ps1`

---

## Installation

### 1. Copy the workflow into your project root

To share or install this workflow, you need to copy the `.kilo/` directory **and** the `kilo.json` file.

> [!IMPORTANT]
> The `kilo.json` file **must** be placed in the absolute root of your new project. If you bundle it inside `.kilo/` for sharing, the recipient must move it back to their project root. Kilo will not discover workflows or servers if the config is not in the root.
>
> **RAG Data:** Exclude generated state when sharing. Do not copy `.kilo/.rag-index-state.json` or the `.kilo/qdrant_storage/` folder.

| Platform | Command |
|---|---|
| macOS / Linux | `cp -r /path/to/this-repo/.kilo /your/project/.kilo && cp /path/to/this-repo/kilo.json /your/project/kilo.json` |
| Windows (PowerShell) | `Copy-Item -Recurse C:\path\to\this-repo\.kilo C:\your\project\.kilo; Copy-Item C:\path\to\this-repo\kilo.json C:\your\project\kilo.json` |

### 2. Install MCP server dependencies

```
cd .kilo
npm install
```
(This step is the same for all platforms.)

### 3. Configure your verification stack (optional)

Copy the verification config template and edit it for your project's stack:

| Platform | Command |
|---|---|
| macOS / Linux | `cp .kilo/verification-config.template.json .kilo/verification-config.json` |
| Windows (PowerShell) | `Copy-Item .kilo/verification-config.template.json .kilo/verification-config.json` |

Edit the file and set `"stack"` to `"node"`, `"python"`, `"go"`, or `"rust"`. Set `commands.lint` to your linter or `null` if none is configured. If you skip this step, the verification server auto-detects your stack from `package.json`, `pyproject.toml`, `go.mod`, or `Cargo.toml`.

### 4. Create your `formal/` directory

| Platform | Command |
|---|---|
| macOS / Linux | `mkdir formal/` |
| Windows (PowerShell) | `New-Item -ItemType Directory formal/` |

Add Alloy (`.als`) files here as you work through Class 3 workflows. Extension models must `open` the core model — do not re-declare shared types (see `.kilo/rules/high-assurance-agentic-coding.md` Rule 12).

### 5. Reload Kilo

In VS Code, open the Command Palette and run `Developer: Reload Window`:

| Platform | Shortcut |
|---|---|
| macOS | `Cmd+Shift+P` |
| Windows / Linux | `Ctrl+Shift+P` |

Kilo will auto-discover the entire workflow.

---

## How Kilo Loads This Workflow

Once `.kilo/` is in your project root and you reload VS Code, Kilo automatically wires up:

| Kilo Feature | Source | How It Works |
|---|---|---|
| **Constitution** | `.kilo/AGENTS.md` | Auto-discovered by Kilo on startup |
| **Rules** | `.kilo/rules/*.md` | Loaded via `instructions` glob in repo-root `kilo.json` |
| **Policies** | `.kilo/policies/*.md` | Loaded via `instructions` glob |
| **Templates** | `.kilo/templates/*.md` | Loaded via `instructions` glob |
| **Coverage Registry** | `.kilo/formal-coverage/*.md` | Loaded via `instructions` glob |
| **Workflows** | `kilo.json` → `command` | Slash commands — type `/High Assurance Plan`, `/grounding`, `/debugging`, etc. |
| **Skills** | `.kilo/skills/*/SKILL.md` | Auto-discovered from skills folder path |
| **Schemas** | `.kilo/schemas/*.schema.json` | Validated JSON — enforces workflow contracts |
| **Qdrant** | `.kilo/qdrant.local.jsonc` + `.kilo/scripts/ensure-qdrant-local.mjs` | Optional semantic search; fail-safe |
| **MCP Servers** | `kilo.json` → `mcp` | Launched as local stdio processes |

---

## Slash Commands (Workflows)

Type `/` in the Kilo chat to invoke any workflow mode. **Run `/High Assurance Plan` before broad, ambiguous, Class 2, or Class 3 requests.** For Class 0 and simple Class 1 work, skip planning and classify directly.

| Command | Purpose |
|---|---|
| `/High Assurance Plan` | **Plan Mode** — clarifies intent, writes EARS requirements, cross-references policy, routes to the correct workflow. Mandatory for Class 3, recommended for Class 2, optional for Class 0/1. |
| `/classify` | Fast-path: classify a change and return required mode (2-3 lines, no implementation). Defined in repo-root `kilo.json`, not a separate file. |
| `/grounding` | Formal Grounding Mode — structural + behavioral truth |
| `/debugging` | Root Cause Analysis — evidence-based debugging with scope classification (IN_SCOPE / OUT_OF_SCOPE / MISSED_REQUIREMENT) and routing |
| `/implementation` | Constrained Implementation Mode |
| `/verification` | Verification Traceability Mode |
| `/state-machine` | Query the workflow state machine |
| `/status` | Report current workflow state, active artifacts, pending gates |

---

## MCP Servers

Four MCP servers are configured via repo-root `kilo.json`:

| Server | Description | Key Tools |
|---|---|---|
| **joern** | Structural truth via CPG analysis | `joern_status`, `joern_build_cpg`, `joern_create_graph_snapshot`, `joern_compare_graph_snapshots`, `joern_find_symbols`, `joern_get_call_graph`, `joern_get_data_flow`, `joern_get_dependency_cone`, `joern_get_mutation_points`, `joern_get_related_tests`, `joern_detect_unapproved_dependencies` |
| **alloy** | Behavioral truth via formal model checking | `alloy_status`, `alloy_list_models`, `alloy_validate_model_mapping`, `alloy_run_predicate`, `alloy_check_assertion`, `alloy_generate_instance`, `alloy_generate_counterexample`, `alloy_export_instance_json` |
| **verification** | Verification truth via tests, lint, typecheck, security | `verification_run_unit_tests`, `verification_run_lint`, `verification_run_typecheck`, `verification_run_security_scan`, `verification_generate_traceability_report`, `verification_validate_work_package` |
| **rag-index** | Repo-local semantic retrieval via Voyage + Qdrant | `rag-index_status`, `rag-index_index_status`, `rag-index_semantic_search`, `rag-index_index_workspace`, `rag-index_reindex_file`, `rag-index_clear_index`, `rag-index_qdrant_restart` |

### Stack Support (verification server)

The verification server auto-detects your project stack:

| Stack | Detection | Test | Typecheck | Security |
|---|---|---|---|---|
| **Node.js** | `package.json` | `npm test` / `vitest` | `tsc --noEmit` | `npm audit` |
| **Python** | `pyproject.toml` | `pytest` | `mypy` | `pip-audit` |
| **Go** | `go.mod` | `go test` | `go vet` | `govulncheck` |
| **Rust** | `Cargo.toml` | `cargo test` | `cargo check` | `cargo audit` |

Override with `.kilo/verification-config.json`.

### Artifact Persistence

All workflow artifacts are organized in a run-based structure:

```
.kilo/artifacts/
  runs/
    RUN-YYYY-MM-DD-NNN-[slug]/
      00-intake/            ← Classification, intent, initial prompt
      01-grounding/         ← Freshness report, structural truth, Alloy validation, FWP
      02-implementation/    ← Implementation summary, scope confirmation
      03-verification/      ← Traceability report, drift analysis, CI results
      04-deployment/        ← Deployment decision (human-entered)
  indexes/
    run-index.jsonl         ← Discoverable run history
    artifact-index.jsonl    ← Discoverable artifact history
  baselines/
    audit-baseline.json     ← Security audit baseline
    latest-run.json         ← Pointer to most recent run (no symlinks; Windows-safe)
```

See `.kilo/artifact-storage.md` for full naming, versioning, and replay conventions.

---

## Tool-Native Workflow Enforcement

All modes, skills, templates, and policies use Kilo-native tool names. Generic language like "look around the repo" or "run tests" is prohibited. See `.kilo/rules/tool-optimization.md` for the full requirement.

### Key Tool References

| Tool | Purpose |
|---|---|
| `ask_followup_question` | Resolve askable assumptions — emitted as raw XML, rendered as a selectable dialog in all modes (Plan, Grounding, Implementation, Verification). Never plain text. |
| `rag-index_semantic_search` | Discover code paths by meaning using this repo's default MCP semantic backend |
| `rag-index_status` / `rag-index_index_status` | Confirm semantic backend health and index freshness. Staleness signal: `last_commit != current_commit`. Note: `indexed_vectors_count: 0` is normal when `points_count < 10,000` — Qdrant uses full-scan below the HNSW threshold. |
| `semantic_search` | Built-in semantic discovery — use only when indexing is explicitly enabled and verified available |
| `search_files` | Confirm exact symbols, routes, constants, imports, errors |
| `read_file` | Inspect source before editing or making claims |
| `apply_diff` | Surgical edits to existing files |
| `write_to_file` | New files or intentional full-file replacement |
| `execute_command` | Verification — tests, typecheck, lint, build |
| `attempt_completion` | Final gate — only after verification and review |

### Semantic Search / Qdrant

This repo ships two semantic backends:

1. `rag-index_semantic_search` via the `rag-index` MCP server. This is the default backend because repo-root `kilo.json` keeps built-in indexing disabled. The backend scopes collections to the active workspace.
2. Built-in `semantic_search`, only when indexing is explicitly enabled and verified in the active runtime.

Before `rag-index_semantic_search`, call `rag-index_status` and `rag-index_index_status`. From the status response, check:
- `last_commit` ≠ `current_commit` → index is stale. Call `rag-index_index_workspace` (incremental — only re-embeds changed files) if semantic retrieval is needed; otherwise document as `stale — skipped` and proceed with `search_files`.
- `points_count: 0` → never indexed. Call `rag-index_index_workspace` with `full_reindex: true`.
- `indexed_vectors_count: 0` with `points_count < 10,000` → **normal**. Qdrant uses full-scan below the HNSW build threshold (default 10,000). Do not treat this as a broken index.

If neither semantic backend is available, fall back to `search_files` → `list_code_definition_names` → `read_file` → `list_files`. Never auto-install Qdrant. Never block the workflow on Qdrant unavailability. See `.kilo/rules/local-qdrant-bootstrap.md`.

## Skills

9 skills are auto-discovered in `.kilo/skills/`. Each skill follows the format `.kilo/skills/<skill-name>/SKILL.md`.

| Skill | Purpose | Used By |
|---|---|---|
| `fresh-graph-grounding` | Ensure planning uses current codebase | Grounding Mode |
| `alloy-rule-authoring` | Create or update Alloy behavioral rules | Grounding Mode |
| `formal-fixture-generation` | Convert Alloy instances to test fixtures | Grounding Mode |
| `human-readable-handoff` | Bridge formal truth to implementation | Grounding Mode |
| `formal-work-package` | Compile bounded implementation package | Grounding Mode |
| `constrained-implementation` | Implement within approved scope only | Implementation Mode |
| `verification-traceability` | Prove implementation correctness | Verification Mode |
| `confidence-assessment` | Report uncertainty before proceeding | Grounding + Debugging |
| `user-handoff` | Produce user-actionable next-steps handoff | All Modes |

---

## Directory Reference

```
repo-root/
  kilo.json                              ← Kilo config: MCP, workflows, instructions
  .kilo/
    AGENTS.md                            ← Constitution (loaded via `instructions`)
    README.md                            ← This file
    artifact-storage.md                  ← Artifact naming, versioning, replay convention
    high-assurance-agentic-coding-user-workflow-guide.md  ← Full user workflow reference
    verification-config.json             ← Active verification stack config
    verification-config.template.json    ← Copy to verification-config.json per project
    package.json                         ← MCP server Node.js dependencies
    alloy.jar                            ← Alloy Analyzer JAR (optional — set ALLOY_JAR)
    alloy.js                             ← Alloy MCP server
    joern.js                             ← Joern MCP server
    rag-index.js                         ← Repo-local semantic search MCP server
    verification.js                      ← Verification MCP server
    joern-install.sh                     ← Joern installer (macOS / Linux)
    joern-install.ps1                    ← Joern installer (Windows PowerShell)
    agent-manager.json                   ← Agent Manager worktree/session state

    workflow/
      state-machine.md                   ← Valid states, transitions, artifact requirements

  modes/
    grounding-mode.md                    ← Formal Grounding Architect
    debugging-mode.md                    ← Root Cause Analyst
    implementation-mode.md               ← Constrained Implementer
    verification-mode.md                 ← Verification Auditor

  rules/
    high-assurance-agentic-coding.md     ← Master rule set (24 core rules; includes tiering + test_contracts)
    change-classification.md             ← Class 0-3 definitions, batch routing, tool paths
    tool-optimization.md                 ← Kilo tool-first requirement + Qdrant rule
    assumption-gate.md                   ← No handoff with unresolved askable assumptions
    debugging-evidence.md                ← Root cause evidence + confidence levels
    freshness-ttl.md                     ← When truth artifacts expire + class-based rules
    no-hallucinated-mapping.md           ← Evidence requirements for all claims + mappings
    local-qdrant-bootstrap.md            ← Qdrant availability + fallback behavior
    user-actionable-output.md            ← Handoff requirements per mode
    _tool-native-preamble.md             ← Shared hard requirements + Tool Usage Summary template (loaded by all modes/policies)

  policies/
    escalation-matrix.md                 ← Trigger → change class + required tool response
    human-approval.md                    ← When human sign-off is required + approval capture
    enforcement.md                       ← Fail conditions + tool-native fail conditions
    risk-classification.md               ← LOW / MODERATE / HIGH / CRITICAL + tool mapping
    autonomy-levels.md                   ← LEVEL_0 through LEVEL_5 + tool requirements
    drift-severity.md                    ← Architecture drift severity + evidence + actions
    fast-path-verification.md            ← Class 0/1 requirements + fast-path tool rules
    batch-routing.md                     ← Mixed-class batch: coupling, split, route

  formal-coverage/
    coverage-registry.md                 ← Domain Alloy coverage table (update per project)

  examples/
    class3-walkthrough.md                ← Complete Class 3 example with real artifacts

  skills/
    alloy-rule-authoring/SKILL.md
    confidence-assessment/SKILL.md
    constrained-implementation/SKILL.md
    formal-fixture-generation/SKILL.md
    formal-work-package/SKILL.md
    fresh-graph-grounding/SKILL.md
    human-readable-handoff/SKILL.md
    user-handoff/SKILL.md
    verification-traceability/SKILL.md

  templates/
    confidence-report.md
    debugging-next-steps-handoff.md
    debugging-report.md
    deployment-decision.md
    formal-work-package.md
    freshness-report.md
    grounding-next-steps-handoff.md
    human-readable-implementation-handoff.md
    implementation-fix-handoff.md            ← Narrow fix from Debugging (IN_SCOPE)
    implementation-next-steps-handoff.md
    new-grounding-handoff.md                 ← Escalation from Debugging (OUT_OF_SCOPE)
    regression-addendum.md
    traceability-report.md
    user-next-steps-handoff.md
    verification-next-steps-handoff.md

  schemas/
    alloy-validation.schema.json         ← Alloy run/check result schema
    graph-snapshot.schema.json           ← CPG node/edge typed schema
    traceability.schema.json             ← Verification truth + replay_inputs schema
    work-package.schema.json             ← FWP schema; test_contracts[] with full lifecycle fields

  templates/
    test-contract.template.ts            ← Vitest test file template with @contract_id header
    test-fixture.template.json           ← JSON fixture template for contract inputs/expected
    (+ existing handoff/report templates)

  scripts/
    validate-contracts.mjs               ← Validates test_contracts[] lifecycle (exit 0=pass, 1=violations, 2=error)
    generate-boundary-cases.mjs          ← Generates boundary fixtures from Joern mutation points
    validate-schemas.mjs                 ← FWP + schema JSON validation
    lint-questions.mjs                   ← Scans artifacts for plain-text question patterns

  mcp/
    alloy-mcp-tools.md                   ← Alloy MCP tool contracts
    joern-mcp-tools.md                   ← Joern MCP tool contracts
    verification-mcp-tools.md            ← Verification MCP tool contracts
    mcp-contract-validation.md           ← MCP failure semantics (PASS / FAIL / PARTIAL)

  workflow/
    state-machine.md                     ← Valid states and transitions
    run-structure.md                     ← Run folder layout specification
    error-recovery.md                    ← Error recovery procedures by mode

  examples/
    class3-walkthrough.md                ← End-to-end Class 3 example
    ci-integration.md                    ← CI/CD pipeline integration guide

  artifacts/                             ← Run-based artifact storage
    runs/                                ← One subdirectory per session (RUN-YYYY-MM-DD-NNN-<slug>/)
    archive/                             ← Archived runs older than 30 days (git-ignored)
  plans/                                 ← Legacy plan files (FROZEN — new plans go to artifacts/runs/<RUN>/00-intake/)
  scripts/                               ← Health-check and validation utilities
```

---

## Artifact Retention Policy

Run artifacts accumulate under `.kilo/artifacts/runs/`. To prevent unbounded growth:

- **Active runs (last 30 days):** keep in full under `artifacts/runs/`
- **Older runs:** move to `artifacts/archive/` (git-ignored; compress or delete as needed)

`artifacts/archive/` is listed in `.gitignore` so archived runs do not bloat the repository.

There is no automation script yet — apply the policy manually. A future `node .kilo/scripts/archive-runs.mjs --older-than 30` script is planned.

---

## Per-Project Setup

When adding this workflow to a new project:

1. **Run `/High Assurance Plan`** to discover project context and deconstruct your first change request.
2. **Update `formal-coverage/coverage-registry.md`** — replace the example domains with your project's actual domains.
3. **Configure verification** — copy `verification-config.template.json` to `verification-config.json` and set your stack and commands.
4. **Create a `formal/` directory** in your project root for Alloy models.
5. **Install Joern** (if needed for structural truth):

| Platform | Command |
|---|---|
| macOS / Linux | `./.kilo/joern-install.sh` |
| Windows (PowerShell) | `.\.kilo\joern-install.ps1` |

6. **Set `ALLOY_JAR`** if not using Homebrew:

| Platform | Command |
|---|---|
| macOS / Linux | `export ALLOY_JAR=/path/to/alloy.jar` |
| Windows (PowerShell) | `$env:ALLOY_JAR = "C:\\path\\to\\alloy.jar"` |

7. **Set `WORKSPACE`** if running MCP servers outside VS Code:

| Platform | Command |
|---|---|
| macOS / Linux | `export WORKSPACE=/path/to/your/project` |
| Windows (PowerShell) | `$env:WORKSPACE = "C:\\path\\to\\your\\project"` |

---

## Acceptance Gate

A change may be accepted only when:

1. Change class is correct.
2. Required mode was used.
3. Required artifacts exist.
4. Required evidence exists.
5. All `test_contracts` have status `TEST_PASSING` with `red_evidence` and `green_evidence` captured.
6. `validate-contracts.mjs` exits 0 (no violations).
7. Required formal checks passed (when applicable).
8. No unauthorized architecture drift exists.
9. Human approval exists (when required).
10. Traceability report is complete and persisted.
11. Workflow can be replayed from `replay_inputs`.
12. No unresolved askable assumptions remain.

---

## Example

See `.kilo/examples/class3-walkthrough.md` for a complete end-to-end Class 3 workflow example covering:
- High-Assurance Plan Mode deconstruction
- Change classification
- Joern CPG snapshot
- Alloy model authoring + assertion check
- Formal Work Package with `test_contracts` (full schema)
- Contract Lifecycle — RED phase (test file + failing run + `red_evidence`) before source edits
- Constrained implementation → GREEN phase (`green_evidence` captured)
- `validate-contracts.mjs` gate in Verification
- Post-implementation drift analysis
- Traceability report with `contract_validation_result`
- Mode tier applied (Frontier/Standard/Fast per step)

---

## Key Rules at a Glance

| # | Rule |
|---|---|
| 1 | Classify every change before work begins. |
| 2 | Use the lightest safe workflow. |
| 3 | Use Kilo-native tools by name. |
| 4 | Run the Assumption Gate before routing or handoff. |
| 5 | Never hand off with unresolved askable assumptions. Surface them via `ask_followup_question` XML — never plain text. |
| 6 | Never skip fresh structural truth for Class 3. |
| 7 | Never skip graph comparison for Class 2. |
| 8 | Never trust stale Alloy mappings. |
| 9 | Never hallucinate evidence, mappings, root causes, files, symbols, or tool behavior. |
| 10 | Never implement outside the approved scope. |
| 11 | Never weaken formal rules silently. |
| 12 | Always produce required artifacts before proceeding. |
| 13 | Always route to Grounding Mode when classification, architecture, scope, or risk is uncertain. |
| 14 | Reject unauthorized architecture drift. |
| 15 | Record evidence for every accepted change. |
| 16 | Use `read_file` before editing any source file. |
| 17 | Use `apply_diff` for surgical edits to existing files. |
| 18 | Use `execute_command` for verification. |
| 19 | Use `attempt_completion` only after verification and unresolved-risk review. |
| 20 | Always end with a user-actionable handoff. |
| 21 | `test_contracts` must be defined in Grounding before implementation begins. Grounding emits contract entries only — test bodies are written in Implementation Mode. |
| 22 | Never advance a contract from `CONTRACT_DEFINED` to `TEST_PASSING` without first capturing RED evidence (a failing test run). |
| 23 | Verification Mode must run `validate-contracts.mjs` before issuing a PASS decision; exit code 1 blocks the PASS. |
| 24 | Use the model tier matching each mode: Frontier for Plan + Grounding, Standard for Implementation + Debugging, Fast for Verification. |

Full rule text: `.kilo/rules/high-assurance-agentic-coding.md`

---

## Batch Requests

When a user groups several requests together, the workflow splits them into independent workstreams rather than treating the batch as a single change class. Coupled items (same page, state, data model) are grouped; independent items may split. See `.kilo/policies/batch-routing.md` and `.kilo/rules/change-classification.md` for the full routing matrix.

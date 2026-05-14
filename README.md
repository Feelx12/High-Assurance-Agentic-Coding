[![Connect with me on LinkedIn](https://img.shields.io/badge/Connect%20with%20me%20on-LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/felix-cortez)


<img width="1536" height="1024" alt="High-Assurance Agentic Coding" src="https://github.com/user-attachments/assets/a308d15f-eac3-4042-aed2-dc32477f9209" />


# High-Assurance Agentic Coding

> **The Future Is Formally Verified.**

A structured, formally-grounded workflow for AI-assisted software development using [Kilo Code](https://kilo.ai). Designed to prevent hallucination, scope creep, unauthorized architecture drift, and unverified changes.

---

## What This Is

This repository provides a complete Kilo Code workflow configuration that enforces:

- **Plan-first workflow** — every request starts with requirements clarification and task deconstruction
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
/plan ────► Requirements clarification + deconstruction
  ↓
/classify ────► Class 0  ──► /implementation (fast path)
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

### Plan Mode (`/plan`) — Always Run First

**Purpose:** Clarify requirements and deconstruct requests before any implementation, debugging, or grounding begins.

1. Parse intent — identify ambiguities in the user request
2. Ask clarifying questions (scope, constraints, edge cases, priorities)
3. Deconstruct into discrete, ordered, classifiable sub-tasks
4. Classify each sub-task per `.kilo/rules/change-classification.md`
5. Route each sub-task to the correct downstream mode
6. Save the structured plan to `.kilo/plans/`

### Full Class 3 Workflow

```
/plan ────► Requirements deconstruction + task classification
  ↓
/classify ────► confirms Class 3
  ↓
/grounding
  ↓ Fresh Joern graph snapshot
  ↓ Graph delta + impact analysis
  ↓ Assumptions + behavior requirements
  ↓ Alloy reconciliation / creation
  ↓ Alloy assertions (must all pass)
  ↓ Human-readable handoff
  ↓ Formal Work Package (JSON, schema-validated)
/implementation
  ↓ Constrained implementation (allowed files only)
/verification
  ↓ Alloy re-check + tests + drift analysis + build + security audit
  ↓ Traceability Report (persisted to run-based artifact structure)
```

### Motto

```
Joern scopes it.
Alloy constrains it.
Tests prove it.
MCP automates it.
Modes enforce it.
```

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
| **Windows (PowerShell)** | `.\\.kilo\\joern-install.ps1` |

> **Windows note:** If execution policy blocks the PowerShell script, run: `powershell -ExecutionPolicy Bypass -File .\.kilo\joern-install.ps1`

---

## Installation

### 1. Copy `.kilo/` into your project root

| Platform | Command |
|---|---|
| macOS / Linux | `cp -r /path/to/this-repo/.kilo /your/project/.kilo` |
| Windows (PowerShell) | `Copy-Item -Recurse C:\path\to\this-repo\.kilo C:\your\project\.kilo` |

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
| **Rules** | `.kilo/rules/*.md` | Loaded via `instructions` glob in `kilo.jsonc` |
| **Policies** | `.kilo/policies/*.md` | Loaded via `instructions` glob |
| **Templates** | `.kilo/templates/*.md` | Loaded via `instructions` glob |
| **Coverage Registry** | `.kilo/formal-coverage/*.md` | Loaded via `instructions` glob |
| **Workflows** | `.kilo/kilo.jsonc` → `command` | Slash commands — type `/plan`, `/grounding`, `/debugging`, etc. |
| **Skills** | `.kilo/skills/*/SKILL.md` | Auto-discovered from skills folder path |
| **MCP Servers** | `.kilo/kilo.jsonc` → `mcp` | Launched as local stdio processes |

---

## Slash Commands (Workflows)

Type `/` in the Kilo chat to invoke any workflow mode. **Always run `/plan` first.**

| Command | Purpose |
|---|---|
| `/plan` | **Plan Mode** — requirements clarification, deconstruction, and task routing. Always run first. |
| `/classify` | Fast-path: classify a change and return required mode (2-3 lines, no implementation) |
| `/grounding` | Formal Grounding Mode — structural + behavioral truth |
| `/debugging` | Root Cause Analysis — evidence-based debugging with scope classification (IN_SCOPE / OUT_OF_SCOPE / MISSED_REQUIREMENT) and routing |
| `/implementation` | Constrained Implementation Mode |
| `/verification` | Verification Traceability Mode |
| `/state-machine` | Query the workflow state machine |
| `/status` | Report current workflow state, active artifacts, pending gates |

---

## MCP Servers

Three MCP servers are included in `.kilo/`:

| Server | Description | Key Tools |
|---|---|---|
| **joern** | Structural truth via CPG analysis | `build_cpg`, `create_graph_snapshot`, `joern_status`, `compare_graph_snapshots`, `find_symbols`, `get_call_graph`, `get_data_flow`, `get_dependency_cone`, `get_mutation_points`, `get_related_tests`, `detect_unapproved_dependencies` |
| **alloy** | Behavioral truth via formal model checking | `alloy_status`, `list_models`, `validate_model_mapping`, `run_predicate`, `check_assertion`, `generate_instance`, `generate_counterexample`, `export_instance_json` |
| **verification** | Verification truth via tests, lint, typecheck, security | `run_unit_tests`, `run_lint`, `run_typecheck`, `run_security_scan`, `generate_traceability_report`, `validate_work_package` |

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
.kilo/
  AGENTS.md                              ← Constitution (auto-discovered by Kilo)
  kilo.jsonc                             ← Kilo config: MCP, workflows, instructions
  README.md                              ← This file
  artifact-storage.md                    ← Artifact naming, versioning, replay convention
  high-assurance-agentic-coding-user-workflow-guide.md  ← Full user workflow reference
  verification-config.json               ← Active verification stack config
  verification-config.template.json      ← Copy to verification-config.json per project
  package.json                           ← MCP server Node.js dependencies
  alloy.jar                              ← Alloy Analyzer JAR (optional — set ALLOY_JAR)
  alloy.js                               ← Alloy MCP server
  joern.js                               ← Joern MCP server
  verification.js                        ← Verification MCP server
  joern-install.sh                       ← Joern installer (macOS / Linux)
  joern-install.ps1                      ← Joern installer (Windows PowerShell)
  agent-manager.json                     ← Agent Manager worktree/session state

  workflow/
    state-machine.md                     ← Valid states, transitions, artifact requirements

  modes/
    grounding-mode.md                    ← Formal Grounding Architect
    debugging-mode.md                    ← Root Cause Analyst
    implementation-mode.md               ← Constrained Implementer
    verification-mode.md                 ← Verification Auditor

  rules/
    high-assurance-agentic-coding.md     ← Master rule set (12 rules)
    change-classification.md             ← Class 0-3 definitions and escalation
    no-hallucinated-mapping.md           ← Evidence requirements for all claims
    debugging-evidence.md                ← Root cause evidence rules
    freshness-ttl.md                     ← When truth artifacts expire
    user-actionable-output.md            ← Handoff requirements per mode

  policies/
    escalation-matrix.md                 ← Trigger → change class routing
    human-approval.md                    ← When human sign-off is required
    enforcement.md                       ← Fail conditions
    risk-classification.md               ← LOW / MODERATE / HIGH / CRITICAL
    autonomy-levels.md                   ← LEVEL_0 through LEVEL_5
    drift-severity.md                    ← Architecture drift severity levels
    fast-path-verification.md            ← Class 0 and 1 fast paths

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
    work-package.schema.json             ← FWP structural + behavioral truth schema

  mcp/
    alloy-mcp-tools.md                   ← Alloy MCP tool contracts
    joern-mcp-tools.md                   ← Joern MCP tool contracts
    verification-mcp-tools.md            ← Verification MCP tool contracts
    mcp-contract-validation.md           ← MCP failure semantics (PASS / FAIL / PARTIAL)

  artifacts/                             ← Run-based artifact storage
  plans/                                 ← Plan files from /plan mode
  scripts/                               ← Health-check and validation utilities
```

---

## Per-Project Setup

When adding this workflow to a new project:

1. **Run `/plan`** to deconstruct your first change request.
2. **Update `formal-coverage/coverage-registry.md`** — replace the example domains with your project's actual domains.
3. **Configure verification** — copy `verification-config.template.json` to `verification-config.json` and set your stack and commands.
4. **Create a `formal/` directory** in your project root for Alloy models.
5. **Install Joern** (if needed for structural truth):

| Platform | Command |
|---|---|
| macOS / Linux | `./.kilo/joern-install.sh` |
| Windows (PowerShell) | `.\\.kilo\\joern-install.ps1` |

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
5. Required tests passed.
6. Required formal checks passed (when applicable).
7. No unauthorized architecture drift exists.
8. Human approval exists (when required).
9. Traceability report is complete and persisted.
10. Workflow can be replayed from `replay_inputs`.

---

## Example

See `.kilo/examples/class3-walkthrough.md` for a complete end-to-end Class 3 workflow example covering:
- Plan Mode deconstruction
- Change classification
- Joern CPG snapshot
- Alloy model authoring + assertion check
- Formal Work Package
- Constrained implementation
- Post-implementation drift analysis
- Traceability report

---

## Key Rules at a Glance

| # | Rule |
|---|---|
| 1 | Classify every change before work begins. |
| 2 | Never skip graph refresh for Class 3. |
| 3 | Never trust stale Alloy mappings. |
| 4 | Never hallucinate evidence, mappings, or root causes. |
| 5 | Never implement outside the approved scope. |
| 6 | Never weaken formal rules silently. |
| 7 | Always produce required artifacts before proceeding. |
| 8 | Always route to Grounding Mode when in doubt. |
| 9 | Reject unauthorized architecture drift. |
| 10 | Record evidence for every accepted change. |
| 11 | Always end with a user handoff. |
| 12 | Extension Alloy models must `open` the core model. |

Full rule text: `.kilo/rules/high-assurance-agentic-coding.md`

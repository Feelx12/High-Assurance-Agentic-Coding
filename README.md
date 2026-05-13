# High-Assurance Agentic Coding

> **The Future Is Formally Verified.**

A structured, formally-grounded workflow for AI-assisted software development using [Kilo Code](https://kilo.ai). Designed to prevent hallucination, scope creep, unauthorized architecture drift, and unverified changes.

---

## What This Is

This repository provides a complete Kilo Code workflow configuration that enforces:

- **Change classification** before any work begins (Class 0–3)
- **Formal grounding** via Joern / Code Property Graph (CPG) for structural truth
- **Behavioral constraints** via Alloy formal models
- **Evidence-based verification** before accepting any change
- **Human approval gates** for high-risk domains

---

## Workflow Summary

```
User request
  ↓
Classify change  (/classify — fast path)
  ↓
Class 0 → /implementation (fast path)
Class 1 → /debugging + minimal truth check
Class 2 → /grounding (Formal Regression)
Class 3 → Full High-Assurance Workflow
```

### Full Class 3 Workflow

```
/grounding
  ↓ Fresh Joern graph snapshot
  ↓ Graph delta + impact analysis
  ↓ Assumptions + behavior requirements
  ↓ Alloy reconciliation / creation
  ↓ Alloy run/check
  ↓ Human-readable handoff
  ↓ Formal Work Package
/implementation
  ↓ Constrained implementation
/verification
  ↓ Alloy + tests + Joern diff + CI
  ↓ Traceability Report (persisted to .kilo/artifacts/)
```

### Motto

```
Joern scopes it.
Alloy constrains it.
Tests prove it.
RAG remembers it.
MCP automates it.
Modes enforce it.
```

---

## Prerequisites

- [Kilo Code](https://kilo.ai) VS Code extension installed
- [Node.js](https://nodejs.org) v18+ (for MCP servers)
- [Alloy Analyzer](https://alloytools.org) — install via Homebrew:
  ```bash
  brew install alloy-analyzer
  ```
- [Joern](https://joern.io) — install via the included script:
  ```bash
  chmod +x joern-install.sh
  ./joern-install.sh
  ```
  Then add Joern to your PATH (add to `~/.zshrc`):
  ```bash
  export PATH="$HOME/bin/joern/joern-cli:$PATH"
  ```

> **Note:** `joern-cli.zip` is listed in `.gitignore` and should never be committed. The install script downloads it automatically.

---

## Installation

### 1. Copy `.kilo/` into your project root

```bash
cp -r /path/to/this-repo/.kilo /your/project/.kilo
```

### 2. Install MCP server dependencies

```bash
cd .kilo/mcp-servers
npm install
```

### 3. Configure your verification stack (optional)

Copy the verification config template and fill in your stack:

```bash
cp .kilo/verification-config.template.json .kilo/verification-config.json
# Edit: set "stack" to "node" | "python" | "go" | "rust"
```

If you skip this step, the verification server will auto-detect your stack from `package.json`, `pyproject.toml`, `go.mod`, or `Cargo.toml`.

### 4. Create your `formal/` directory

```bash
mkdir formal/
```

Add Alloy (`.als`) files here as you work through Class 3 workflows. The Alloy MCP server scans this directory.

### 5. Reload Kilo

In VS Code, open the Command Palette (`Cmd+Shift+P`) and run:
```
Developer: Reload Window
```

That's it. Kilo will auto-discover everything.

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
| **Workflows** | `.kilo/kilo.jsonc` → `command` | Slash commands — type `/grounding`, `/debugging`, etc. |
| **Skills** | `.kilo/skills/*/SKILL.md` | Auto-discovered from `skills` folder path in global config |
| **MCP Servers** | `.kilo/kilo.jsonc` → `mcp` | Launched as local stdio processes |

---

## Slash Commands (Workflows)

Type `/` in the Kilo chat to invoke any workflow mode:

| Command | Purpose |
|---|---|
| `/classify` | **Fast-path**: classify a change and return required mode (2–3 lines, no implementation) |
| `/grounding` | Formal Grounding Mode — structural + behavioral truth |
| `/debugging` | Root Cause Analysis — evidence-based debugging |
| `/implementation` | Constrained Implementation Mode |
| `/verification` | Verification Traceability Mode |
| `/state-machine` | Query the workflow state machine |
| `/status` | Report current workflow state, active artifacts, pending gates |

---

## MCP Servers

Three MCP servers are included in `.kilo/mcp-servers/`:

| Server | Status | Description |
|---|---|---|
| `joern` | **Functional** — real CPG analysis when Joern is on PATH; graceful STUB when not | `build_cpg`, `create_graph_snapshot`, `compare_graph_snapshots`, `find_symbols`, `get_related_tests`, `detect_unapproved_dependencies` + more |
| `alloy` | **Functional** — real Alloy checks when `brew install alloy-analyzer` or `ALLOY_JAR` is set; graceful STUB when not | `list_models`, `find_related_model`, `run_predicate`, `check_assertion`, `generate_instance`, `generate_counterexample`, `export_instance_json` + more |
| `verification` | **Functional** — fully operational, stack-agnostic | `run_unit_tests`, `run_integration_tests`, `run_lint`, `run_typecheck`, `run_static_analysis`, `run_security_scan`, `generate_traceability_report`, `validate_work_package` |

### Stack Support (verification server)

The verification server auto-detects your project stack:

| Stack | Detection | Test | Lint | Typecheck | Security |
|---|---|---|---|---|---|
| **Node.js** | `package.json` | `npm test` | `eslint` | `tsc` | `npm audit` |
| **Python** | `pyproject.toml` | `pytest` | `ruff` / `flake8` | `mypy` | `pip-audit` |
| **Go** | `go.mod` | `go test` | `golangci-lint` | `go vet` | `govulncheck` |
| **Rust** | `Cargo.toml` | `cargo test` | `cargo clippy` | `cargo check` | `cargo audit` |

Override with `.kilo/verification-config.json` (copy from `verification-config.template.json`).

### Artifact Persistence

All MCP tools that produce traceability reports and Alloy instances persist them automatically:

```
.kilo/artifacts/     ← Traceability reports, work packages
.kilo/snapshots/     ← CPG snapshots (Joern)
.kilo/alloy-instances/ ← Alloy instances, counterexamples, fixtures
```

See `.kilo/artifact-storage.md` for the full naming and versioning convention.

---

## Skills

Eight skills are auto-discovered in `.kilo/skills/`. Each skill must follow the Kilo format:

```
.kilo/skills/<skill-name>/SKILL.md
```

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

---

## Directory Reference

```
.kilo/
  AGENTS.md                              ← Constitution (auto-discovered by Kilo)
  kilo.jsonc                             ← Kilo config: MCP, workflows, instructions
  artifact-storage.md                    ← Artifact naming, versioning, replay convention
  verification-config.template.json      ← Copy to verification-config.json per project

  workflow/
    state-machine.md                     ← Valid states and transitions

  modes/
    grounding-mode.md                    ← Formal Grounding Architect role
    debugging-mode.md                    ← Root Cause Analyst role
    implementation-mode.md               ← Constrained Implementer role
    verification-mode.md                 ← Verification Auditor role

  rules/
    high-assurance-agentic-coding.md     ← Master rule set
    change-classification.md             ← Class 0–3 definitions
    no-hallucinated-mapping.md           ← Evidence requirements
    debugging-evidence.md                ← Root cause evidence rules
    freshness-ttl.md                     ← When truth artifacts expire

  policies/
    escalation-matrix.md                 ← Trigger → change class routing
    human-approval.md                    ← When human sign-off is required
    enforcement.md                       ← Fail conditions
    risk-classification.md               ← LOW / MODERATE / HIGH / CRITICAL
    autonomy-levels.md                   ← LEVEL_0 through LEVEL_5
    drift-severity.md                    ← Architecture drift severity
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
    verification-traceability/SKILL.md

  templates/
    freshness-report.md
    human-readable-implementation-handoff.md
    formal-work-package.md
    debugging-report.md
    regression-addendum.md
    traceability-report.md
    confidence-report.md

  schemas/
    graph-snapshot.schema.json           ← CPG node/edge typed schema
    work-package.schema.json             ← Typed structural_truth + behavioral_truth
    alloy-validation.schema.json         ← Alloy run/check result schema
    traceability.schema.json             ← Typed verification_truth + replay_inputs

  mcp/
    joern-mcp-tools.md                   ← Joern tool contracts (documentation)
    alloy-mcp-tools.md                   ← Alloy tool contracts (documentation)
    verification-mcp-tools.md            ← Verification tool contracts (documentation)
    mcp-contract-validation.md           ← MCP failure semantics

  mcp-servers/
    joern.js                             ← Joern MCP server (real CPG analysis + graceful stub)
    alloy.js                             ← Alloy MCP server (real formal checks + graceful stub)
    verification.js                      ← Verification MCP server (functional, stack-agnostic)
    package.json

  artifacts/                             ← Workflow artifacts (auto-created at runtime)
  snapshots/                             ← CPG snapshots (auto-created at runtime)
  alloy-instances/                       ← Alloy instances/fixtures (auto-created at runtime)

.github/
  workflows/
    high-assurance-ci.yml                ← CI: MCP syntax, schema validation, binary guard, skill validation
```

---

## Per-Project Setup

When you add this workflow to a new project:

1. **Update `formal-coverage/coverage-registry.md`** — replace the example domains with your project's actual domains and mark which ones have Alloy coverage.
2. **Copy `verification-config.template.json`** → `.kilo/verification-config.json` and set your stack.
3. **Create a `formal/` directory** in your project root for Alloy models.
4. **Set `WORKSPACE` in your shell** if using the verification MCP server outside VS Code:
   ```bash
   export WORKSPACE=/path/to/your/project
   ```
5. **Optional — set `ALLOY_JAR`** if you're not using Homebrew:
   ```bash
   export ALLOY_JAR=/path/to/alloy.jar
   ```

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

## CI & GitHub Actions

The included GitHub Actions workflow (`.github/workflows/high-assurance-ci.yml`) is **informational and optional by default**. It runs on pushes to `main`/`master` and can be triggered manually.

To set up the repository, connect it to GitHub, and test the CI workflow, use the included pre-flight setup script:

```bash
chmod +x setup.sh
./setup.sh
```

This script will:
1. Verify required tools (Node.js, git).
2. Install MCP server dependencies and run the full local validation suite (`npm run check`).
3. Initialize the Git repository.
4. Optionally use the GitHub CLI (`gh`) to create a remote repository and push the code.
5. Provide instructions for triggering the workflow via CLI, web, or the VS Code GitHub Actions extension.
6. Provide instructions for running the workflow locally using `act`.

The workflow performs the following checks:

| Check | What It Does |
|---|---|
| MCP server syntax & health | Builds dependencies and ensures all three servers start cleanly without runtime errors or blocking issues. |
| Schema validation | Validates all 4 JSON schemas parse correctly. |
| Config validation | Parses `kilo.jsonc` and verifies all referenced rule, policy, and MCP files exist. |
| Binary artifact guard | Fails if `joern-cli.zip` is committed. |
| Skill frontmatter | Verifies all `SKILL.md` files have valid YAML frontmatter and `name` fields. |
| Traceability validation | Validates committed traceability reports against their schema. |

> **Note:** If you want these checks to block pull requests, you must configure Branch Protection Rules in your GitHub repository settings (Settings → Branches → Require status checks).

---

## Example

See `.kilo/examples/class3-walkthrough.md` for a complete end-to-end Class 3 workflow example covering:
- Change classification
- Joern CPG snapshot
- Alloy model authoring + assertion check
- Formal Work Package
- Constrained implementation
- Post-implementation graph diff
- Traceability report

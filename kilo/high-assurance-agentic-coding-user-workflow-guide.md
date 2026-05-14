# High-Assurance Agentic Coding — User Workflow Guide

> **Purpose:** Quick-reference guide for routing any change through the correct workflow, with OS-specific toolchain notes, handoff requirements, and copy/paste prompts for every next step.

---

## 1. Plan Mode — Always Run First

**Every request starts with `/plan`.** Plan Mode is a pre-workflow intake step for requirements clarification and task deconstruction. It must run before `/classify` or any other mode.

### What Plan Mode Does

1. **Parse intent** — identify what the user is asking for and flag ambiguities
2. **Ask clarifying questions** — scope, constraints, edge cases, priorities, dependencies
3. **Deconstruct** — break the request into discrete, ordered, classifiable sub-tasks
4. **Classify each sub-task** per `.kilo/rules/change-classification.md`
5. **Route** — assign each sub-task to the correct mode (`/grounding`, `/debugging`, `/implementation`)
6. **Save plan** — persist the structured plan to `.kilo/plans/<timestamp>-<slug>.md`

### What Plan Mode Does NOT Do

- Implement code
- Debug anything
- Run Alloy or Joern
- Produce Formal Work Packages

### Plan Output Example

```
## Plan: Add Dark Mode Toggle

### Clarified Requirements
- Toggle in settings page only (not header)
- Persist to Firestore user doc, not localStorage
- System-preference detection on first visit

### Sub-Tasks
| # | Task | Class | Mode | Depends On |
|---|------|-------|------|------------|
| 1 | Add toggle UI in Settings page | 0 | /implementation | — |
| 2 | Add dark-mode state to TeamContext + Firestore | 3 | /grounding | 1 |
| 3 | Apply theme to all existing components | 2 | /grounding | 2 |
| 4 | Add system-preference detection | 1 | /debugging | 2 |

### Implementation Order
1. /implementation — toggle UI (Class 0, fast path)
2. /grounding → /implementation → /verification — state + Firestore (Class 3)
3. /grounding — theme application (Class 2 regression check)
4. /debugging — system-preference detection (Class 1)
```

---

## 2. Decision Flow: Classification & Routing

After `/plan`, run `/classify` on the highest-class sub-task. Use `/classify` for fast-path confirmation.

```
/plan (requirements clarification + deconstruction)
  │
  ▼
/classify ───► Class 0  ──► /implementation (fast path)
       │
       ├──► Class 1  ──► /debugging
       │
       ├──► Class 2  ──► /grounding (Formal Regression)
       │
       └──► Class 3  ──► Full High-Assurance Workflow
                           /grounding → /implementation → /verification
```

**Quick-guess table (no tooling needed):**

| Triggers (ANY of these) | Class |
|---|---|
| Color, copy text, spacing, icon swap, non-functional UI polish | **Class 0** |
| Broken button, incorrect label, failed validation, isolated function bug | **Class 1** |
| Workflow regression — formal workflow passed but new defect appeared | **Class 2** |
| New feature, new state, new data model, new API, auth/payments/permissions/scoring/scheduling, cross-module change | **Class 3** |

Full escalation matrix: `.kilo/policies/escalation-matrix.md`

---

## 3. When `/grounding` Is Required

`/grounding` is required for:

- **Class 3** — always (full Formal Grounding)
- **Class 2** — always (Formal Regression path)
- **Class 1** — only if the bug touches business rules, invariants, data integrity, permissions, scoring, payments, scheduling, safety, or formalized behavior
- **Class 0** — never required

**`/grounding` is NOT required** for color changes, copy edits, spacing tweaks, or icon swaps.

---

## 4. Sequential Steps by Class

### Class 0 — Trivial Product/UI Change

```
Step 1: /classify ──► confirms Class 0
Step 2: /implementation (runs directly — no Joern, no Alloy)
Step 3: Verification: lint + typecheck + UI snapshot/golden test if available
Step 4: User handoff (implementation-next-steps-handoff.md)
```

**Outputs required:** Change summary, files changed, verification run, final decision.

---

### Class 1 — Small Bug Fix

```
Step 1: /classify ──► confirms Class 1
Step 2: /debugging
         ├── Reproduce failure
         ├── Root cause analysis (with evidence)
         ├── Minimal truth check (Joern graph query only if shared state/data flow)
         ├── Minimal fix (no refactors, no scope creep)
         └── Regression test
Step 3: Debugging Report
Step 4: User handoff (debugging-next-steps-handoff.md)
```

---

### Class 2 — Formal Regression (Workflow-Gated)

```
Step 1: Return to /grounding with "Formal Regression" flag
Step 2: Refresh Joern graph
Step 3: Compare intended work package vs. actual implementation
Step 4: Update Alloy or tests if coverage gap exists
Step 5: Produce amended Formal Work Package
Step 6: /implementation (narrow fix only)
Step 7: /verification (full re-verify)
Step 8: Regression Addendum
Step 9: User handoff (grounding-next-steps-handoff.md)
```

---

### Class 3 — Full High-Assurance Workflow

```
┌──────────────────────────────┐
│  /grounding                  │
│  ├── Change classification   │
│  ├── Fresh Joern graph       │
│  ├── Graph delta + impact    │
│  ├── Assumptions captured    │
│  ├── Alloy reconciliation    │
│  ├── Alloy run/check         │
│  ├── Human-readable handoff  │
│  └── Formal Work Package     │
│        │                     │
│        ▼                     │
│  /implementation             │
│  ├── Read FWP                │
│  ├── Edit allowed files only │
│  ├── Add required tests      │
│  └── Implementation summary  │
│        │                     │
│        ▼                     │
│  /verification               │
│  ├── Rerun Alloy             │
│  ├── Run all tests           │
│  ├── Post-implementation     │
│  │   graph diff              │
│  ├── Architecture drift check│
│  ├── Build + security audit  │
│  └── Traceability Report     │
└──────────────────────────────┘
```

See `.kilo/examples/class3-walkthrough.md` for a complete annotated example.

---

## 5. Windows & macOS Toolchain Readiness

### 4.1 Prerequisites (Both Platforms)

| Tool | Version | Why |
|---|---|---|
| Node.js | v18+ | MCP servers & project runtime |
| Java | 11+ | Alloy and Joern |
| Git | 2.x | Version control |

### 4.2 Alloy Analyzer

| Platform | Install |
|---|---|
| **macOS** | `brew install alloy-analyzer` |
| **Windows** | Download `alloy.jar` from [alloytools.org](https://alloytools.org), set environment variable: `$env:ALLOY_JAR="C:\path\to\alloy.jar"` |
| **Windows** (permanent) | `[Environment]::SetEnvironmentVariable('ALLOY_JAR', 'C:\path\to\alloy.jar', 'User')` |
| **macOS/Linux** (manual) | `export ALLOY_JAR=/path/to/alloy.jar` |

### 4.3 Joern Installation

| Platform | Command |
|---|---|
| **macOS / Linux / WSL** | `./.kilo/joern-install.sh` |
| **Windows (PowerShell)** | `.\.kilo\joern-install.ps1` |

> **Windows note:** The PowerShell install script must be invoked with PowerShell, not CMD. Use `powershell -ExecutionPolicy Bypass -File .\.kilo\joern-install.ps1` if execution policy blocks it.

### 4.4 MCP Server Dependencies

| Both platforms: |
|---|
| `cd .kilo` |
| `npm install` |

### 4.5 Environment Variables

| Variable | **Windows (PowerShell)** | **macOS / Linux** |
|---|---|---|
| `WORKSPACE` | `$env:WORKSPACE="C:\path\to\project"` | `export WORKSPACE=/path/to/project` |
| `ALLOY_JAR` | `$env:ALLOY_JAR="C:\path\to\alloy.jar"` | `export ALLOY_JAR=/path/to/alloy.jar` |

### 4.6 Build Commands (OS-Specific Syntax)

| **macOS / Linux** | **Windows (CMD)** | **Windows (PowerShell)** |
|---|---|---|
| `NODE_ENV=production npm run build` | `set NODE_ENV=production && npm run build` | `$env:NODE_ENV="production"; npm run build` |

> **Tip:** Install `cross-env` (`npm i -D cross-env`) to use one command everywhere: `cross-env NODE_ENV=production next build`.

### 4.7 Verification Config

```bash
# Both platforms
cp .kilo/verification-config.template.json .kilo/verification-config.json
```

Then edit `verification-config.json` to set your stack (`"node"`, `"python"`, `"go"`, or `"rust"`).

### 4.8 Formal Directory

```bash
# Both platforms
mkdir formal/
```

---

## 6. User Handoff Requirements

**Every mode session must end with a user handoff.** This is a hard rule (`.kilo/rules/user-actionable-output.md`).

### Required Fields (Every Handoff)

| Field | Description |
|---|---|
| What was completed | Summary of actions taken |
| What was NOT completed | Known gaps, deferred items |
| What needs user review | Things to inspect or approve |
| Assumptions needing sign-off | Table with confidence + sign-off required |
| Current gate status | Cleared gates + remaining gates |
| Next recommended mode | `grounding` / `debugging` / `implementation` / `verification` |
| Copy/paste prompt | Ready-to-use prompt for the next agent |

### Handoff Templates by Mode

| Mode | Template File |
|---|---|
| Grounding | `.kilo/templates/grounding-next-steps-handoff.md` |
| Debugging | `.kilo/templates/debugging-next-steps-handoff.md` |
| Implementation | `.kilo/templates/implementation-next-steps-handoff.md` |
| Verification | `.kilo/templates/verification-next-steps-handoff.md` |

### When Human Approval Is Required

Set gate status to **"Requires Human Approval"** if ANY of:

- Authentication changes
- Payment logic changes
- Permission/role changes
- PII access changes
- Public API behavior changes
- Safety-critical behavior changes
- Alloy assumptions are low confidence
- Architecture drift is `REVIEW_REQUIRED` or `CRITICAL`

---

## 7. State Machine (Valid Transitions)

```
IDLE ──► GROUNDING
IDLE ──► DEBUGGING
IDLE ──► IMPLEMENTATION  (Class 0 only)

GROUNDING ──► READY_FOR_IMPLEMENTATION
GROUNDING ──► BLOCKED

READY_FOR_IMPLEMENTATION ──► IMPLEMENTATION

IMPLEMENTATION ──► READY_FOR_VERIFICATION
IMPLEMENTATION ──► BLOCKED

READY_FOR_VERIFICATION ──► VERIFICATION

VERIFICATION ──► PASSED
VERIFICATION ──► FAILED
VERIFICATION ──► RETURN_TO_GROUNDING

FAILED ──► GROUNDING
BLOCKED ──► GROUNDING
```

Full reference: `.kilo/workflow/state-machine.md`

---

## 8. Copy/Paste Prompts for Each Next Step

### From Grounding → Implementation

```
Execute Implementation Mode on the <feature name> feature.

Use the Formal Work Package at:
  <path to FWP>

And the verified Alloy model at:
  <path to Alloy model>

### Key References
Grounding report: <path>
Alloy model: <path>
Implementation mode rules: .kilo/modes/implementation-mode.md

### Pre-Implementation Status
<list all cleared gates>

### Allowed Files
<list>

### Forbidden Files
<list>
```

---

### From Implementation → Verification

```
Execute Verification Mode on the <feature name> feature.

Use the Formal Work Package at:
  <path to FWP>

And the verified Alloy model at:
  <path to Alloy model>

### Key References
Grounding report: <path>
Alloy model: <path>
Implementation summary: <path>
Verification mode rules: .kilo/modes/verification-mode.md

### Pre-Verification Status
<list all cleared gates from implementation mode>

### Alloy Assertions to Verify
<list>

### Allowed Files
<list from FWP>

### Forbidden Files
<list from FWP>

### Required Verification Checks
1. Alloy check — rerun all assertions
2. Unit tests — run all test files
3. TypeScript typecheck
4. Build
5. Architecture drift check (use run_drift_check tool)
6. Security audit diff (use run_security_diff tool)
7. Traceability Report
```

---

### From Debugging → (Next Mode)

```
<grounding | implementation | verification>

<Ready-to-use prompt based on fix severity and risk level>

### Key References
Debugging report: <path>
Test results: <path>
```

---

### Class 0 Fast-Path Prompt (Skip Grounding)

```
/implementation

Perform the following Class 0 change:
<description of trivial UI change>

### Allowed Files
<list>

### Required Verification
- Lint
- Typecheck
- UI snapshot/golden test if available

Do NOT run full CI, Alloy, or Joern graph refresh.
```

---

## 9. Artifact Locations

Workflow artifacts are organized in a run-based structure:

```
.kilo/artifacts/
  runs/
    RUN-YYYY-MM-DD-NNN-[slug]/
      00-intake/            ← Plan output, classification, intent
      01-grounding/         ← Freshness report, structural truth, Alloy validation, FWP
      02-implementation/    ← Implementation summary, scope confirmation
      03-verification/      ← Traceability report, drift analysis, CI results
      04-deployment/        ← Deployment decision (human-entered)
  indexes/
    run-index.jsonl         ← Discoverable run history
    artifact-index.jsonl    ← Discoverable artifact history
  baselines/
    audit-baseline.json     ← Security audit baseline
    latest-run.json         ← Pointer to most recent run
```

Plan files from `/plan` mode are stored in `.kilo/plans/`. See `.kilo/artifact-storage.md` for full naming, versioning, and replay conventions.

---

## 10. Quick Command Reference

| Slash Command | Purpose |
|---|---|
| `/plan` | **Plan Mode** — requirements clarification, deconstruction, task routing. Always run first. |
| `/classify` | Fast-path: classify and return required mode |
| `/grounding` | Formal Grounding — structural + behavioral truth |
| `/debugging` | Root cause analysis — evidence-based |
| `/implementation` | Constrained implementation |
| `/verification` | Full verification + traceability |
| `/status` | Current workflow state, artifacts, pending gates |
| `/state-machine` | Query valid states and transitions |

---

## 11. Acceptance Gate Checklist

A change is accepted only when ALL of:

- [ ] Change class is correct
- [ ] Required mode was used
- [ ] Required artifacts exist
- [ ] Required evidence exists
- [ ] Required tests passed
- [ ] Required formal checks passed (when applicable)
- [ ] No unauthorized architecture drift
- [ ] Human approval exists (when required)
- [ ] Traceability report is complete and persisted

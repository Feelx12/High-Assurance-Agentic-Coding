# Grounding Next-Steps Handoff

## 1. What was completed

{Filled by agent — summary of grounding session actions: change classification, graph refresh, Alloy reconciliation, assumptions captured, behavior requirements verified, formal work package produced}

## 2. What was NOT completed

{Filled by agent — deferred domains, unresolved assumptions, features deliberately excluded from the work package}

## 3. What needs user review

- [ ] Change classification: {class} — confirm correct
- [ ] Assumptions list (see Section 6 of grounding report)
- [ ] Formal Work Package scope (allowed/forbidden files)
- [ ] Alloy model changes (if any)

## 4. Assumptions needing sign-off

| # | Assumption | Confidence | Requires Sign-Off |
|---|---|---|---|
| A1 | {assumption text} | {high/medium/low} | Yes/No |

## 5. Current gate status

- Completed:
  - Change classification: {class}
  - Graph snapshot: {id}
  - Alloy reconciliation: {status}
  - Assumptions documented
  - Behavior requirements verified
  - Formal Work Package: {artifact id}
- Remaining:
  - Human sign-off on assumptions
  - Implementation Mode
- Human approval required: Yes/No

<!-- JOERN_DEGRADED_DECISION — render when joern_status !== "AVAILABLE" AND change_class >= 2 -->
{N/A — remove this entire block if Joern is available}

## 5a. ⚠️ STRUCTURAL TRUTH UNAVAILABLE — DECISION REQUIRED

> **WARNING:** Joern is not installed or not on PATH. A Code Property Graph could not
> be built. Structural truth (call graphs, data flows, dependency cones, mutation
> points, automated drift detection) is **DEGRADED**.
>
> This workflow cannot proceed with full assurance until resolved.

**You must choose one of the following paths before this workflow continues:**

### [A] PROCEED WITH FALLBACK ANALYSIS

The agent will use available context (file-level scans, direct code reads,
grep-based symbol searches) to produce the best possible interpretation of
the workload. Structural truth will be marked `DEGRADED_WITH_CONSENT` and
structural confidence will be lowered. All downstream artifacts (Freshness
Report, Formal Work Package, Traceability Report) will carry this marker.

⚠️ **Risk:** Cross-module call paths, indirect dependencies, and data flows may
be missed. Requires your explicit sign-off on this risk.

### [B] PAUSE AND RESOLVE

The workflow pauses here. The workload breakdown is surfaced so you can
identify and resolve the underlying issue before continuing.

**Resolution steps:**
1. Run: `.\.kilo\joern-install.ps1` (Windows) or `./.kilo/joern-install.sh` (macOS/Linux)
2. Add joern-cli to PATH
3. Reload Kilo
4. Re-run Grounding Mode

The current grounding session will produce a **BLOCKED** state. No unvalidated
data will progress downstream.

---

**Your decision:** {Select A or B}

- [ ] **A — Proceed with fallback** (DEGRADED_PROCEED)
- [ ] **B — Pause and resolve** (BLOCKED)

`joern_decision`: {fallback | pause}

<!-- END JOERN_DEGRADED_DECISION -->

## 6. Next recommended mode

**Implementation Mode** — work is ready to implement using the Formal Work Package.

## 7. Copy/paste prompt for next agent

```
Execute Implementation Mode on the {feature name} feature.

Use the Formal Work Package at:
  {path to FWP}

And the verified Alloy model at:
  {path to Alloy model}

### Key References
Grounding report: {path}
Alloy model: {path}
Implementation mode rules: .kilo/modes/implementation-mode.md

### Pre-Implementation Status
{list all cleared gates}

### Allowed Files
{list}

### Forbidden Files
{list}
```

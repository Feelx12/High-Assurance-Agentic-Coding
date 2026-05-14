# Formal Coverage Registry

> **Update this file per project.** Replace the example domains below with your project's actual domains.
> The starred rows (`*`) are project-specific examples; everything else is a generic template.

## Domain Coverage Table

| Domain | Alloy Coverage | Verification Level | Notes |
|---|---|---|---|
| Authentication | Yes | CRITICAL | Formal rules required for any behavior change |
| Payments / Billing | Yes | CRITICAL | Formal rules required |
| Authorization / Permissions | Yes | CRITICAL | Formal rules required |
| Public API Contracts | Yes | HIGH | Formal rules required when contract changes |
| User Data / PII | Yes | CRITICAL | Formal rules required; human approval always required |
| Scheduling / Queuing | Yes | HIGH | Formal rules required |
| Data Integrity Invariants | Yes | HIGH | Formal rules required |
| Safety-Critical Workflows | Yes | CRITICAL | Full assurance workflow always required |
| Cross-Module State Transitions | Partial | HIGH | Escalate if state graph changes |
| Analytics / Event Tracking | Partial | MODERATE | Escalate if data integrity or privacy touched |
| UI Components (stateless) | No | LOW | Fast-path allowed unless state/data touched |
| Marketing / Content Pages | No | LOW | Class 0 normally |
| Logging / Observability | No | LOW | Class 0/1 normally unless log schema changes |

---

## Project-Specific Domains

| Domain | Alloy Coverage | Verification Level | Notes |
|---|---|---|---|
| Lineup Optimization (AI Engine) | Yes (formal/jonny-ball-current.als) | HIGH | Formal rules for lineup eligibility, recommendation lifecycle |
| Bullpen Optimization (AI Engine) | Yes (formal/jonny-ball-current.als) | HIGH | Formal rules for pitcher availability, pitch limits, rest days |
| FairBall Rotation (Core) | Yes (formal/jonny-ball-current.als) | HIGH | RotationMode enum, lineup eligibility, policy warnings |
| FairBall Rotation — Advancement, Bye/Forfeit, Versioning | Yes (formal/fairball-advancement.als) | HIGH | Added 2026-05-13. Model covers: AdvancementType enum, bye-preserves-game-count, forfeit-increments-game-count, mode-change-safe-within-shift-snake-fixed, mode-change-unsafe-with-present, mode-history-recorded, minimum-player-threshold, opponent-source-fallback, sequential-opponent-source-works |
| Stat-Threshold Rules | Yes (formal/stat_rules_v2.als) | HIGH | Added 2026-05-13, updated 2026-05-13 (v2). Model covers: disabled-rule-no-violation, enabled-rule-yields-violation, override-suppresses-violation, violations-only-reference-config-rules, enabling-passing-rule-no-false-violation, unsupported-stat-cannot-be-enabled, fielding-rules-not-globally-enforced, override-only-for-enabled-rules, stat-category-matches-stat-key |
| Dashboard / Control Room | No | LOW | Fast-path allowed unless state/data touched |
| Schedule / Games | Yes (formal/jonny-ball-current.als) | HIGH | Game lifecycle, result coherence, season state exclusions |
| Roster Management | Yes (formal/jonny-ball-current.als) | HIGH | Player lifecycle, archived players exclusion, lineup sizing |
| Export / Data Egress | No | LOW | Pure data export — no state mutation; Class 0/1 normally |

---

## Rules

1. If a change touches a domain with **Alloy Coverage = Yes**, Grounding Mode must check whether Alloy reconciliation is required.
2. If a change touches a **CRITICAL** domain, human approval is required before implementation.
3. If a domain is not listed, treat it as **MODERATE** and use the escalation matrix to determine class.
4. Update this registry whenever a new formalized domain is added to the project.

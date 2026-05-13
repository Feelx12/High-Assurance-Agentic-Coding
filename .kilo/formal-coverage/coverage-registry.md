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

## Project-Specific Domains (update per project)

| Domain | Alloy Coverage | Verification Level | Notes |
|---|---|---|---|
| TOEFL Scoring * | Yes | HIGH | Formal rules required |
| Lineup Optimization * | Yes | HIGH | Formal rules required |
| Dashboard Widgets * | No | LOW | Fast-path allowed unless state/data touched |
| UI Themes * | No | LOW | Class 0 normally |

---

## Rules

1. If a change touches a domain with **Alloy Coverage = Yes**, Grounding Mode must check whether Alloy reconciliation is required.
2. If a change touches a **CRITICAL** domain, human approval is required before implementation.
3. If a domain is not listed, treat it as **MODERATE** and use the escalation matrix to determine class.
4. Update this registry whenever a new formalized domain is added to the project.

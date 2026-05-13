# Escalation Matrix

| Trigger | Escalate To |
|---|---|
| UI-only change | Class 0 |
| Copy/color/spacing only | Class 0 |
| Localized runtime bug | Class 1 |
| Isolated function defect | Class 1 |
| Shared state mutation | Class 2 or 3 |
| Auth logic touched | Class 3 |
| Payment logic touched | Class 3 |
| Permission logic touched | Class 3 |
| Public API changed | Class 3 |
| New dependency added | Class 3 |
| Alloy assertion failure | Class 2 |
| Graph drift detected | Class 2 |
| Cross-module dependency introduced | Class 3 |
| Data integrity invariant touched | Class 3 |
| Scoring logic touched | Class 3 |
| Scheduling logic touched | Class 3 |
| Safety-critical workflow touched | Class 3 |
| Formalized behavior touched | Class 3 |

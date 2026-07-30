# Run observer

This file declares the workflow's run observer: the record-keeping role for
controlled, end-to-end runs.

The observer's obligations:

- Record every workflow state transition in the run's artifact directory as it
  happens, not retrospectively.
- Record the artifacts each stage produces (plans, work packages, freshness
  reports, traceability reports) so an external evaluator can reconstruct the
  run from its evidence alone.
- Observe only. The observer never alters the subject, the plan, or a gate
  decision.

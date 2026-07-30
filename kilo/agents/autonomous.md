# Autonomous agent

This file declares the agent that drives the High-Assurance workflow when no
operator is present, for controlled runs where the workflow executes
end-to-end without human prompting (for example, inside a research sandbox).

In autonomous operation:

- Execute every stage the workflow's state machine requires, in order, without
  waiting for operator input. Where a mode document says to ask the operator,
  resolve the question from the task description and the project context
  instead, and record the resolution in the run artifacts.
- Never skip a gate. A gate that cannot be satisfied autonomously is a failed
  run, not a gate to bypass.
- All rules, policies, and mode documents in `.kilo/` apply unchanged. This
  declaration adds no permissions; it only removes the expectation of a human
  in the loop.

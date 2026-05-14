# MCP Contract Validation

All MCP tools must fail deterministically.

## Required Response Fields

- status: PASS / FAIL / PARTIAL
- timestamp
- commit_hash
- tool_name
- tool_version
- execution_duration
- inputs
- outputs
- errors
- evidence_refs

## Failure Semantics

FAIL:
- required operation did not complete
- output cannot be trusted

PARTIAL:
- operation completed with missing or incomplete data
- agent must not treat output as full truth

PASS:
- operation completed and output is usable

## Rule

Agents must not silently ignore MCP failure or partial output.

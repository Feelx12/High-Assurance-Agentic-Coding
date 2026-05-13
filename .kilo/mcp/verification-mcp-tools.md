# Verification MCP Tool Requirements

The Verification MCP server provides verification truth.

## Required Tools

run_unit_tests(scope)
run_integration_tests(scope)
run_lint(path?)
run_typecheck()
run_static_analysis()
run_security_scan()
generate_traceability_report(artifact_id, change_class, risk_level, final_decision)
validate_work_package(work_package_path)

## Required Outputs

Each tool must return:

- command executed,
- pass/fail result,
- failure details,
- test files run,
- coverage if available,
- timestamp,
- commit hash,
- tool version,
- CI status.

# Alloy MCP Tool Requirements

The Alloy MCP server provides behavioral truth.

## Required Tools

list_models()
find_related_model(domain)
validate_model_mapping(model, graph_snapshot)
run_predicate(model, predicate, scope)
check_assertion(model, assertion, scope)
generate_instance(model, predicate)
generate_counterexample(model, assertion)
export_instance_json(instance_id)

## Required Outputs

Each tool must return:

- model file,
- command used,
- scope used,
- status,
- timestamp,
- commit hash,
- tool version,
- predicate result,
- assertion result,
- counterexample if present,
- generated instance if present,
- exported fixture if present.

# Joern MCP Tool Requirements

The Joern MCP server provides structural truth.

## Required Tools

build_cpg(repo_path)
create_graph_snapshot(repo_path)
compare_graph_snapshots(before_id, after_id)
find_symbols(query)
get_call_graph(symbol)
get_data_flow(symbol)
get_dependency_cone(symbol)
get_mutation_points(entity)
get_related_tests(symbol)
detect_unapproved_dependencies(allowed_scope)

## Required Outputs

Each tool must return:

- status,
- timestamp,
- commit hash,
- tool version,
- execution duration,
- result,
- partial failure status if applicable,
- evidence references.

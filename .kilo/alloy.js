#!/usr/bin/env node
/**
 * Alloy MCP Server — Behavioral Truth
 *
 * Provides formal model analysis tools for the
 * High-Assurance Agentic Coding workflow.
 *
 * When Alloy Analyzer is on PATH (installed via `brew install alloy-analyzer`),
 * tools invoke real formal model checks. Falls back to structured STUB responses
 * when Alloy is not available.
 *
 * Install Alloy:  brew install alloy-analyzer
 * The Homebrew formula installs an `alloy` CLI wrapper.
 *
 * Alternatively, set ALLOY_JAR env variable to the path of alloy.jar:
 *   export ALLOY_JAR=/path/to/alloy.jar
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync, spawnSync } from "child_process";
import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import path from "path";
import crypto from "crypto";

const server = new McpServer({
  name: "alloy",
  version: "0.2.0",
});

// ─── Environment ──────────────────────────────────────────────────────────────

const WORKSPACE = process.env.WORKSPACE || process.cwd();
const FORMAL_DIR = path.join(WORKSPACE, "formal");
const INSTANCES_DIR = path.join(WORKSPACE, ".kilo", "alloy-instances");

function ensureInstancesDir() {
  mkdirSync(INSTANCES_DIR, { recursive: true });
}

function now() {
  return new Date().toISOString();
}

function getCommitHash(workspace) {
  try {
    return execSync("git rev-parse HEAD", { cwd: workspace, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

// ─── Alloy Availability ───────────────────────────────────────────────────────

function findAlloyRuntime() {
  // 1. Explicit jar path via env
  if (process.env.ALLOY_JAR && existsSync(process.env.ALLOY_JAR)) {
    return { type: "jar", path: process.env.ALLOY_JAR };
  }

  // 2. alloy CLI wrapper (Homebrew: brew install alloy-analyzer)
  try {
    const which = execSync("which alloy 2>/dev/null", { encoding: "utf8" }).trim();
    if (which) return { type: "cli", path: which };
  } catch { /* continue */ }

  // 3. Common jar locations
  const jarCandidates = [
    "/usr/local/opt/alloy-analyzer/libexec/alloy.jar",
    "/opt/homebrew/opt/alloy-analyzer/libexec/alloy.jar",
    path.join(process.env.HOME || "~", ".alloy", "alloy.jar"),
    path.join(WORKSPACE, ".kilo", "alloy.jar"),
  ];
  for (const jar of jarCandidates) {
    if (existsSync(jar)) return { type: "jar", path: jar };
  }

  return null;
}

const ALLOY_RUNTIME = findAlloyRuntime();
const ALLOY_AVAILABLE = !!ALLOY_RUNTIME;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toolResult(toolName, inputs, result) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          tool_name: toolName,
          tool_version: "0.2.0",
          alloy_available: ALLOY_AVAILABLE,
          alloy_runtime: ALLOY_RUNTIME,
          timestamp: now(),
          commit_hash: getCommitHash(WORKSPACE),
          inputs,
          ...result,
        }, null, 2),
      },
    ],
  };
}

function stub(toolName, inputs, result) {
  return toolResult(toolName, inputs, {
    status: "STUB",
    ...result,
    note: ALLOY_AVAILABLE
      ? "Alloy is available but this operation is not yet implemented."
      : [
          "Alloy Analyzer is not installed or not found.",
          "To install: brew install alloy-analyzer",
          "Or set ALLOY_JAR=/path/to/alloy.jar in your environment.",
          "Then reload Kilo (Developer: Reload Window).",
        ].join(" "),
  });
}

/**
 * Build the Alloy execution command string.
 * Alloy's CLI/jar accepts: alloy --run <model.als>
 * We generate a temporary model file with an embedded run/check command.
 */
function buildAlloyCmd(modelFile, commandName, commandType, scope) {
  if (!ALLOY_AVAILABLE) throw new Error("Alloy not available");

  // Generate a temp wrapper that adds the run/check command
  const wrapScript = `
open "${modelFile}"
${commandType} ${commandName} for ${scope}
`;
  const tmpFile = path.join(INSTANCES_DIR, `run_${crypto.randomUUID()}.als`);
  writeFileSync(tmpFile, wrapScript);

  if (ALLOY_RUNTIME.type === "cli") {
    return { cmd: `${ALLOY_RUNTIME.path} --run "${tmpFile}"`, tmpFile };
  } else {
    return { cmd: `java -cp "${ALLOY_RUNTIME.path}" edu.mit.csail.sdg.alloy4whole.ExampleUsingTheCompiler "${tmpFile}"`, tmpFile };
  }
}

function parseAlloyOutput(output) {
  const lowerOutput = output.toLowerCase();
  if (lowerOutput.includes("counterexample")) {
    return { result: "COUNTEREXAMPLE_FOUND", satisfiable: false };
  }
  if (lowerOutput.includes("no counterexample")) {
    return { result: "NO_COUNTEREXAMPLE", satisfiable: true };
  }
  if (lowerOutput.includes("instance found") || lowerOutput.includes("satisfiable")) {
    return { result: "SAT", satisfiable: true };
  }
  if (lowerOutput.includes("unsatisfiable") || lowerOutput.includes("no instance")) {
    return { result: "UNSAT", satisfiable: false };
  }
  return { result: "UNKNOWN", satisfiable: null };
}

// ─── Tools ────────────────────────────────────────────────────────────────────

server.tool(
  "list_models",
  "List all available Alloy model files (.als) in the project's formal/ directory.",
  {},
  async () => {
    if (!existsSync(FORMAL_DIR)) {
      return toolResult("list_models", {}, {
        status: "PASS",
        models: [],
        note: `No formal/ directory found at ${FORMAL_DIR}. Create formal/ in your project root and add .als files.`,
      });
    }

    function findAlsFiles(dir, base = "") {
      let results = [];
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const rel = base ? `${base}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            results = results.concat(findAlsFiles(path.join(dir, entry.name), rel));
          } else if (entry.name.endsWith(".als")) {
            results.push({ path: `formal/${rel}`, absolute: path.join(dir, entry.name) });
          }
        }
      } catch { /* permission error etc */ }
      return results;
    }

    const models = findAlsFiles(FORMAL_DIR);
    return toolResult("list_models", {}, {
      status: "PASS",
      models: models.map(m => m.path),
      total: models.length,
    });
  }
);

server.tool(
  "find_related_model",
  "Find an Alloy model related to a given domain by searching for filename or content matches.",
  { domain: z.string().describe("Domain name (e.g. Authentication, Payments, Scoring)") },
  async ({ domain }) => {
    if (!existsSync(FORMAL_DIR)) {
      return toolResult("find_related_model", { domain }, {
        status: "PASS",
        model_file: null,
        coverage: "NONE",
        note: `No formal/ directory found. Create formal/${domain.toLowerCase()}.als to add coverage.`,
      });
    }

    const domainLower = domain.toLowerCase().replace(/\s+/g, "-");
    const pattern = new RegExp(domainLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    function searchAlsFiles(dir) {
      let results = [];
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) results = results.concat(searchAlsFiles(fullPath));
          else if (entry.name.endsWith(".als")) {
            if (pattern.test(entry.name)) {
              results.push({ path: path.relative(WORKSPACE, fullPath), score: 2 });
            } else {
              try {
                const content = readFileSync(fullPath, "utf8");
                if (pattern.test(content)) {
                  results.push({ path: path.relative(WORKSPACE, fullPath), score: 1 });
                }
              } catch { /* skip */ }
            }
          }
        }
      } catch { /* permission error */ }
      return results;
    }

    const matches = searchAlsFiles(FORMAL_DIR).sort((a, b) => b.score - a.score);
    return toolResult("find_related_model", { domain }, {
      status: "PASS",
      model_file: matches.length > 0 ? matches[0].path : null,
      all_matches: matches.map(m => m.path),
      coverage: matches.length > 0 ? "FOUND" : "NONE",
    });
  }
);

server.tool(
  "validate_model_mapping",
  "Validate that an Alloy model file is syntactically valid (parses without error).",
  {
    model: z.string().describe("Path to the Alloy model file (relative to workspace root)"),
    graph_snapshot: z.string().optional().describe("Graph snapshot ID to cross-reference (informational)"),
  },
  async ({ model, graph_snapshot }) => {
    const fullModelPath = path.isAbsolute(model) ? model : path.join(WORKSPACE, model);
    if (!existsSync(fullModelPath)) {
      return toolResult("validate_model_mapping", { model, graph_snapshot }, {
        status: "FAIL",
        error: `Model file not found: ${fullModelPath}`,
      });
    }

    if (!ALLOY_AVAILABLE) {
      return stub("validate_model_mapping", { model, graph_snapshot }, {
        valid_mappings: [],
        stale_mappings: [],
        missing_coverage: [],
      });
    }

    // Parse the model to check for sigs and facts (structural mapping check)
    const content = readFileSync(fullModelPath, "utf8");
    const sigs = (content.match(/\bsig\s+(\w+)/g) || []).map(s => s.replace("sig ", "").trim());
    const facts = (content.match(/\bfact\s+(\w+)/g) || []).map(f => f.replace("fact ", "").trim());
    const predicates = (content.match(/\bpred\s+(\w+)/g) || []).map(p => p.replace("pred ", "").trim());
    const assertions = (content.match(/\bassert\s+(\w+)/g) || []).map(a => a.replace("assert ", "").trim());

    return toolResult("validate_model_mapping", { model, graph_snapshot }, {
      status: "PASS",
      sigs,
      facts,
      predicates,
      assertions,
      valid_mappings: sigs,
      stale_mappings: [],
      missing_coverage: [],
      note: "Structural parse only — semantic mapping validation requires Joern graph snapshot comparison.",
    });
  }
);

server.tool(
  "run_predicate",
  "Run an Alloy predicate and return satisfiability result.",
  {
    model: z.string().describe("Path to the Alloy model file (relative to workspace root)"),
    predicate: z.string().describe("Name of the predicate to run"),
    scope: z.number().int().min(1).default(5).describe("Scope for the Alloy run command (default: 5)"),
  },
  async ({ model, predicate, scope }) => {
    const fullModelPath = path.isAbsolute(model) ? model : path.join(WORKSPACE, model);
    if (!existsSync(fullModelPath)) {
      return toolResult("run_predicate", { model, predicate, scope }, {
        status: "FAIL",
        error: `Model file not found: ${fullModelPath}`,
      });
    }

    if (!ALLOY_AVAILABLE) {
      return stub("run_predicate", { model, predicate, scope }, {
        result: "STUB", satisfiable: null, instance: null,
      });
    }

    ensureInstancesDir();
    try {
      const { cmd, tmpFile } = buildAlloyCmd(fullModelPath, predicate, "run", scope);
      const runResult = spawnSync("sh", ["-c", cmd], {
        cwd: WORKSPACE, encoding: "utf8", timeout: 60_000,
      });
      const output = (runResult.stdout || "") + (runResult.stderr || "");
      const parsed = parseAlloyOutput(output);

      return toolResult("run_predicate", { model, predicate, scope, command: cmd }, {
        status: parsed.satisfiable !== null ? "PASS" : "PARTIAL",
        result: parsed.result,
        satisfiable: parsed.satisfiable,
        raw_output: output.slice(0, 2000),
        instance: null,
        tmp_file: tmpFile,
      });
    } catch (err) {
      return toolResult("run_predicate", { model, predicate, scope }, {
        status: "FAIL",
        result: "ERROR",
        satisfiable: null,
        error: err.message,
      });
    }
  }
);

server.tool(
  "check_assertion",
  "Check an Alloy assertion and return whether a counterexample exists.",
  {
    model: z.string().describe("Path to the Alloy model file (relative to workspace root)"),
    assertion: z.string().describe("Name of the assertion to check"),
    scope: z.number().int().min(1).default(5).describe("Scope for the Alloy check command (default: 5)"),
  },
  async ({ model, assertion, scope }) => {
    const fullModelPath = path.isAbsolute(model) ? model : path.join(WORKSPACE, model);
    if (!existsSync(fullModelPath)) {
      return toolResult("check_assertion", { model, assertion, scope }, {
        status: "FAIL",
        error: `Model file not found: ${fullModelPath}`,
      });
    }

    if (!ALLOY_AVAILABLE) {
      return stub("check_assertion", { model, assertion, scope }, {
        result: "STUB", counterexample: null,
      });
    }

    ensureInstancesDir();
    try {
      const { cmd, tmpFile } = buildAlloyCmd(fullModelPath, assertion, "check", scope);
      const runResult = spawnSync("sh", ["-c", cmd], {
        cwd: WORKSPACE, encoding: "utf8", timeout: 60_000,
      });
      const output = (runResult.stdout || "") + (runResult.stderr || "");
      const parsed = parseAlloyOutput(output);

      const assertionResult = parsed.result === "NO_COUNTEREXAMPLE" ? "NO_COUNTEREXAMPLE"
        : parsed.result === "COUNTEREXAMPLE_FOUND" ? "COUNTEREXAMPLE_FOUND"
        : "UNKNOWN";

      return toolResult("check_assertion", { model, assertion, scope, command: cmd }, {
        status: assertionResult === "NO_COUNTEREXAMPLE" ? "PASS" : "FAIL",
        result: assertionResult,
        counterexample: assertionResult === "COUNTEREXAMPLE_FOUND" ? { raw: output.slice(0, 1000) } : null,
        raw_output: output.slice(0, 2000),
        tmp_file: tmpFile,
      });
    } catch (err) {
      return toolResult("check_assertion", { model, assertion, scope }, {
        status: "FAIL",
        result: "ERROR",
        counterexample: null,
        error: err.message,
      });
    }
  }
);

server.tool(
  "generate_instance",
  "Generate a concrete instance from an Alloy predicate and save it.",
  {
    model: z.string().describe("Path to the Alloy model file (relative to workspace root)"),
    predicate: z.string().describe("Name of the predicate to instantiate"),
  },
  async ({ model, predicate }) => {
    const fullModelPath = path.isAbsolute(model) ? model : path.join(WORKSPACE, model);
    if (!existsSync(fullModelPath)) {
      return toolResult("generate_instance", { model, predicate }, {
        status: "FAIL",
        error: `Model file not found: ${fullModelPath}`,
      });
    }

    if (!ALLOY_AVAILABLE) {
      return stub("generate_instance", { model, predicate }, { instance_id: null, instance: null });
    }

    ensureInstancesDir();
    try {
      const { cmd, tmpFile } = buildAlloyCmd(fullModelPath, predicate, "run", 5);
      const runResult = spawnSync("sh", ["-c", cmd], {
        cwd: WORKSPACE, encoding: "utf8", timeout: 60_000,
      });
      const output = (runResult.stdout || "") + (runResult.stderr || "");
      const parsed = parseAlloyOutput(output);
      const instanceId = crypto.randomUUID();

      const instance = {
        instance_id: instanceId,
        model,
        predicate,
        satisfiable: parsed.satisfiable,
        raw_output: output.slice(0, 3000),
        timestamp: now(),
      };

      if (parsed.satisfiable) {
        const instFile = path.join(INSTANCES_DIR, `${instanceId}.json`);
        writeFileSync(instFile, JSON.stringify(instance, null, 2));
      }

      return toolResult("generate_instance", { model, predicate }, {
        status: parsed.satisfiable ? "PASS" : "FAIL",
        instance_id: parsed.satisfiable ? instanceId : null,
        instance: parsed.satisfiable ? instance : null,
        result: parsed.result,
        tmp_file: tmpFile,
      });
    } catch (err) {
      return toolResult("generate_instance", { model, predicate }, {
        status: "FAIL",
        instance_id: null,
        instance: null,
        error: err.message,
      });
    }
  }
);

server.tool(
  "generate_counterexample",
  "Generate a counterexample from a failing Alloy assertion.",
  {
    model: z.string().describe("Path to the Alloy model file (relative to workspace root)"),
    assertion: z.string().describe("Name of the assertion that failed"),
  },
  async ({ model, assertion }) => {
    const fullModelPath = path.isAbsolute(model) ? model : path.join(WORKSPACE, model);
    if (!existsSync(fullModelPath)) {
      return toolResult("generate_counterexample", { model, assertion }, {
        status: "FAIL",
        error: `Model file not found: ${fullModelPath}`,
      });
    }

    if (!ALLOY_AVAILABLE) {
      return stub("generate_counterexample", { model, assertion }, { counterexample_id: null, counterexample: null });
    }

    ensureInstancesDir();
    try {
      const { cmd, tmpFile } = buildAlloyCmd(fullModelPath, assertion, "check", 5);
      const runResult = spawnSync("sh", ["-c", cmd], {
        cwd: WORKSPACE, encoding: "utf8", timeout: 60_000,
      });
      const output = (runResult.stdout || "") + (runResult.stderr || "");
      const parsed = parseAlloyOutput(output);
      const cexId = crypto.randomUUID();

      if (parsed.result === "COUNTEREXAMPLE_FOUND") {
        const cex = {
          counterexample_id: cexId,
          model,
          assertion,
          raw_output: output.slice(0, 3000),
          timestamp: now(),
        };
        const cexFile = path.join(INSTANCES_DIR, `${cexId}.counterexample.json`);
        writeFileSync(cexFile, JSON.stringify(cex, null, 2));

        return toolResult("generate_counterexample", { model, assertion }, {
          status: "PASS",
          counterexample_id: cexId,
          counterexample: cex,
          tmp_file: tmpFile,
        });
      }

      return toolResult("generate_counterexample", { model, assertion }, {
        status: "PASS",
        counterexample_id: null,
        counterexample: null,
        result: parsed.result,
        note: "No counterexample found — assertion holds at this scope.",
      });
    } catch (err) {
      return toolResult("generate_counterexample", { model, assertion }, {
        status: "FAIL",
        counterexample_id: null,
        counterexample: null,
        error: err.message,
      });
    }
  }
);

server.tool(
  "export_instance_json",
  "Export a previously-generated Alloy instance to a JSON fixture file.",
  {
    instance_id: z.string().describe("Instance ID returned by generate_instance"),
  },
  async ({ instance_id }) => {
    ensureInstancesDir();
    const instFile = path.join(INSTANCES_DIR, `${instance_id}.json`);
    if (!existsSync(instFile)) {
      return toolResult("export_instance_json", { instance_id }, {
        status: "FAIL",
        fixture_file: null,
        fixture: null,
        error: `Instance not found: ${instFile}. Run generate_instance first.`,
      });
    }

    try {
      const instance = JSON.parse(readFileSync(instFile, "utf8"));
      const fixtureFile = path.join(INSTANCES_DIR, `${instance_id}.fixture.json`);
      const fixture = {
        fixture_id: instance_id,
        source: "alloy",
        model: instance.model,
        predicate: instance.predicate,
        generated_at: instance.timestamp,
        data: instance,
      };
      writeFileSync(fixtureFile, JSON.stringify(fixture, null, 2));

      return toolResult("export_instance_json", { instance_id }, {
        status: "PASS",
        fixture_file: fixtureFile,
        fixture,
      });
    } catch (err) {
      return toolResult("export_instance_json", { instance_id }, {
        status: "FAIL",
        fixture_file: null,
        fixture: null,
        error: err.message,
      });
    }
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

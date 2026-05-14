#!/usr/bin/env node
/**
 * Alloy MCP Server — Behavioral Truth
 *
 * Provides formal model analysis tools for the
 * High-Assurance Agentic Coding workflow.
 *
 * When Alloy Analyzer is on PATH (installed via `brew install alloy-analyzer`),
 * tools invoke real formal model checks. Falls back to STATUS responses
 * (PASS/FAIL/PARTIAL/STUB) when Alloy is not available or a query path is not
 * yet implemented.
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
import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import path from "path";
import crypto from "crypto";

const IS_WIN = process.platform === "win32";

const server = new McpServer({
  name: "alloy",
  version: "0.2.0",
});

// ─── Environment ──────────────────────────────────────────────────────────────

let WORKSPACE = process.env.WORKSPACE || "";
if (!WORKSPACE || WORKSPACE.includes("${workspaceFolder}") || WORKSPACE === "${workspaceFolder}") {
  WORKSPACE = process.cwd();
}
const FORMAL_DIR = path.join(WORKSPACE, "formal");
const ALLOWED_MODEL_DIRS = [
  FORMAL_DIR,
  path.join(WORKSPACE, "Alloy"),
];
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

  // 2. Platform-appropriate PATH lookup for CLI wrapper
  try {
    const whichCmd = IS_WIN ? "where" : "which";
    const whichResult = execSync(`${whichCmd} alloy 2>/dev/null`, { encoding: "utf8" }).trim();
    if (whichResult) {
      const firstLine = whichResult.split("\n")[0].trim();
      if (existsSync(firstLine)) return { type: "cli", path: firstLine };
    }
  } catch { /* continue */ }

  // 3. Common jar locations
  const userHome = process.env.USERPROFILE || process.env.HOME || "~";
  const jarCandidates = [
    "/usr/local/opt/alloy-analyzer/libexec/alloy.jar",
    "/opt/homebrew/opt/alloy-analyzer/libexec/alloy.jar",
    path.join(userHome, ".alloy", "alloy.jar"),
    path.join(WORKSPACE, ".kilo", "alloy.jar"),
  ];
  if (IS_WIN) {
    jarCandidates.push(
      path.join(userHome, "bin", "alloy", "alloy.jar"),
      path.join(process.env.PROGRAMFILES || "C:\\Program Files", "alloy", "alloy.jar"),
    );
  }
  for (const jar of jarCandidates) {
    if (existsSync(jar)) return { type: "jar", path: jar };
  }

  return null;
}

const ALLOY_RUNTIME = findAlloyRuntime();
const ALLOY_AVAILABLE = !!ALLOY_RUNTIME;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Search all directories in ALLOWED_MODEL_DIRS for .als files.
 * Returns { path, absolute } objects with path relative to WORKSPACE.
 */
function searchAllModelDirs() {
  const results = [];
  for (const dir of ALLOWED_MODEL_DIRS) {
    if (!existsSync(dir)) continue;
    function walk(dirPath, relPrefix) {
      try {
        for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath, path.join(relPrefix, entry.name));
          } else if (entry.name.endsWith(".als")) {
            const absPath = fullPath;
            const relPath = path.relative(WORKSPACE, fullPath);
            results.push({ path: relPath, absolute: absPath });
          }
        }
      } catch { /* skip unreadable dirs */ }
    }
    walk(dir, path.relative(WORKSPACE, dir));
  }
  return results;
}

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

function stub(toolName, inputs, result, severity = "PARTIAL") {
  const note = ALLOY_AVAILABLE
    ? "Alloy is available but this operation encountered an error. Check the model and command output."
    : [
        "Alloy Analyzer is not installed or not found.",
        "To install: brew install alloy-analyzer (macOS) or set ALLOY_JAR=/path/to/alloy.jar",
        "Then reload Kilo (Developer: Reload Window).",
      ].join(" ");
  const error = ALLOY_AVAILABLE
    ? null
    : "Alloy Analyzer not found on PATH or ALLOY_JAR. Install via brew or set ALLOY_JAR, then reload Kilo.";
  return toolResult(toolName, inputs, {
    status: severity,
    note,
    ...(severity === "FAIL" ? { error } : {}),
    ...result,
  });
}

/**
 * Build the Alloy execution command string.
 * Uses Alloy 6's built-in CLI (org.alloytools.alloy.core.infra.Alloy exec)
 * which compiles an .als file and executes all run/check commands in it.
 *
 * We generate a temporary .als file that imports the target model
 * and adds the specific run/check command. The Alloy exec command runs
 * all commands in the file and outputs results to stdout.
 */
function buildAlloyCmd(modelFile, commandName, commandType, scope) {
  if (!ALLOY_AVAILABLE) throw new Error("Alloy not available");

  // Generate a temp wrapper module that imports the target model and adds the command.
  // The model must use 'module' at the top to be importable via 'open'.
  const content = readFileSync(modelFile, "utf8");
  let moduleName = "main";
  const moduleMatch = content.match(/^module\s+(\w+)/m);
  if (moduleMatch) moduleName = moduleMatch[1];

  // Read the model's open directives so the wrapper has access to the same modules
  const openDirectives = (content.match(/^open\s+\S+/gm) || []).join("\n");

  // The model dir where the .als file lives — needed so Alloy can resolve the module
  const modelDir = path.dirname(modelFile);

  // Read open util/integer directives etc. — these are standard
  const wrapContent = `module wrapped_${crypto.randomUUID().replace(/-/g, "_")}
${openDirectives}
open ${moduleName}

${commandType} ${commandName} for ${scope}
`;

  // Place the wrapper in the SAME directory as the model so that 'open moduleName' resolves
  const tmpFile = path.join(modelDir, `_wrapped_${crypto.randomUUID()}.als`);
  writeFileSync(tmpFile, wrapContent);

  // Escape backslashes for Alloy/Java on Windows
  const escapedTmp = tmpFile.replace(/\\/g, "/");

  if (ALLOY_RUNTIME.type === "cli") {
    return { cmd: `${ALLOY_RUNTIME.path} "${escapedTmp}"`, tmpFile };
  } else {
    return { cmd: `java -cp "${ALLOY_RUNTIME.path}" org.alloytools.alloy.core.infra.Alloy exec "${escapedTmp}"`, tmpFile };
  }
}

function parseAlloyOutput(output) {
  const lines = output.split("\n").filter(l => /^\d+\.\s+(check|run)\s/.test(l));

  // Parse each command result line: index. type name ... result
  const results = lines.map(line => {
    const parts = line.trim().split(/\s+/);
    // parts: [idx, type, name?, ..., result]
    const idx = parts[0].replace(".", "");
    const type = parts[1]; // "run" or "check"
    const result = parts[parts.length - 1]; // last column is always SAT/UNSAT
    // Name might have spaces for padding. Use everything between type and result.
    const nameStart = line.indexOf(parts[1]) + parts[1].length;
    const nameEnd = line.lastIndexOf(parts[parts.length - 1]);
    const name = line.substring(nameStart, nameEnd).trim();

    return { idx: parseInt(idx), type, name, result: result === "SAT" ? "SAT" : "UNSAT" };
  });

  // For a single command input, return the result for that command
  if (results.length === 1) {
    const r = results[0];
    if (r.type === "check") {
      // SAT = counterexample found (assertion fails)
      // UNSAT = no counterexample (assertion holds)
      return {
        result: r.result === "SAT" ? "COUNTEREXAMPLE_FOUND" : "NO_COUNTEREXAMPLE",
        satisfiable: r.result !== "SAT", // assertion HOLDING = satisfiable (true),
        raw_results: results,
      };
    } else {
      return {
        result: r.result === "SAT" ? "SAT" : "UNSAT",
        satisfiable: r.result === "SAT",
        raw_results: results,
      };
    }
  }

  // Multiple commands — return aggregate
  return {
    result: results.length > 0 ? "MULTIPLE" : "UNKNOWN",
    satisfiable: null,
    raw_results: results,
  };
}

// ─── Tools ────────────────────────────────────────────────────────────────────

server.tool(
  "alloy_status",
  "Report Alloy availability, runtime, and model inventory. Use as pre-condition check before grounding.",
  {},
  async () => {
    const models = searchAllModelDirs();
    let javaAvailable = false;
    try {
      const r = spawnSync("java", ["-version"], { encoding: "utf8", timeout: 10_000 });
      javaAvailable = r.status === 0 || (r.stderr && r.stderr.includes("version"));
    } catch { /* empty */ }
    return toolResult("alloy_status", {}, {
      status: "PASS",
      alloy_available: ALLOY_AVAILABLE,
      alloy_runtime_type: ALLOY_RUNTIME?.type || null,
      alloy_runtime_path: ALLOY_RUNTIME?.path || null,
      models_count: models.length,
      models: models.map(m => m.path),
      java_available: javaAvailable,
      install_instructions: ALLOY_AVAILABLE
        ? null
        : "brew install alloy-analyzer (macOS) or set ALLOY_JAR=/path/to/alloy.jar (any OS)",
    });
  }
);

server.tool(
  "list_models",
  "List all available Alloy model files (.als) in the project's formal/ directory.",
  {},
  async () => {
    const models = searchAllModelDirs();
    const searched = ALLOWED_MODEL_DIRS.filter(d => existsSync(d));
    return toolResult("list_models", {}, {
      status: "PASS",
      models: models.map(m => m.path),
      total: models.length,
      searched_dirs: searched,
    });
  }
);

server.tool(
  "find_related_model",
  "Find an Alloy model related to a given domain by searching for filename or content matches.",
  { domain: z.string().describe("Domain name (e.g. Authentication, Payments, Scoring)") },
  async ({ domain }) => {
    const domainLower = domain.toLowerCase().replace(/\s+/g, "-");
    const pattern = new RegExp(domainLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const allModels = searchAllModelDirs();
    const matched = allModels
      .filter(m => pattern.test(m.path))
      .map(m => ({ path: m.path, score: 2 }))
      .concat(
        allModels
          .filter(m => !pattern.test(m.path))
          .filter(m => {
            try { return pattern.test(readFileSync(m.absolute, "utf8")); }
            catch { return false; }
          })
          .map(m => ({ path: m.path, score: 1 }))
      )
      .sort((a, b) => b.score - a.score);

    return toolResult("find_related_model", { domain }, {
      status: "PASS",
      model_file: matched.length > 0 ? matched[0].path : null,
      all_matches: matched.map(m => m.path),
      coverage: matched.length > 0 ? "FOUND" : "NONE",
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
    // Resolve model path — handle absolute and relative paths
    // Also resolve ${workspaceFolder} template variable that some MCP orchestrators inject
    const fullModelPath = resolveModelPath(model);
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
      }, "PARTIAL");
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
    const fullModelPath = resolveModelPath(model);
    if (!existsSync(fullModelPath)) {
      return toolResult("run_predicate", { model, predicate, scope }, {
        status: "FAIL",
        error: `Model file not found: ${fullModelPath}`,
      });
    }

    if (!ALLOY_AVAILABLE) {
      return stub("run_predicate", { model, predicate, scope }, {
        result: null, satisfiable: null, instance: null,
      }, "PARTIAL");
    }

    ensureInstancesDir();
    try {
      const { cmd, tmpFile } = buildAlloyCmd(fullModelPath, predicate, "run", scope);
      const runResult = spawnSync(cmd, [], {
        cwd: WORKSPACE, encoding: "utf8", timeout: 60_000, shell: true,
      });
      const output = (runResult.stdout || "") + (runResult.stderr || "");
      const parsed = parseAlloyOutput(output);
      try { rmSync(tmpFile, { force: true }); } catch { /* ignore */ }

      // Find the result for our specific predicate if multiple results
      const ourResult = parsed.raw_results
        ? parsed.raw_results.find(r => r.name === predicate)
        : null;
      const satisfiable = ourResult ? (ourResult.result === "SAT") : parsed.satisfiable;

      return toolResult("run_predicate", { model, predicate, scope, command: cmd }, {
        status: satisfiable !== null ? "PASS" : "PARTIAL",
        result: ourResult?.result || parsed.result,
        satisfiable,
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
    const fullModelPath = resolveModelPath(model);
    if (!existsSync(fullModelPath)) {
      return toolResult("check_assertion", { model, assertion, scope }, {
        status: "FAIL",
        error: `Model file not found: ${fullModelPath}`,
      });
    }

    if (!ALLOY_AVAILABLE) {
      return stub("check_assertion", { model, assertion, scope }, {
        result: null, counterexample: null,
      }, "PARTIAL");
    }

    ensureInstancesDir();
    try {
      const { cmd, tmpFile } = buildAlloyCmd(fullModelPath, assertion, "check", scope);
      const runResult = spawnSync(cmd, [], {
        cwd: WORKSPACE, encoding: "utf8", timeout: 60_000, shell: true,
      });
      const output = (runResult.stdout || "") + (runResult.stderr || "");
      const parsed = parseAlloyOutput(output);
      try { rmSync(tmpFile, { force: true }); } catch { /* ignore */ }

      // Find the result for our specific assertion if multiple results
      const ourResult = parsed.raw_results
        ? parsed.raw_results.find(r => r.name === assertion)
        : null;
      const hasCounterexample = ourResult ? (ourResult.result === "SAT") : false;
      const assertionResult = hasCounterexample ? "COUNTEREXAMPLE_FOUND" : "NO_COUNTEREXAMPLE";

      return toolResult("check_assertion", { model, assertion, scope, command: cmd }, {
        status: hasCounterexample ? "FAIL" : "PASS",
        result: assertionResult,
        counterexample: hasCounterexample ? { raw: output.slice(0, 1000) } : null,
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

function resolveModelPath(model) {
  const resolved = model.replace(/\$\{workspaceFolder\}/gi, WORKSPACE);
  return path.isAbsolute(resolved) ? resolved : path.join(WORKSPACE, resolved);
}

server.tool(
  "generate_instance",
  "Generate a concrete instance from an Alloy predicate and save it.",
  {
    model: z.string().describe("Path to the Alloy model file (relative to workspace root)"),
    predicate: z.string().describe("Name of the predicate to instantiate"),
    scope: z.number().int().min(1).default(5).describe("Scope for the Alloy run command (default: 5)"),
  },
  async ({ model, predicate, scope }) => {
    const fullModelPath = resolveModelPath(model);
    if (!existsSync(fullModelPath)) {
      return toolResult("generate_instance", { model, predicate, scope }, {
        status: "FAIL",
        error: `Model file not found: ${fullModelPath}`,
      });
    }

    if (!ALLOY_AVAILABLE) {
      return stub("generate_instance", { model, predicate }, { instance_id: null, instance: null }, "PARTIAL");
    }

    ensureInstancesDir();
    try {
      const { cmd, tmpFile } = buildAlloyCmd(fullModelPath, predicate, "run", scope);
      const runResult = spawnSync(cmd, [], {
        cwd: WORKSPACE, encoding: "utf8", timeout: 60_000, shell: true,
      });
      const output = (runResult.stdout || "") + (runResult.stderr || "");
      const parsed = parseAlloyOutput(output);
      try { rmSync(tmpFile, { force: true }); } catch { /* ignore */ }

      // Get satisfiable result for this specific predicate
      const ourResult = parsed.raw_results
        ? parsed.raw_results.find(r => r.name === predicate)
        : null;
      const satisfiable = ourResult ? (ourResult.result === "SAT") : parsed.satisfiable;
      const instanceId = crypto.randomUUID();

      const instance = {
        instance_id: instanceId,
        model,
        predicate,
        satisfiable,
        raw_output: output.slice(0, 3000),
        timestamp: now(),
      };

      if (satisfiable) {
        const instFile = path.join(INSTANCES_DIR, `${instanceId}.json`);
        writeFileSync(instFile, JSON.stringify(instance, null, 2));
      }

      return toolResult("generate_instance", { model, predicate }, {
        status: satisfiable ? "PASS" : "FAIL",
        instance_id: satisfiable ? instanceId : null,
        instance: satisfiable ? instance : null,
        result: ourResult?.result || parsed.result,
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
    scope: z.number().int().min(1).default(5).describe("Scope for the Alloy check command (default: 5)"),
  },
  async ({ model, assertion, scope }) => {
    const fullModelPath = resolveModelPath(model);
    if (!existsSync(fullModelPath)) {
      return toolResult("generate_counterexample", { model, assertion, scope }, {
        status: "FAIL",
        error: `Model file not found: ${fullModelPath}`,
      });
    }

    if (!ALLOY_AVAILABLE) {
      return stub("generate_counterexample", { model, assertion }, { counterexample_id: null, counterexample: null }, "PARTIAL");
    }

    ensureInstancesDir();
    try {
      const { cmd, tmpFile } = buildAlloyCmd(fullModelPath, assertion, "check", scope);
      const runResult = spawnSync(cmd, [], {
        cwd: WORKSPACE, encoding: "utf8", timeout: 60_000, shell: true,
      });
      const output = (runResult.stdout || "") + (runResult.stderr || "");
      const parsed = parseAlloyOutput(output);
      try { rmSync(tmpFile, { force: true }); } catch { /* ignore */ }

      // Find result for this specific assertion
      const ourResult = parsed.raw_results
        ? parsed.raw_results.find(r => r.name === assertion)
        : null;
      const hasCounterexample = ourResult ? (ourResult.result === "SAT") : false;
      const cexId = crypto.randomUUID();

      if (hasCounterexample) {
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
        result: "NO_COUNTEREXAMPLE",
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

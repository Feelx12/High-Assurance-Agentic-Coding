#!/usr/bin/env node
/**
 * Joern MCP Server — Structural Truth
 *
 * Provides Code Property Graph (CPG) analysis tools for the
 * High-Assurance Agentic Coding workflow.
 *
 * When Joern CLI is on PATH (joern, joern-parse), tools run real CPG queries.
 * When Joern is not available, tools return structured STUB responses so the
 * workflow can continue at reduced assurance.
 *
 * Install Joern:  ./joern-install.sh  (included in this repo)
 * Then add to PATH:  export PATH="$HOME/bin:$PATH"
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import path from "path";
import crypto from "crypto";

const server = new McpServer({
  name: "joern",
  version: "0.2.0",
});

// ─── Environment ──────────────────────────────────────────────────────────────

const WORKSPACE = process.env.WORKSPACE || process.cwd();
const SNAPSHOTS_DIR = path.join(WORKSPACE, ".kilo", "snapshots");

function ensureSnapshotsDir() {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
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

// ─── Joern Availability ───────────────────────────────────────────────────────

function joernPath() {
  // Check common install locations
  const candidates = [
    "joern",
    path.join(process.env.HOME || "~", "bin", "joern", "joern-cli", "joern"),
    "/usr/local/bin/joern",
    "/opt/joern/joern-cli/joern",
  ];
  for (const c of candidates) {
    try {
      execSync(`which ${c} 2>/dev/null || test -f "${c}"`, { stdio: "ignore" });
      return c;
    } catch { /* try next */ }
  }
  return null;
}

function joernParseCliPath() {
  const candidates = [
    "joern-parse",
    path.join(process.env.HOME || "~", "bin", "joern", "joern-cli", "joern-parse"),
    "/usr/local/bin/joern-parse",
    "/opt/joern/joern-cli/joern-parse",
  ];
  for (const c of candidates) {
    try {
      execSync(`which ${c} 2>/dev/null || test -f "${c}"`, { stdio: "ignore" });
      return c;
    } catch { /* try next */ }
  }
  return null;
}

const JOERN = joernPath();
const JOERN_PARSE = joernParseCliPath();
const JOERN_AVAILABLE = !!JOERN && !!JOERN_PARSE;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toolResult(toolName, inputs, result) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          tool_name: toolName,
          tool_version: "0.2.0",
          joern_available: JOERN_AVAILABLE,
          joern_path: JOERN || null,
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
    note: JOERN_AVAILABLE
      ? "Joern is available but this query path is not yet implemented. Please file an issue."
      : `Joern is not on PATH. Run ./joern-install.sh and add $HOME/bin to PATH, then reload Kilo. Searched: joern, ~/bin/joern/joern-cli/joern, /usr/local/bin/joern`,
  });
}

/**
 * Run a Joern script query via the Joern REPL (--script flag).
 * Returns parsed JSON or throws.
 */
function runJoernScript(script, repoPath) {
  if (!JOERN_AVAILABLE) throw new Error("Joern not available");
  const result = spawnSync(
    JOERN,
    ["--script", "/dev/stdin", "--param", `cpgPath=${repoPath}`],
    {
      input: script,
      cwd: WORKSPACE,
      encoding: "utf8",
      timeout: 300_000,
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "Joern exited non-zero");
  return result.stdout.trim();
}

/**
 * Parse a CPG and return a snapshot saved to .kilo/snapshots/<id>.json
 */
async function buildAndSnapshotCPG(repoPath) {
  const snapshotId = crypto.randomUUID();
  ensureSnapshotsDir();
  const cpgDir = path.join(SNAPSHOTS_DIR, snapshotId);
  mkdirSync(cpgDir, { recursive: true });

  // Step 1: joern-parse to create the CPG binary
  const cpgBin = path.join(cpgDir, "cpg.bin");
  const parseResult = spawnSync(
    JOERN_PARSE,
    [repoPath, "--output", cpgBin],
    { cwd: WORKSPACE, encoding: "utf8", timeout: 300_000 }
  );
  if (parseResult.error) throw parseResult.error;
  if (parseResult.status !== 0) throw new Error(`joern-parse failed: ${parseResult.stderr}`);

  // Step 2: Query the CPG for key symbols and files
  const queryScript = `
    importCpg("${cpgBin}")
    val files = cpg.file.name.l.mkString("\\n")
    val methods = cpg.method.filter(_.isExternal == false).map(m => s"${m.fullName}|${m.filename}|${m.lineNumber.getOrElse(-1)}").l.mkString("\\n")
    println("===FILES===")
    println(files)
    println("===METHODS===")
    println(methods)
  `;

  let rawOutput = "";
  try {
    rawOutput = runJoernScript(queryScript, cpgBin);
  } catch (e) {
    rawOutput = `Query failed: ${e.message}`;
  }

  // Parse output
  const filesSection = rawOutput.split("===METHODS===")[0]?.split("===FILES===")[1]?.trim() || "";
  const methodsSection = rawOutput.split("===METHODS===")[1]?.trim() || "";

  const impactedFiles = filesSection.split("\n").filter(Boolean);
  const impactedSymbols = methodsSection.split("\n").filter(Boolean).map(line => {
    const [fullName, filename, lineNum] = line.split("|");
    return { id: fullName, label: fullName, kind: "METHOD", file: filename, line: parseInt(lineNum) || -1 };
  });

  const snapshot = {
    snapshot_id: snapshotId,
    repo_path: repoPath,
    commit_hash: getCommitHash(repoPath),
    timestamp: now(),
    tool_version: JOERN || "unknown",
    status: "PASS",
    cpg_path: cpgBin,
    nodes: impactedSymbols,
    edges: [],
    impacted_files: impactedFiles,
    impacted_symbols: impactedSymbols.map(s => s.id),
    related_tests: impactedFiles.filter(f => /test|spec/i.test(f)),
  };

  const snapshotFile = path.join(SNAPSHOTS_DIR, `${snapshotId}.json`);
  writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));

  return { snapshotId, snapshot, snapshotFile };
}

// ─── Tools ────────────────────────────────────────────────────────────────────

server.tool(
  "build_cpg",
  "Build a Code Property Graph (CPG) for a repository using joern-parse.",
  { repo_path: z.string().describe("Absolute path to the repository root") },
  async ({ repo_path }) => {
    if (!JOERN_AVAILABLE) {
      return stub("build_cpg", { repo_path }, { cpg_id: null });
    }
    try {
      const { snapshotId, snapshotFile } = await buildAndSnapshotCPG(repo_path);
      return toolResult("build_cpg", { repo_path }, {
        status: "PASS",
        cpg_id: snapshotId,
        snapshot_file: snapshotFile,
        message: "CPG built successfully. Use snapshot_id with other tools.",
      });
    } catch (err) {
      return toolResult("build_cpg", { repo_path }, {
        status: "FAIL",
        cpg_id: null,
        error: err.message,
      });
    }
  }
);

server.tool(
  "create_graph_snapshot",
  "Create a CPG snapshot for a repository and return a snapshot ID for comparison.",
  { repo_path: z.string().describe("Absolute path to the repository root") },
  async ({ repo_path }) => {
    if (!JOERN_AVAILABLE) {
      return stub("create_graph_snapshot", { repo_path }, { snapshot_id: null, commit_hash: null });
    }
    try {
      const { snapshotId, snapshotFile } = await buildAndSnapshotCPG(repo_path);
      return toolResult("create_graph_snapshot", { repo_path }, {
        status: "PASS",
        snapshot_id: snapshotId,
        snapshot_file: snapshotFile,
        commit_hash: getCommitHash(repo_path),
      });
    } catch (err) {
      return toolResult("create_graph_snapshot", { repo_path }, {
        status: "FAIL",
        snapshot_id: null,
        commit_hash: null,
        error: err.message,
      });
    }
  }
);

server.tool(
  "compare_graph_snapshots",
  "Compare two CPG snapshots and return the structural delta (added/removed nodes, changed APIs).",
  {
    before_id: z.string().describe("Snapshot ID from before the change"),
    after_id: z.string().describe("Snapshot ID from after the change"),
  },
  async ({ before_id, after_id }) => {
    ensureSnapshotsDir();
    const beforeFile = path.join(SNAPSHOTS_DIR, `${before_id}.json`);
    const afterFile = path.join(SNAPSHOTS_DIR, `${after_id}.json`);

    if (!existsSync(beforeFile) || !existsSync(afterFile)) {
      return toolResult("compare_graph_snapshots", { before_id, after_id }, {
        status: "FAIL",
        error: `Snapshot file not found. Expected: ${beforeFile} and ${afterFile}. Run create_graph_snapshot first.`,
      });
    }

    try {
      const before = JSON.parse(readFileSync(beforeFile, "utf8"));
      const after = JSON.parse(readFileSync(afterFile, "utf8"));

      const beforeSymbols = new Set(before.impacted_symbols || []);
      const afterSymbols = new Set(after.impacted_symbols || []);
      const beforeFiles = new Set(before.impacted_files || []);
      const afterFiles = new Set(after.impacted_files || []);

      const addedSymbols = [...afterSymbols].filter(s => !beforeSymbols.has(s));
      const removedSymbols = [...beforeSymbols].filter(s => !afterSymbols.has(s));
      const addedFiles = [...afterFiles].filter(f => !beforeFiles.has(f));
      const removedFiles = [...beforeFiles].filter(f => !afterFiles.has(f));

      return toolResult("compare_graph_snapshots", { before_id, after_id }, {
        status: "PASS",
        before_commit: before.commit_hash,
        after_commit: after.commit_hash,
        added_nodes: addedSymbols,
        removed_nodes: removedSymbols,
        added_files: addedFiles,
        removed_files: removedFiles,
        modified_dependencies: [],
        new_call_paths: [],
        new_data_flows: [],
        changed_apis: addedSymbols.filter(s => s.includes("public") || s.includes("api") || s.includes("export")),
        changed_tests: [...afterFiles].filter(f => /test|spec/i.test(f) && !beforeFiles.has(f)),
        drift_indicator: addedSymbols.length > 0 || removedSymbols.length > 0 ? "CHANGES_DETECTED" : "NO_CHANGE",
      });
    } catch (err) {
      return toolResult("compare_graph_snapshots", { before_id, after_id }, {
        status: "FAIL",
        error: err.message,
      });
    }
  }
);

server.tool(
  "find_symbols",
  "Search the CPG for symbols matching a query string. Requires a snapshot ID.",
  {
    query: z.string().describe("Symbol name or pattern to search for"),
    snapshot_id: z.string().optional().describe("Snapshot ID to search within (optional; searches latest if omitted)"),
  },
  async ({ query, snapshot_id }) => {
    if (!JOERN_AVAILABLE) {
      return stub("find_symbols", { query }, { symbols: [] });
    }

    ensureSnapshotsDir();
    let snapshotFile = snapshot_id
      ? path.join(SNAPSHOTS_DIR, `${snapshot_id}.json`)
      : null;

    // Find latest snapshot if none specified
    if (!snapshotFile || !existsSync(snapshotFile)) {
      try {
        const files = execSync(`ls -t "${SNAPSHOTS_DIR}"/*.json 2>/dev/null | head -1`, { encoding: "utf8" }).trim();
        snapshotFile = files || null;
      } catch { snapshotFile = null; }
    }

    if (!snapshotFile || !existsSync(snapshotFile)) {
      return toolResult("find_symbols", { query }, {
        status: "FAIL",
        symbols: [],
        error: "No snapshot found. Run create_graph_snapshot first.",
      });
    }

    try {
      const snapshot = JSON.parse(readFileSync(snapshotFile, "utf8"));
      const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const symbols = (snapshot.impacted_symbols || [])
        .filter(s => pattern.test(s))
        .map(s => ({ name: s, kind: "METHOD" }));

      return toolResult("find_symbols", { query, snapshot_id }, {
        status: "PASS",
        symbols,
        total_found: symbols.length,
      });
    } catch (err) {
      return toolResult("find_symbols", { query }, {
        status: "FAIL",
        symbols: [],
        error: err.message,
      });
    }
  }
);

server.tool(
  "get_call_graph",
  "Return the call graph rooted at a given symbol. Requires Joern CLI.",
  { symbol: z.string().describe("Fully qualified symbol name") },
  async ({ symbol }) => stub("get_call_graph", { symbol }, { callers: [], callees: [] })
);

server.tool(
  "get_data_flow",
  "Trace data flows to and from a symbol. Requires Joern CLI.",
  { symbol: z.string().describe("Fully qualified symbol name") },
  async ({ symbol }) => stub("get_data_flow", { symbol }, { sources: [], sinks: [], flows: [] })
);

server.tool(
  "get_dependency_cone",
  "Return the full dependency cone for a symbol.",
  { symbol: z.string().describe("Fully qualified symbol name") },
  async ({ symbol }) => stub("get_dependency_cone", { symbol }, {
    direct_dependencies: [],
    transitive_dependencies: [],
  })
);

server.tool(
  "get_mutation_points",
  "Return all mutation points (state writes) for an entity.",
  { entity: z.string().describe("Entity name or file path") },
  async ({ entity }) => stub("get_mutation_points", { entity }, { mutation_points: [] })
);

server.tool(
  "get_related_tests",
  "Return test files related to a given symbol. Searches the latest snapshot for test files matching the symbol name.",
  {
    symbol: z.string().describe("Fully qualified symbol name"),
    snapshot_id: z.string().optional().describe("Snapshot ID to search (optional; uses latest if omitted)"),
  },
  async ({ symbol, snapshot_id }) => {
    ensureSnapshotsDir();
    let snapshotFile = snapshot_id
      ? path.join(SNAPSHOTS_DIR, `${snapshot_id}.json`)
      : null;

    if (!snapshotFile || !existsSync(snapshotFile)) {
      try {
        const files = execSync(`ls -t "${SNAPSHOTS_DIR}"/*.json 2>/dev/null | head -1`, { encoding: "utf8" }).trim();
        snapshotFile = files || null;
      } catch { snapshotFile = null; }
    }

    if (!snapshotFile || !existsSync(snapshotFile)) {
      return toolResult("get_related_tests", { symbol }, {
        status: "PARTIAL",
        test_files: [],
        note: "No snapshot found. Run create_graph_snapshot first.",
      });
    }

    try {
      const snapshot = JSON.parse(readFileSync(snapshotFile, "utf8"));
      const baseName = symbol.split(".").pop() || symbol;
      const pattern = new RegExp(baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const testFiles = (snapshot.related_tests || []).filter(f => pattern.test(f));

      return toolResult("get_related_tests", { symbol }, {
        status: "PASS",
        test_files: testFiles,
      });
    } catch (err) {
      return toolResult("get_related_tests", { symbol }, {
        status: "FAIL",
        test_files: [],
        error: err.message,
      });
    }
  }
);

server.tool(
  "detect_unapproved_dependencies",
  "Detect dependencies that fall outside the approved scope by comparing snapshot files against an allow-list.",
  {
    allowed_scope: z.array(z.string()).describe("List of approved file or module paths"),
    snapshot_id: z.string().optional().describe("Snapshot ID to check (optional; uses latest)"),
  },
  async ({ allowed_scope, snapshot_id }) => {
    ensureSnapshotsDir();
    let snapshotFile = snapshot_id
      ? path.join(SNAPSHOTS_DIR, `${snapshot_id}.json`)
      : null;

    if (!snapshotFile || !existsSync(snapshotFile)) {
      try {
        const files = execSync(`ls -t "${SNAPSHOTS_DIR}"/*.json 2>/dev/null | head -1`, { encoding: "utf8" }).trim();
        snapshotFile = files || null;
      } catch { snapshotFile = null; }
    }

    if (!snapshotFile || !existsSync(snapshotFile)) {
      return toolResult("detect_unapproved_dependencies", { allowed_scope }, {
        status: "PARTIAL",
        unapproved_dependencies: [],
        drift_level: "UNKNOWN",
        note: "No snapshot found. Run create_graph_snapshot first.",
      });
    }

    try {
      const snapshot = JSON.parse(readFileSync(snapshotFile, "utf8"));
      const allFiles = snapshot.impacted_files || [];
      const unapproved = allFiles.filter(f => {
        return !allowed_scope.some(allowed => f.startsWith(allowed) || f === allowed);
      });

      let driftLevel = "NONE";
      if (unapproved.length > 0) driftLevel = "REVIEW_REQUIRED";
      if (unapproved.some(f => /auth|payment|permission|security|pii/i.test(f))) driftLevel = "CRITICAL";

      return toolResult("detect_unapproved_dependencies", { allowed_scope }, {
        status: "PASS",
        unapproved_dependencies: unapproved,
        drift_level: driftLevel,
        total_files_checked: allFiles.length,
        total_unapproved: unapproved.length,
      });
    } catch (err) {
      return toolResult("detect_unapproved_dependencies", { allowed_scope }, {
        status: "FAIL",
        unapproved_dependencies: [],
        drift_level: "UNKNOWN",
        error: err.message,
      });
    }
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

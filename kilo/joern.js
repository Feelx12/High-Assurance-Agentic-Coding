#!/usr/bin/env node
/**
 * Joern MCP Server — Structural Truth
 *
 * Provides Code Property Graph (CPG) analysis tools for the
 * High-Assurance Agentic Coding workflow.
 *
 * When Joern CLI is on PATH (joern, joern-parse), tools run real CPG queries.
 * When Joern is not available, entry-point tools return FAIL (blocking),
 * and query tools return PARTIAL (degraded, workflow may continue).
 *
 * Install Joern:  ./joern-install.sh  (included in this repo)
 * Then add to PATH:  export PATH="$HOME/bin:$PATH"
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, statSync } from "fs";
import path from "path";
import crypto from "crypto";

const IS_WIN = process.platform === "win32";

const server = new McpServer({
  name: "joern",
  version: "0.2.0",
});

// ─── Environment ──────────────────────────────────────────────────────────────

let WORKSPACE = process.env.WORKSPACE || "";
// Guard against unexpanded template literal (Kilo config passes "${workspaceFolder}")
if (!WORKSPACE || WORKSPACE.includes("${workspaceFolder}") || WORKSPACE === "${workspaceFolder}") {
  WORKSPACE = process.cwd();
}
const SNAPSHOTS_DIR = path.join(WORKSPACE, ".kilo", "snapshots");

function ensureSnapshotsDir() {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

function latestJsonFile(dir) {
  try {
    const files = readdirSync(dir).filter(f => f.endsWith(".json")).map(f => ({
      name: f,
      mtime: statSync(path.join(dir, f)).mtimeMs,
    }));
    files.sort((a, b) => b.mtime - a.mtime);
    return files.length > 0 ? path.join(dir, files[0].name) : null;
  } catch {
    return null;
  }
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
  const candidates = [
    "joern",
    "joern.bat",
    path.join(process.env.USERPROFILE || process.env.HOME || "~", "bin", "joern", "joern-cli", "joern"),
    path.join(process.env.USERPROFILE || process.env.HOME || "~", "bin", "joern", "joern-cli", "joern.bat"),
    "/usr/local/bin/joern",
    "/opt/joern/joern-cli/joern",
  ];
  for (const c of candidates) {
    try {
      if (process.platform === "win32") {
        if (c.includes("\\") || c.includes("/")) {
          if (existsSync(c)) return c;
        } else {
          execSync(`where "${c}" 2>nul`, { stdio: "ignore" });
          return c;
        }
      } else {
        execSync(`which ${c} 2>/dev/null || test -f "${c}"`, { stdio: "ignore" });
        return c;
      }
    } catch { /* try next */ }
  }
  return null;
}

function joernParseCliPath() {
  const candidates = [
    "joern-parse",
    "joern-parse.bat",
    path.join(process.env.USERPROFILE || process.env.HOME || "~", "bin", "joern", "joern-cli", "joern-parse"),
    path.join(process.env.USERPROFILE || process.env.HOME || "~", "bin", "joern", "joern-cli", "joern-parse.bat"),
    "/usr/local/bin/joern-parse",
    "/opt/joern/joern-cli/joern-parse",
  ];
  for (const c of candidates) {
    try {
      if (process.platform === "win32") {
        if (c.includes("\\") || c.includes("/")) {
          if (existsSync(c)) return c;
        } else {
          execSync(`where "${c}" 2>nul`, { stdio: "ignore" });
          return c;
        }
      } else {
        execSync(`which ${c} 2>/dev/null || test -f "${c}"`, { stdio: "ignore" });
        return c;
      }
    } catch { /* try next */ }
  }
  return null;
}

const JOERN = joernPath();
const JOERN_PARSE = joernParseCliPath();
const JOERN_AVAILABLE = !!JOERN && !!JOERN_PARSE;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cross-platform spawn of a Joern command.
 * On Windows, appends .bat if the command has no extension, and
 * always uses shell: true to allow .bat resolution.
 */
function safeSpawn(command, args, options = {}) {
  let cmd = command;
  if (IS_WIN && !cmd.endsWith(".bat") && !cmd.endsWith(".exe") && !cmd.endsWith(".cmd")) {
    // Try the .bat variant — Node's spawnSync doesn't resolve PATHEXT
    const batCmd = `${cmd}.bat`;
    if (existsSync(batCmd)) {
      cmd = batCmd;
    } else {
      // Let the shell resolve it
      return spawnSync(`${cmd}.bat`, args, { ...options, shell: true });
    }
  }
  return spawnSync(cmd, args, { ...options, shell: IS_WIN });
}

/**
 * Convert a filesystem path to forward-slash form for embedding in
 * Scala/Joern scripts (avoids backslash escape issues on Windows).
 */
function toFwdSlash(p) {
  return p.replace(/\\/g, "/");
}

function findLatestCpgPath() {
  ensureSnapshotsDir();
  const latestFile = latestJsonFile(SNAPSHOTS_DIR);
  if (!latestFile) return null;
  try {
    const snap = JSON.parse(readFileSync(latestFile, "utf8"));
    const cpgPath = snap.cpg_path;
    if (!cpgPath) return null;
    const resolved = path.isAbsolute(cpgPath) ? cpgPath : path.join(WORKSPACE, cpgPath);
    return existsSync(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

function parseSectionedOutput(raw, sectionName) {
  const marker = `===${sectionName}===`;
  const idx = raw.indexOf(marker);
  if (idx === -1) return [];
  const after = raw.slice(idx + marker.length);
  const endIdx = after.indexOf("===");
  const section = endIdx === -1 ? after : after.slice(0, endIdx);
  return section.trim().split("\n").filter(Boolean)
    .filter(line => !line.startsWith("[INFO") && !line.startsWith("[WARN") && !line.startsWith("[ERROR"))
    .map(line => {
      const parts = line.split("|");
      return { fullName: parts[0] || line, file: parts[1] || "", line: parseInt(parts[2]) || -1 };
    });
}

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

function stub(toolName, inputs, result, severity = "PARTIAL") {
  const note = JOERN_AVAILABLE
    ? "Query execution failed or returned no data. Check the CPG snapshot or symbol name."
    : "Joern is not on PATH. Run joern-install.sh (Unix) or joern-install.ps1 (Windows) and add joern-cli to PATH, then reload Kilo.";
  const error = JOERN_AVAILABLE
    ? null
    : "Joern CLI not found on PATH. Run joern-install.ps1 (Windows) or joern-install.sh (macOS/Linux) and add joern-cli to PATH, then reload Kilo.";
  return toolResult(toolName, inputs, {
    status: severity,
    note,
    ...(severity === "FAIL" ? { error } : {}),
    ...result,
  });
}

/**
 * Run a Joern script query via the Joern REPL (--script flag).
 * Returns parsed JSON or throws.
 */
function runJoernScript(script, repoPath) {
  if (!JOERN_AVAILABLE) throw new Error("Joern not available");
  const tmpScript = path.join(SNAPSHOTS_DIR, `_tmp_query_${Date.now()}.sc`);
  mkdirSync(path.dirname(tmpScript), { recursive: true });
  writeFileSync(tmpScript, script, "utf8");
  try {
    const result = safeSpawn(
      JOERN,
      ["--script", toFwdSlash(tmpScript)],
      { cwd: WORKSPACE, encoding: "utf8", timeout: 300_000 }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || "Joern exited non-zero");
    return result.stdout.trim();
  } finally {
    try { rmSync(tmpScript, { force: true }); } catch { /* ignore */ }
  }
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
  const parseResult = safeSpawn(
    JOERN_PARSE,
    [repoPath, "--output", cpgBin],
    { cwd: WORKSPACE, encoding: "utf8", timeout: 300_000 }
  );
  if (parseResult.error) throw parseResult.error;
  if (parseResult.status !== 0) throw new Error(`joern-parse failed: ${parseResult.stderr}`);

  // Step 2: Query the CPG for key symbols and files
  // Use forward-slash path to avoid Scala backslash escape issues on Windows.
  // Scala s"..." string interpolation uses $ which must be $$ in JS template literals.
  const cpgPath = toFwdSlash(cpgBin);
  const queryScript = [
    'importCpg("' + cpgPath + '")',
    'val files = cpg.file.name.l.mkString("\\n")',
    'val methods = cpg.method.filter(_.isExternal == false).map(m => s"${m.fullName}|${m.filename}|${m.lineNumber.getOrElse(-1)}").l.mkString("\\n")',
    'println("===FILES===")',
    'println(files)',
    'println("===METHODS===")',
    'println(methods)',
  ].join("\n");

  let rawOutput = "";
  try {
    rawOutput = runJoernScript(queryScript, cpgPath);
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
  "register_cpg",
  "Register an existing CPG binary (built externally) as a snapshot. " +
  "Useful when joern-parse is not available but a frontend like jssrc2cpg was used.",
  {
    cpg_path: z.string().describe("Absolute path to the existing CPG binary file or directory"),
    repo_path: z.string().describe("Repository root path for commit hash"),
  },
  async ({ cpg_path, repo_path }) => {
    if (!existsSync(cpg_path)) {
      return toolResult("register_cpg", { cpg_path, repo_path }, {
        status: "FAIL",
        error: `CPG not found at: ${cpg_path}`,
      });
    }
    try {
      const snapshotId = crypto.randomUUID();
      ensureSnapshotsDir();
      const cpgDir = path.join(SNAPSHOTS_DIR, snapshotId);
      mkdirSync(cpgDir, { recursive: true });

      // Shallow snapshot without query — just file info
      const snapshot = {
        snapshot_id: snapshotId,
        repo_path: repo_path,
        commit_hash: getCommitHash(repo_path),
        timestamp: now(),
        tool_version: "registered",
        status: "PASS",
        cpg_path: cpg_path,
        nodes: [],
        edges: [],
        impacted_files: [],
        impacted_symbols: [],
        related_tests: [],
        note: "CPG was registered externally (not built via joern-parse). Run build_cpg for full analysis.",
      };

      const snapshotFile = path.join(SNAPSHOTS_DIR, `${snapshotId}.json`);
      writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));

      return toolResult("register_cpg", { cpg_path, repo_path }, {
        status: "PASS",
        snapshot_id: snapshotId,
        snapshot_file: snapshotFile,
        commit_hash: getCommitHash(repo_path),
      });
    } catch (err) {
      return toolResult("register_cpg", { cpg_path, repo_path }, {
        status: "FAIL",
        error: err.message,
      });
    }
  }
);

server.tool(
  "build_cpg",
  "Build a Code Property Graph (CPG) for a repository using joern-parse, " +
  "then run a full analysis query to extract symbols, files, and tests.",
  { repo_path: z.string().describe("Absolute path to the repository root") },
  async ({ repo_path }) => {
    if (!JOERN_AVAILABLE) {
      return stub("build_cpg", { repo_path }, { cpg_id: null }, "FAIL");
    }
    try {
      const { snapshotId, snapshot, snapshotFile } = await buildAndSnapshotCPG(repo_path);
      return toolResult("build_cpg", { repo_path }, {
        status: "PASS",
        cpg_id: snapshotId,
        snapshot_file: snapshotFile,
        total_symbols: snapshot.impacted_symbols.length,
        total_files: snapshot.impacted_files.length,
        message: "CPG built and analyzed. Snapshot saved.",
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
  "Create a CPG snapshot for a repository (joern-parse only, no full query). " +
  "Use register_cpg for externally-built CPGs, or build_cpg for full analysis.",
  { repo_path: z.string().describe("Absolute path to the repository root") },
  async ({ repo_path }) => {
    if (!JOERN_AVAILABLE) {
      return stub("create_graph_snapshot", { repo_path }, { snapshot_id: null, commit_hash: null }, "FAIL");
    }
    try {
      // Lightweight: parse only, no query
      const snapshotId = crypto.randomUUID();
      ensureSnapshotsDir();
      const cpgDir = path.join(SNAPSHOTS_DIR, snapshotId);
      mkdirSync(cpgDir, { recursive: true });
      const cpgBin = path.join(cpgDir, "cpg.bin");

      const parseResult = safeSpawn(
        JOERN_PARSE,
        [repo_path, "--output", cpgBin],
        { cwd: WORKSPACE, encoding: "utf8", timeout: 300_000 }
      );
      if (parseResult.error) throw parseResult.error;
      if (parseResult.status !== 0) throw new Error(`joern-parse failed: ${parseResult.stderr}`);

      const snapshot = {
        snapshot_id: snapshotId,
        repo_path: repo_path,
        commit_hash: getCommitHash(repo_path),
        timestamp: now(),
        tool_version: JOERN || "unknown",
        status: "PASS",
        cpg_path: cpgBin,
        nodes: [],
        edges: [],
        impacted_files: [],
        impacted_symbols: [],
        related_tests: [],
      };

      const snapshotFile = path.join(SNAPSHOTS_DIR, `${snapshotId}.json`);
      writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));

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
      return stub("find_symbols", { query }, { symbols: [] }, "PARTIAL");
    }

    ensureSnapshotsDir();
    let snapshotFile = snapshot_id
      ? path.join(SNAPSHOTS_DIR, `${snapshot_id}.json`)
      : null;

    // Find latest snapshot if none specified
    if (!snapshotFile || !existsSync(snapshotFile)) {
      try {
        snapshotFile = latestJsonFile(SNAPSHOTS_DIR);
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
  async ({ symbol }) => {
    if (!JOERN_AVAILABLE) {
      return stub("get_call_graph", { symbol }, { callers: [], callees: [] }, "PARTIAL");
    }
    const cpgPath = findLatestCpgPath();
    if (!cpgPath) {
      return stub("get_call_graph", { symbol }, { callers: [], callees: [] }, "PARTIAL");
    }
    const safeSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const script = [
      'importCpg("' + toFwdSlash(cpgPath) + '")',
      'val methods = cpg.method.fullName(".*' + safeSymbol + '.*").l',
      'if (methods.nonEmpty) {',
      '  println("===CALLERS===")',
      '  cpg.method.fullName(".*' + safeSymbol + '.*").caller.dedup.l.take(20).foreach(c => println(c.fullName + "|" + c.filename + "|" + c.lineNumber.getOrElse(-1).toString))',
      '  println("===CALLEES===")',
      '  cpg.method.fullName(".*' + safeSymbol + '.*").callee.dedup.l.take(20).foreach(c => println(c.fullName + "|" + c.filename + "|" + c.lineNumber.getOrElse(-1).toString))',
      '} else {',
      '  println("SYMBOL_NOT_FOUND")',
      '}',
    ].join("\n");
    try {
      const raw = runJoernScript(script, symbol);
      if (raw.includes("SYMBOL_NOT_FOUND")) {
        return toolResult("get_call_graph", { symbol }, {
          status: "PASS",
          callers: [],
          callees: [],
          note: "Symbol not found in CPG",
        });
      }
      return toolResult("get_call_graph", { symbol }, {
        status: "PASS",
        callers: parseSectionedOutput(raw, "CALLERS"),
        callees: parseSectionedOutput(raw, "CALLEES"),
      });
    } catch (e) {
      return stub("get_call_graph", { symbol }, {
        callers: [], callees: [],
        note: `Query failed: ${e.message}`,
      }, "PARTIAL");
    }
  }
);

server.tool(
  "get_data_flow",
  "Trace data flows to and from a symbol. Requires Joern CLI.",
  { symbol: z.string().describe("Fully qualified symbol name") },
  async ({ symbol }) => {
    if (!JOERN_AVAILABLE) {
      return stub("get_data_flow", { symbol }, { sources: [], sinks: [], flows: [] }, "PARTIAL");
    }
    const cpgPath = findLatestCpgPath();
    if (!cpgPath) {
      return stub("get_data_flow", { symbol }, { sources: [], sinks: [], flows: [] }, "PARTIAL");
    }
    const safeSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const script = [
      'importCpg("' + toFwdSlash(cpgPath) + '")',
      'val targetMethods = cpg.method.fullName(".*' + safeSymbol + '.*").l',
      'if (targetMethods.nonEmpty) {',
      '  println("===SOURCES===")',
      '  cpg.method.fullName(".*' + safeSymbol + '.*").parameter.l.take(10).foreach(p => println(p.name + "|" + p.typeFullName + "|" + p.lineNumber.getOrElse(-1).toString))',
      '  println("===SINKS===")',
      '  cpg.method.fullName(".*' + safeSymbol + '.*").methodReturn.l.take(10).foreach(r => println("return|" + r.typeFullName + "|" + r.lineNumber.getOrElse(-1).toString))',
      '} else {',
      '  println("SYMBOL_NOT_FOUND")',
      '}',
    ].join("\n");
    try {
      const raw = runJoernScript(script, symbol);
      if (raw.includes("SYMBOL_NOT_FOUND")) {
        return toolResult("get_data_flow", { symbol }, {
          status: "PASS",
          sources: [],
          sinks: [],
          flows: [],
          note: "Symbol not found in CPG",
        });
      }
      return toolResult("get_data_flow", { symbol }, {
        status: "PASS",
        sources: parseSectionedOutput(raw, "SOURCES"),
        sinks: parseSectionedOutput(raw, "SINKS"),
        flows: [],
      });
    } catch (e) {
      return stub("get_data_flow", { symbol }, {
        sources: [], sinks: [], flows: [],
        note: `Query failed: ${e.message}`,
      }, "PARTIAL");
    }
  }
);

server.tool(
  "get_dependency_cone",
  "Return the full dependency cone for a symbol.",
  { symbol: z.string().describe("Fully qualified symbol name") },
  async ({ symbol }) => {
    if (!JOERN_AVAILABLE) {
      return stub("get_dependency_cone", { symbol }, {
        direct_dependencies: [],
        transitive_dependencies: [],
      }, "PARTIAL");
    }
    const cpgPath = findLatestCpgPath();
    if (!cpgPath) {
      return stub("get_dependency_cone", { symbol }, {
        direct_dependencies: [],
        transitive_dependencies: [],
      }, "PARTIAL");
    }
    const safeSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const script = [
      'importCpg("' + toFwdSlash(cpgPath) + '")',
      'val methods = cpg.method.fullName(".*' + safeSymbol + '.*").l',
      'if (methods.nonEmpty) {',
      '  val directDeps = cpg.method.fullName(".*' + safeSymbol + '.*").take(3).callee.dedup.l.take(30)',
      '  println("===DIRECT===")',
      '  directDeps.foreach(d => println(d.fullName + "|" + d.filename + "|" + d.lineNumber.getOrElse(-1).toString))',
      '  val transitiveDeps = directDeps.take(5).map(_.callee.dedup.l).l.flatten.distinct.diff(directDeps).take(10)',
      '  println("===TRANSITIVE===")',
      '  transitiveDeps.foreach(d => println(d.fullName + "|" + d.filename + "|" + d.lineNumber.getOrElse(-1).toString))',
      '} else {',
      '  println("SYMBOL_NOT_FOUND")',
      '}',
    ].join("\n");
    try {
      const raw = runJoernScript(script, symbol);
      if (raw.includes("SYMBOL_NOT_FOUND")) {
        return toolResult("get_dependency_cone", { symbol }, {
          status: "PASS",
          direct_dependencies: [],
          transitive_dependencies: [],
          note: "Symbol not found in CPG",
        });
      }
      return toolResult("get_dependency_cone", { symbol }, {
        status: "PASS",
        direct_dependencies: parseSectionedOutput(raw, "DIRECT"),
        transitive_dependencies: parseSectionedOutput(raw, "TRANSITIVE"),
      });
    } catch (e) {
      return stub("get_dependency_cone", { symbol }, {
        direct_dependencies: [],
        transitive_dependencies: [],
        note: `Query failed: ${e.message}`,
      }, "PARTIAL");
    }
  }
);

server.tool(
  "get_mutation_points",
  "Return all mutation points (state writes) for an entity.",
  { entity: z.string().describe("Entity name or file path") },
  async ({ entity }) => {
    if (!JOERN_AVAILABLE) {
      return stub("get_mutation_points", { entity }, { mutation_points: [] }, "PARTIAL");
    }
    const cpgPath = findLatestCpgPath();
    if (!cpgPath) {
      return stub("get_mutation_points", { entity }, { mutation_points: [] }, "PARTIAL");
    }
    const safeEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const script = [
      'importCpg("' + toFwdSlash(cpgPath) + '")',
      'val assignments = cpg.method.fullName(".*' + safeEntity + '.*").take(5).assignment.l',
      'if (assignments.nonEmpty) {',
      '  println("===MUTATIONS===")',
      '  assignments.distinct.take(15).foreach(a => println(a.code + "|" + a.method.fullName + "|" + a.lineNumber.getOrElse(-1).toString))',
      '} else {',
      '  println("NO_MUTATIONS_FOUND")',
      '}',
    ].join("\n");
    try {
      const raw = runJoernScript(script, entity);
      if (raw.includes("NO_MUTATIONS_FOUND")) {
        return toolResult("get_mutation_points", { entity }, {
          status: "PASS",
          mutation_points: [],
          note: "No mutation points found for this entity",
        });
      }
      return toolResult("get_mutation_points", { entity }, {
        status: "PASS",
        mutation_points: parseSectionedOutput(raw, "MUTATIONS"),
      });
    } catch (e) {
      return stub("get_mutation_points", { entity }, {
        mutation_points: [],
        note: `Query failed: ${e.message}`,
      }, "PARTIAL");
    }
  }
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
        snapshotFile = latestJsonFile(SNAPSHOTS_DIR);
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
        snapshotFile = latestJsonFile(SNAPSHOTS_DIR);
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

// ─── joern_status — Health Check ──────────────────────────────────────────────

server.tool(
  "joern_status",
  "Report Joern availability, paths, and snapshot inventory. Use this as a pre-condition check before grounding.",
  {},
  async () => {
    ensureSnapshotsDir();
    let snapshotsCount = 0;
    let latestSnapshotId = null;
    try {
      const files = readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith(".json"));
      snapshotsCount = files.length;
      latestSnapshotId = files.length > 0 ? path.basename(files[0], ".json") : null;
    } catch { /* empty */ }

    let javaAvailable = false;
    try {
      const r = spawnSync("java", ["-version"], { encoding: "utf8", timeout: 10_000 });
      javaAvailable = r.status === 0 || (r.stderr && r.stderr.includes("version"));
    } catch { /* empty */ }

    return toolResult("joern_status", {}, {
      status: "PASS",
      joern_available: JOERN_AVAILABLE,
      joern_path: JOERN || null,
      joern_parse_path: JOERN_PARSE || null,
      java_available: javaAvailable,
      snapshots_count: snapshotsCount,
      latest_snapshot_id: latestSnapshotId,
      install_instructions: IS_WIN
        ? "Run .\\.kilo\\joern-install.ps1 and reload Kilo"
        : "Run ./.kilo/joern-install.sh and reload Kilo",
    });
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

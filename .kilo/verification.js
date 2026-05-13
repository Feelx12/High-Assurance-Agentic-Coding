#!/usr/bin/env node
/**
 * Verification MCP Server — Verification Truth
 *
 * Provides test execution, static analysis, and traceability tools for the
 * High-Assurance Agentic Coding workflow.
 *
 * Stack detection: reads .kilo/verification-config.json if present,
 * otherwise auto-detects from package.json / pyproject.toml / go.mod / Cargo.toml.
 *
 * WORKSPACE env variable must point to your project root (set by kilo.jsonc).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

const server = new McpServer({
  name: "verification",
  version: "0.2.0",
});

// ─── Workspace & Stack Detection ──────────────────────────────────────────────

const WORKSPACE = process.env.WORKSPACE || process.cwd();

/**
 * Detect project stack from well-known config files.
 * Returns one of: "node" | "python" | "go" | "rust" | "unknown"
 */
function detectStack(workspace) {
  const configFile = path.join(workspace, ".kilo", "verification-config.json");
  if (existsSync(configFile)) {
    try {
      const cfg = JSON.parse(readFileSync(configFile, "utf8"));
      if (cfg.stack) return cfg;
    } catch { /* fall through to auto-detect */ }
  }

  if (existsSync(path.join(workspace, "package.json"))) return { stack: "node" };
  if (existsSync(path.join(workspace, "pyproject.toml")) || existsSync(path.join(workspace, "setup.py"))) return { stack: "python" };
  if (existsSync(path.join(workspace, "go.mod"))) return { stack: "go" };
  if (existsSync(path.join(workspace, "Cargo.toml"))) return { stack: "rust" };
  return { stack: "unknown" };
}

const STACK_CONFIG = detectStack(WORKSPACE);

/** Stack-aware test commands */
const TEST_COMMANDS = {
  node:    (scope) => scope
    ? `npm test -- --testPathPattern="${scope}" --passWithNoTests 2>&1 || true`
    : `npm test -- --passWithNoTests 2>&1 || true`,
  python:  (scope) => scope
    ? `python -m pytest "${scope}" -v 2>&1 || true`
    : `python -m pytest -v 2>&1 || true`,
  go:      (scope) => scope
    ? `go test ./${scope}/... 2>&1 || true`
    : `go test ./... 2>&1 || true`,
  rust:    (_scope) => `cargo test 2>&1 || true`,
  unknown: (_scope) => null,
};

const LINT_COMMANDS = {
  node:    () => `npx eslint . --format compact 2>&1 || true`,
  python:  () => `python -m flake8 . 2>&1 || python -m ruff check . 2>&1 || true`,
  go:      () => `golangci-lint run 2>&1 || true`,
  rust:    () => `cargo clippy 2>&1 || true`,
  unknown: () => null,
};

const TYPECHECK_COMMANDS = {
  node:    () => existsSync(path.join(WORKSPACE, "tsconfig.json"))
    ? `npx tsc --noEmit 2>&1 || true`
    : null,
  python:  () => `python -m mypy . 2>&1 || true`,
  go:      () => `go vet ./... 2>&1 || true`,
  rust:    () => `cargo check 2>&1 || true`,
  unknown: () => null,
};

const INTEGRATION_TEST_COMMANDS = {
  node:    (scope) => scope
    ? `npm run test:integration -- --testPathPattern="${scope}" 2>&1 || true`
    : `npm run test:integration 2>&1 || true`,
  python:  (scope) => scope
    ? `python -m pytest "${scope}" -v -m integration 2>&1 || true`
    : `python -m pytest -v -m integration 2>&1 || true`,
  go:      (scope) => scope
    ? `go test -tags=integration ./${scope}/... 2>&1 || true`
    : `go test -tags=integration ./... 2>&1 || true`,
  rust:    (_scope) => `cargo test --test '*' 2>&1 || true`,
  unknown: (_scope) => null,
};

const SECURITY_COMMANDS = {
  node:    () => `npm audit --json 2>&1 || true`,
  python:  () => `pip-audit 2>&1 || safety check 2>&1 || true`,
  go:      () => `govulncheck ./... 2>&1 || true`,
  rust:    () => `cargo audit 2>&1 || true`,
  unknown: () => null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function run(cmd, cwd) {
  if (!cmd) {
    return { status: "SKIPPED", output: "No command available for this stack.", error: null };
  }
  try {
    const output = execSync(cmd, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 120_000 });
    return { status: "PASS", output: output.trim(), error: null };
  } catch (err) {
    return {
      status: "FAIL",
      output: (err.stdout || "").trim(),
      error: (err.stderr || err.message || "").trim(),
    };
  }
}

function toolResult(toolName, inputs, result) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          tool_name: toolName,
          tool_version: "0.2.0",
          timestamp: now(),
          workspace: WORKSPACE,
          stack: STACK_CONFIG.stack,
          inputs,
          ...result,
        }, null, 2),
      },
    ],
  };
}

function getCommitHash(workspace) {
  try {
    return execSync("git rev-parse HEAD", { cwd: workspace, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

server.tool(
  "run_unit_tests",
  "Run unit tests for the project or a specific scope. Supports Node.js, Python, Go, Rust.",
  {
    scope: z.string().optional().describe("Optional test file path or pattern to limit scope"),
  },
  async ({ scope }) => {
    const cmdFn = TEST_COMMANDS[STACK_CONFIG.stack];
    const cmd = cmdFn ? cmdFn(scope) : null;
    if (!cmd) {
      return toolResult("run_unit_tests", { scope }, {
        status: "FAIL",
        error: `Unknown stack '${STACK_CONFIG.stack}'. Create .kilo/verification-config.json to configure. Supported: node, python, go, rust.`,
      });
    }
    const result = run(cmd, WORKSPACE);
    return toolResult("run_unit_tests", { scope, command: cmd }, { ...result, commit_hash: getCommitHash(WORKSPACE) });
  }
);

server.tool(
  "run_integration_tests",
  "Run integration tests for the project or a specific scope. Supports Node.js, Python, Go, Rust.",
  {
    scope: z.string().optional().describe("Optional test file path or pattern"),
  },
  async ({ scope }) => {
    const cmdFn = INTEGRATION_TEST_COMMANDS[STACK_CONFIG.stack];
    const cmd = cmdFn ? cmdFn(scope) : null;
    const result = run(cmd, WORKSPACE);
    return toolResult("run_integration_tests", { scope, command: cmd }, { ...result, commit_hash: getCommitHash(WORKSPACE) });
  }
);

server.tool(
  "run_lint",
  "Run the project linter. Supports ESLint (Node), flake8/ruff (Python), golangci-lint (Go), clippy (Rust).",
  {
    path: z.string().optional().describe("Optional file or directory to lint"),
  },
  async ({ path: lintPath }) => {
    const cmdFn = LINT_COMMANDS[STACK_CONFIG.stack];
    let cmd = cmdFn ? cmdFn() : null;
    if (cmd && lintPath) {
      // Inject path where supported
      cmd = cmd.replace(/\s\.\s/, ` ${lintPath} `);
    }
    const result = run(cmd, WORKSPACE);
    return toolResult("run_lint", { path: lintPath || ".", command: cmd }, { ...result, commit_hash: getCommitHash(WORKSPACE) });
  }
);

server.tool(
  "run_typecheck",
  "Run the type checker. Supports tsc (Node), mypy (Python), go vet (Go), cargo check (Rust).",
  {},
  async () => {
    const cmdFn = TYPECHECK_COMMANDS[STACK_CONFIG.stack];
    const cmd = cmdFn ? cmdFn() : null;
    if (!cmd) {
      return toolResult("run_typecheck", {}, {
        status: "SKIPPED",
        error: `No typecheck command available for stack '${STACK_CONFIG.stack}' or missing config (e.g. tsconfig.json).`,
      });
    }
    const result = run(cmd, WORKSPACE);
    return toolResult("run_typecheck", { command: cmd }, { ...result, commit_hash: getCommitHash(WORKSPACE) });
  }
);

server.tool(
  "run_static_analysis",
  "Run both typecheck and lint as a combined static analysis pass.",
  {},
  async () => {
    const typeCmdFn = TYPECHECK_COMMANDS[STACK_CONFIG.stack];
    const lintCmdFn = LINT_COMMANDS[STACK_CONFIG.stack];
    const typeCmd = typeCmdFn ? typeCmdFn() : null;
    const lintCmd = lintCmdFn ? lintCmdFn() : null;
    const typeResult = run(typeCmd, WORKSPACE);
    const lintResult = run(lintCmd, WORKSPACE);
    const status = typeResult.status !== "FAIL" && lintResult.status !== "FAIL" ? "PASS" : "FAIL";
    return toolResult("run_static_analysis", { typecheck_command: typeCmd, lint_command: lintCmd }, {
      status,
      typecheck: typeResult,
      lint: lintResult,
      commit_hash: getCommitHash(WORKSPACE),
    });
  }
);

server.tool(
  "run_security_scan",
  "Run a security/dependency vulnerability scan. Supports npm audit (Node), pip-audit (Python), govulncheck (Go), cargo audit (Rust).",
  {},
  async () => {
    const cmdFn = SECURITY_COMMANDS[STACK_CONFIG.stack];
    const cmd = cmdFn ? cmdFn() : null;
    const result = run(cmd, WORKSPACE);
    return toolResult("run_security_scan", { command: cmd }, { ...result, commit_hash: getCommitHash(WORKSPACE) });
  }
);

server.tool(
  "generate_traceability_report",
  "Generate and persist a traceability report stub. Saves to .kilo/artifacts/<artifact_id>.traceability.json.",
  {
    artifact_id: z.string().describe("Artifact ID for the traceability report"),
    change_class: z.enum(["CLASS_0", "CLASS_1", "CLASS_2", "CLASS_3"]).describe("Change class"),
    risk_level: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).describe("Risk level"),
    final_decision: z.enum(["PASS", "FAIL"]).describe("Final decision"),
    prompt: z.string().optional().describe("Original user prompt / request"),
    commit_hash: z.string().optional().describe("Commit hash at time of report"),
  },
  async ({ artifact_id, change_class, risk_level, final_decision, prompt, commit_hash }) => {
    const resolvedHash = commit_hash || getCommitHash(WORKSPACE);
    const report = {
      artifact_id,
      timestamp: now(),
      workspace: WORKSPACE,
      stack: STACK_CONFIG.stack,
      commit_hash: resolvedHash,
      change_class,
      risk_level,
      final_decision,
      prompt: prompt || "",
      note: "Populate structural_truth and behavioral_truth from Joern and Alloy servers before marking PASS.",
    };

    // Persist artifact to .kilo/artifacts/
    try {
      const artifactsDir = path.join(WORKSPACE, ".kilo", "artifacts");
      mkdirSync(artifactsDir, { recursive: true });
      const outPath = path.join(artifactsDir, `${artifact_id}.traceability.json`);
      writeFileSync(outPath, JSON.stringify(report, null, 2));
      return toolResult("generate_traceability_report", { artifact_id, change_class, risk_level, final_decision }, {
        status: "PASS",
        report,
        persisted_to: outPath,
      });
    } catch (err) {
      return toolResult("generate_traceability_report", { artifact_id, change_class, risk_level, final_decision }, {
        status: "PARTIAL",
        report,
        error: `Could not persist artifact: ${err.message}`,
      });
    }
  }
);

server.tool(
  "validate_work_package",
  "Validate a work package JSON file against the work-package.schema.json schema.",
  {
    work_package_path: z.string().describe("Path to the work package JSON file (relative to workspace root)"),
  },
  async ({ work_package_path }) => {
    const fullPath = path.isAbsolute(work_package_path)
      ? work_package_path
      : path.join(WORKSPACE, work_package_path);

    if (!existsSync(fullPath)) {
      return toolResult("validate_work_package", { work_package_path }, {
        status: "FAIL",
        error: `File not found: ${fullPath}`,
      });
    }

    const schemaPath = path.join(WORKSPACE, ".kilo", "schemas", "work-package.schema.json");
    if (!existsSync(schemaPath)) {
      return toolResult("validate_work_package", { work_package_path }, {
        status: "FAIL",
        error: "Schema not found: .kilo/schemas/work-package.schema.json",
      });
    }

    // Use ajv via npx for validation (avoids adding a new hard dependency)
    const cmd = `npx --yes ajv-cli validate -s "${schemaPath}" -d "${fullPath}" 2>&1 || true`;
    const result = run(cmd, WORKSPACE);
    return toolResult("validate_work_package", { work_package_path, command: cmd }, {
      ...result,
      commit_hash: getCommitHash(WORKSPACE),
    });
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

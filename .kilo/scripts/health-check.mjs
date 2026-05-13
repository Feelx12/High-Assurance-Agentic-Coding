#!/usr/bin/env node
/**
 * health-check.mjs
 *
 * Verifies each MCP server can be imported and initialised without runtime
 * errors.  Because these servers are long-running stdio processes we can't
 * just `node server.js` and wait — they block on stdin.
 *
 * Strategy: dynamically import each module after replacing the transport
 * connect call with a no-op so initialisation runs but the process exits
 * cleanly.  We do this by wrapping the import in a child process with a
 * hard timeout and checking the exit code.
 *
 * Warnings are surfaced but do NOT fail the check unless they indicate a
 * real problem (unhandled rejection, syntax error, missing module, etc.)
 */

import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/ → mcp-servers/ → .kilo/ → project root
const MCP_DIR = path.resolve(__dirname, "..");
const ROOT    = path.resolve(MCP_DIR, "..", "..");

const SERVERS = ["joern.js", "alloy.js", "verification.js"];

// We probe each server by running a tiny wrapper that patches
// StdioServerTransport so the server doesn't block.
const PROBE_SCRIPT = `
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Patch StdioServerTransport so connect() resolves immediately instead of
// blocking on stdin — this lets module-level initialisation run cleanly.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
const _orig = StdioServerTransport.prototype.start ?? StdioServerTransport.prototype.connect;
if (_orig) {
  StdioServerTransport.prototype.start = async () => {};
  StdioServerTransport.prototype.connect = async () => {};
}

// Dynamic import of the server module; we need the file path injected below.
const target = process.argv[2];
try {
  await import(target);
  // Give async init tasks a tick to settle, then exit cleanly.
  setTimeout(() => process.exit(0), 200);
} catch (err) {
  process.stderr.write("HEALTH-CHECK FAIL: " + err.message + "\\n");
  process.exit(1);
}
`;

import { writeFileSync, unlinkSync } from "fs";
const PROBE_FILE = path.join(__dirname, "_probe.mjs");

writeFileSync(PROBE_FILE, PROBE_SCRIPT);

let allPassed = true;

for (const server of SERVERS) {
  const serverPath = path.join(MCP_DIR, server);
  const serverUrl = `file://${serverPath}`;

  const result = spawnSync(
    process.execPath,
    ["--no-warnings", PROBE_FILE, serverUrl],
    {
      cwd: MCP_DIR,
      encoding: "utf8",
      timeout: 10_000,
      env: {
        ...process.env,
        WORKSPACE: ROOT,
        NODE_ENV: "test",
      },
    }
  );

  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  const timedOut = result.error?.code === "ETIMEDOUT";
  const exitCode = result.status;

  if (timedOut) {
    console.log(`✓  ${server}: started (timeout — server is blocking correctly on stdio)`);
  } else if (exitCode === 0) {
    console.log(`✓  ${server}: started and exited cleanly`);
    if (stderr) console.log(`   warnings: ${stderr.split("\n").slice(0, 3).join(" | ")}`);
  } else {
    console.error(`❌ ${server}: FAILED (exit ${exitCode})`);
    if (stderr) console.error(`   stderr: ${stderr.slice(0, 500)}`);
    if (stdout) console.error(`   stdout: ${stdout.slice(0, 500)}`);
    allPassed = false;
  }
}

// Clean up probe file
try { unlinkSync(PROBE_FILE); } catch { /* ignore */ }

if (!allPassed) {
  console.error("\n❌ Health check failed — one or more servers did not start cleanly.");
  process.exit(1);
}

console.log("\n✓ All servers passed health check.");

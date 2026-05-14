#!/usr/bin/env node
/**
 * validate-config.mjs
 * Validates that kilo.jsonc parses correctly after stripping comments,
 * and that all referenced mode/rules/policy files exist.
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KILO_DIR  = path.resolve(__dirname, "..");  // .kilo directory
const ROOT      = path.resolve(KILO_DIR, "..");

let fail = false;
let warnings = 0;

// ── 1. Parse kilo.jsonc ───────────────────────────────────────────────────────
const kiloJsoncPath = path.join(KILO_DIR, "kilo.jsonc");
let config;
try {
  const src = readFileSync(kiloJsoncPath, "utf8");

  // State-machine JSON comment stripper that respects string literals.
  // Handles: single-line comments, block comments, escaped chars in strings.
  function stripJsonc(input) {
    let out = "";
    let i = 0;
    let inString = false;
    while (i < input.length) {
      const ch = input[i];
      if (inString) {
        if (ch === "\\" && i + 1 < input.length) {
          out += ch + input[i + 1];
          i += 2;
          continue;
        }
        if (ch === '"') inString = false;
        out += ch;
        i++;
      } else {
        if (ch === '"') {
          inString = true;
          out += ch;
          i++;
        } else if (ch === "/" && input[i + 1] === "/") {
          // Single-line comment — skip to end of line
          while (i < input.length && input[i] !== "\n") i++;
        } else if (ch === "/" && input[i + 1] === "*") {
          // Block comment — skip to */
          i += 2;
          while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) i++;
          i += 2;
        } else {
          out += ch;
          i++;
        }
      }
    }
    return out;
  }

  // Also replace {{{input}}} Handlebars tokens used in command templates
  const stripped = stripJsonc(src).replace(/\{\{\{[^}]*\}\}\}/g, "PLACEHOLDER");
  config = JSON.parse(stripped);
  console.log("✓  kilo.jsonc: parsed successfully");
} catch (err) {
  console.error(`❌ kilo.jsonc: parse error — ${err.message}`);
  process.exit(1);
}

// ── 2. Check all command template files exist ─────────────────────────────────
const commands = config.command || {};
for (const [cmdName, cmdDef] of Object.entries(commands)) {
  const template = cmdDef.template || "";
  // Extract file references like .kilo/modes/grounding-mode.md
  const refs = [...template.matchAll(/\.kilo\/[\w./\-]+\.md/g)].map(m => m[0]);
  for (const ref of refs) {
    const fullPath = path.join(ROOT, ref);
    if (!existsSync(fullPath)) {
      console.error(`❌ command '${cmdName}' references missing file: ${ref}`);
      fail = true;
    } else {
      console.log(`✓  command '${cmdName}' → ${ref} exists`);
    }
  }
}

// ── 3. Check all instruction globs resolve to existing directories ────────────
const instructions = config.instructions || [];
for (const glob of instructions) {
  // Check the base directory exists (we can't do full glob resolution without a glob lib)
  const baseDir = path.join(ROOT, glob.replace(/\/\*.*$/, ""));
  if (!existsSync(baseDir)) {
    console.error(`❌ instructions glob references missing path: ${glob} (base: ${baseDir})`);
    fail = true;
  } else {
    console.log(`✓  instructions glob base exists: ${glob}`);
  }
}

// ── 4. Check all MCP server scripts exist ────────────────────────────────────
const mcpServers = config.mcp || {};
for (const [serverName, serverDef] of Object.entries(mcpServers)) {
  const cmd = serverDef.command || [];
  const scriptArg = cmd[1];
  if (scriptArg) {
    const fullPath = path.join(ROOT, scriptArg);
    if (!existsSync(fullPath)) {
      console.error(`❌ MCP server '${serverName}' references missing script: ${scriptArg}`);
      fail = true;
    } else {
      console.log(`✓  MCP server '${serverName}' → ${scriptArg} exists`);
    }
  }
}

if (warnings > 0) {
  console.warn(`\n⚠️  ${warnings} warning(s) — review above.`);
}

if (fail) {
  console.error("\n❌ Config validation failed.");
  process.exit(1);
}

console.log("\n✓ kilo.jsonc config is valid.");

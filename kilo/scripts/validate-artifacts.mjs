#!/usr/bin/env node
/**
 * validate-artifacts.mjs
 * Validates any committed traceability reports (.kilo/artifacts/*.traceability.json)
 * against the traceability JSON schema.
 * Exits 0 with a notice if no artifacts exist yet (not an error — fresh install).
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const KILO_DIR     = path.resolve(__dirname, "..");
const ARTIFACTS_DIR = path.join(KILO_DIR, "artifacts");
const SCHEMA_PATH  = path.join(KILO_DIR, "schemas", "traceability.schema.json");

// ── No artifacts yet ──────────────────────────────────────────────────────────
if (!existsSync(ARTIFACTS_DIR)) {
  console.log("ℹ️  No .kilo/artifacts/ directory found — skipping (no reports committed yet).");
  process.exit(0);
}

const files = readdirSync(ARTIFACTS_DIR).filter(f => f.endsWith(".traceability.json"));
if (files.length === 0) {
  console.log("ℹ️  No traceability reports in .kilo/artifacts/ — skipping.");
  process.exit(0);
}

// ── Load schema ───────────────────────────────────────────────────────────────
if (!existsSync(SCHEMA_PATH)) {
  console.error("❌ Schema not found: .kilo/schemas/traceability.schema.json");
  process.exit(1);
}

const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
const required = schema.required || [];
const allowedFinalDecisions = schema.properties?.final_decision?.enum || ["PASS", "FAIL"];
const allowedChangClasses   = schema.properties?.change_class?.enum   || [];
const allowedRiskLevels     = schema.properties?.risk_level?.enum     || [];

let fail = false;
let warnings = 0;

// ── Validate each report ──────────────────────────────────────────────────────
for (const file of files) {
  const fullPath = path.join(ARTIFACTS_DIR, file);
  let report;

  try {
    report = JSON.parse(readFileSync(fullPath, "utf8"));
  } catch (err) {
    console.error(`❌ ${file}: JSON parse error — ${err.message}`);
    fail = true;
    continue;
  }

  const missing = required.filter(k => !(k in report));
  if (missing.length > 0) {
    console.error(`❌ ${file}: missing required fields: ${missing.join(", ")}`);
    fail = true;
    continue;
  }

  // Enum checks
  if (allowedFinalDecisions.length && !allowedFinalDecisions.includes(report.final_decision)) {
    console.error(`❌ ${file}: invalid final_decision '${report.final_decision}' (expected: ${allowedFinalDecisions.join("|")})`);
    fail = true;
  }
  if (allowedChangClasses.length && !allowedChangClasses.includes(report.change_class)) {
    console.error(`❌ ${file}: invalid change_class '${report.change_class}'`);
    fail = true;
  }
  if (allowedRiskLevels.length && !allowedRiskLevels.includes(report.risk_level)) {
    console.error(`❌ ${file}: invalid risk_level '${report.risk_level}'`);
    fail = true;
  }

  // Warn if final_decision is FAIL (shouldn't normally be committed)
  if (report.final_decision === "FAIL") {
    console.warn(`⚠️  ${file}: final_decision is FAIL — was this intentionally committed?`);
    warnings++;
  }

  if (!fail) {
    console.log(`✓  ${file}: valid (class=${report.change_class}, risk=${report.risk_level}, decision=${report.final_decision})`);
  }
}

if (warnings > 0) {
  console.warn(`\n⚠️  ${warnings} warning(s) — review above.`);
}

if (fail) {
  console.error(`\n❌ Artifact validation failed — ${files.length} report(s) checked.`);
  process.exit(1);
}

console.log(`\n✓ All ${files.length} traceability report(s) valid.`);

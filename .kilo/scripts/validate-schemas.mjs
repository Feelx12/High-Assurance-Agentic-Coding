#!/usr/bin/env node
/**
 * validate-schemas.mjs
 * Validates that all .kilo/schemas/*.schema.json files parse as valid JSON
 * and contain the required top-level JSON Schema fields.
 */

import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = path.resolve(__dirname, "..", "..", "schemas");

const REQUIRED_TOP_LEVEL = ["$schema", "title", "type", "required", "properties"];

let fail = false;

const files = readdirSync(SCHEMAS_DIR).filter(f => f.endsWith(".schema.json"));

if (files.length === 0) {
  console.error("❌ No schema files found in .kilo/schemas/");
  process.exit(1);
}

for (const file of files) {
  const fullPath = path.join(SCHEMAS_DIR, file);
  try {
    const schema = JSON.parse(readFileSync(fullPath, "utf8"));

    const missing = REQUIRED_TOP_LEVEL.filter(k => !(k in schema));
    if (missing.length > 0) {
      console.error(`❌ ${file}: missing top-level fields: ${missing.join(", ")}`);
      fail = true;
    } else {
      const reqFields = schema.required || [];
      const propFields = Object.keys(schema.properties || {});
      const reqNotInProps = reqFields.filter(r => !propFields.includes(r));
      if (reqNotInProps.length > 0) {
        console.warn(`⚠️  ${file}: required fields not in properties: ${reqNotInProps.join(", ")}`);
        // warn only, don't fail
      }
      console.log(`✓  ${file}: valid (${reqFields.length} required, ${propFields.length} properties)`);
    }
  } catch (err) {
    console.error(`❌ ${file}: JSON parse error — ${err.message}`);
    fail = true;
  }
}

if (fail) {
  console.error("\n❌ Schema validation failed.");
  process.exit(1);
}

console.log(`\n✓ All ${files.length} schemas valid.`);

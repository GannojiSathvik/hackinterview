#!/usr/bin/env node
/**
 * One-off exporter: transpiles src/data/mockAptitudeQuestions.ts in memory
 * (no path-alias resolution needed — its only import is `import type {...}`,
 * which the TypeScript transpiler erases on its own) and evaluates it to
 * produce a plain-JSON snapshot for the backend seed script.
 *
 * Usage: node scripts/export-assessment-questions.mjs
 * Output: ../interview-backend/seed_data/aptitude_questions.json
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_PATH = path.join(
  __dirname,
  "..",
  "src",
  "data",
  "mockAptitudeQuestions.ts"
);
const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "..",
  "interview-backend",
  "seed_data",
  "aptitude_questions.json"
);

const source = readFileSync(SOURCE_PATH, "utf8");

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});

// Execute the transpiled CommonJS output in an isolated module sandbox to
// pull out the exported array without touching the real module graph.
const Module = require("node:module");
const sandbox = new Module(SOURCE_PATH, null);
sandbox.filename = SOURCE_PATH;
sandbox.paths = Module._nodeModulePaths(path.dirname(SOURCE_PATH));
sandbox._compile(outputText, SOURCE_PATH);

const { mockAptitudeQuestions } = sandbox.exports;

if (!Array.isArray(mockAptitudeQuestions) || mockAptitudeQuestions.length === 0) {
  throw new Error("mockAptitudeQuestions did not export a non-empty array");
}

mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(mockAptitudeQuestions, null, 2) + "\n");

console.log(
  `Exported ${mockAptitudeQuestions.length} questions -> ${path.relative(process.cwd(), OUTPUT_PATH)}`
);

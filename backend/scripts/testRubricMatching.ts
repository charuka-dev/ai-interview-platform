/**
 * scripts/testRubricMatching.ts
 *
 * Smoke-tests the rubricService fuzzy matcher against realistic, messy job
 * titles as a candidate would actually type them.
 *
 * Run from the backend/ directory:
 *   npx tsx scripts/testRubricMatching.ts
 */

// Point the service at the real rubrics directory (resolved from backend/)
import path from "path";
process.env.RUBRICS_DIR = path.resolve(process.cwd(), "src", "rubrics");

import { rubricService } from "../src/services/rubricService";

// ── Test titles ────────────────────────────────────────────────────────────────

const TEST_TITLES: string[] = [
  "Sr. Python/Django Engineer",
  "Software Engineer II - Backend",
  "Python Backend Dev",
  "React Frontend Developer",
  "Frontend Engineer (React/TypeScript)",
  "Full Stack Engineer (Node/React)",
  "MERN Stack Developer",
  "iOS Developer",
  "Android Developer (Kotlin)",
  "Flutter Developer",
  "Site Reliability Engineer",
  "DevOps / SRE",
  "AWS Cloud Engineer",
  "Cloud Solutions Architect",
  "Data Scientist - NLP",
  "Junior Data Analyst",
  "ML Engineer (Computer Vision)",
  "AI/ML Engineer",
  "QA Automation Engineer",
  "SDET",
  "Security Engineer",
  "Application Security Engineer",
  "DBA",
  "Database Administrator - PostgreSQL",
  "Random unrelated title like Marketing Manager",
];

// ── Run matching ───────────────────────────────────────────────────────────────

interface Result {
  input: string;
  matchedRubric: string;
  fellBackToGeneric: boolean;
}

const results: Result[] = TEST_TITLES.map((title) => {
  const { rubricName } = rubricService.getRubric(title);
  return {
    input: title,
    matchedRubric: rubricName,
    fellBackToGeneric: rubricName === "generic",
  };
});

// ── Pretty-print as a table ────────────────────────────────────────────────────

const COL_INPUT = 45;
const COL_RUBRIC = 30;
const COL_FALLBACK = 18;

const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);

const hr = `${"─".repeat(COL_INPUT + COL_RUBRIC + COL_FALLBACK + 8)}`;

console.log("\n🔍  Rubric Fuzzy-Match Test Results\n");
console.log(hr);
console.log(
  `│ ${pad("Input Job Title", COL_INPUT)} │ ${pad("Matched Rubric", COL_RUBRIC)} │ ${pad("Fallback?", COL_FALLBACK)} │`
);
console.log(hr);

for (const r of results) {
  const fallbackStr = r.fellBackToGeneric ? "⚠️  YES" : "✅  no";
  console.log(
    `│ ${pad(r.input, COL_INPUT)} │ ${pad(r.matchedRubric, COL_RUBRIC)} │ ${pad(fallbackStr, COL_FALLBACK)} │`
  );
}

console.log(hr);

// ── Summary stats ──────────────────────────────────────────────────────────────

const totalFallbacks = results.filter((r) => r.fellBackToGeneric).length;
const matched = results.length - totalFallbacks;

console.log(
  `\n📊  ${matched}/${results.length} titles matched a specific rubric  |  ${totalFallbacks} fell back to generic\n`
);

// ── Fallback breakdown ─────────────────────────────────────────────────────────

const fallbacks = results.filter((r) => r.fellBackToGeneric);
if (fallbacks.length > 0) {
  console.log("⚠️  Titles that fell back to generic (consider extending rubrics):");
  for (const r of fallbacks) {
    console.log(`   • "${r.input}"`);
  }
  console.log();
}

/**
 * Fails the build when README.md's documented detection rules drift away from
 * RULE_DEFINITIONS, which is the single source of truth for the rule engine.
 *
 * This exists because the README once advertised "12 heuristic detection
 * rules" against a code base that had 10, and was missing one rule from its
 * numbered list entirely. That is exactly the kind of mistake that is
 * invisible in review and embarrassing in a security-focused project, so it
 * is now a checked invariant instead of a manual chore.
 *
 * Checks:
 *   1. The Features bullet's stated rule count equals RULE_DEFINITIONS.length.
 *   2. The "Detection rules" numbered list has one entry per rule.
 *   3. Every RULE_DEFINITIONS[].name appears, verbatim, in that list.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { RULE_DEFINITIONS } from "../src/shared/settings.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = resolve(repoRoot, "README.md");
const readme = readFileSync(readmePath, "utf8");

const errors: string[] = [];

// 1. The "N heuristic detection rules" bullet in the Features section.
const countMatch = readme.match(/\*\*(\d+) heuristic detection rules\*\*/);
if (!countMatch) {
  errors.push(
    'README.md: could not find the Features bullet matching "**N heuristic detection rules**".'
  );
} else if (Number(countMatch[1]) !== RULE_DEFINITIONS.length) {
  errors.push(
    `README.md: Features bullet says ${countMatch[1]} heuristic detection rules, ` +
      `but RULE_DEFINITIONS has ${RULE_DEFINITIONS.length}.`
  );
}

// 2 & 3. The numbered list under the "Detection rules" heading. Each entry is
// expected to lead with the exact rule name in bold, so the list can be
// compared against the code without fuzzy matching.
const sectionMatch = readme.match(/\n### Detection rules\n([\s\S]*?)(?=\n## |\n### |$)/);
if (!sectionMatch) {
  errors.push('README.md: could not find the "### Detection rules" section.');
} else {
  const listed = [...sectionMatch[1].matchAll(/^\d+\.\s+\*\*(.+?)\*\*/gm)].map((m) => m[1].trim());

  if (listed.length !== RULE_DEFINITIONS.length) {
    errors.push(
      `README.md: the "Detection rules" list has ${listed.length} numbered entries, ` +
        `but RULE_DEFINITIONS has ${RULE_DEFINITIONS.length}.`
    );
  }

  const missing = RULE_DEFINITIONS.filter((rule) => !listed.includes(rule.name));
  for (const rule of missing) {
    errors.push(
      `README.md: rule "${rule.name}" (id: ${rule.id}) is defined in RULE_DEFINITIONS ` +
        'but is not listed in the "Detection rules" section. Add it as ' +
        `\`N. **${rule.name}** — ...\`.`
    );
  }

  const known = new Set(RULE_DEFINITIONS.map((rule) => rule.name));
  for (const name of listed) {
    if (!known.has(name)) {
      errors.push(
        `README.md: the "Detection rules" list contains "${name}", which is not the ` +
          "name of any rule in RULE_DEFINITIONS. Rule names must match the code verbatim."
      );
    }
  }
}

if (errors.length > 0) {
  console.error("check:docs failed — README.md is out of sync with RULE_DEFINITIONS:\n");
  for (const error of errors) console.error(`  - ${error}`);
  console.error("");
  process.exit(1);
}

console.log(
  `check:docs OK — README.md documents all ${RULE_DEFINITIONS.length} rules in RULE_DEFINITIONS.`
);

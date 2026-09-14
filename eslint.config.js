// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "scripts/**/*.ts"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      // The codebase already imports types with `import type` throughout;
      // this makes that a checked invariant rather than a convention.
      "@typescript-eslint/consistent-type-imports": "error",
      // A couple of narrow `any`-adjacent casts exist (e.g. the service
      // worker's message handling). Surface them, don't block CI on them.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Must stay last: turns off stylistic rules that would fight Prettier.
  eslintConfigPrettier
);

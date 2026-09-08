import js from "@eslint/js";

// Globals are listed rather than switched off. There is no Foundry or Pathfinder 2e type package
// here, so `no-undef` is the only thing between a typo in a global name and an error that shows up
// on a live sheet. Add to the list when the module starts using another one.
const foundryGlobals = {
  CONFIG: "readonly",
  Hooks: "readonly",
  game: "readonly",
  ui: "readonly",
  foundry: "readonly",
  Actor: "readonly",
  Item: "readonly",
  ChatMessage: "readonly",
  fromUuid: "readonly",
  libWrapper: "readonly"
};

const browserGlobals = {
  document: "readonly",
  window: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  MutationObserver: "readonly",
  WeakMap: "readonly",
  HTMLElement: "readonly",
  Event: "readonly"
};

const nodeGlobals = {
  process: "readonly",
  console: "readonly"
};

export default [
  {
    ignores: ["node_modules/**", "styles/**", "lang/**", "docs/**"]
  },
  js.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...foundryGlobals, ...browserGlobals }
    }
  },
  {
    files: ["tools/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals
    }
  },
  {
    rules: {
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-unsafe-optional-chaining": "error",
      "no-self-compare": "error",
      "no-unmodified-loop-condition": "warn"
    }
  }
];

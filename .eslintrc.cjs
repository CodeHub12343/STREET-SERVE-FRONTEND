/* eslint-env node */

/**
 * Layering boundaries (FOLDER_STRUCTURE.md §1) are enforced with import/no-restricted-paths:
 *   app → features → { components, lib, stores }   (strictly downward)
 *   - components/ may NOT import features/
 *   - lib/ may NOT import features/ or components/
 * Feature-to-feature imports must go through a public barrel (index.ts); this is reviewed,
 * not machine-enforced, to keep the ruleset legible.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: ['./tsconfig.json'], tsconfigRootDir: __dirname },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:storybook/recommended',
    'prettier',
  ],
  ignorePatterns: [
    '.next/',
    'node_modules/',
    'public/sw.js',
    'src/app/sw.ts',
    'next-env.d.ts',
    '*.cjs',
    '*.mjs',
  ],
  settings: {
    'import/resolver': { typescript: { project: './tsconfig.json' } },
  },
  rules: {
    /**
     * Never shadow a built-in global at module scope.
     *
     * A styled-component `const Promise = styled.p\`...\`` shadowed the global for its WHOLE
     * module — `const` hoists into the temporal dead zone, so it applied from line 1. Next's
     * compiled `dynamic()` loader then called `Promise.resolve(...)`, hit the React component, and
     * threw "Promise.resolve is not a function" 167 lines from the declaration that caused it.
     *
     * Cost hours to find, because the error names the built-in and points at the wrong line. A
     * component wanting to be called `Promise` should be `RefundPromise`; the rule makes that the
     * only option.
     */
    'no-shadow-restricted-names': 'error',
    /**
     * `no-shadow` with `builtinGlobals` was tried and dropped: it flags every `window` property
     * (a variable called `name` or `status` became an error), and it pushed a full lint past ten
     * minutes on this codebase. The denylist below is the part that actually earns its keep —
     * cheap, and it catches the exact mistake that cost hours.
     */
    'id-denylist': [
      'error',
      'Promise',
      'Array',
      'Object',
      'JSON',
      'Math',
      'Symbol',
      'Proxy',
      'Reflect',
      'WeakMap',
      'WeakSet',
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/components',
            from: './src/features',
            message: 'components/ is shared + dumb; it must not depend on features/.',
          },
          {
            target: './src/lib',
            from: './src/features',
            message: 'lib/ is cross-cutting plumbing; it must not depend on features/.',
          },
          {
            target: './src/lib',
            from: './src/components',
            message: 'lib/ must not depend on components/.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.stories.tsx', '**/*.test.ts', '**/*.test.tsx', '.storybook/**/*'],
      rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
  ],
};

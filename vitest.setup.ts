import '@testing-library/jest-dom/vitest';
// M10: axe-core accessibility matcher. vitest-axe@0.1.0 ships an empty `extend-expect`
// build, so register the matcher ourselves from its (working) matchers export.
import { expect } from 'vitest';
// vitest-axe's .d.ts types the matcher as type-only, but matchers.js exports it as a runtime
// value — reach it through a namespace import so both the type and value resolve.
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend({ toHaveNoViolations: (axeMatchers as { toHaveNoViolations: never }).toHaveNoViolations });

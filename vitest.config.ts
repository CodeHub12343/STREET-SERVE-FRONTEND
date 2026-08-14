import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: true,
    // jsdom setup is slow on this machine under parallel load; give async UI tests headroom.
    testTimeout: 20_000,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});

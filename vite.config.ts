import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true
  },
  test: {
    exclude: ['tests/e2e/**', 'realtime/**', 'node_modules/**', 'dist/**']
  }
});

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Test-only alias so route modules that import '@/...' resolve the same way Next resolves them. The production
// build and tsconfig are not changed by this file.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});

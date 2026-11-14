import { defineConfig } from 'vitest/config';

// Testes das regras de negócio puras (src/app/core/regras.ts)
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});

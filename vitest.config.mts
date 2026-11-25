import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.{test,spec}.ts'],
        typecheck: {
            tsconfig: './tsconfig.vitest.json',
        },
    },
});

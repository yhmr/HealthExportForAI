/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'react-native': './__tests__/mocks/react-native.js'
    }
  },
  test: {
    server: {
      deps: {
        inline: ['react-native-health-connect']
      }
    },
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});

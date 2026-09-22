import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': resolve(import.meta.dirname, 'node_modules/react-native-web'),
      'react-native-web$': resolve(import.meta.dirname, 'node_modules/react-native-web'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
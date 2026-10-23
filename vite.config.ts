/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // faker locales make a big bundle; fine for a local tool.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'node',
  },
});

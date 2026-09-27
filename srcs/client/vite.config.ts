import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/socket.io': {
        target: process.env.SERVER_URL ?? 'http://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    emptyOutDir: true,
    rolldownOptions: {
      output: { entryFileNames: 'bundle.js' },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5175, strictPort: true },
  preview: { port: 5175 },
  resolve: { dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'] },
});

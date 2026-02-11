import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const disableHotReload = process.env.DISABLE_HOT_RELOAD === 'true';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    watch: disableHotReload
      ? {
          // Ignore tous les fichiers pour désactiver le HMR
          ignored: ['**/*'],
        }
      : {
          // Réduction des répertoires surveillés
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        },
    hmr: !disableHotReload, // Désactive HMR si demandé
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
});
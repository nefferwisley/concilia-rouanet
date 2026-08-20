import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {assertPublicEnvSafe} from './src/config/publicEnv';

export function loadPublicEnvForVite(mode: string, cwd: string): Record<string, string | undefined> {
  const loadedEnv = loadEnv(mode, cwd, '');
  const effectiveEnv = {...process.env, ...loadedEnv};
  assertPublicEnvSafe(effectiveEnv);
  return effectiveEnv;
}

export default defineConfig(({mode}) => {
  loadPublicEnvForVite(mode, process.cwd());
  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

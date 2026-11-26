import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { projectBackups } from './scripts/project-backups.mjs';

export default defineConfig({
  plugins: [react(), projectBackups()],
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg'] },
  server: {
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/backups/saves/**'] },
    watch: { ignored: ['**/backups/saves/**'] },
  },
});

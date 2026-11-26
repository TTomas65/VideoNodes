import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { projectBackups } from './scripts/project-backups.mjs';
import { localFontCatalog } from './scripts/local-fonts.mjs';

export default defineConfig({
  plugins: [react(), projectBackups(), localFontCatalog()],
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg'] },
  server: {
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/backups/saves/**'] },
    watch: { ignored: ['**/backups/saves/**'] },
  },
});

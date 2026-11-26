import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const loopbackHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;
const loopbackClient = /^(?:::1|(?:::ffff:)?127\.0\.0\.1)$/i;
const options = { encoding: 'utf8', timeout: 8000, maxBuffer: 1_000_000, windowsHide: true };
const windowsFonts = [
  "$ErrorActionPreference = 'Stop'",
  '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)',
  'Add-Type -AssemblyName PresentationCore',
  '[Windows.Media.Fonts]::SystemFontFamilies | ForEach-Object { $_.Source }',
].join('\n');

async function installedFonts() {
  if (process.platform === 'win32') {
    const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsFonts], options);
    return stdout.split(/\r?\n/);
  }
  if (process.platform === 'linux') {
    const { stdout } = await run('fc-list', ['--format', '%{family}\n'], options);
    return stdout.split(/[\n,]/);
  }
  return null;
}

export function localFontCatalog() {
  let pending;
  const configure = (server) => {
    server.middlewares.use('/api/local-fonts', async (request, response) => {
      const reply = (status, body) => {
        response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(body));
      };
      const { host, origin, 'sec-fetch-site': site } = request.headers;
      if (!loopbackHost.test(host ?? '') || !loopbackClient.test(request.socket.remoteAddress ?? '')
        || origin && origin !== `http://${host}` && origin !== `https://${host}`
        || site && site !== 'same-origin' && site !== 'none') {
        reply(403, {});
        return;
      }
      if (request.method !== 'GET') {
        reply(405, {});
        return;
      }
      pending ??= installedFonts().finally(() => { pending = undefined; });
      const names = await pending.catch(() => null);
      if (!names) { reply(501, {}); return; }
      const families = [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      reply(200, { families });
    });
  };
  return { name: 'videonodes-local-fonts', configureServer: configure, configurePreviewServer: configure };
}

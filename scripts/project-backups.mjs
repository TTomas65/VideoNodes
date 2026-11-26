import { mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultDirectory = fileURLToPath(new URL('../backups/saves/', import.meta.url));
const backupId = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const idPattern = new RegExp(`^${backupId}$`);
const assetPath = new RegExp(`^/(${backupId})/(project\\.json|preview\\.jpg)$`);
const limit = 44_000_000;
const loopback = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

function send(response, status, data, contentType = 'application/json; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(Buffer.isBuffer(data) ? data : JSON.stringify(data));
}

async function listBackups(directory) {
  const directories = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return [];
  });
  const entries = await Promise.all(directories.filter((entry) => entry.isDirectory() && idPattern.test(entry.name)).map(async ({ name }) => {
    const raw = await readFile(join(directory, name, 'info.json'), 'utf8').catch((error) => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (!raw) return null;
    try {
      const { title, at } = JSON.parse(raw);
      return typeof title === 'string' && Number.isFinite(at) ? { id: name, title, at } : null;
    } catch {
      return null;
    }
  }));
  return entries.filter(Boolean).sort((a, b) => b.at - a.at);
}

async function readBody(request) {
  if (Number(request.headers['content-length']) > limit) return null;
  const parts = [];
  let length = 0;
  for await (const part of request.iterator({ destroyOnReturn: false })) {
    length += part.length;
    if (length > limit) return null;
    parts.push(part);
  }
  return Buffer.concat(parts).toString('utf8');
}

async function createBackup(request, response, directory) {
  const expectedOrigin = `http://${request.headers.host}`;
  if (request.headers.origin !== expectedOrigin || !request.headers['content-type']?.startsWith('application/json')) {
    send(response, 403, { error: 'A mentés a helyi szerkesztőből érhető el.' });
    return;
  }
  const body = await readBody(request);
  if (body === null) { send(response, 413, { error: 'A mentés túl nagy.' }); return; }
  let value;
  try { value = JSON.parse(body); } catch { send(response, 400, { error: 'Érvénytelen mentés.' }); return; }
  const { id, project, preview } = value ?? {};
  const image = typeof preview === 'string' && preview.length <= 5_000_000
    ? /^data:image\/jpeg;base64,([\w+/=]+)$/.exec(preview)?.[1] : null;
  if (typeof id !== 'string' || !idPattern.test(id) || project?.version !== 1
    || !Array.isArray(project.nodes) || project.nodes.length > 100 || !Array.isArray(project.edges)
    || typeof project.name !== 'string' || !project.name.trim() || !image) {
    send(response, 400, { error: 'A projekt vagy a képernyőkép érvénytelen.' });
    return;
  }
  const jpg = Buffer.from(image, 'base64');
  if (jpg[0] !== 0xff || jpg[1] !== 0xd8 || jpg.at(-2) !== 0xff || jpg.at(-1) !== 0xd9) {
    send(response, 400, { error: 'A képernyőkép érvénytelen.' });
    return;
  }
  await mkdir(directory, { recursive: true });
  const target = join(directory, id);
  const pending = await mkdtemp(join(directory, '.pending-'));
  const info = { id, title: project.name.trim().slice(0, 64), at: Date.now() };
  try {
    await writeFile(join(pending, 'project.json'), JSON.stringify(project));
    await writeFile(join(pending, 'preview.jpg'), jpg);
    await writeFile(join(pending, 'info.json'), JSON.stringify(info));
    await rename(pending, target);
  } finally {
    // Only remove files in the temporary directory created for this write.
    await Promise.allSettled(['project.json', 'preview.jpg', 'info.json'].map((file) => rm(join(pending, file), { force: true })));
    await rmdir(pending).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
  send(response, 201, info);
}

async function handle(request, response, directory) {
  if (!loopback.test(request.headers.host ?? '')
    || (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`)) {
    send(response, 403, { error: 'A backups mappa helyben érhető el.' });
    return;
  }
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/' && request.method === 'GET') {
    send(response, 200, { localBackups: true, entries: await listBackups(directory) });
    return;
  }
  if (pathname === '/' && request.method === 'POST') {
    await createBackup(request, response, directory);
    return;
  }
  const asset = request.method === 'GET' && assetPath.exec(pathname);
  if (asset) {
    const [, id, file] = asset;
    const content = await readFile(join(directory, id, file)).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (content) {
      send(response, 200, content, file.endsWith('.jpg') ? 'image/jpeg' : 'application/json; charset=utf-8');
      return;
    }
  }
  send(response, 404, { error: 'Ez a mentés nem található.' });
}

export function projectBackups(directory = defaultDirectory) {
  const configure = (server) => {
    server.middlewares.use('/api/backups', (request, response) => {
      handle(request, response, directory).catch(() => {
        if (!response.headersSent) send(response, 500, { error: 'A backups mappa olvasása vagy írása sikertelen.' });
      });
    });
  };
  return { name: 'videonodes-project-backups', configureServer: configure, configurePreviewServer: configure };
}

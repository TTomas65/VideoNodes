import { access, mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultDirectory = fileURLToPath(new URL('../backups/saves/', import.meta.url));
const presetDirectory = fileURLToPath(new URL('../presets/text/', import.meta.url));
const backupId = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const idPattern = new RegExp(`^${backupId}$`);
const assetPath = new RegExp(`^/(${backupId})/(project\\.json|preset\\.json|preview\\.jpg)$`);
const visibilityPath = new RegExp(`^/(${backupId})/visibility$`);
const loopback = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

function send(response, status, data, contentType = 'application/json; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(Buffer.isBuffer(data) ? data : JSON.stringify(data));
}

async function listBackups(directory, isPreset) {
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
      const { title, at, kind } = JSON.parse(raw);
      if (typeof title !== 'string' || !Number.isFinite(at)) return null;
      if (!isPreset) return { id: name, title, at };
      if (kind !== 'style' && kind !== 'card') return null;
      const hidden = await access(join(directory, name, '.hidden')).then(() => true, () => false);
      return { id: name, title, at, kind, hidden };
    } catch {
      return null;
    }
  }));
  return entries.filter(Boolean).sort((a, b) => b.at - a.at);
}

async function readBody(request, limit) {
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

function acceptsWrite(request, response) {
  const expectedOrigin = `http://${request.headers.host}`;
  if (request.headers.origin !== expectedOrigin || !request.headers['content-type']?.startsWith('application/json')) {
    send(response, 403, { error: 'A mentés a helyi szerkesztőből érhető el.' });
    return false;
  }
  return true;
}

async function createBackup(request, response, directory, isPreset) {
  if (!acceptsWrite(request, response)) return;
  const body = await readBody(request, isPreset ? 8_000_000 : 44_000_000);
  if (body === null) { send(response, 413, { error: 'A mentés túl nagy.' }); return; }
  let value;
  try { value = JSON.parse(body); } catch { send(response, 400, { error: 'Érvénytelen mentés.' }); return; }
  const { id, project, preset, preview } = value ?? {};
  const image = typeof preview === 'string' && preview.length <= 5_000_000
    ? /^data:image\/jpeg;base64,([\w+/=]+)$/.exec(preview)?.[1] : null;
  const data = isPreset ? preset : project;
  const validData = isPreset
    ? (preset?.kind === 'style' || preset?.kind === 'card') && typeof preset.caption?.text === 'string' && preset.caption.text.length <= 20000
    : Array.isArray(project?.nodes) && project.nodes.length <= 100 && Array.isArray(project.edges);
  if (typeof id !== 'string' || !idPattern.test(id) || data?.version !== 1 || !validData
    || typeof data.name !== 'string' || !data.name.trim() || !image) {
    send(response, 400, { error: 'A mentés vagy az előnézeti kép érvénytelen.' });
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
  const filename = isPreset ? 'preset.json' : 'project.json';
  const info = { id, title: data.name.trim().slice(0, 64), at: Date.now(), ...(isPreset && { kind: data.kind, hidden: false }) };
  try {
    await writeFile(join(pending, filename), JSON.stringify(data));
    await writeFile(join(pending, 'preview.jpg'), jpg);
    await writeFile(join(pending, 'info.json'), JSON.stringify(info));
    await rename(pending, target);
  } finally {
    // Only remove files in the temporary directory created for this write.
    await Promise.allSettled([filename, 'preview.jpg', 'info.json'].map((file) => rm(join(pending, file), { force: true })));
    await rmdir(pending).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
  send(response, 201, info);
}

async function changeVisibility(request, response, directory, id) {
  if (!acceptsWrite(request, response)) return;
  let value;
  try { value = JSON.parse(await readBody(request, 1000)); } catch { /* Validate below. */ }
  if (typeof value?.hidden !== 'boolean') { send(response, 400, { error: 'Érvénytelen láthatóság.' }); return; }
  const folder = join(directory, id);
  const exists = await access(join(folder, 'info.json')).then(() => true, () => false);
  if (!exists) { send(response, 404, { error: 'Ez a sablon nem található.' }); return; }
  const marker = join(folder, '.hidden');
  if (value.hidden) await writeFile(marker, '');
  else await rm(marker, { force: true });
  send(response, 200, { hidden: value.hidden });
}

async function handle(request, response, directory, isPreset) {
  if (!loopback.test(request.headers.host ?? '')
    || (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`)
    || (isPreset && !/^(?:::1|(?:::ffff:)?127\.0\.0\.1)$/i.test(request.socket.remoteAddress ?? ''))) {
    send(response, 403, { error: 'A mentési mappa helyben érhető el.' });
    return;
  }
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/' && request.method === 'GET') {
    send(response, 200, { [isPreset ? 'localPresets' : 'localBackups']: true, entries: await listBackups(directory, isPreset) });
    return;
  }
  if (pathname === '/' && request.method === 'POST') {
    await createBackup(request, response, directory, isPreset);
    return;
  }
  const visibility = isPreset && request.method === 'PATCH' && visibilityPath.exec(pathname);
  if (visibility) {
    await changeVisibility(request, response, directory, visibility[1]);
    return;
  }
  const asset = request.method === 'GET' && assetPath.exec(pathname);
  if (asset && (asset[2] === 'preview.jpg' || asset[2] === (isPreset ? 'preset.json' : 'project.json'))) {
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

function diskGallery(name, route, directory, isPreset) {
  const configure = (server) => {
    server.middlewares.use(route, (request, response) => {
      handle(request, response, directory, isPreset).catch(() => {
        if (!response.headersSent) send(response, 500, { error: 'A mentési mappa olvasása vagy írása sikertelen.' });
      });
    });
  };
  return { name, configureServer: configure, configurePreviewServer: configure };
}

export const projectBackups = (directory = defaultDirectory) => diskGallery('videonodes-project-backups', '/api/backups', directory, false);
export const textPresets = (directory = presetDirectory) => diskGallery('videonodes-text-presets', '/api/text-presets', directory, true);

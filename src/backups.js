const endpoint = `${import.meta.env.BASE_URL}api/backups`;
const isLoopback = /^(?:localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
let diskAvailable;

async function readDiskJson(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error ?? 'A backups mappa nem érhető el.');
  return data;
}

export async function listDiskBackups() {
  if (!isLoopback || diskAvailable === false) return null;
  const response = await fetch(endpoint);
  if ([404, 405].includes(response.status) || (response.ok && !response.headers.get('content-type')?.includes('application/json'))) {
    diskAvailable = false;
    return null;
  }
  const data = await readDiskJson(response);
  diskAvailable = data.localBackups === true;
  if (!diskAvailable) return null;
  return data.entries.map((entry) => ({
    ...entry, source: 'disk', preview: `${endpoint}/${entry.id}/preview.jpg`,
  }));
}

export async function createDiskBackup(id, project, preview) {
  if (diskAvailable === undefined) await listDiskBackups();
  if (!diskAvailable) return false;
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, project, preview }),
  });
  const saved = await readDiskJson(response);
  if (saved.id !== id) throw new Error('A backups mappa nem igazolta a mentést.');
  return true;
}

export async function readDiskBackup(id) {
  return readDiskJson(await fetch(`${endpoint}/${id}/project.json`));
}

function preserveSvgPaint(node) {
  // The capture library clones an SVG subtree without copying its descendants' computed styles.
  const graphics = node.querySelectorAll('.react-flow__edges svg path, .react-flow__edges svg circle, .react-flow__background circle');
  const styles = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'opacity', 'filter'];
  const restore = Array.from(graphics, (element) => {
    const original = element.getAttribute('style');
    const computed = getComputedStyle(element);
    for (const property of styles) element.style.setProperty(property, computed.getPropertyValue(property));
    return () => {
      if (original === null) element.removeAttribute('style');
      else element.setAttribute('style', original);
    };
  });
  return () => restore.forEach((reset) => reset());
}

export async function captureWorkspace(node) {
  const { toJpeg } = await import('html-to-image');
  const { width, height } = node.getBoundingClientRect();
  const scale = Math.min(1, 1280 / Math.max(width, height));
  const restore = preserveSvgPaint(node);
  try {
    const preview = await toJpeg(node, {
      canvasWidth: Math.max(1, Math.round(width * scale)),
      canvasHeight: Math.max(1, Math.round(height * scale)),
      quality: 0.88,
      pixelRatio: 1,
      preferredFontFormat: 'woff2',
      backgroundColor: '#30343a',
      filter: (element) => !element.classList?.contains('toast'),
    });
    if (!preview.startsWith('data:image/jpeg;base64,')) throw new Error('A vászon képernyőképét nem sikerült elkészíteni.');
    return preview;
  } finally {
    restore();
  }
}

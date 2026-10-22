/* A small recovery shell, not an offline mirror of the game's source art library. */
const CACHE_PREFIX = 'chronicles-of-fortune-';
const SHELL_CACHE = `${CACHE_PREFIX}shell-v2`;
const BUILD_CACHE = `${CACHE_PREFIX}build-v2`;
const IMAGE_CACHE = `${CACHE_PREFIX}images-v2`;
const CURRENT_CACHES = new Set([SHELL_CACHE, BUILD_CACHE, IMAGE_CACHE]);
const OPTIONAL_SHELL = [
  '/manifest.json',
  '/assets/generated/world-loading-v1.webp',
  '/assets/generated/fortune-ui-frame-v1.webp'
];
const IMAGE_LIMIT = 96;
const BUILD_LIMIT = 32;
const MAX_IMAGE_BYTES = 512 * 1024;
const MAX_SHELL_IMAGE_BYTES = 1024 * 1024;
const MAX_BUILD_BYTES = 4 * 1024 * 1024;
let developmentMode = false;

const ownedCache = name => name.startsWith(CACHE_PREFIX) || name === 'fortuna-v1';
const isShellPath = path => path === '/' || path === '/index.html';

function cacheableResponse(response) {
  return response && response.status === 200 && ['basic', 'default'].includes(response.type)
    && !response.redirected
    && !/\b(?:private|no-store|no-cache)\b/i.test(response.headers.get('cache-control') || '')
    && response.headers.get('vary') !== '*';
}

async function cacheResponse(cacheName, key, response, kind, limit) {
  if (!response) return;
  const contentType = response.headers.get('content-type') || '';
  if (kind === 'html') {
    if (response.status !== 200 || !contentType.includes('text/html')) return;
    const html = await response.clone().text();
    developmentMode = /\/@vite\/client|\/@fs\/|\/src\/main\.ts|\/node_modules\/\.vite\//.test(html);
    if (developmentMode || html.length > MAX_BUILD_BYTES) return;
  }
  if (!cacheableResponse(response)) return;
  if (kind !== 'html') {
    if ((kind === 'image' || kind === 'shell-image') && !contentType.startsWith('image/')) return;
    if (kind === 'build' && !/javascript|text\/css/.test(contentType)) return;
    if (kind === 'manifest' && !/json/.test(contentType)) return;
    const maxBytes = kind === 'build' ? MAX_BUILD_BYTES : kind === 'shell-image' ? MAX_SHELL_IMAGE_BYTES : MAX_IMAGE_BYTES;
    if (Number(response.headers.get('content-length')) > maxBytes) return;
    if ((await response.clone().arrayBuffer()).byteLength > maxBytes) return;
  }
  try {
    const cache = await caches.open(cacheName);
    await cache.put(key, response.clone());
    if (limit) {
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map(oldest => cache.delete(oldest)));
    }
  } catch { /* Cache quota or browser policy must not break a successful network request. */ }
}

async function installShell() {
  let buildPaths = [];
  try {
    const response = await fetch('/index.html', { cache: 'reload' });
    await cacheResponse(SHELL_CACHE, '/index.html', response, 'html');
    if (developmentMode) return;
    if (cacheableResponse(response) && (response.headers.get('content-type') || '').includes('text/html')) {
      const html = await response.clone().text();
      buildPaths = [...new Set([...html.matchAll(/(?:src|href)=["'](\/assets\/[^/"']+-[a-zA-Z0-9_-]{8,}\.(?:js|css))["']/g)].map(match => match[1]))].slice(0, BUILD_LIMIT);
    }
  } catch { /* An offline update can still use the previous installed shell. */ }
  await Promise.allSettled([...OPTIONAL_SHELL.map(async path => {
    const response = await fetch(path, { cache: 'reload' });
    await cacheResponse(SHELL_CACHE, path, response, path.endsWith('.json') ? 'manifest' : 'shell-image');
  }), ...buildPaths.map(async path => {
    const response = await fetch(path, { cache: 'reload' });
    await cacheResponse(BUILD_CACHE, path, response, 'build', BUILD_LIMIT);
  })]);
}

self.addEventListener('install', event => {
  event.waitUntil(installShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const shell = await caches.open(SHELL_CACHE);
      const hasNewShell = !!(await shell.match('/index.html') || await shell.match('/'));
      // Keep the old shell if this update installed offline or against a Vite dev server.
      if (hasNewShell) {
        const names = await caches.keys();
        await Promise.all(names.filter(name => ownedCache(name) && !CURRENT_CACHES.has(name)).map(name => caches.delete(name)));
      }
    } catch { /* Storage policy cannot prevent the new worker from taking control. */ }
    await self.clients.claim();
  })());
});

async function cachedShell() {
  try {
    const names = await caches.keys();
    const candidates = [SHELL_CACHE, ...names.filter(name => ownedCache(name) && name !== SHELL_CACHE && !name.endsWith('images-v2') && !name.endsWith('build-v2'))];
    for (const name of candidates) {
      const cache = await caches.open(name);
      const response = await cache.match('/index.html') || await cache.match('/');
      if (cacheableResponse(response) && (response.headers.get('content-type') || '').includes('text/html')) return response;
    }
  } catch { /* Cache storage can also be disabled while the browser is offline. */ }
  return new Response('ไม่สามารถเปิดเกมได้ขณะออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง', {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function cachedAsset(cacheName, request) {
  try {
    const response = await (await caches.open(cacheName)).match(request);
    if (response) return response;
    if (OPTIONAL_SHELL.includes(new URL(request.url).pathname)) return (await caches.open(SHELL_CACHE)).match(request);
  } catch { /* A disabled cache has no offline copy. */ }
}

async function networkFirst(request, cacheName, kind, limit) {
  try {
    const response = await fetch(request);
    if (response.status >= 500) {
      const cached = kind === 'html' ? await cachedShell() : await cachedAsset(cacheName, request);
      if (cached && cached.status === 200) return cached;
    }
    // Never allow cache failures to turn a successful fetch into an offline error.
    try { await cacheResponse(cacheName, kind === 'html' ? '/index.html' : request, response, kind, limit); }
    catch { /* Network response is still usable. */ }
    return response;
  } catch {
    if (kind === 'html') return cachedShell();
    const cached = await cachedAsset(cacheName, request);
    return cached || new Response('', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

function runtimeImage(path) {
  if (/(?:atlas|sheet|source|raw|showcase|preview|reference)/i.test(path)) return false;
  return /^\/assets\/(?:generated|map-completion-v1|foliage|terrain|buildings|sky|companions)\/[^/]+\.(?:png|webp)$/i.test(path)
    || /^\/assets\/(?:monsters\/)?[^/]+\/[^/]+\/rotations\/[^/]+\.png$/i.test(path);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.cache === 'no-store' || request.headers.has('authorization')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search || request.headers.has('range')) return;
  if (/^\/(?:src|node_modules|@vite|@id|@fs|__vite)(?:\/|$)/.test(url.pathname)) return;
  let work;
  if (request.mode === 'navigate' && isShellPath(url.pathname)) work = networkFirst(request, SHELL_CACHE, 'html');
  else if (developmentMode) return;
  else if (/^\/assets\/[^/]+-[a-zA-Z0-9_-]{8,}\.(?:js|css)$/.test(url.pathname)) work = networkFirst(request, BUILD_CACHE, 'build', BUILD_LIMIT);
  else if (runtimeImage(url.pathname)) work = networkFirst(request, IMAGE_CACHE, 'image', IMAGE_LIMIT);
  else if (url.pathname === '/manifest.json') work = networkFirst(request, SHELL_CACHE, 'manifest');
  else return;
  event.respondWith(work);
  event.waitUntil(work.then(() => undefined));
});

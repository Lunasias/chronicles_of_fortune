import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SOURCE = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const ORIGIN = 'https://fortuna.example';
const SHELL = 'chronicles-of-fortune-shell-v2';
const IMAGES = 'chronicles-of-fortune-images-v2';
const BUILD = 'chronicles-of-fortune-build-v2';
const html = text => new Response(`<html><body>${text}</body></html>`, {headers: {'Content-Type': 'text/html'}});
const image = text => new Response(text, {headers: {'Content-Type': 'image/png'}});

function worker(network) {
  const stores = new Map(), listeners = new Map(), fetched = [];
  let skipped = 0, claimed = 0, rejectWrites = false;
  const key = request => new URL(typeof request === 'string' ? request : request.url, ORIGIN).href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(request) {return store.get(key(request))?.clone();},
        async put(request, response) {if (rejectWrites) throw new Error('QuotaExceededError');store.set(key(request), response.clone());},
        async keys() {return [...store.keys()].map(url => new Request(url));},
        async delete(request) {return store.delete(key(request));}
      };
    },
    async keys() {return [...stores.keys()];},
    async delete(name) {return stores.delete(name);}
  };
  let route = network ?? (request => {
    const path = new URL(typeof request === 'string' ? request : request.url, ORIGIN).pathname;
    if (path === '/' || path === '/index.html') return html('production kingdom');
    if (path === '/manifest.json') return new Response('{}', {headers: {'Content-Type': 'application/json'}});
    if (/\.(?:js|css)$/.test(path)) return new Response('production bundle', {headers: {'Content-Type': path.endsWith('.css') ? 'text/css' : 'application/javascript'}});
    return image('painted sprite');
  });
  vm.runInNewContext(SOURCE, {
    URL, Request, Response, Headers, caches,
    fetch: async (request, options) => {fetched.push(key(request));return route(request, options);},
    self: {
      location: {origin: ORIGIN}, addEventListener(type, handler) {listeners.set(type, handler);},
      async skipWaiting() {skipped++;}, clients: {async claim() {claimed++;}}
    }
  });
  return {
    caches, stores, fetched,
    get skipped() {return skipped;}, get claimed() {return claimed;},
    setNetwork(next) {route = next;}, rejectWrites() {rejectWrites = true;},
    async lifecycle(type) {
      const waiting = [];listeners.get(type)({waitUntil(promise) {waiting.push(promise);}});
      await Promise.all(waiting);
    },
    async request(path, options = {}) {
      const waiting = [];let response;
      listeners.get('fetch')({
        request: {url: new URL(path, ORIGIN).href, method: 'GET', cache: 'default', mode: 'same-origin', headers: new Headers(), ...options},
        respondWith(promise) {response = promise;}, waitUntil(promise) {waiting.push(promise);}
      });
      const result = response ? await response : null;
      await Promise.all(waiting);return result;
    }
  };
}

test('install tolerates missing optional artwork and never requests the missing favicon', async () => {
  const sw = worker(request => {
    const path = new URL(request, ORIGIN).pathname;
    if (path === '/index.html') return html('ready');
    if (path.endsWith('.json')) return new Response('{}', {headers: {'Content-Type': 'application/json'}});
    if (path.includes('world-loading')) return new Response('', {status: 404});
    throw new Error('optional image unavailable');
  });
  await sw.lifecycle('install');
  assert.equal(sw.skipped, 1);assert.ok(await (await sw.caches.open(SHELL)).match('/index.html'));
  assert.ok(await (await sw.caches.open(SHELL)).match('/manifest.json'));
  assert.equal(sw.fetched.some(url => url.endsWith('/favicon.ico')), false);
  assert.equal(await (await sw.caches.open(SHELL)).match('/assets/generated/world-loading-v1.webp'), undefined);
});

test('an offline update retains the previous shell and leaves other applications caches alone', async () => {
  const sw = worker(() => {throw new Error('offline');});
  await (await sw.caches.open('fortuna-v1')).put('/', html('previous installed kingdom'));
  await (await sw.caches.open('calendar-cache')).put('/', html('another application'));
  await sw.lifecycle('install');await sw.lifecycle('activate');
  assert.equal(sw.skipped, 1);assert.equal(sw.claimed, 1);
  assert.ok((await sw.caches.keys()).includes('fortuna-v1'));assert.ok((await sw.caches.keys()).includes('calendar-cache'));
  const response = await sw.request('/', {mode: 'navigate'});
  assert.equal(response.status, 200);assert.match(await response.text(), /previous installed kingdom/);
});

test('install keeps the compiled entry files and loading artwork usable on a later offline boot', async () => {
  const sw = worker(request => {
    const path = new URL(request, ORIGIN).pathname;
    if (path === '/index.html') return html('<script src="/assets/game-a1b2c3d4.js"></script><link href="/assets/game-e5f6g7h8.css" rel="stylesheet">');
    if (path.endsWith('.js')) return new Response('bootGame()', {headers: {'Content-Type': 'application/javascript'}});
    if (path.endsWith('.css')) return new Response('body { color: ivory; }', {headers: {'Content-Type': 'text/css'}});
    if (path.endsWith('.webp')) return image(new Uint8Array(700 * 1024));
    return new Response('{}', {headers: {'Content-Type': 'application/json'}});
  });
  await sw.lifecycle('install');
  sw.setNetwork(() => {throw new Error('offline');});
  assert.equal((await sw.request('/', {mode: 'navigate'})).status, 200);
  assert.equal(await (await sw.request('/assets/game-a1b2c3d4.js')).text(), 'bootGame()');
  assert.equal((await sw.request('/assets/game-e5f6g7h8.css')).status, 200);
  assert.equal((await sw.request('/assets/generated/world-loading-v1.webp')).status, 200);
  assert.equal((await sw.request('/assets/generated/fortune-ui-frame-v1.webp')).status, 200);
});

test('activation only removes obsolete caches belonging to this game after a successful shell install', async () => {
  const sw = worker();
  for (const name of ['fortuna-v1', 'chronicles-of-fortune-shell-v1', 'calendar-cache', 'fortuna-another-game', IMAGES, BUILD]) await sw.caches.open(name);
  await sw.lifecycle('install');await sw.lifecycle('activate');
  const names = await sw.caches.keys();
  assert.equal(names.includes('fortuna-v1'), false);assert.equal(names.includes('chronicles-of-fortune-shell-v1'), false);
  assert.ok(names.includes('calendar-cache'));assert.ok(names.includes('fortuna-another-game'));assert.ok(names.includes(IMAGES));assert.ok(names.includes(BUILD));
});

test('navigation uses fresh HTML and falls back offline without caching error or private responses', async () => {
  const sw = worker();await sw.lifecycle('install');
  sw.setNetwork(() => html('new kingdom'));
  assert.match(await (await sw.request('/', {mode: 'navigate'})).text(), /new kingdom/);
  sw.setNetwork(() => new Response('private profile', {headers: {'Content-Type': 'text/html', 'Cache-Control': 'private'}}));
  assert.equal(await (await sw.request('/', {mode: 'navigate'})).text(), 'private profile');
  sw.setNetwork(() => new Response('not found', {status: 404}));
  assert.equal((await sw.request('/', {mode: 'navigate'})).status, 404);
  sw.setNetwork(() => new Response('server unavailable', {status: 503}));
  assert.match(await (await sw.request('/', {mode: 'navigate'})).text(), /new kingdom/);
  sw.setNetwork(() => {throw new Error('offline');});
  assert.match(await (await sw.request('/index.html', {mode: 'navigate'})).text(), /new kingdom/);
});

test('only small public runtime sprites are cached and the image cache never exceeds 96 entries', async () => {
  const sw = worker();
  for (let index = 0; index < 110; index++) assert.equal((await sw.request(`/assets/foliage/tree-${index}.png`)).status, 200);
  const cache = await sw.caches.open(IMAGES), keys = await cache.keys();
  assert.equal(keys.length, 96);assert.equal(await cache.match('/assets/foliage/tree-0.png'), undefined);
  assert.ok(await cache.match('/assets/foliage/tree-109.png'));
  sw.setNetwork(() => new Response('bad image', {status: 404}));
  assert.equal((await sw.request('/assets/foliage/missing.png')).status, 404);assert.equal(await cache.match('/assets/foliage/missing.png'), undefined);
  sw.setNetwork(() => new Response('private image', {headers: {'Content-Type': 'image/png', 'Cache-Control': 'no-store'}}));
  await sw.request('/assets/foliage/private.png');assert.equal(await cache.match('/assets/foliage/private.png'), undefined);
  sw.setNetwork(() => image(new Uint8Array(512 * 1024 + 1)));
  await sw.request('/assets/foliage/huge.png');assert.equal(await cache.match('/assets/foliage/huge.png'), undefined);
  sw.setNetwork(() => {throw new Error('offline');});
  assert.equal((await sw.request('/assets/foliage/tree-109.png')).status, 200);
  assert.equal((await sw.request('/assets/foliage/tree-0.png')).status, 503);
});

test('external, authenticated, source-sheet and Vite requests bypass the worker', async () => {
  const sw = worker();
  for (const path of ['https://private.example/image.png', '/api/profile', '/@vite/client', '/src/main.ts', '/node_modules/.vite/deps/three.js', '/assets/art-v2/warrior-motion-atlas.png', '/assets/presentation-v1/abilities.png', '/assets/generated/source-sheet.png', '/?token=secret']) {
    assert.equal(await sw.request(path, {mode: path.startsWith('/?') ? 'navigate' : 'same-origin'}), null, path);
  }
  assert.equal(await sw.request('/assets/foliage/tree.png', {headers: new Headers({Authorization: 'Bearer private'})}), null);
  assert.equal(await sw.request('/assets/foliage/tree.png', {headers: new Headers({Range: 'bytes=0-20'})}), null);
  assert.equal(await sw.request('/assets/foliage/tree.png', {cache: 'no-store'}), null);
  assert.equal(sw.fetched.length, 0);
});

test('a Vite development shell is never installed and does not cache its modules or artwork', async () => {
  const sw = worker(() => new Response('<script type="module" src="/@vite/client"></script><script src="/src/main.ts"></script>', {headers: {'Content-Type': 'text/html', 'Cache-Control': 'no-cache'}}));
  await sw.lifecycle('install');
  assert.equal(sw.fetched.length, 1);assert.equal(await (await sw.caches.open(SHELL)).match('/index.html'), undefined);
  assert.equal(await sw.request('/assets/foliage/tree.png'), null);
  assert.equal(await sw.request('/assets/game-a1b2c3d4.js'), null);
});

test('production bundles have a separate bounded cache and survive a later network failure', async () => {
  const sw = worker();
  for (let index = 0; index < 40; index++) await sw.request(`/assets/chunk${index}-a1b2c3d4.js`);
  const cache = await sw.caches.open(BUILD);assert.equal((await cache.keys()).length, 32);
  sw.setNetwork(() => {throw new Error('offline');});
  assert.equal((await sw.request('/assets/chunk39-a1b2c3d4.js')).status, 200);
  assert.equal((await sw.request('/assets/chunk0-a1b2c3d4.js')).status, 503);
});

test('storage quota failures preserve usable network responses and a first offline visit returns a clear 503', async () => {
  const sw = worker();sw.rejectWrites();
  assert.equal((await sw.request('/assets/foliage/tree.png')).status, 200);
  sw.setNetwork(() => {throw new Error('offline');});
  const response = await sw.request('/', {mode: 'navigate'});
  assert.equal(response.status, 503);assert.match(await response.text(), /ออฟไลน์/);
});

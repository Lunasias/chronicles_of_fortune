import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v) };
globalThis.document = undefined;
globalThis.window = { addEventListener() {}, dispatchEvent() {} };
const { AudioSynthesizer, parseAudioSettings, DEFAULT_AUDIO_SETTINGS, biomeAudio, AUDIO_SETTINGS_KEY } = await import('../.test-build/engine/AudioSynthesizer.js');

test('audio preferences survive damaged storage and reject invalid types', () => {
  assert.deepEqual(parseAudioSettings('{'), DEFAULT_AUDIO_SETTINGS);
  assert.deepEqual(parseAudioSettings('null'), DEFAULT_AUDIO_SETTINGS);
  const settings = parseAudioSettings('{"master":7,"music":-2,"sfx":"0","enabled":"false","ambience":0}');
  assert.equal(settings.master, 1); assert.equal(settings.music, 0);
  assert.equal(settings.sfx, DEFAULT_AUDIO_SETTINGS.sfx); assert.equal(settings.enabled, true);
  assert.equal(settings.ambience, 0);
});

test('every generated sound has a valid stereo PCM payload, recorded hash and unclipped signal', () => {
  const manifest = JSON.parse(fs.readFileSync('public/audio/v2/manifest.json', 'utf8'));
  assert.equal(manifest.assets.filter(a => a.kind === 'music').length, 10);
  assert.equal(manifest.assets.filter(a => a.kind === 'ambience').length, 6);
  assert.equal(manifest.assets.filter(a => a.kind === 'sfx').length, 47);
  const ids = new Set(manifest.assets.map(a => a.id));
  const mixerSource = fs.readFileSync('src/engine/AudioSynthesizer.ts', 'utf8');
  for (const [,name] of mixerSource.matchAll(/this\.effect\('([^']+)'/g)) assert.ok(ids.has(`sfx-${name}`), `missing effect ${name}`);
  for (const asset of manifest.assets) {
    const wav = fs.readFileSync(`public/audio/v2/${asset.file}`);
    assert.equal(wav.toString('ascii',0,4), 'RIFF'); assert.equal(wav.toString('ascii',8,12), 'WAVE');
    assert.equal(wav.readUInt16LE(22), 2); assert.equal(wav.readUInt32LE(24), 22050);
    assert.equal(wav.readUInt32LE(40), wav.length - 44);
    assert.equal(crypto.createHash('sha256').update(wav).digest('hex'), asset.sha256, asset.id);
    let peak = 0, sum = 0;
    for (let i = 44; i < wav.length; i += 2) { const x = wav.readInt16LE(i) / 32768; peak = Math.max(peak, Math.abs(x)); sum += x*x; }
    assert.ok(peak < .85 && peak > .2, asset.id);
    assert.ok(Math.sqrt(sum / ((wav.length - 44) / 2)) > .005, `${asset.id} is silent`);
    if (asset.loop) for (let c = 0; c < 2; c++) assert.equal(wav.readInt16LE(44+c*2), wav.readInt16LE(wav.length-4+c*2), `${asset.id} loop clicks`);
  }
});

test('biomes choose distinct music and ambience', () => {
  assert.deepEqual(biomeAudio('crystal_cavern'), {music:'abyss',ambience:'cave'});
  assert.deepEqual(biomeAudio('snow'), {music:'frostpeak',ambience:'wind'});
  assert.deepEqual(biomeAudio('volcano'), {music:'sunfire',ambience:'fire'});
  assert.deepEqual(biomeAudio('coast'), {music:'overworld',ambience:'water'});
});

function fakeAudio() {
  store.clear();
  const sources = [], requests = [], deferred = new Map();
  const param = () => ({ value: 1, cancelScheduledValues() {}, setValueAtTime(v) {this.value=v;}, linearRampToValueAtTime(v) {this.value=v;} });
  const node = () => ({connect() {},disconnect() {}, gain:param()});
  class Context {
    state = 'running'; currentTime = 0; destination = node();
    createGain() {return node();}
    createDynamicsCompressor() {return { ...node(), threshold:param(), knee:param(), ratio:param(), attack:param(), release:param() };}
    createBufferSource() {const s={...node(),playbackRate:param(),start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};sources.push(s);return s;}
    async decodeAudioData() {return {duration:.25};}
    async resume() {this.state='running';} async suspend() {this.state='suspended';}
  }
  window.AudioContext = Context;
  globalThis.fetch = async url => {
    requests.push(url);
    if (deferred.has(url)) await deferred.get(url);
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
  };
  return { sources, requests, deferred, mixer:new AudioSynthesizer() };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('music remembers muted scene changes, returns to biome after battle and persists zero volume', async () => {
  const {mixer,requests}=fakeAudio();
  mixer.playBiomeBgm('snow'); assert.equal(requests.length,0,'nothing fetched before a gesture');
  await mixer.unlock(); await flush();
  assert.equal(mixer.getDiagnostics().activeMusic,'music-frostpeak');
  mixer.bgmEnabled=false; mixer.playBgm('battle');
  assert.equal(mixer.getCurrentTrack(),'battle');
  mixer.bgmEnabled=true; await flush();
  assert.equal(mixer.getDiagnostics().activeMusic,'music-battle');
  mixer.restoreWorldBgm(); await flush();
  assert.equal(mixer.getDiagnostics().activeMusic,'music-frostpeak');
  assert.equal(requests.filter(p=>p.endsWith('music-frostpeak.wav')).length,1,'decoded buffers reused');
  mixer.setMasterVolume(0); mixer.setSfxVolume(0); mixer.setAmbienceVolume(0);
  const reloaded = new AudioSynthesizer();
  assert.equal(reloaded.getSettings().master,0); assert.equal(reloaded.sfxVolume,0);
  assert.equal(JSON.parse(store.get(AUDIO_SETTINGS_KEY)).ambience,0);
});

test('slow music downloads cannot replace a newer scene or restart stopped music', async () => {
  const {mixer,deferred}=fakeAudio(); await mixer.unlock();
  let finish;
  deferred.set('/audio/v2/music-boss.wav',new Promise(resolve=>{finish=resolve;}));
  mixer.playBgm('boss'); mixer.playBgm('casino'); await flush();
  finish(); await flush();
  assert.equal(mixer.getDiagnostics().activeMusic,'music-casino');
  let release;
  deferred.set('/audio/v2/music-town.wav',new Promise(resolve=>{release=resolve;}));
  mixer.playBgm('town'); mixer.stopBgm(); release(); await flush();
  assert.equal(mixer.getDiagnostics().activeMusic,'none');
});

test('effects obey mute, effect volume and polyphony limits; failures stay nonfatal', async () => {
  const {mixer,sources}=fakeAudio(); await mixer.unlock();
  mixer.setSfxVolume(0); mixer.coin(); await flush(); assert.equal(sources.length,0);
  mixer.setSfxVolume(.6);
  for(const method of ['coin','attackHit','strikeHit','counterParry','magicGuardBlock','magicCast','levelUp','fanfare','darklingRoar','hurt','skillCast','magicHit','defendBlock','miss','victory','defeat','chestOpen','relicChime']) mixer[method]();
  await flush(); assert.equal(mixer.getDiagnostics().voices,16);
  mixer.enabled=false; mixer.thunderClap(); await flush(); assert.equal(mixer.getDiagnostics().voices,16);
  mixer.enabled=true;
  globalThis.fetch=async()=>({ok:false,status:404});
  mixer.playBgm('abyss'); await flush();
  assert.ok(mixer.getDiagnostics().failedAssets.includes('music-abyss'));
  assert.equal(mixer.getCurrentTrack(),'abyss');
});

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
  assert.equal(manifest.assets.filter(a => a.kind === 'sfx').length, 48);
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
    assert.ok(peak < .85 && peak > .025, asset.id);
    if (/sfx-(click|menu|step|chestTick|speechBlip)/.test(asset.id)) assert.ok(peak <= .31, `${asset.id} should leave headroom for combat`);
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
    createBufferSource() {const s={...node(),playbackRate:param(),start(at=0){this.started=true;this.startedAt=at;},stop(at=0){this.stopped=true;this.stoppedAt=at;this.onended?.();}};sources.push(s);return s;}
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
  for(const method of ['click','step','attackHit','victory','thunderClap']) mixer[method]();
  await flush(); assert.equal(mixer.getDiagnostics().voices,5);
  mixer.enabled=false; mixer.thunderClap(); await flush(); assert.equal(mixer.getDiagnostics().voices,0);
  mixer.enabled=true;
  globalThis.fetch=async()=>({ok:false,status:404});
  mixer.playBgm('abyss'); await flush();
  assert.ok(mixer.getDiagnostics().failedAssets.includes('music-abyss'));
  assert.equal(mixer.getCurrentTrack(),'abyss');
});

test('one combat contact wins over duplicate hits, hurt and announcement cues', async () => {
  const {mixer}=fakeAudio(); await mixer.unlock();
  mixer.attackHit(); mixer.hurt(); mixer.voiceCritical(); mixer.strikeHit();
  await flush();
  assert.equal(mixer.getDiagnostics().voices,1);
  assert.equal(mixer.getDiagnostics().effectGroups.combat,'strikeHit');
});

test('returning to the active scene cancels a pending track; transitions do not overlap melodies', async () => {
  const {mixer,deferred,sources}=fakeAudio(); await mixer.unlock();
  mixer.playBgm('overworld'); await flush();
  let finish;
  deferred.set('/audio/v2/music-boss.wav',new Promise(resolve=>{finish=resolve;}));
  mixer.playBgm('boss'); mixer.playBgm('overworld'); finish(); await flush();
  assert.equal(mixer.getDiagnostics().activeMusic,'music-overworld');
  const previous=sources.find(s=>s.loop);
  mixer.playBgm('battle'); await flush();
  const next=sources.filter(s=>s.loop).at(-1);
  assert.ok(previous.stoppedAt<next.startedAt,'new melody starts only after the old one stops');
});

test('effects waiting on a download are discarded when their scene has ended', async () => {
  const {mixer,deferred,sources}=fakeAudio(); await mixer.unlock();
  let finish;
  deferred.set('/audio/v2/sfx-attackHit.wav',new Promise(resolve=>{finish=resolve;}));
  mixer.attackHit(); mixer.playBgm('town'); finish(); await flush();
  assert.equal(sources.filter(s=>!s.loop).length,0);
});

test('late contact audio is discarded instead of playing after the impact', async () => {
  const {mixer,deferred,sources}=fakeAudio(); await mixer.unlock();
  let finish;
  deferred.set('/audio/v2/sfx-attackHit.wav',new Promise(resolve=>{finish=resolve;}));
  mixer.attackHit(); await new Promise(resolve=>setTimeout(resolve,250)); finish(); await flush();
  assert.equal(sources.length,0);
});

test('reward ducking releases to the configured music level and respects music mute', async () => {
  const {mixer,sources}=fakeAudio(); await mixer.unlock();
  mixer.relicChime(); await flush();
  assert.equal(mixer.buses.music.gain.value,mixer.bgmVolume*.45);
  sources.at(-1).stop();
  assert.equal(mixer.buses.music.gain.value,mixer.bgmVolume);
  mixer.bgmEnabled=false;
  assert.equal(mixer.buses.music.gain.value,0);
});

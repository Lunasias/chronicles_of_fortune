import { audio } from '../engine/AudioSynthesizer';

/** All controls read from the mixer, including after reload and quick-menu mute. */
export function installAudioSettings(): void {
  const sliders = [
    ['sliderMasterVolume', 'masterVolumeVal', 'master', (v: number) => audio.setMasterVolume(v)],
    ['sliderBgmVolume', 'bgmVolumeVal', 'music', (v: number) => audio.setBgmVolume(v)],
    ['sliderSfxVolume', 'sfxVolumeVal', 'sfx', (v: number) => audio.setSfxVolume(v)],
    ['sliderAmbienceVolume', 'ambienceVolumeVal', 'ambience', (v: number) => audio.setAmbienceVolume(v)],
  ] as const;
  const sound = document.getElementById('checkSound') as HTMLInputElement | null;
  const music = document.getElementById('checkMusic') as HTMLInputElement | null;
  const sync = () => {
    const settings = audio.getSettings();
    for (const [id, label, key] of sliders) {
      const input = document.getElementById(id) as HTMLInputElement | null;
      const output = document.getElementById(label);
      const value = String(Math.round(settings[key] * 100));
      if (input) input.value = value;
      if (output) output.textContent = `${value}%`;
    }
    if (sound) sound.checked = settings.enabled;
    if (music) music.checked = settings.musicEnabled;
    const quick = document.getElementById('btnToggleBgm');
    if (quick) {
      quick.setAttribute('aria-pressed', String(settings.musicEnabled));
      quick.title = settings.musicEnabled ? 'ปิดเพลง' : 'เปิดเพลง';
      quick.textContent = settings.musicEnabled ? '🎵' : '🔇';
    }
  };
  for (const [id, , , set] of sliders) {
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.addEventListener('input', () => set(Number(input.value) / 100));
  }
  sound?.addEventListener('change', () => { audio.enabled = sound.checked; });
  music?.addEventListener('change', () => { audio.bgmEnabled = music.checked; });
  document.getElementById('btnAudioTest')?.addEventListener('click', async () => {
    await audio.unlock(); audio.relicChime();
  });
  document.getElementById('btnAudioReset')?.addEventListener('click', () => { audio.resetSettings(); });
  window.addEventListener('fortune-audio-change', sync);
  sync();
  for (const id of ['settingsModal', 'inventoryModal', 'worldMapModal']) {
    const panel = document.getElementById(id);
    if (!panel) continue;
    let visible = !panel.classList.contains('hidden');
    new MutationObserver(() => {
      const next = !panel.classList.contains('hidden');
      if (next !== visible) { visible = next; next ? audio.menuOpen() : audio.menuClose(); }
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }
}

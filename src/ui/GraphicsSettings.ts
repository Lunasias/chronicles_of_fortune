import { normalizeGraphicsPreferences, type GraphicsPreferences } from '../engine/ArtDirection';

function readPreferences(): GraphicsPreferences {
  try { return normalizeGraphicsPreferences(JSON.parse(localStorage.getItem('fortuna_graphics_v2') || 'null')); }
  catch { return normalizeGraphicsPreferences(null); }
}
export const graphicsPreferences = readPreferences();
export function prefersReducedMotion(): boolean {
  return graphicsPreferences.reducedMotion ||
    (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export function installGraphicsSettings() {
  const settings = document.querySelector('#settingsModal .space-y-3');
  if (!settings) return;
  const section = document.createElement('fieldset');
  section.id = 'graphicsPreferences';
  section.innerHTML = `<legend>ภาพและการเคลื่อนไหว</legend>
    <label for="graphicsQuality">คุณภาพบรรยากาศ</label>
    <select id="graphicsQuality"><option value="high">เต็มรายละเอียด</option><option value="balanced">สมดุล / ประหยัดพลังงาน</option></select>
    <label for="graphicsLabels">ชื่อสถานที่บนแมพ</label>
    <select id="graphicsLabels"><option value="hover">แสดงเมื่อชี้ดู</option><option value="all">แสดงทั้งหมด</option></select>
    <label><input id="graphicsReducedMotion" type="checkbox"> ลดการเคลื่อนไหวและแสงกระพริบ</label>`;
  settings.prepend(section);
  const quality = section.querySelector<HTMLSelectElement>('#graphicsQuality')!;
  const labels = section.querySelector<HTMLSelectElement>('#graphicsLabels')!;
  const reduced = section.querySelector<HTMLInputElement>('#graphicsReducedMotion')!;
  quality.value = graphicsPreferences.quality;
  labels.value = graphicsPreferences.labels;
  reduced.checked = graphicsPreferences.reducedMotion;
  const persist = () => {
    Object.assign(graphicsPreferences, normalizeGraphicsPreferences({ quality: quality.value, labels: labels.value, reducedMotion: reduced.checked }));
    document.body.dataset.reducedMotion = String(prefersReducedMotion());
    try { localStorage.setItem('fortuna_graphics_v2', JSON.stringify(graphicsPreferences)); } catch { /* Session preferences still apply. */ }
  };
  section.addEventListener('change', persist);
  document.body.dataset.reducedMotion = String(prefersReducedMotion());
}

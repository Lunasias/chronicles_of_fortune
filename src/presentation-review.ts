import { presentationArt, IMPACT_ROWS, ambientFrame, type PresentationSheet } from './engine/PresentationArt';
import { JOB_PROMOTIONS, TIER3_PROMOTIONS } from './game/Player';
import { JOB_VISUALS } from './engine/JobVisuals';
import { listCompanionProfiles } from './game/CompanionDatabase';

type Tab = 'heroes' | 'companions' | 'impact' | 'world';
let selected: Tab = 'heroes', playing = true, progress = 0, previous = performance.now();
const slider = document.getElementById('timeline') as HTMLInputElement;
const reduced = document.getElementById('reduced') as HTMLInputElement;
const gallery = document.getElementById('gallery')!;
const allJobs = [...Object.values(JOB_PROMOTIONS), ...Object.values(TIER3_PROMOTIONS)].flat();
let cards: { canvas: HTMLCanvasElement; key: string; index: number }[] = [];
const impactLabels = ['โจมตีธรรมดา', 'โจมตีหนัก', 'คริติคอล', 'บล็อกกายภาพ', 'สวนกลับ', 'เกราะเวท'];
const worldLabels = ['ธงราชอาณาจักร', 'เตาหลอมและประกายไฟ', 'กังหันน้ำ', 'ช่องระบายไอน้ำ', 'แม่ค้าในเมือง', 'นกในป่า'];

function renderGallery() {
  gallery.replaceChildren(); cards = [];
  const entries = selected === 'heroes' ? allJobs.map(job => ({ key: job.tier2Key, name: job.name, detail: `ขั้น ${JOB_VISUALS[job.tier2Key].tier} · ${job.skillName}` }))
    : selected === 'companions' ? listCompanionProfiles().map(p => ({ key: p.key, name: p.name, detail: p.skillName }))
    : (selected === 'impact' ? impactLabels : worldLabels).map((name, index) => ({ key: String(index), name, detail: selected === 'impact' ? 'เตรียม → ปะทะ → แตกตัว → สลาย' : 'ภาพวน 6 เฟรม · หยุดนิ่งในโหมดลดการเคลื่อนไหว' }));
  entries.forEach((entry, index) => {
    const card = document.createElement('article'); card.className = 'card';
    const canvas = document.createElement('canvas'); canvas.width = 288; canvas.height = 240;
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', entry.name);
    const heading = document.createElement('h2'); heading.textContent = entry.name;
    const detail = document.createElement('p'); detail.textContent = entry.detail;
    card.append(canvas, heading, detail); gallery.append(card); cards.push({ canvas, key: entry.key, index });
  });
  document.getElementById('reviewNote')!.textContent = selected === 'heroes' ? 'เตรียมท่า → ปล่อยพลัง → คืนท่า · ภาพอาชีพใหม่ใช้ในสนามต่อสู้ ส่วนบนแมพยังใช้ภาพแปดทิศทาง'
    : selected === 'companions' ? 'คู่หูแต่ละตัวมีภาพเตรียม ช่วยโจมตีหรือร่ายเวท และคืนท่า โดยใช้ตัวตนเดิมจากแผนภาพอ้างอิง'
    : selected === 'impact' ? 'สีและรูปทรงแยกผลปะทะให้ชัด ใช้ร่วมกับแรงสะเทือนและท่ารับแรงในเกม'
    : 'รายละเอียดอยู่ข้างอาคารและนอกทางเดิน ใช้เฟรมต่างจังหวะและจำกัดจำนวนตามคุณภาพกราฟิก';
}
for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-tab]')) button.onclick = () => {
  selected = button.dataset.tab as Tab;
  for (const tab of document.querySelectorAll('button[data-tab]')) tab.setAttribute('aria-pressed', String(tab === button));
  renderGallery();
};
const play = document.getElementById('play')!;
play.onclick = () => { playing = !playing; play.textContent = playing ? 'หยุด' : 'เล่น'; play.setAttribute('aria-pressed', String(playing)); };
slider.oninput = () => { progress = Number(slider.value) / 100; playing = false; play.textContent = 'เล่น'; play.setAttribute('aria-pressed', 'false'); };
reduced.checked = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function draw(now: number) {
  if (playing) progress = (progress + Math.min(100, now - previous) / 1800) % 1;
  previous = now; slider.value = String(Math.round(progress * 100));
  document.getElementById('frameLabel')!.textContent = `${Math.round(progress * 100)}%`;
  for (const { canvas, key, index } of cards) {
    const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false;
    let sprite: HTMLCanvasElement | null;
    if (selected === 'heroes') {
      const pose = reduced.checked ? 3 : progress < .18 ? 0 : progress < .38 ? 1 : progress < .72 ? 2 : 3;
      const visual = JOB_VISUALS[key];
      const names = ['paladin','berserker','archmage','necromancer','ninja','assassin','high_priest','saint','rune_master'];
      sprite = presentationArt.cell(`promotion-${visual.tier}` as PresentationSheet, pose, names.indexOf(visual.style), 144, true);
      if (sprite) ctx.drawImage(sprite, 0, 10, 288, 288);
    } else if (selected === 'companions') {
      sprite = presentationArt.companion(key, progress, reduced.checked);
      if (sprite) ctx.drawImage(sprite, 48, 30, 192, 192);
    } else {
      const frame = selected === 'world' ? ambientFrame(progress * 960, 0, reduced.checked) : reduced.checked ? 3 : Math.min(5, Math.floor(progress * 6));
      sprite = presentationArt.cell(selected, frame, index, 128);
      if (sprite) ctx.drawImage(sprite, 16, -8, 256, 256);
    }
    if (!sprite) { ctx.fillStyle = '#c8d5df'; ctx.font = '13px Tahoma'; ctx.textAlign = 'center'; ctx.fillText('กำลังเตรียมภาพ…', 144, 120); }
  }
  requestAnimationFrame(draw);
}
renderGallery(); requestAnimationFrame(draw);

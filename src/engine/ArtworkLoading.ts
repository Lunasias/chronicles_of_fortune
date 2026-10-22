/** Keep unfinished production atlases behind an illustrated loading screen. */
const pending = new Set<HTMLImageElement>();
let loaded = 0;
let failed = 0;
let scheduled = false;
let overlay: HTMLElement | null = null;
// The HTML cover appears before JavaScript or any game atlas is downloaded.
let bootPending = typeof document !== 'undefined' && !!document.getElementById?.('artworkLoading');

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.getElementById?.('artworkLoading') ?? document.createElement('div');
  overlay.id = 'artworkLoading';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `<div class="fortune-loading-scene" aria-hidden="true"></div>
    <div class="fortune-loading-caption" aria-hidden="true"><span>FORTUNA</span><span>อาณาจักรเหนือหมู่เมฆ</span></div>
    <div class="fortune-loading-card">
      <span class="fortune-loading-eyebrow">CHRONICLES OF FORTUNE</span>
      <h2>กำลังเตรียมโลกแห่งโชคชะตา</h2>
      <p>กำลังเปิดแผนที่และเตรียมเหล่านักผจญภัย</p>
      <progress max="1" value="0" aria-label="ความคืบหน้าการโหลดภาพ"></progress>
      <small>เส้นทางใหม่ · สมบัติล้ำค่า · ตำนานของคุณ</small>
      <button class="pixel-btn" hidden>ลองโหลดอีกครั้ง</button>
    </div>`;
  overlay.querySelector('button')!.addEventListener('click', () => window.location.reload());
  if (!overlay.isConnected) document.body.appendChild(overlay);
  return overlay;
}

function paintLoadingState() {
  if (typeof document === 'undefined' || !document.body) return;
  ensureOverlay();
  overlay!.hidden = !bootPending && pending.size === 0 && failed === 0;
  if (failed) {
    overlay!.querySelector('h2')!.textContent = 'โหลดภาพบางส่วนไม่สำเร็จ';
    overlay!.querySelector('p')!.textContent = 'ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';
    overlay!.querySelector('button')!.hidden = false;
  }
  const progress = overlay!.querySelector('progress')!;
  progress.max = Math.max(1, loaded + pending.size);
  progress.value = loaded;
}

/** Reveal the title or review scene only after its first complete paint. */
export function completeArtworkBoot() {
  if (!bootPending) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bootPending = false;
    paintLoadingState();
  }));
}

export function createArtworkImage(): HTMLImageElement {
  const image = new Image();
  if (typeof document === 'undefined' || !document.body) return image;
  pending.add(image);
  paintLoadingState();
  let done = false;
  const finish = (ok: boolean) => {
    if (done) return;
    clearTimeout(timeout);
    done = true; pending.delete(image); loaded++;
    if (!ok) failed++;
    // Providers cut sprites and invalidate caches in their own load handlers.
    // Expose the scene only after those handlers and a complete repaint.
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('artwork-ready'));
        requestAnimationFrame(() => { scheduled = false; paintLoadingState(); });
      });
    }
  };
  const timeout = setTimeout(() => finish(false), 60000);
  image.addEventListener('load', () => finish(true), { once: true });
  image.addEventListener('error', () => finish(false), { once: true });
  return image;
}

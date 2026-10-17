/** Keep unfinished production atlases behind an opaque loading screen. */
const pending = new Set<HTMLImageElement>();
let loaded = 0;
let failed = 0;
let scheduled = false;
let overlay: HTMLElement | null = null;

function paintLoadingState() {
  if (typeof document === 'undefined' || !document.body) return;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'artworkLoading';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = '<div><span>CHRONICLES OF FORTUNE</span><h2>กำลังเตรียมโลกแฟนตาซี</h2><p>โหลดภาพฉากและตัวละคร</p><progress max="1" value="0" aria-label="ความคืบหน้าการโหลดภาพ"></progress><button class="pixel-btn" hidden>ลองโหลดอีกครั้ง</button></div>';
    overlay.querySelector('button')!.addEventListener('click', () => window.location.reload());
    document.body.appendChild(overlay);
  }
  overlay.hidden = pending.size === 0 && failed === 0;
  if (failed) {
    overlay.querySelector('h2')!.textContent = 'โหลดภาพบางส่วนไม่สำเร็จ';
    overlay.querySelector('p')!.textContent = 'ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';
    overlay.querySelector('button')!.hidden = false;
  }
  const progress = overlay.querySelector('progress')!;
  progress.max = Math.max(1, loaded + pending.size);
  progress.value = loaded;
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

/** Shared interaction polish for the interface. Native details keeps the system
 * menu keyboard-accessible without duplicating game button handlers. */
export function installInterface(): void {
  // Reserve actual rendered space: font loading, browser zoom and orientation
  // changes can all change the HUD height without crossing a CSS breakpoint.
  const measureHUD = () => {
    const dock = document.getElementById('bottomBar')?.getBoundingClientRect();
    const cards = ['hudHeroCard', 'hudMatchStatus'].map(id =>
      document.getElementById(id)?.getBoundingClientRect().bottom || 0);
    document.body.style.setProperty('--hud-clearance', `${Math.max(...cards) + 10}px`);
    if (dock && dock.height) {
      document.body.style.setProperty('--dock-clearance', `${window.innerHeight - dock.top + 8}px`);
    }
  };
  const layoutObserver = new ResizeObserver(measureHUD);
  for (const id of ['bottomBar', 'hudHeroCard', 'hudMatchStatus']) {
    const element = document.getElementById(id);
    if (element) layoutObserver.observe(element);
  }
  window.addEventListener('resize', measureHUD);
  measureHUD();
  const menu = document.querySelector<HTMLDetailsElement>('#hudSystemMenu');
  const labels: Record<string, string> = {
    btnAdventureGuide: 'สมุดนักผจญภัย',
    btnToggleCrisisTracker: 'ภารกิจ', btnToggleLogHistory: 'บันทึกเหตุการณ์',
    btnSaveGame: 'บันทึกเกม', btnToggleBgm: 'เสียงเพลง',
    btnMobileDisplayToggle: 'การแสดงผล', btnSettings: 'ตั้งค่า',
    btnToggleLog: 'บันทึกเหตุการณ์', btnUseSpinner: 'วงล้อเสริม',
    btnInventory: 'กระเป๋า', btnFieldMagic: 'เวทมนตร์',
    btnCenterCam: 'โฟกัสตัวละคร', btnWorldMap: 'แผนที่โลก',
  };
  for (const [id, label] of Object.entries(labels)) {
    const button = document.getElementById(id);
    if (!button) continue;
    button.setAttribute('aria-label', label);
    button.dataset.uiLabel = label;
    if (!button.title) button.title = label;
  }
  menu?.addEventListener('click', event => {
    if ((event.target as Element).closest('button')) menu.open = false;
  });
  document.addEventListener('pointerdown', event => {
    if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.open) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
    }
  });
  // Dialog labels reference real headings, including panels created at runtime.
  let headingNumber = 0;
  const labelDialogs = () => {
    for (const panel of document.querySelectorAll<HTMLElement>('[id$="Modal"]')) {
      const heading = panel.querySelector<HTMLElement>('h2, h3');
      if (!heading) continue;
      if (!heading.id) heading.id = `dialog-heading-${++headingNumber}`;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-labelledby', heading.id);
    }
  };
  labelDialogs();
  const observer = new MutationObserver(labelDialogs);
  observer.observe(document.body, { childList: true, subtree: true });
}

/** Inventory filters only change presentation; item indices stay owned by the game. */
export function installInventoryTools(list: HTMLElement): void {
  let toolbar = document.getElementById('inventoryFilters');
  if (!toolbar) {
    toolbar = document.createElement('div'); toolbar.id = 'inventoryFilters'; toolbar.className = 'inventory-filters';
    toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', 'กรองสัมภาระ');
    toolbar.innerHTML = '<button class="pixel-btn" data-filter="all" aria-pressed="true">ทั้งหมด</button><button class="pixel-btn" data-filter="equipment" aria-pressed="false">อุปกรณ์</button><button class="pixel-btn" data-filter="supplies" aria-pressed="false">ของใช้</button><span class="inventory-filter-count" role="status"></span>';
    list.before(toolbar);
    toolbar.dataset.filter = 'all';
    toolbar.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-filter]');
      if (!button) return;
      toolbar!.dataset.filter = button.dataset.filter;
      installInventoryTools(list);
    });
  }
  const filter = toolbar.dataset.filter ?? 'all';
  for (const button of toolbar.querySelectorAll<HTMLButtonElement>('button')) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  let count = 0;
  for (const child of list.children) {
    const row = child as HTMLElement;
    const empty = row.classList.contains('inventory-empty-slot');
    const visible = filter === 'all' || (!empty && row.dataset.category === filter);
    row.hidden = !visible;
    if (visible && !empty) count++;
  }
  toolbar.querySelector('.inventory-filter-count')!.textContent = `${count} รายการ`;
  let message = document.getElementById('inventoryFilteredEmpty');
  if (!message) { message = document.createElement('p'); message.id = 'inventoryFilteredEmpty'; message.className = 'inventory-filter-empty'; list.after(message); }
  message.textContent = 'ยังไม่มีไอเทมในหมวดนี้'; message.hidden = count > 0 || filter === 'all';
}

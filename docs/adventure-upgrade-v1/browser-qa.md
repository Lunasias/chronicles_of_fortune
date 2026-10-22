# Adventure upgrade browser review — 2026-10-22

Chromium passed **33 checks** with no JavaScript page errors, failed requests or HTTP errors. The review used 1280×720 desktop, 390×844 portrait and 844×390 landscape viewports.

The normal game path was exercised through real controls: title help → two-player setup → new game → dice roll → destination preview → explicit confirmation → arrival at the selected destination. Pressing Enter on a focused destination card only previewed it. Service filters and keyboard cycling retained valid destination IDs.

The journal opened from the title and the `?` shortcut, displayed its journey/combat/controls tabs, trapped keyboard focus and closed with Escape. Space inside the journal did not roll dice underneath. Portrait and landscape confirmation buttons remained reachable, and journal content scrolled within the viewport.

Save integration was verified through Settings: manual slot 1 → clipboard export → import into slot 2 with the Unicode player name `ผู้กล้า 🌿` preserved. Import-triggered autosaving left manual slot 1 intact. Reloading the app made Continue choose the newest compatible save and successfully resume it.

- [Machine-readable checks and viewport measurements](browser-qa.json)
- [Desktop route decision](route-decision-desktop.png)
- [Arrival after explicit confirmation](route-arrival-desktop.png)
- [Portrait route filters](route-filter-phone.png)
- [Landscape route filters](route-filter-landscape.png)
- [Portrait journal](guide-journey-phone.png)
- [Landscape journal](guide-journey-landscape.png)
- [Save settings](save-settings-desktop.png)

Reproduce with the Vite server running and `node scripts/verify-adventure-upgrade.cjs`. Playwright must be locally installed or available through `NODE_PATH`; set `FORTUNA_REVIEW_URL` to use another development-server URL. This is scoped feature verification, not a complete campaign or live multiplayer playthrough.

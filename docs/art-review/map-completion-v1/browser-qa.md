# Map completion browser review — 2026-10-22

The complete artwork flow passed Chromium review at 1280×720 desktop, 390×844 portrait and 844×390 landscape. Fifteen views cover illustrated loading with actual atlas requests held, forest/snow/volcano/sakura maps, desktop/mobile inventory, the title screen, two-player setup and the initial world reached through the normal **New Adventure → Begin Game** controls.

All **432 runtime scenery canvases** rendered nonempty artwork with transparent room around their edges. No JavaScript page errors, failed network requests, HTTP errors or horizontal page overflow occurred. The loading cover disappeared after assets finished and did not remain over normal gameplay.

The generated brass/jade frame uses a 192px nine-slice source boundary. Its corners remain intact in portrait and landscape. Inventory text and controls remain readable; the initial turn notification expires normally. The portrait setup panel scrolls to reveal every configuration field and the Begin Game button.

- [Machine-readable browser results](browser-qa.json)
- [All runtime sprite bounds](runtime-sprites.json)
- [Replacement and recovered sprite contact sheet](runtime-sprite-contact.png)
- [Desktop loading screen](loading-desktop.png)
- [Portrait loading screen](loading-phone.png)
- [Landscape loading screen](loading-landscape.png)
- [Mobile inventory](inventory-phone.png)
- [Mobile setup controls](setup-phone-controls.png)
- [Normal initial world](normal-initial-world.png)

To reproduce, run `node scripts/verify-map-completion.cjs` while the Vite development server is running. Playwright must be available through the local installation or `NODE_PATH`; `FORTUNA_REVIEW_URL` optionally overrides the default `http://localhost:5173` URL.

These checks cover the artwork/loading/UI change. They do not constitute a complete campaign or live multiplayer playthrough.

# Quality and campaign systems v3

## Implemented scope

| Priority | Area | Result |
| --- | --- | --- |
| P0 | Multiplayer | Private per-seat admission/rejoin tickets; authenticated transport identity; turn stamps; monotonically increasing command sequences; shape, size, rate, roster and snapshot bounds; validation before relay. Host loss pauses local commands and invalidates stale combat callbacks. Returning host restores a shared board checkpoint. |
| P0 | Performance | Pre-extracted delivery atlases preserve all 432 complete regional sprites and their original foot anchors. Ground materials are baked at their actual sampling size. Lossless WebP for backgrounds and hero atlases; lazy action sheets and hidden roster previews; bounded LRU canvas bytes; three-backdrop limit; 30 Hz touch rendering and no hidden-tab world painting. |
| P0 | Save recovery | Format v3 migrates supported rules-2 v1/v2 payloads without mutating the source. Checksums detect corruption. Previous-good and staged crash copies recover a damaged/missing primary. Future versions are rejected without silently replacing the run. Autosave checkpoints every turn. |
| P0 | Browser CI | Playwright journeys cover production start/save/Continue, actual combat input, WebRTC with BroadcastChannel disabled, spoof rejection, host refresh/recovery, Quick Match/talent persistence, NPC choices, town development and mobile bounds. CI retains traces, screenshots and reports. |
| P1 | Tutorial | Optional, nonblocking first three personal turns: real dice, preview/confirmation, character inspection, waypoint planning and context-sensitive combat/service help. Per-player completion and dismissal live in the save. |
| P1 | Balance | Seeded integration simulation uses production roads, AI, combat, rewards, XP, town income and victory rules. Mage durability is modestly raised; AI uses actual class MP costs, avoids wasteful self-sacrifice and seeks recovery when out of MP. |
| P1 | Quick Match | Eight-day preset, two players, Lv.2, 500G, ×1.5 rewards. Campaign setup exposes day, level, cash, reward and goal rules. Online hosts can also select the eight-day rules; the roster and starting checkpoint carry the same configuration. |
| P2 | Builds | Nine talents across three branching paths. One point every two levels, four maximum. Each path has mutually exclusive advanced talents. Combat, recovery, spell MP and town-income effects apply in actual rules and persist. AI uses valid builds. |
| P2 | Town development | A town at level 2 can choose a market, sanctuary or watchtower. Ownership, funds, one-project limit, income, regeneration, protected buyout cost and asset value are enforced by the same transactions used by the UI. |
| P2 | Stories and replay | Three NPC jobs start through actual guild/church/tavern encounters. Help/contract paths change rewards and relationships. Completion requires new achievements and returning to the correct service; claims pay once. The journal shows standings, story endings and a bounded turn timeline that focuses past locations without changing the current match. |

## Evidence

- `npm run verify`: typecheck, production build, all 342 regression tests and CSS coverage passed.
- `npm run test:e2e`: all six browser journeys passed; builds the production app and starts a local signaling broker plus dev/preview servers. [Local E2E summary](e2e-summary.json); CI artifacts retain traces and the full report.
- `npm run test:balance`: 100 seeded matches, 50 eight-day and 50 standard campaigns. All finish with zero invalid numeric states and zero stalled battles. See [before](balance-before.json) and [current model output](balance-report.json).
- [Responsive UI, cold-load measurements and public-broker WebRTC](browser-qa.json), including a real external PeerJS signaling connection with local BroadcastChannel unavailable.
- [Lossless background/hero encoding](asset-report.json): 30 source files, approximately 93.7 MB → 70.7 MB, a 24.6% reduction, with identical visible pixels.
- [Regional and ground delivery](region-delivery-report.json): approximately 60.4 MB → 10.1 MB, an 83.2% reduction. Delivery pixels come from the original renderer; whole-tree replacements are baked before packing. Regression tests check every atlas hash and all 432 foot anchors.
- [Pre-packing browser measurements](performance-before.json) and the final `browser-qa.json` record actual localhost transfers and render CPU samples. These include Vite development modules and are not production WAN download timings.

## Boundaries

The protocol reduces spoofing, replay and obviously invalid state changes. The active P2P turn owner still resolves random results and permitted game outcomes. A hostile modified host/client cannot be made cheat-proof without a trusted authoritative server.

Host recovery pauses and resumes a checkpoint with the same host; automatic migration to another host is not implemented. Refresh recovery may restart an incomplete encounter at its board checkpoint. The public-broker check uses isolated browser contexts on one physical machine. Separate devices, cellular networks, long-session packet loss and restrictive NAT requiring TURN still need field testing; no TURN service or credentials are invented by this update. BroadcastChannel is a convenience for trusted same-origin local tabs.

Migration preserves existing rules-2 campaigns. Older saves from a different world/rules layout are retained/exportable and explicitly rejected rather than guessing a new map for their progress.

The balance model simplifies shops/events and excludes PvP, dungeons and Darkling; its class win rates guide a first pass, not a claim of complete competitive balance. Replay is an inspectable turn timeline and match summary, not deterministic input playback or a video.

## Rebuilding delivery artwork

Keep authoring PNGs. Run `npm run optimize:assets` for lossless background/hero copies. With Vite serving the repository, run `npm run package:regions` to export the original regional canvases and ground samples into delivery WebP atlases. The script verifies visible pixels and writes foot/hash manifests. Run the full verification suite after regenerating.

Implementation references: [Playwright web servers](https://playwright.dev/docs/test-webserver), [PeerJS server configuration](https://peerjs.com/server/getting-started).

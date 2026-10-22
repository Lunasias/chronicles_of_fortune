# Kingdom experience — 2026-10-23

This release improves the complete path from starting an adventure to choosing a
destination, growing a hero, fighting and keeping progress.

## Choose a story

Five campaign presets configure the existing match rules and roster controls:
first adventure, four-player kingdom rivalry, a twenty-day season, cooperative
guardian hunting and the endless spire. The first adventure starts with one human,
one relaxed AI rival and Darkling disabled. Names, jobs, appearances and human/AI
seats remain editable. Advanced goals and house rules are available in a separate
expandable section. The Begin Game action stays reachable while setup scrolls.

The new title artwork is original generated pixel-fantasy art, with two adventurers
overlooking the kingdom and quiet space behind the actual menu. Typography and
interactive controls remain live HTML.

## Royal contracts

The journal's new **ราชภารกิจ** tab offers five one-time campaign commissions:
monster victories, town captures, income, a PvP victory and a guardian victory.
Players choose one active contract. Progress starts at acceptance, so earlier
achievements do not grant an instant reward. Completing a contract pays its stated
gold and XP once; abandoning resets that job's progress. Level gates and mode
restrictions prevent unavailable challenges, including PvP work in co-op.

Humans accept and claim before rolling on their own turn. AI rivals use the same
contracts and reward rules. Guardian achievements are recorded independently of
temporary dungeon visits. Rewards immediately evaluate match victory, including
crossing the gold-goal threshold. Host/active-turn authority remains in place for
online play.

Contract state is an additive, validated field in the existing v2 world save.
Older saves with no contracts load with an empty ledger. Invalid ledgers cannot
replace a good save, and completed rewards remain completed after save/import.

## Find a destination

**ค้นหา / ปักหมุด** searches real place names, Thai service labels, regions and
biomes. Categories include services, towns, treasure and bosses/dungeon entrances.
Results show connected-road distance and distinguish separate dungeon scenes.

Pinning a location focuses the camera without moving the character. The tracker
remembers separate pins for hot-seat players in the current campaign. After a
dice roll, **ดูปลายทางที่ใกล้หมุด** previews a legal reachable destination closest
to the pin. The existing explicit travel confirmation and dice/path validation
still decide whether movement can start. Road-distance advice is not a promise
that an arbitrary intermediate stop is legal.

## Read the fight

Attack, strike and magic cards show fundamental damage ranges calculated with the
real damage functions, current formation and elemental matchup. Formation changes
refresh the estimates. Frozen and silenced commands explain the lost action;
resource hints match the engine's status-resolution order. Defender cards explain
which attack they answer. Ranges exclude criticals, evasion, defensive choices,
relics and other conditional procs, and do not consume RNG or mutate combatants.

## Save without leaving the game

Save-code export/import, load failures and deletion confirmation now use queued,
themed native HTML dialogs. Code fields preserve Unicode and permit selecting or
copying text; clipboard failures leave a manual copy path. Escape/controller cancel
closes the dialog. Every controller action is owned by the dialog while it is open,
so underlying movement or combat cannot trigger. Invalid imports retain the prior
save; deleting one slot requires an explicit destructive confirmation.

## Artwork and provenance

- Runtime title: `public/assets/generated/kingdom-title-v2.webp` (426,026 bytes).
- Retained source: `public/assets/kingdom-v2/title-source.png`.
- [Exact generation prompt](../../public/assets/generated/kingdom-title-v2-prompt.json).
- Tool: built-in `image_gen`, generated for this project on 2026-10-23.
- The original title and previous map/UI artwork remain at their versioned paths.

## Verification

`npm run verify` passes TypeScript, production build, **322 automated tests** and
CSS coverage. New tests exercise acceptance baselines, reward duplication, mode and
turn gates, abandonment, guardian tracking, save migration/validation, immediate
victory, road connectivity, destination filtering, damage forecasts and controller
input isolation. Existing gameplay, dungeon and multiplayer regressions remain.

[Browser checks](browser-qa.json) pass **28 checks** with zero JavaScript, HTTP,
request or native browser-dialog errors, across desktop, portrait and landscape.
They cover real setup, accepting a contract, search/pin, dice-based waypoint advice,
save/export/import/cancel, separate hot-seat pins, combat estimates and reachable
mobile controls. A controlled achievement fixture makes the claim button ready;
unit tests separately verify honest progress accounting and one-time rewards.
The existing adventure browser suite also passes **33 checks**, including actual
travel and arrival. These two suites total **61 passing browser checks**.

Run the Vite server, then run the following with Playwright available via the local
installation or `NODE_PATH`:

```text
node scripts/verify-kingdom-experience.cjs
node scripts/verify-adventure-upgrade.cjs
```

Selected evidence:

- [New desktop title](title-desktop.png)
- [Campaign presets](campaign-desktop.png)
- [Mobile campaign setup](campaign-phone.png)
- [Royal contracts](royal-contracts-desktop.png)
- [Destination search on a phone](navigator-phone.png)
- [Waypoint travel advice](waypoint-route-desktop.png)
- [Landscape save dialog](save-dialog-landscape.png)
- [Battle forecasts](battle-forecast-desktop.png)

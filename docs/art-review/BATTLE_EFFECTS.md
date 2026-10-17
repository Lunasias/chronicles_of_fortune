# Battle effects overhaul — 2026-10-17

The combat engine now layers fixed-step, native-pixel choreography onto its impact particles, animation reactions and damage numbers. Sixteen geometry families cover blade crescents, ground-breaking strikes, parry ripostes, shields, arcane seals, fire eruptions, ice prisms, branching lightning, eclipsing shadow blades, winged holy pillars, nature spirals, healing, summons, novas, traveling beams and evasion.

- Impacts gather, release and dissipate rather than leaving one static ring on screen. Skills add a caster seal and delayed empowered target effect. Promoted jobs use their elemental identity; EX burst uses the skill choreography. Existing damage rules and turn timing stay intact.
- Critical/shatter/duo impacts, chain lightning, burns, curses, lifesteal and finishing blows add localized accents. Misses use evasion instead of the normal hit effect. Defend and magic guard add a visible shield.
- Geometry is clipped to the arena, uses integer blocks and has no blur/gradient resampling. Directional energy keeps its thickness on horizontal and diagonal segments. Damage numbers render above the new energy layers.
- Reduced motion lowers ray/bolt detail, suppresses shake and full-screen impact flashes. Balanced quality lowers geometry counts. Full-screen flashes are capped at 18% opacity in normal mode; the old class cinematic renderer with its separate white flash is retired.
- The timeline is capped at 40 active layers, legacy particle debris at 600 (280 balanced / 120 reduced motion), and other persistent effect lists at 40. Combat numbers are capped at 60. Effects expire through the existing fixed-step clock and honor hitstop. Starting a battle resets visual state.

## Review

Open `/effects-review.html` to use Battle Effects Studio: choose an action, play/pause, scrub 0–110 fixed ticks, and compare reduced-motion or balanced quality. This calls the real combat VFX entry points, uses the same battlefield and responsive actor scale, and does not create a save or resolve a battle. Its quality controls apply only in that review tab and are not persisted. The gallery is included in the production build.

Screenshots: `effects-holy.png`, `effects-frost.png`, `effects-nova.png`.

Validation: `npm run verify` passes typecheck, production build, all 186 tests and CSS coverage. Four additional tests cover all sixteen families, deterministic read-only rendering, integer rectangles, canvas-state balance, reduced geometry, delay/expiration, chain limits, real entry-point routing including promoted classes, reset and hitstop. Browser play of the cleric's magic resolved damage and changed to the defense turn. Screenshots are previews, not physical-device performance benchmarks.

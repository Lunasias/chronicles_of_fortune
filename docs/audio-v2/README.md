# Fortuna audio v2 and modal fixes

The original live oscillator sequencer has been replaced with a stereo sample mixer.
All 64 assets are newly composed/synthesized by `scripts/generate-audio.cjs` without
recordings, external services, or third-party samples. The generated WAVs and their
SHA-256 provenance are in `public/audio/v2/manifest.json`.

- 10 eight-bar scores: title, overworld, battle, boss, darkling, casino, frostpeak,
  abyss, sunfire, and town/shop interiors. Layered plucked strings, flute, bells,
  bass, strings, percussion, and stereo echo replace the former square-wave loop.
- 6 ambience loops: forest birds, wind, rain, cave, fire, and water.
- 48 cues: combat, magic, footsteps, dice, coins, rewards, menus, turn start,
  roulette ticks, thunder, and musical announcement stingers. The historical
  `voice*` methods play stingers; they are not spoken dialogue.

## Mixer behavior

Samples load/decode only after a pointer or keyboard gesture and are reused from
the decoded buffer cache. Scene transitions fade out the previous loop before
starting the next melody; an outdated download cannot replace the current scene.
Four independent gain controls feed a
compressor: master, music, effects, and ambience. Preferences (including zero and
mute) persist in `fortune_audio_v2`. Muting music preserves the requested scene.
Tab visibility and page lifecycle suspend/resume the context and cancel transient
effects. UI, movement, combat, rewards and weather each have one voice slot, with
priorities, cooldowns and deadlines for delayed downloads. Effects from a finished
scene are discarded. Rewards and contact sounds briefly lower the music; the
configured level returns when the cue ends. Missing audio leaves gameplay usable.

Combat resolution is silent: the presentation plays one contact cue at the impact,
with a separate quiet approach swish. Duplicate simulation sounds, simultaneous
hurt/critical jingles and narration character beeps have been removed. Fast-forward
AI simulations no longer produce a burst of sounds for every skipped round.

The revised synthesis uses a damped delay-line plucked string, breathier flute,
diatonic harmony, less uniform note timing, colored-noise foley, short resonant
metal transients and lower UI/footstep peaks. These remain synthesized sounds,
not recordings of real instruments or actors.

Regenerate with `npm run gen:audio`. Validate with `npm run verify`.
The files total approximately 23 MiB and load on demand, rather than at game start.

## UI corrections

The button surface no longer overrides `absolute`/`fixed` positioning. The wonder
chest reserves header space for its close button, scrolls within short screens,
uses large prize icons, disables closing while spinning, and cancels pending
timers when closed/reopened. The minimap wrapper grows with its objective text,
keeps the canvas square, and includes its footer within the border.
World-event notifications are suppressed during combat and retained in the
chronicle, leaving the arena turn banner and command dock clear.

## Equipment and scouting regression

The monster confirmation screen previously displayed base stats and used obsolete
damage formulas. Scouting and battle creation now share `createPlayerCombatant`,
and `CombatDamage` supplies the same opening-damage formulas to both the preview
and resolver. The card shows equipment/buff totals; a separate line explains any
field adjustments. Critical hits, defensive commands and passive procs are
explicitly excluded from the opening estimate.

The reported Cleric fixture now reads ATK 77, DEF 43, MAG 30, SPD 25 in both inspect
and scouting. Snow changes battle DEF to 47 and SPD to 23 and is explained on the
confirmation screen. Preview with
`/?art-scene=scout&job=cleric&gear=equipped&biome=snow&weather=snow`.

## Verified

- All generated files: RIFF lengths, stereo PCM format, hashes, non-silent and
  unclipped signals, and equal first/last samples for loop continuity.
- Mixer tests: malformed preferences, independent zero levels, scene races,
  muted scene changes, buffer reuse, combat return, missing files and voice cap.
- Chromium: actual nonzero audio output; all 10 music scenes; rain ambience;
  effect source cleanup; visibility suspend/resume; settings persistence.
- Chest open/spin/reward/close and viewport geometry at 320×568, 390×844,
  844×390, 1440×900 and 1920×940. Minimap containment and square aspect ratio.
- Development preview: `/?art-scene=chest` (excluded from production behavior).

Browser verification used Chromium touch/mobile emulation, not physical devices.

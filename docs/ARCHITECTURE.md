# Architecture — a game, not a forked engine

## Modules and ownership

This repo owns original arena content and game rules. The engine stays pinned to VANILLAJS `v3.2.0`, exact commit `7a3a5a3ec49aed5b7063a05614951e69bb257da6`. Vendoring must preserve the source and transitive relative-import dependency closure in `vendor/vanillajs/`, plus Apache-2.0 LICENSE/NOTICE. Browser runtime does not import mutable upstream repos, external packages or demo internals.

| Owner | Responsibility |
| --- | --- |
| VANILLAJS `time`, `character`, `collision`, `input` | Fixed tick, player movement, geometry contact and device adapters |
| VANILLAJS `combat3d`, `weapons`, `projectiles`, `weapon-feel` | Combat truth, hit order, fire cadence, damage, cosmetic weapon feel |
| VANILLAJS `navigation` / `geometry` | Bounded movement route helpers, static AABB acceleration and conservative visibility |
| VANILLAJS `render-webgl` / opt-in `render-lit` | Draw calls, camera/lighting, owned GPU resources |
| Game `src/sim/` | Bot decision/state, match/score/winner policy, respawn/pickups, reproducible command/replay |
| Game `src/view/` / `src/input/` | HUD/scoreboard/viewmodel/particles and device lifecycle |
| Game `content/` and `tests/` | Original bounded arena assets and verification |
| `docs/PERFORMANCE.md` evidence | Source-bound device/cadence numbers; never claims without measurements |

Suggested directories are proposed, not yet present.

## Authoritative tick

Use **60 ticks/s**, since `Combat3D.step` is exactly one 1/60 s step. Record accepted inputs per tick including deterministic bot commands and/or seed/config enough to reconstruct them. Establish a documented order for accepted player/bot movement, validated actor pose publication, target selection, combat, death score, pickups, respawn and match transitions. Damage, winner and timers must be independent of rendering cadence. Test simultaneous kills, self-damage, ties, projectile rejection, discarded commands, bot-versus-bot frags and boundary tick conditions.

Render using the last snapshots and interpolation in `requestAnimationFrame`. A lower-res draw profile never changes collision or target selection. Audio, visual flinch, animation and weapon-viewmodel movement are cosmetic. Do not multiply pointer deltas by `dt` if the adapter already consumes angular deltas. Implement an explicit maximum accumulated time, pause/resume reset and neutral input gate so a suspended tab does not replay stale combat.

## Bot scheduling and fairness

Use bounded seeded bot logic. Acquire visible targets using actual geometry; issue one compatible combat command for each alive bot at the correct tick. Route over valid ground-plane occupancy. Apply reaction/cooldown and aim error based on difficulty, not frame count or privileged damage functions. Bot AI updates can be staggered, but published commands must remain deterministic for the same tape.

The match owner tracks scoreboard, target score, remaining ticks, respawn queue, win/tie resolution and pause state. The combat module owns actor/weapon state. Never maintain a second conflicting health value. During respawn, validate physical clearance and ensure previous fired projectiles/cooldowns behave per the actual engine contract.

## Resource caps and transactional content

Plan the first arena within `mod-fps` bounds (1 human + 3 bots; available 8 bot spawns, 32 block features and 4 stairs, with extra strict data/clearance rules). `Combat3D` supports up to 16 actors and 64 live projectiles but those limits do **not** override tighter pack schema. Do not assume material-grid sand or rendered particles are new `Combat3D` solids. Asset import/replacement validates all data before swapping an active match; replay files contain inert data, never code.

## Runtime lifecycle

- Start: validate source manifest, packs, renderer support, audio permissions and settings; reject unsupported states clearly.
- Pause/hidden/blur/pointer unlock: stop canonical clock advancement; release held inputs, discard queued fire, reset RAF timestamp and pause audio as needed.
- Rematch: deterministic new session/seed choice, fully reset scoreboard, bots, weapons, pickups, effects and controls.
- Arena switch: create and validate candidate resources first, publish only when accepted, dispose old buffers/listeners/timers; detect repeated-switch leaks.
- Offline export: local self-contained HTTP-hosted package; subpath-safe imports and service-worker lifecycle if added. Use source-digest-scoped cache validity to avoid mixed-code restores.

## Upstream escalation

For missing shared collision/graphics APIs or actor counts, supply independent failing tests, a minimal reproducer, performance impact and proposed contract. Open an upstream VANILLAJS PR **separately** and wait for approval/green CI before any consumer pin update. OPT recommendations are evaluated with equality tests and target-device evidence, not blindly copied as faster code.

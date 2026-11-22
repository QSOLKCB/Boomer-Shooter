# BH-000 — STORM PROTOCOL
## A first-person bullet-hell mode for The Foundry Pit

**Status: design proposal only — not implemented.** BS-001/BS-002 deathmatch must remain unchanged until independently reviewed new-mode code passes its own tests. This proposal is for a separate `Bullet Hell` selection, not a silent change to Deathmatch rules or a claim that VANILLAJS presently supports hundreds of Combat3D projectiles.

**Art direction:** one operator in a vast industrial reactor court. A towering original machine, **THE CATHEDRAL ENGINE**, throws luminous radial rings, alternating fans, slow spirals, moving walls and telegraphed laser sweeps through smoke, iron and neon. First-person perspective, open sightlines, clear floor markers and readable projectiles are non-negotiable. The earlier mood image is *inspiration*, not an actual in-game screenshot.

## The player experience

The operator enters a contained boss arena with fast Arcade movement, WASD/mouse look, accurate forward weapons and jump. The boss remains a real vulnerable enemy, not a decorative animation. Its attacks are **solid, damaging patterns** that can be dodged, jumped, ducked behind cover where applicable, or deliberately crossed at a cost. Build toward three recognisable phases and a short replayable survival run.

**First playable target (BH-001):** one original reactor arena and one boss; 3 escalating phases; 5 distinct pattern primitives; 1 player with clearly visible HP, damage, respawn/restart and a way to damage/defeat the boss; 64, 128 and 256 *actual authoritative* hazard-bullet workloads where accepted, with instrumentation for a proposed ceiling of 512. These are bounded goals **subject to measured feasibility**, not already supported API guarantees. One complete victory and defeat path, plus a quick replay.

**Initial pattern vocabulary**
1. **Clockwork fan:** aimed spreads around a sampled target direction, emitted at a bounded rate, with telegraph and travel time.
2. **Concentric rings:** radial bursts with predictable angular gaps and different speeds, including near/far dodge opportunities.
3. **Rotating spiral:** deterministic seeded phase advance; repeated emitters create a moving safety corridor.
4. **Split gate:** paired curtains leaving a safe lane wide enough for the validated collision body; animated lane marker matches actual geometry.
5. **Forge sweep:** charge-up beam/low wall with explicit start/end ticks and conservative swept collision; optional jumping only if its real bounds make jumping viable.

The player must be able to understand why they took damage. Projectiles should have bright heads, short trails and visually consistent hit radii, not screen-filling opaque explosions. If an attack has no feasible dodge path in a test configuration, redesign it rather than loosening collision.

## Authoritative architecture — DO NOT equate this with Combat3D's existing ammo pool

VANILLAJS v3.2.0 is pinned at `7a3a5a3ec49aed5b7063a05614951e69bb257da6`.

The existing `Combat3D` constructor creates a `ProjectileSystem({capacity:64})`. Its public cap is **64 live combat shots** and is **not** expanded by this proposal. The standalone `ProjectileSystem` accepts a caller-supplied positive integer capacity, but its Map/clone/collider-query implementation is not evidence it can handle hundreds of dense moving hazards at acceptable frame times. It would need measurements; collisions in the projectile module are against AABBs.

For BH-001 prefer a **game-owned, testable, bounded pattern/hazard subsystem** with one authoritative 60 Hz tick and deterministic accepted command order. Retain VANILLAJS's character movement, collision conventions, time, math, input, geometry and WebGL renderer; use existing weapon timing primitives where appropriate. Each hazard has stable ID, origin, direction or velocity, age/lifetime, radius/shape and source; emitted count, live count and collision work are bounded. Use a fixed capacity **maximum 512 for the experimental target**, with explicit overflow/rejection receipts and stable priority. Do not silently increase caps based on FPS or desktop hardware.

**Health and damage ownership:** BH-001 must pick **one** authority for player and boss damage and event attribution. Do not keep a shadow HP variable conflicting with `Combat3D`. A clean independent BH mode can own its own health/damage model and use the engine's movement, weapon timer, collision and graphics primitives. If shared `Combat3D` authority is required, first propose a reviewed environmental-damage API upstream, include tests, and deliberately update the engine pin. **Never** mutate private Combat3D fields or fake events. Label new game-owned damage logic plainly.

**Collision:** compute swept hazard-vs-player intersection over the **same fixed interval** as player movement. A fast projectile must not skip a thin target between endpoints. Match an independently implemented oracle for finite seeded layouts, radius and boundary contact, grazing near misses, crossing multiple hazards in a tick, wall blocking (only if declared for that pattern), same-tick emission, death and cooldown/iframes. No unverified use of moving-shots-on-static-target APIs for simultaneous player motion.

**Determinism:** named seed, serialized phase state, accepted player command sequence and canonical per-tick event/state digest; independent replay at 30/60/120 Hz drawing schedules on the **same documented runtime**. Do not claim cross-engine Float64 bit identity. No use of wall time, render callbacks or unseeded random calls in emission/collision.

**Authority/presentation separation:** hazards are not visual impostors. Draw the same active hazard IDs and positions accepted by simulation (with snapshot interpolation), but cosmetic sparks/afterglow do not add collisions. Batch bullet heads/trails into bounded dynamic meshes with the pinned VANILLAJS renderer; measure mesh upload and draw costs. Avoid one WebGL draw call and one buffer per shot. A low-resolution visual mode must preserve identical hits, health and phase progression.

## Lifecycle and isolation

- Deathmatch remains the default and fully functional; Bullet Hell is an opt-in independent match type with its own menu/route and replay schema version. No changes to existing replay formats or original saved runs.
- Enter/exit/restart, focus loss, pointer unlock, hidden tab and unsupported WebGL must pause and clear accepted/held inputs without phantom bullets or stale time debt.
- Switching modes must dispose GPU buffers, audio voices, RAF callbacks, listeners and any generated pattern state; support repeated switching/restarts.
- Local-first; HTML/ES modules; no runtime npm, external assets, service, CDN, account or telemetry. Package the new mode under GitHub Pages subpath and verify local HTTP operation.
- Original industrial graphics and audio only; retain Apache-2.0 credits, engine pin and SHA receipts.

## Milestones and review gates

| ID | Work | Accept when |
| --- | --- | --- |
| **BH-000** | This proposal and implementer handoff | Owner accepts this direction; no runtime changed |
| **BH-001A** | Isolated authoritative hazard field + collision/replay tests | Sweep, lifecycle, overflow, collision oracle and 30/60/120 display parity pass |
| **BH-001B** | Playable boss arena, controls, music/effects, three phases and victory/defeat | Full browser play-through, input/teardown test, actual damaging bullets and boss defeated |
| **BH-002** | Optimize 64/128/256/512 hazard ladder where admitted; multi-profile evidence | Source-bound raw p50/p95/p99, parity and hardware/backend identity; no invented 60 FPS |
| **BH-003** | More patterns, optional modifiers and level authoring | Validated inert data, replay compatibility and independent owner approval |

Each implementation phase gets **its own PR**; no merge, release, tag or deployment without owner approval. These IDs are a parallel experimental programme, not a replacement for BS-003 onward.

## Minimum tests

- **Geometry:** fast crossing (no tunnelling), zero-length and zero-radius rejection, exact tangency, diagonal movement, two simultaneous hits, bounded invulnerability interval.
- **Patterns:** fixed-seed signature for fan/ring/spiral/curtain/sweep; hard spawn budget and deterministic overflow; phase transition at precise ticks.
- **Fairness:** for each required pattern, simulate a valid dodge path using the actual player body envelope and response delay; false visual/simulation hit radii fail.
- **Damage:** every recorded reduction has one accepted hazard/weapon event; no double application, phantom death or respawn damage.
- **Isolation:** existing BS-001 and BS-002 tests, deathmatch replays and `/Boomer-Shooter/` package must still pass unchanged.
- **Browser:** enter arena, move, aim, dodge, shoot boss, die, retry, finish a run, pause/blur/capture rejection, offline warmed run and ten mode switches with zero leaked tracked resources.
- **Performance:** at least 64/128/256 hazards with exact scenario/seed and real measured work; 512 is a stress goal, **not** a promised capability. Distinguish headless SwiftShader from native GPU.

## Evidence to preserve

The implementation PR should include exact SHA, module closure, original art origin, data/command fixtures, numerical test output, packaged Chromium screenshots, raw frame and tick samples, draw counts, hazard occupancy and budget/overflow counters, known unresolved native-device checks. If actual GPU timing or 60 FPS was not measured, say so.

**Bottom line:** the mode must be an actual first-person game with dangerous bullets, intelligible dodging and a boss that can be defeated. A glowing particle storm with no authoritative hit rules does not qualify.

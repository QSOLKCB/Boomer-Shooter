# BS-001 engine integration

The tagged tree resolves to `7a3a5a3ec49aed5b7063a05614951e69bb257da6`. Complete upstream bytes live under `vendor/vanillajs/`. Fourteen public modules, LICENSE and NOTICE have individual SHA-256 entries. To reproduce the integration offline with a local engine checkout containing the object:

```sh
python3 integration/vendor.py /path/to/VANILLAJS
node --test tests/provenance.test.mjs tests/combat.test.mjs
```

The generator reads immutable git blobs, resolves relative imports from the selected MODULES.json entry points, regenerates the consumer derivative and writes the receipt. Source and derived file hashes are checked at browser startup.

| Entry points | Use |
| --- | --- |
| mod-fps | Inert bounded geometry, weapons, bots and spawn admission |
| character, time, input | Shared swept character controller, fixed clock, keyboard and pointer adapters |
| weapon-feel, combat3d | Per-actor spread, aim, triggers, timers, impacts, damage, death/assist attribution |
| navigation | Four-neighbour routes across a 36 × 36 ground occupancy grid |
| render-webgl, audio2d | Retained static geometry, bounded dynamic submissions, local procedural PCM |
| Transitive closure | collision, math, mod-sdk, projectiles, weapons |

The FPS Lab and Block Arena Foundry were inspected as integration examples. The game owns its arena, bots, free-for-all rules, presentation and replay format. The public replay-audit module's 128-frame plan and unrelated vehicle/trajectory dependencies make it unsuitable for a five-minute match tape. BS-001 records game commands around the engine's fixed step.

## Armour pickup

At the pin, a living Combat3D actor has authoritative armour and damage absorption, but `combat.pickup(id,'armour',35)` throws `RangeError('pickup')`. The strict FPS pack accepts health and ammo supply locations. BS-001 validates an inert list of armour-pad IDs against admitted ammo pads, so positions, clearance and the eight-pickup capacity all use the base validator.

On 23 November 2026, the owner granted a BS-001-only exception for the existing `Combat3D.pickupArmour(id, amount)` at VANILLAJS v3.2.0. Game commit `c8f9559a56fbdd4fe915b2bc579b5b258c6cfd5e` identifies the approved implementation on PR #2. The generator and provenance test check the approved class digest independently. Further reusable changes follow the upstream PR and consumer pin review in [AGENTS.md](../AGENTS.md#upstream-pin-and-boundaries).

| Approved bytes | SHA-256 |
| --- | --- |
| Pinned `vendor/vanillajs/modules/combat3d/index.js` | `635ab98c2d654330c0d329c2f2cdbbab57ffde0b027d38cf554ccc10d1dc1c50` |
| Added method in `integration/armour-method.txt` | `5a2a33e20b3c7aecdc9c010f6a99731de64a46b13ed080c6bec8326a4dda30d7` |
| Generated `src/engine/combat3d.js` including its relative imports | `7208d9722b04418a06951c653960b7a9c9c10df6bf305f7d2c6643332d895223` |

Both humans and bots can replenish a living actor's armour up to 100. The pad enters cooldown and emits a pickup event only after granting a positive amount. A full or dead actor leaves it available to the next eligible claimant. The ordinary Combat3D damage path reads the restored armour on the next tick. See the absorption and pad-contention regressions in [combat](../tests/combat.test.mjs) and [match](../tests/match.test.mjs).

For comparison, Quake Team Fortress 2.9 checks armour points multiplied by absorption, applies class limits and lets an Engineer convert excess plate value to metal. Foundry plates replenish a single armour type. The full-bot regression above exercises the shared gameplay idea that an eligible rival can still claim a pickup after another combatant passes over it. The reference is `armor_touch` in `tf_29src.zip`, `ITEMS.QC` lines 328–422. [Archived Team Fortress 2.9 source](https://archive.org/details/tf_29src)

## Aim bounds

WeaponFeel quaternion rotation can return a component one binary64 unit past the Combat3D command boundary. One observed direction on the original route was `[-1.0000000000000002,0,9.95856552776786e-9]`. Combat3D validates each component before normalizing the vector, including on ticks without a shot. The consumer divides all components by the largest absolute component only when it exceeds one. This preserves the line of fire; Combat3D still normalizes and resolves the shot. The integration regression exercises the source rotation and strict admission.

Bots clamp pitch after adding their sampled aim error to the elevation of the last visible target. WeaponFeel accepts both endpoints of ±(π/2 − 0.01) radians. On the previous PR head, walking toward the nearest living rival failed at tick 1,677 in Node. Jumping every 42 ticks during the same pursuit failed at tick 2,784 in the opposite direction. The two regressions reach the respective endpoint and finish an ordinary ten-frag match using accepted player commands. [Match tests](../tests/match.test.mjs)

## Match contract

Each accepted tick validates the command, admits due respawns, generates bot decisions from the last published state, moves each living body once, publishes poses together, and submits every fire/reload request to one Combat3D step. The game then applies supplies in stable actor ID order and ranks the complete tick. The engine captures eligible shots before damage resolution, including trades. The initial seed, game rules and run-length encoded human commands reproduce the seeded rival commands.

Actors share the controller and weapon rules. The three bot profiles vary preferred range, movement speed, shot cadence, reaction and steering. They periodically test unobstructed sight, remember a last seen position, seek useful supplies, and route to occluded cover. Routes expand at most 256 cells per search. They navigate ground routes. The player can climb the west gantry's six quarter-metre stairs. Cover and floor contact use compiled pack solids. Machinery animation and surface trim are cosmetic. Body pushing, continuous slopes and multistorey pathfinding remain outside the controller contract.

A respawn skips physically occupied starts and maximizes nearest-rival distance minus seven metres per visible rival. Stable start order resolves ties. Each actor waits 108 ticks and uses the same rules. If every start is occupied the next tick retries. Each rematch uses the same initial seed for comparability.

Presentation interpolates actor positions between accepted ticks and snaps across deaths/respawns. Effects read Combat3D events. The clock accepts at most five updates per callback and discards excess wall-time debt. A pause releases input and clears the accumulator. Rematches reuse one static scene and audio bank. The optional audio path is capped at twelve active sources. Samples cover the most recent 4,096 frames and 8,192 ticks.

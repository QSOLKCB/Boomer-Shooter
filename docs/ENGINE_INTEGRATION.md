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

The isolated proposal in `integration/armour-method.txt` adds one operation on the private authoritative actor. A living actor can replenish armour up to 100. A dead/full actor receives zero. Calls validate the amount and actor ID. The generated consumer class differs only by this method and relative import locations. Existing engine damage, ammo, scoring and respawn code executes unchanged. A separate upstream proposal could admit the armour kind in the public pickup and pack APIs. The minimal reproduction, damage parity and actual absorption regression are in `tests/combat.test.mjs`.

## Cardinal aim

WeaponFeel quaternion rotation can return a component one binary64 unit past the Combat3D command boundary. One observed direction on the original route was `[-1.0000000000000002,0,9.95856552776786e-9]`. Combat3D validates each component before normalizing the vector, including on ticks without a shot. The consumer divides all components by the largest absolute component only when it exceeds one. This preserves the line of fire; Combat3D still normalizes and resolves the shot. The integration regression exercises the source rotation and strict admission.

## Match contract

Each accepted tick validates the command, admits due respawns, generates bot decisions from the last published state, moves each living body once, publishes poses together, and submits every fire/reload request to one Combat3D step. The game then applies supplies in stable actor ID order and ranks the complete tick. The engine captures eligible shots before damage resolution, including trades. The initial seed, game rules and run-length encoded human commands reproduce the seeded rival commands.

Actors share the controller and weapon rules. The three bot profiles vary preferred range, movement speed, shot cadence, reaction and steering. They periodically test unobstructed sight, remember a last seen position, seek useful supplies, and route to occluded cover. Routes expand at most 256 cells per search. They navigate ground routes. The player can climb the west gantry's six quarter-metre stairs. Cover and floor contact use compiled pack solids. Machinery animation and surface trim are cosmetic. Body pushing, continuous slopes and multistorey pathfinding remain outside the controller contract.

A respawn skips physically occupied starts and maximizes nearest-rival distance minus seven metres per visible rival. Stable start order resolves ties. Each actor waits 108 ticks and uses the same rules. If every start is occupied the next tick retries. Each rematch uses the same initial seed for comparability.

Presentation interpolates actor positions between accepted ticks and snaps across deaths/respawns. Effects read Combat3D events. The clock accepts at most five updates per callback and discards excess wall-time debt. A pause releases input and clears the accumulator. Rematches reuse one static scene and audio bank. The optional audio path is capped at twelve active sources. Samples cover the most recent 4,096 frames and 8,192 ticks.

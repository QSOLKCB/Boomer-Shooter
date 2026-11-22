# BH-001A / Reactor authority

Base game 9e7bd6587cfeda77f18061c5bb2c09fa26723a99. Engine sources and SHA-256 closure are in vendor/vanillajs/manifest.json at v3.2.0, 7a3a5a3ec49aed5b7063a05614951e69bb257da6. The new encounter imports character, collision, math and weapons, and shares the existing accepted-command encoding. It owns the two health values. No engine patches.

At 60 Hz, sample the command, move the operator, resolve a forward core shot, then emit and advance the current plan. Every hazard uses a closed axis-aligned box with the dimensions specified by the pattern. Intersect relative linear paths from both bodies' endpoints over that tick. The court has a solid floor and boundary rails, with no intervening cover. The rail at the machinery separates walking space from the core and lets energy through. An operator shot that destroys the core takes priority. Otherwise the earliest hazard contact outside the 36-tick invulnerability window costs 20 HP. All overlapping projectiles expire even inside that window. The enrage level follows core health immediately. The current attack completes using its announced speed and lane before the next attack adopts the new level.

The normal field holds 256 live slots. The first 48 valid emissions per tick can enter while a slot is free. Overflow increments a rejection counter without consuming an ID. Live entries compact in ID order. Each accepted shape has bounded life. Five minutes ends the run on the reactor timer. The command tape has at most 18,000 rows before run-length encoding.

The v1 replay binds a uint32 seed, accepted commands and a rolling 32-bit checksum of each tick's events and state, including live hazard coordinates and extents. This checksum detects ordinary replay divergence within the producing runtime. It is not a cryptographic integrity signature. The separate end-state record identifies phase, plan, hit points and outcome.

## Verification

Run with Node 24.22.3 from the repository root.

```sh
node --test tests/*.test.mjs
node scripts/verify-replay.mjs evidence/bs-001/node-reference-replay.json
```

The new tests compare 4,096 seeded moving layouts to an independent face-crossing oracle, exercise inclusive grazing and simultaneous contact, enforce spawn and lifetime budgets, pin all five emission sequences, and show each pattern damaging a stationary body while an actual controller path survives it. Replay runs complete at three draw schedules. The recorded output includes the pre-existing Deathmatch and provenance suite and the archived 4,220-tick Deathmatch replay.

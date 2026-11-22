# Performance programme — push VANILLAJS, measure the limits

A fun arcade shooter is the first objective. The second is a repeatable evidence-led characterization of VANILLAJS's FPS performance under escalating load. **A 60 FPS 1080p target is a design aspiration, not a claim or merge gate until native GPU evidence defines a realistic baseline.** Correctness, visible quality and game feel remain constraints.

## Workload ladder

Start every profile from an exact pinned engine/game source, fixed match arena and seed. Measure a **reference scene** with 1 human + 3 CPU actors; add heavier cases only if they remain inside verified pack and combat limits.

| Workload | Fixed variables | What to observe |
| --- | --- | --- |
| P0 — idle arena | 1 player, geometry, no AI fire | baseline render submissions, visibility, VRAM, warm-up |
| P1 — normal deathmatch | 1 human + 3 CPU, standard weapon/pickup mix | real gameplay p50/p95 intervals, JS update cost, fairness and dropped ticks |
| P2 — bot ladder | 1, 2, 3, 4, 6, 8 bots where independently valid | route expansions, visibility ray work, draw calls, combat work |
| P3 — projectile / explosion pressure | bounded launch intervals, real near-maximum active projectiles | simultaneous collision/event work, overflow rejections, disposal |
| P4 — visual density | same authoritative tape, conservative high/low renderer, lit meshes/particles | draw calls, shader/frame time where measurable, visual quality and view accuracy |
| P5 — lifecycle torture | ten rematches/arena reloads and focus losses | buffers/listeners retained, memory growth, stale worker, safety and exact replay |

The pinned `Combat3D` has 16 actors total and 64 active projectiles; `mod-fps` permits at most 8 bot spawns. Do not exceed caps or invent unlimited participants to create an impressive chart. A workload may be rejected by stricter combined limits; document rejection.

## Measurement protocol

- Preserve one canonical 60 Hz simulation, same seed/config/tick commands and same source hash between A/B renderer trials.
- Record OS/kernel, CPU, GPU/driver, browser/version, graphics backend, device-pixel ratio, viewport and actual drawing-buffer resolution.
- Record warm-up count, frame sample count, profiling interval, p50/p95/p99 frame intervals, JS callback duration, simulation step count, dropped/bounded-catch-up ticks, draw calls (if instrumented), entity/projectile counts and app memory estimates only when the API can actually observe them.
- Hosted headless Chromium, SwiftShader, physical NVIDIA hardware and manually played sessions are distinct test environments. RAF cadence is **not** GPU execution duration; JS callback is **not** asynchronous GPU completion time.
- A steady observed frame interval near 16.7 ms is not proof of complete 60 Hz GPU rendering. Use appropriate GPU query instrumentation if available and disclose its limitations.
- Collect raw sample CSV/JSON and SHA-256 digests with an exact source/config receipt. Include screenshots and visible artefact review.
- Repeat with alternate order of A/B profiles, check stability and run numerical parity tests after every optimization.

## Optimization priorities

First remove correctness defects and input latency. Then profile scene/texture setup, static batching, conservative visibility, retained meshes, CPU work allocation, AI route and line-of-sight query scheduling, and renderer resolution profiles. The [OPT catalog](https://github.com/QSOLKCB/OPT) offers possible mechanisms but is **not evidence** that this game gains speed. Adopt only under measured and independent equal-behaviour tests.

Preserve an uncomplicated low-graphics profile; aggressive culling must be conservative (never hide a relevant hittable actor or collision in the authority system). An apparent FPS boost that changes accepted shots, bot target choice or score is **a regression**.

## Future reports

Store measured results under `evidence/` (with source commit and test inputs) when they exist. No synthetic 'benchmark passes', invented GPU readings, hard-coded victory chart or unverified performance badges are allowed. Current status: **no game benchmark executed**.

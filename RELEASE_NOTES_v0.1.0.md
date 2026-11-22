# BOOMER-SHOOTER v0.1.0 — THE FOUNDRY PIT: FIRST BLOOD

**Proposed first public release — ready for owner review and manual tagging.**  
**Project:** [QSOLKCB/Boomer-Shooter](https://github.com/QSOLKCB/Boomer-Shooter)  
**Play:** https://qsolkcb.github.io/Boomer-Shooter/  
**Included milestones:** BS-000, BS-001, GitHub Pages publication and BS-002 (merged PRs #1–#4).  
**Feature baseline:** `a44cdb830edb4bf8600a8716cc7cb5a7ccd8e78a` (merge of PR #4 on 22 November 2026).  
**Release tag:** **NOT CREATED**. After reviewing and merging this documentation PR, tag the **accepted current main**; do not tag the historical feature baseline if the intended release includes the documentation updates.

## First blood

**One human. Three rival machines. One industrial pit.**

BOOMER-SHOOTER's first release candidate turns a brand-new repository into **The Foundry Pit**, an original, offline-first arena FPS built on **VANILLAJS v3.2.0**.

Fight **Kiln**, **Vise** and **Flux** in a true free-for-all: the machines target, damage and eliminate one another as well as the human. A first-to-10-frags or five-minute match ends in a ranked scoreboard, with a one-action rematch.

### The playable game — BS-001 (PR #2)

- One handcrafted industrial foundry arena with traversable cover, gantry steps, supply points, procedural geometry and a coherent first-person visual identity.
- Three distinct **Combat3D-backed weapons**: precision **Rivet Rifle** hitscan, sustained **Arc Repeater** and the travelling, explosive **Slag Launcher**.
- Three seeded CPU rivals with ground-path routing, line-of-sight checks, target acquisition, distinct aggression, cover decisions, pickups and real CPU-versus-CPU eliminations.
- Authoritative 60 Hz combat; wall occlusion, ammo/reload, splash/self-damage, armour absorption, kill/death attribution, 108-tick respawn and deterministic tie policy.
- Health, armour and ammunition pickups, score and kill feed, HUD, pause, match results, game-over/restart, and optional locally synthesized sound.
- Versioned accepted-command replay with re-execution of canonical state/event digests **within the same runtime**.
- Exact **VANILLAJS v3.2.0** pin, complete public-module vendoring closure and per-file SHA-256 receipt; one tightly scoped, owner-approved consumer armour pickup derivative.

### Browser delivery — GitHub Pages (PR #3)

- Self-contained native-ES-module runtime packaged for `/Boomer-Shooter/` and published to GitHub Pages from `main`.
- Pages CI runs the Node test suite before packaging; deployment never occurs from PR branches.
- A source-revision marker identifies the published content. The successful [BS-002 post-merge deployment](https://github.com/QSOLKCB/Boomer-Shooter/actions/runs/45036209648) targets merge commit `a44cdb830edb4bf8600a8716cc7cb5a7ccd8e78a`.
- No account, telemetry, CDN, npm runtime dependency or cloud match server. Once cloned, local gameplay requires only a loopback HTTP server; no service-worker offline cold-start claim.

### Arcade feel and input safety — BS-002 (PR #4)

- **One-click mouse capture** on entry, resume and rematch: the authoritative clock stays stopped until the requested pointer capture is granted and the initiating gesture released. Explicit retry and drag/keyboard fallback if capture fails.
- **Arcade / Classic** movement presets with faster strafe/jump tuning for Arcade, plus a six-tick jump request window that cannot leak across cancellation or death.
- Right mouse / Q **aim-down-sights**, weapon-specific flashes and impacts, clearer elimination feedback, incoming-damage bearing and position-sensitive procedural shot audio.
- **Easy, Normal, Hard** bot skill presets with documented reaction timing and seeded aim dispersion, without granting artificial damage or bypassing cover.
- Safer respawn placement, faster health-pad availability, ammunition grants contingent on actual reserve use and deterministic supply contention.
- Replay **format 2** records tuning and difficulty while remaining compatible with historical BS-001 **format 1** tapes.
- Browser regressions address cursor-warp-on-capture, unwanted opening shots, off-window key releases, focus/pointer cancellation, context restoration, rematch resource disposal and visual readability near explosions.

## Verification and evidence

These results are **executed historical evidence**, not a fresh test run of this documentation PR.

- **28 consumer tests passed** using Node **24.22.3** in the recorded BS-002 execution.
- Chromium drove a real deathmatch and recorded **11 rival-versus-rival eliminations**. Kiln reached 10 frags at tick **3,619**. The producing Chromium verified the saved replay and restarted a fresh match offline.
- A separate browser test held mouse capture pending/rejected for two seconds: tick, health, score and replay remained unchanged until deliberate admission; capture retry and drag fallback were exercised.
- After ten new matches, recorded teardown reported zero tracked WebGL buffers/programs, audio voices or pending game frames.
- [BS-001 verification](evidence/bs-001/README.md) documents an earlier 19-test review, pinned upstream 1,397-test run, genuine bot-on-bot death receipts, offline gameplay, movement/combat testing and provenance hash verification.
- [BS-002 evidence](evidence/bs-002/README.md) includes actual run logs, screenshots, accepted replays, system identification, raw 1080p samples and reproduction commands.
- [GitHub Pages CI passed](https://github.com/QSOLKCB/Boomer-Shooter/actions/runs/45036209648) on the merge of PR #4.

### Performance: precise scope

The BS-002 comparison used **Chrome Headless Shell 151.0.7922.34**, **ANGLE/Vulkan SwiftShader**, a **1920 × 1080** drawing buffer at DPR 1, one human and three CPU competitors. Source- and runtime-bound samples cover 600 simulation ticks after warm-up.

| Observed metric (p50 / p95) | BS-001 control | BS-002 Arcade |
| --- | ---: | ---: |
| Render callback interval | 166.7 / 366.7 ms | **100.1 / 250.0 ms** |
| JavaScript frame callback | 6.3 / 29.5 ms | 9.1 / 18.2 ms |
| Individual simulation step | 0.8 / 6.6 ms | 1.0 / 5.4 ms |

This is **software-rendered, shared-host browser evidence**. The source/ruleset and CPU fighting outcomes differed, and the control overlapped other development work. These numbers **do not prove a general performance gain, hardware GPU render time or sustained 1080p/60 FPS**. Raw observations are preserved in [BS-002 evidence](evidence/bs-002/README.md#1080p-reference).

### Known limits / next engineering gates

- **Only one arena and three live CPU opponents** are implemented. Eight-bot scaling and the multi-arena suite are **BS-003+ work**, not included in v0.1.0.
- The engine's published bounds include **16 Combat3D actor slots**, **64 live projectiles** and **256 combat solids**, but the stricter FPS content validator also applies.
- Real physical-GPU 1080p performance, owner's mouse-feel evaluation, audible-mix assessment, additional browser families and release sign-off are outstanding.
- Same-runtime replay equality is supported; **Node and Chromium Float64 hashes differ** even when final scores/tick agree.
- Static world contact is not a general rotating-body, slope or multilevel AI navigation solver. Audio is optional, and uncaptured mouse mode uses explicit drag/keyboard aim.
- The project is offline-first, but **cold local browser starts require the local HTTP server**; there is no service-worker promise.

## Install / play

[**Play on GitHub Pages**](https://qsolkcb.github.io/Boomer-Shooter/), or run from a local clone:

```sh
git clone https://github.com/QSOLKCB/Boomer-Shooter.git
cd Boomer-Shooter
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. Click **Enter the pit**, or select **Play without capture** if pointer lock is unavailable. Use WASD, mouse/arrow aim, F or left click to fire, Space to jump, R to reload and 1–3 to change weapons. Options provides Arcade/Classic movement, CPU skill, sound and match limits.

## Exact source, history and thanks

- [PR #1](https://github.com/QSOLKCB/Boomer-Shooter/pull/1) — BS-000: project charter and ChatGPT Work handoff.
- [PR #2](https://github.com/QSOLKCB/Boomer-Shooter/pull/2) — BS-001: complete playable arena deathmatch.
- [PR #3](https://github.com/QSOLKCB/Boomer-Shooter/pull/3) — GitHub Pages publication and packaging.
- [PR #4](https://github.com/QSOLKCB/Boomer-Shooter/pull/4) — BS-002: arcade feel, capture lifecycle, skill tuning and browser regressions.
- [Engine licence/provenance](docs/ENGINE_INTEGRATION.md) — pinned [VANILLAJS v3.2.0](https://github.com/QSOLKCB/VANILLAJS/releases/tag/v3.2.0), commit `7a3a5a3ec49aed5b7063a05614951e69bb257da6`.
- [Credits](CREDITS.md) — original procedural scenery, audio, UI and game content.

**QSOL-IMC — THIS IS NOT A PRODUCT. THIS IS INDEPENDENCE.**

*Apache-2.0. No release tag or GitHub Release has been created by this documentation change.*

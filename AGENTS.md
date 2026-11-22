# BOOMER-SHOOTER — Instructions for ChatGPT Work and agents

Read `README.md`, `ROADMAP.md`, `docs/WORK_HANDOFF.md`, `docs/ENGINE_BASELINE.md` and `docs/ACCEPTANCE.md` before changing code. This file is policy, not proof of implementation.

## Product definition

- **Genre:** offline-first **single-human-player versus CPU arena FPS**, primarily free-for-all deathmatch. CPU opponents must fight one another as well as the player. It is **not** a campaign shooter, multiplayer service or benchmark with fake combat.
- First vertical slice: one human versus three active bots, a complete match/rematch loop, one authored arena, three real weapons and meaningful pickups.
- Expand toward 1–8 bots only with resource and gameplay evidence; do not exceed the experimental `mod-fps` pack and `combat3d` limits without a reviewed architecture change.
- Original industrial sci-fi arena, clean visual silhouettes, responsive controls, hard-earned wins, no existing shooter IP or copied copyrighted content.

## Upstream pin and boundaries

- **VANILLAJS v3.2.0:** immutable commit **`7a3a5a3ec49aed5b7063a05614951e69bb257da6`**. Read the pinned `MODULES.json` and exported source APIs. Do **not** follow VANILLAJS `main`, assume an unreleased feature or treat a demo-owned helper as a stable public interface.
- Game-specific AI, arena layout, spawn strategy, scoreboard, match rules, UI and original media belong here. Reusable engine extensions belong upstream via a separate owner-approved PR, with a corresponding reviewed pin update here.
- Native browser ES modules, local self-contained assets and browser standards first. No npm **runtime** dependencies, Node frameworks, CDNs, telemetry, accounts, cloud backends, Docker, Kubernetes, implicit network calls or third-party engine.
- Existing Node CLI commands may be used for verified upstream development/test tasks; no dependency manager or bundler should be required to *play*.
- Preserve applicable Apache-2.0 LICENSE and NOTICE, third-party attribution, and source-file hashes in a local vendoring receipt.

## Non-negotiable correctness rules

1. **Simulation authority:** a single canonical game tick at **60 Hz** compatible with `Combat3D.step`. Accepted commands are applied exactly once. Draw calls, camera animation, sound and particles must never decide authoritative damage, score, hit positions or bot targeting.
2. **Bounded resources:** finite coordinates/timers, bounded actors/projectiles/geometry, stable ID sorting, strict validated inert level/weapon data and atomic rejection of invalid replacements. A reject must not half-change the match.
3. **Fair bots:** bots use the same combat/damage/occlusion logic as the human. They must acquire actual targets, respect reaction/cooldown rules, be able to hit and kill each other, and not spawn fire through solid cover or use fake direct HP subtraction.
4. **Lifecycle:** pause, blur, tab hide, pointer-lock release, key release outside browser focus, gamepad disconnect (if supported), restart and map change must clear held/pending inputs and discard stale wall-time debt. Resume must not create phantom shots or motion.
5. **Numerics and collision:** metres, right-handed, +Y up, −Z forward, feet-centred upright character; preserve engine contact and hit ordering. Avoid visually hiding wall penetration. Document any unsupported slopes, rotating geometry or multi-storey navigation.
6. **Replay:** version/seed/accepted command tape and a re-executed event/state digest, with concrete same-runtime scope. Never promise cross-browser exactness or cross-version portability without evidence.
7. **Performance:** profile real scenes and preserve a numerical parity oracle before optimizing; distinguish hosted headless SwiftShader evidence from local physical-GPU FPS. Never claim 60 FPS based only on callback intervals.
8. **Failure paths:** cover WebGL unavailable, audio unavailable/user-gesture gating, bad/oversize packs, repeated restarts, hidden tab and cleanup of GPU/audio/RAF/listeners.
9. **Source trust:** data-only packs cannot contain executable scripts, `eval`, getters, arbitrary URLs or prototype keys; no secrets or assets from unreviewed external origins.
10. **Evidence honesty:** tests not executed are **untested**, not passing. Record exact source SHA and outcomes. Correctness outranks speed.

## Development and review workflow

- Start with `BS-001` as defined in `docs/WORK_HANDOFF.md`. Deliver a **runnable** vertical slice, not a long speculative design report.
- Small PRs with tests and actual browser demonstrations. Separate planned work from finished work in README/ROADMAP and attach minimal reproduction for defects.
- Before any engine API change, run tests from the exact upstream checkout, including `node --test tests/*.test.js`, `node scripts/check.js` and `node scripts/build.js`, where applicable. Consumer tests do not establish upstream CI passage.
- Validate gameplay determinism at distinct rendering schedules, physical player input, damage occlusion, bot combat, death and respawn, offline subpath and stale service worker behaviour.
- On every PR, report: base/head SHAs; files; actual tests; tested browsers/hardware; screenshots/evidence; known limitations; scope of any upstream fixes.
- **Do not merge, release, tag, deploy, change branch protection, run unreviewed PR code on owner hardware or edit VANILLAJS/OPT/Games2/AFTER-ZERO** without explicit owner authorization.

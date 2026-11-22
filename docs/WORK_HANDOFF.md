# ChatGPT Work — BS-001 implementation handoff

**Destination:** [QSOLKCB/Boomer-Shooter](https://github.com/QSOLKCB/Boomer-Shooter).
**Historical BS-000 assignment.** BS-001 now has a [playable runtime and launch guide](../README.md).
**Upstream:** VANILLAJS release **v3.2.0 — SEDIMENT & SIGNAL**, exact tagged commit `7a3a5a3ec49aed5b7063a05614951e69bb257da6`.

## Assignment

Build a **complete, runnable, offline-first CPU arena shooter vertical slice** using the pinned public VANILLAJS engine interfaces. The player is the **single human** in a free-for-all deathmatch against **three CPU-controlled rivals**. Bots must target, damage and eliminate **one another as well as the player** using the same real collision, combat and scoring rules.

This is explicitly **not** a single-player story campaign, online multiplayer game, mock FPS renderer or benchmark-only prototype. The game should feel like a satisfying, fast, old-school industrial-science-fiction arena shooter while producing reproducible evidence of what VANILLAJS can and cannot currently do.

Before making changes, read repository `AGENTS.md`, `ROADMAP.md`, `docs/GAME_DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/ENGINE_BASELINE.md`, `docs/ACCEPTANCE.md`, `docs/PERFORMANCE.md` and `docs/PROVENANCE.md`. Preserve their authority and document any concrete incompatibility in the PR.

## Engine adoption

1. Verify that the release tag really resolves to `7a3a5a3ec49aed5b7063a05614951e69bb257da6`; inspect the pinned `MODULES.json`, `BUILD_A_GAME.md`, `api/fps/example.js`, `docs/FPS_FOUNDATION_001.md`, `docs/WEAPON_FEEL.md`, `docs/FPS_LAB.md` and actual source exports.
2. Resolve the **complete transitive import closure** of public modules needed for fixed time, grounded movement, collisions, input, weapons, `combat3d`, optional `weapon-feel`, navigation, game-selected rendering and optional procedural audio. Do not treat demo-owned helpers as reusable engine interfaces.
3. Vendor only the required source bytes, preserving relative paths, upstream LICENSE and NOTICE. Check in a machine-readable manifest with source commit, per-file SHA-256, module list and explicit local changes. Never follow mutable upstream `main` or a runtime CDN.
4. Read the pinned limits before designing encounters: `Combat3D` supports at most 16 actors total, 256 solids and 64 live projectiles; `mod-fps` packs allow at most eight bot spawns with stricter arena constraints. Start with **one human plus three CPU rivals** and stay well inside the actual validated capacities.

## Required first vertical slice

- **A complete first-person arena match:** one original industrial map, readable combat loops, actual collision, cover and useful verticality using engine-supported geometry.
- **Controls:** WASD, reliable mouse look and click, jump/strafe, pause/resume, weapon switch/reload, rematch; sensitivity/audio options and safe focus/pointer-lock cancellation.
- **Three functional weapon archetypes:** precision hitscan (working name Rivet Rifle), automatic repeater (Arc Repeater), real travelling projectile with splash (Slag Launcher), backed by the pinned combat/weapon system rather than visual-only shots. Real ammo/cooldowns, impacts, damage attribution and occlusion.
- **AI:** three visibly distinct machine bots (aggressive, cautious, opportunist) with bounded seeded behaviour, navigation, line of sight, fair reaction time and real firing/death. **Demonstrate a bot killing another bot**, not just each bot shooting the player.
- **Arcade match rules:** free-for-all, default **first to 10 frags or five minutes**, health/armour/ammo pickups, limited/safe respawn, kill feed and ranked scoreboard, end screen and immediate rematch. Stable tie resolution and actual combat event attribution.
- **Presentation:** high-contrast original industrial sci-fi visuals, clear damage/weapon feedback, HUD, legible opponent silhouettes, original procedural sound/music where feasible, and clean audio failure fallback. Don't delay basic gameplay behind graphics tooling.
- **Determinism:** one authoritative 60 Hz tick compatible with `Combat3D.step`; fixed input ordering, explicit seeds, recorded commands and independently re-executed state/event receipts. Render pacing must not alter scoring.
- **Offline launch:** native ES modules served on a real local HTTP origin, subpath-safe packaging, no account or internet requirement, WebGL support/failure UI, explicit audio gesture. Test installed/offline reload if using a service worker.
- **Verification:** unit/integration tests for occlusion, combat, bot-versus-bot scoring, pickups, death/respawn, pause/blur, invalid input/content, match finish/tie, replay parity and resource exhaustion; at least one real packaged browser interaction with screenshots and console errors captured.

## Evidence and performance

Establish a **measured reference scene** (1 human + 3 bots) before any ambitious optimization. Later scaling (1, 2, 3, 4, 6 and 8 bots, where validated) is a separate milestone. For each run record exact game SHA and engine pin, seed/tape, browser/backend, render resolution, elapsed/warm-up/samples, real frame-interval p50/p95 and JavaScript callback times, simulation tick counts and correctness results. Keep physical GPU evidence distinct from headless SwiftShader and do not claim 1080p/60 FPS as achieved without measuring on hardware.

Profile and improve **only while preserving authoritative outcomes**. The OPT repository is optional advice, not a runtime dependency or proof of a speedup. Document a minimal reproducer for any engine API/limit blocker; do not silently modify VANILLAJS or raise hard-coded capacity limits.

## Working method and PR output

Prefer a small, shippable executable over abstract plans. Make **one reviewable BS-001 PR** to `main` with a running vertical slice, exact base/head SHAs, vendor receipt, implementation summary, tests actually executed, browser and offline observations, known limitations and proposed follow-up. If truly necessary, split into **BS-001A** (arena boot/movement/combat/bot-vs-bot) and **BS-001B** (full match flow/replay/packaging), with each PR independently runnable and tested.

Do **not** merge, tag, publish, deploy, edit VANILLAJS/OPT or invoke owner-only runners without explicit owner authorization. Owner gameplay and release sign-off remain independent of automated tests.

## Ready-to-paste Work instruction

> Implement BS-001 in QSOLKCB/Boomer-Shooter as a playable offline-first arena deathmatch: one human vs three CPU-controlled opponents in free-for-all, including real bot-versus-bot kills, three distinct VANILLAJS-backed weapons, pickups, respawns, scoreboard, ten-frag/five-minute end conditions and rematch. Follow AGENTS.md and docs/WORK_HANDOFF.md, using immutable VANILLAJS v3.2.0 commit 7a3a5a3ec49aed5b7063a05614951e69bb257da6. Build the minimal complete public module closure with provenance hashes, original visuals/audio, deterministic fixed-step replay, rigorous tests and packaged browser/offline evidence. Submit a reviewable PR only. Do not merge, tag, deploy or change upstream repos.

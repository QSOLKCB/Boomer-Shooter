# Arena Shooter Roadmap

**Planning baseline:** VANILLAJS `v3.2.0` at `7a3a5a3ec49aed5b7063a05614951e69bb257da6`. All implementation phases below are **not started** until their actual evidence is attached. Every milestone should be owner-reviewed in a separate PR.

| Phase | Deliverable | Exit gate |
| --- | --- | --- |
| **BS-000 — Arena charter** | This PR: README, AGENTS, handoff, architecture, engine audit, test/performance/licence policy | Owner accepts the direction and contract |
| **BS-001 — Deathmatch vertical slice** | Original single arena; one human versus 3 CPU bots; three weapons; pickups, health/armour; actual frags, respawns, win/lose scoreboard, rematch | Runnable, real combat, test suite, replay, offline browser check, owner play-through |
| **BS-002 — Arcade movement & combat feel** | Fast tuned strafe/jump movement within validated engine capabilities, weapon impact feedback, clearer enemy attacks, bot difficulty, spawn safety, health/ammo balancing | A/B gameplay tests, fairness regressions, keyboard/mouse lifecycle and frame evidence |
| **BS-003 — Arena expansion** | At least 3 original arenas with distinct sightlines, ramps/elevation/cover, bot skill presets, configurable bot counts up to verified pack limits | Every level playable, navigable, spawns valid, correct line-of-sight and replay |
| **BS-004 — Arena Foundry** | Validated level/weapon/bot tuning packs, in-browser editing or explicit JSON tooling, import/export, user presets | Invalid files reject without altering live match; source/rights/provenance preserved |
| **BS-005 — Engine Torture Chamber** | Stress modes for bots, projectiles, static geometry, lit rendering, visibility and repeated arena transitions; OPT-inspired A/B tuning | Canonical parity, auditable p50/p95 frame evidence, resource counters and exact device/source receipts |
| **BS-006 — Release candidate** | Robust offline bundle, options, manuals, credits, CI, full gameplay regression, fixed replay examples | Owner accepts gameplay/performance; tagging and publishing separately authorized |

## BS-001 functional checklist

- [ ] Local browser startup with a real playable first-person camera and unsupported-renderer fallback.
- [ ] One original arena, readable spawns and cover with actual body/world contact.
- [ ] Player movement, aim, jump/strafe; key and pointer-lock cancellation on focus loss and resume.
- [ ] Three **engine-backed** weapon types: precision hitscan, sustained automatic and travelling explosive projectile.
- [ ] Three active CPU rivals, capable of navigating, shooting, killing each other and the player using the same `Combat3D` API.
- [ ] Health/armour/ammo pickups, ammo/reload/cooldowns, damage/death, score attribution, timed respawn and safe re-entry.
- [ ] Free-for-all frags, configurable target (default first to **10**) and match clock (default **5 minutes**), deterministic winner/tie policy, match summary and one-action rematch.
- [ ] HUD for health, armour, ammo, leader/frag score, time and match status; audio opt-in and options.
- [ ] Seeded deterministic accepted-command capture/replay; substantive numerical tests including bot-v-bot damage.
- [ ] Real packaged browser play-through, offline test and exact dependency/provenance manifest.

## Stretch ideas, **not** BS-001 promises

Optional speed modifiers, advanced vertical routes, additional arenas, clever enemy coordination, environmental hazards, bot personality profiles, local leaderboard, offline bot tournament, procedurally synthesized soundtrack and strictly bounded `material-grid` effects. Do not call these completed before implementation. Multiplayer/online lobbies are out of scope.

## Promotion and ownership

When a resource limit or API gap appears, record the minimal reproducer and actual budget first. A game-owned adapter is preferable for game-specific rules. Upstream VANILLAJS changes require their **own** reviewed tests and PR. Never raise module constants blindly or quietly re-pin the engine. The owner decides when PRs merge and releases are tagged.

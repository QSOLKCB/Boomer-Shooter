# Arena Shooter Roadmap

**Engine baseline:** VANILLAJS `v3.2.0` at `7a3a5a3ec49aed5b7063a05614951e69bb257da6`. BS-000 was merged. BS-001 is playable and submitted for owner review. BS-002 through BS-006 remain open.

| Phase | Deliverable | Exit gate |
| --- | --- | --- |
| **BS-000 — Arena charter** | Planning PR #1: README, AGENTS, handoff, architecture, engine audit, test/performance/licence policy | Owner accepts the direction and contract |
| **BS-001 — Deathmatch vertical slice** | Original single arena; one human versus 3 CPU bots; three weapons; pickups, health/armour; actual frags, respawns, win/lose scoreboard, rematch | Runnable, real combat, test suite, replay, offline browser check, owner play-through |
| **BS-002 — Arcade movement & combat feel** | Fast tuned strafe/jump movement within validated engine capabilities, weapon impact feedback, clearer enemy attacks, bot difficulty, spawn safety, health/ammo balancing | A/B gameplay tests, fairness regressions, keyboard/mouse lifecycle and frame evidence |
| **BS-003 — Arena expansion** | At least 3 original arenas with distinct sightlines, ramps/elevation/cover, bot skill presets, configurable bot counts up to verified pack limits | Every level playable, navigable, spawns valid, correct line-of-sight and replay |
| **BS-004 — Arena Foundry** | Validated level/weapon/bot tuning packs, in-browser editing or explicit JSON tooling, import/export, user presets | Invalid files reject without altering live match; source/rights/provenance preserved |
| **BS-005 — Engine Torture Chamber** | Stress modes for bots, projectiles, static geometry, lit rendering, visibility and repeated arena transitions; OPT-inspired A/B tuning | Canonical parity, auditable p50/p95 frame evidence, resource counters and exact device/source receipts |
| **BS-006 — Release candidate** | Robust offline bundle, options, manuals, credits, CI, full gameplay regression, fixed replay examples | Owner accepts gameplay/performance; tagging and publishing separately authorized |

## BS-001 functional checklist

- [x] Local browser startup with a real playable first-person camera and unsupported-renderer fallback.
- [x] One original arena, readable spawns and cover with actual body/world contact.
- [x] Player movement, aim, jump/strafe; key and pointer-lock cancellation on focus loss and resume.
- [x] Three **engine-backed** weapon types: precision hitscan, sustained automatic and travelling explosive projectile.
- [x] Three active CPU rivals, capable of navigating, shooting, killing each other and the player using the same `Combat3D` API.
- [x] Health/armour/ammo pickups, ammo/reload/cooldowns, damage/death, score attribution, timed respawn and safe re-entry.
- [x] Free-for-all frags, configurable target (default first to **10**) and match clock (default **5 minutes**), deterministic winner/tie policy, match summary and one-action rematch.
- [x] HUD for health, armour, ammo, leader/frag score, time and match status; audio opt-in and options.
- [x] Seeded deterministic accepted-command capture/replay; substantive numerical tests including bot-v-bot damage.
- [x] Real packaged browser play-through, offline test and exact dependency/provenance manifest.

The hosted [BS-001 evidence](evidence/bs-001/README.md) accompanies the slice. Owner play-through and a native 1080p GPU profile remain open.

## Stretch ideas, **not** BS-001 promises

Optional speed modifiers, advanced vertical routes, additional arenas, clever enemy coordination, environmental hazards, bot personality profiles, local leaderboard, offline bot tournament, procedurally synthesized soundtrack and strictly bounded `material-grid` effects. Do not call these completed before implementation. Multiplayer/online lobbies are out of scope.

## Promotion and ownership

When a resource limit or API gap appears, record the minimal reproducer and actual budget first. A game-owned adapter is preferable for game-specific rules. Upstream VANILLAJS changes require their **own** reviewed tests and PR. Never raise module constants blindly or quietly re-pin the engine. The owner decides when PRs merge and releases are tagged.

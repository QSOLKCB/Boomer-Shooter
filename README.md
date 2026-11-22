# BOOMER-SHOOTER

**One human. A pit full of CPU opponents. No excuses.**

An original, high-speed, offline-first arena FPS powered by [VANILLAJS v3.2.0](https://github.com/QSOLKCB/VANILLAJS/releases/tag/v3.2.0). Built to be fun to play **and** to push the VANILLAJS engine with reproducible benchmarks rather than invented performance claims.

> **Status: pre-production.** This repository currently specifies the game and implementation contracts. The playable runtime is not implemented yet.

## The pitch — THE FOUNDRY PIT (working title)

Enter a brutal industrial science-fiction arena. One human player fights CPU-controlled combatants in an old-school free-for-all deathmatch. Bots may target and kill **each other** as well as the human. Fast strafing, deliberate jumps, weapon switching, cover, elevated routes, health/armour/ammo pickups and satisfying respawns determine who reaches the frag limit first. Original characters, geometry, effects, audio and names only; no borrowed franchise assets.

**First playable:** one complete arena, one human versus **three bots**, three genuinely distinct weapons, configurable match length/frag target, real line-of-sight combat, bot-versus-bot damage, health/armour/ammo pickups, deaths/respawns, scoreboard, match end and rematch. Extend to **1–8 CPU bots** only once the pinned engine's pack/actor budgets and browser performance have been verified. No campaign, keys, doors or story progression in the first phase.

**Design goals:** speed, readability, enemy variety, short replayable matches, immediate restart, zero online service requirements and clear performance evidence at increasing simulated load.

## Engine provenance

| Item | Pin / responsibility |
| --- | --- |
| VANILLAJS | Release **v3.2.0 — SEDIMENT & SIGNAL** |
| Exact engine commit | `7a3a5a3ec49aed5b7063a05614951e69bb257da6` |
| Engine module metadata | [pinned MODULES.json](https://github.com/QSOLKCB/VANILLAJS/blob/7a3a5a3ec49aed5b7063a05614951e69bb257da6/MODULES.json) — experimental public APIs |
| OPT | [QSOLKCB/OPT](https://github.com/QSOLKCB/OPT), optional profiling methodology, **not** a runtime dependency |
| License | Apache-2.0; retain upstream LICENSE/NOTICE when vendoring |

Pin the *smallest verified transitive closure* of public engine modules into this game's repository. Do not load code from mutable GitHub branches, public CDNs or demos at runtime. Do not change the engine pin silently.

## Start here

- [AGENTS.md](AGENTS.md) — mandatory rules for ChatGPT Work and implementation agents
- [Work handoff](docs/WORK_HANDOFF.md) — ready-to-use Work assignment for the first runnable PR
- [ROADMAP.md](ROADMAP.md) — milestones and owner review gates
- [Arena game design](docs/GAME_DESIGN.md) — rules, combat loop, bots, content and scope
- [Architecture](docs/ARCHITECTURE.md) — engine boundaries, fixed-tick combat and lifecycle
- [Engine audit](docs/ENGINE_BASELINE.md) — actual v3.2.0 primitives, capacities and limitations
- [Acceptance](docs/ACCEPTANCE.md) — required real play-throughs and regression coverage
- [Performance](docs/PERFORMANCE.md) — benchmark ladder, measurement protocol and honesty rules
- [Provenance](docs/PROVENANCE.md) — licenses, asset rules and pinned source receipts

## Local execution (after implementation)

The first implementation PR must document and verify an ordinary local HTTP workflow (for example, `python3 -m http.server 8000 --bind 127.0.0.1`). Native ES modules served from a real HTTP origin are required; `file://` is not a supported gameplay launch method. The current planning-only tree has **no executable game, test suite or claimed performance result**.

## Working policy

Each substantive phase is a reviewable PR. ChatGPT Work may implement and test but must not merge, tag, publish, deploy or alter upstream repositories without explicit owner authorization. **Correctness outranks speed.**

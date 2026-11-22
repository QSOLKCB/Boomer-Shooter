# VANILLAJS v3.2.0 — verified baseline and engineering boundaries

**Release:** [VANILLAJS v3.2.0 — SEDIMENT & SIGNAL](https://github.com/QSOLKCB/VANILLAJS/releases/tag/v3.2.0). **Exact tagged commit:** `7a3a5a3ec49aed5b7063a05614951e69bb257da6` (confirmed from GitHub release and tag ref 2026-11-22). BS-001 vendors this consumer pin. See the [byte-level copy receipt](../vendor/vanillajs/manifest.json).

Relevant sources in that **exact commit**:
- [`MODULES.json`](https://github.com/QSOLKCB/VANILLAJS/blob/7a3a5a3ec49aed5b7063a05614951e69bb257da6/MODULES.json), [`BUILD_A_GAME.md`](https://github.com/QSOLKCB/VANILLAJS/blob/7a3a5a3ec49aed5b7063a05614951e69bb257da6/BUILD_A_GAME.md)
- [FPS Foundation contracts](https://github.com/QSOLKCB/VANILLAJS/blob/7a3a5a3ec49aed5b7063a05614951e69bb257da6/docs/FPS_FOUNDATION_001.md), [Block Arena tutorial](https://github.com/QSOLKCB/VANILLAJS/blob/7a3a5a3ec49aed5b7063a05614951e69bb257da6/docs/BUILD_YOUR_FIRST_BLOCKY_FPS.md)
- [FPS Lab movement](https://github.com/QSOLKCB/VANILLAJS/blob/7a3a5a3ec49aed5b7063a05614951e69bb257da6/docs/FPS_LAB.md), [Weapon Feel](https://github.com/QSOLKCB/VANILLAJS/blob/7a3a5a3ec49aed5b7063a05614951e69bb257da6/docs/WEAPON_FEEL.md), [public example API](https://github.com/QSOLKCB/VANILLAJS/blob/7a3a5a3ec49aed5b7063a05614951e69bb257da6/api/fps/example.js)

## Engine surfaces to inspect and reuse

| Surface | Actual role | Integration caution |
| --- | --- | --- |
| `character` / `collision` / `time` / `input` | Grounded movement and keyboard/mouse lifecycle, fixed simulation ticks | Feet-centred AABB; stairs, crouch and platform controls have distinct limits |
| `combat3d` / `weapons` / `projectiles` | Player/bot combatants, hit regions, weapon timers, impacts, splash, death and respawn | Combat's authoritative step is **1/60 s** |
| `weapon-feel` | Explicit look/accuracy/ADS/cosmetic recoil | Cosmetic kick must not rotate the authoritative shot without deliberate spread |
| `navigation` | Bounded X/Z grid paths, cover-oriented bot policies can compose these | Grid is not a general multilevel navmesh or dynamic crowd solver |
| `mod-fps` / `mod-sdk` | Strict inert FPS arena, bot and weapon packs | Tight pack bounds, only supported schemas and transactional replacement |
| `render-webgl`, optional `render-lit` / `geometry` / `scene-graph` | WebGL1 rendering, lit meshes, batching, conservative visibility | Render state is never authoritative; rebuild static index on edits |
| `audio2d` / `soundtrack` / `chip-audio` | Pure original procedural sound/music tools | Browser permission and timing not authoritative |
| `replay-audit` | Source-pinned evidence and command-tape examples | Inspect exported API, do not assume transparent cross-version replay |
| `material-grid` | New bounded, seeded **30 Hz** sand/water grid | v3.2.0 optional experiment, not FPS destruction physics |
| REPLAY-TRANSPORT-001 | Browser-to-browser recorded replay transfer | Not live multiplayer, not required for offline arena deathmatch |

## Source-backed ceilings

`Combat3D` exposes **16 actors total**, **256 solids**, **64 live projectiles**, **4096 events per tick** and **36,000 combat ticks**, according to the pinned combat module. The player counts toward actors. The existing `mod-fps` strict arena schema is more restrictive: at most **8 bot spawns**, **32 grid blocks**, **4 stair ramps** and a 24–64 m even arena size, plus additional validation constraints. Therefore **1 human + 3 bots** is an appropriate initial consumer target; **up to 8 bots** is a later goal subject to real per-scene tests, not a capacity guarantee.

`Combat3D` uses Float64 metres, right-handed +Y up and −Z forward, rectangular actor hit regions, explicit occlusion, and fixed actor poses for each tick's shot query. No moving-body full-frame interpolation, advanced network rollback, capsule solver or cross-browser bit-exactness is implied. Reuse the validated combat API rather than reimplementing health decrements.

The existing Block Arena Foundry has skirmish/survival rules and example bot logic, but those **demo-owned** functions and its world are not reusable engine API contracts. A consuming game must own its original bot policy and free-for-all match rules and test that bots attack **one another** (the demo alone does not prove this project's configuration).

## First Work integration checklist

1. Verify tag SHA and every selected source file; record a complete import-dependency closure and cryptographic SHA-256 per vendored file.
2. Copy complete required public module directories plus applicable `api/`, licence and notice, preserving relative imports.
3. Run dependency tests and a small browser boot before building complex visuals; document unchanged or locally patched vendor files.
4. Keep a checked-in machine-readable manifest stating source repo, tag, commit, file paths, digests and local changes.
5. Test installed offline package and actual deployment subpath; do not assume `file://` works with native modules.
6. Perform separate, reviewed upstream PR and deliberate version re-pin for any reusable new API.

See [the consumer integration](ENGINE_INTEGRATION.md) and [executed evidence](../evidence/bs-001/README.md) for BS-001.

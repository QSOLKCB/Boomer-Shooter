# ChatGPT Work handoff — BH-001: STORM PROTOCOL

**Historical implementation handoff from PR #6.** The [encounter guide](../README.md#storm-protocol--cathedral-engine-boss-encounter) describes the playable implementation.

**Repository:** https://github.com/QSOLKCB/Boomer-Shooter  
**Pinned engine:** VANILLAJS v3.2.0 at `7a3a5a3ec49aed5b7063a05614951e69bb257da6`.  
**Constraints:** read `AGENTS.md`, `ROADMAP.md`, `docs/BULLET_HELL_001.md`, `docs/ENGINE_INTEGRATION.md`, `docs/ACCEPTANCE.md` and `docs/PERFORMANCE.md` and inspect actual pinned source.

## Ready-to-paste Work prompt

> Build **BH-001 — STORM PROTOCOL**, a new playable first-person **bullet-hell boss mode** inside QSOLKCB/Boomer-Shooter while leaving the existing free-for-all Deathmatch and archived replays unchanged. Use VANILLAJS v3.2.0's pinned character/input/time/collision/renderer primitives and follow `docs/BULLET_HELL_001.md`. Create an original industrial reactor arena, a vulnerable multi-phase boss and five real damaging, dodgeable attack patterns (aimed fan, ring, spiral, moving gap curtain, charged sweep). Start with a bounded 60 Hz game-owned hazard authority and verified swept collision, not hundreds of cosmetic-only projectiles. The existing Combat3D engine pool is limited to 64 shots; never silently raise its capacity, mutate private fields or fake damage/score events. Establish one authoritative health model and deterministic seeded command/replay receipts. Implement batched WebGL rendering, readable telegraphs, responsive FPS controls, clear damage feedback, boss health and win/death/restart. Measure actual 64/128/256 hazard cases and treat 512 as an unproven stress goal. Test overflow, collision fairness, replay under different render schedules, pointer/focus cancellation, WebGL teardown and the live deathmatch regressions. Record exact source pin, tests, browser screenshots and raw performance evidence. Deliver through reviewable PR(s), ideally BH-001A (numerical core) then BH-001B (playable boss). **Do not merge, tag, publish, deploy or modify upstream repos without explicit owner authorization.**

## PR review checklist

- [ ] Character movement and input use pinned public VANILLAJS, not a second controls system.
- [ ] New hazards actually determine hits; rendering is downstream only.
- [ ] A boss exists with a finite defeat path and at least three distinct phases.
- [ ] Real collision/grazing tests and fixed-seed command replay pass.
- [ ] Existing deathmatch controls, tests, replay import, scoreboard and Pages URL remain intact.
- [ ] Packaged browser evidence includes an actual successful run and a defeated-player run.
- [ ] Raw 64/128/256 load results clearly label backend, source SHA and dropped-time policy.
- [ ] No performance promise, release, merge or upstream mutation has been made without owner review.

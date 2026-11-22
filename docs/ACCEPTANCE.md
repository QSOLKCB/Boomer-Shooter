# Acceptance and verification contract

## Completion evidence levels

1. **Unit proof:** numerical tests executed from a named source SHA.
2. **Integration evidence:** real game state, arena geometry, bots, weapons and control path exercised in tests.
3. **Browser evidence:** actual packaged Chromium or Firefox launch and rendered interaction, with errors/screenshots recorded.
4. **Physical-device evidence:** owner's manual mouse/keyboard gameplay and native GPU frame profile, separate from hosted/software browser.
5. **Owner sign-off:** review, merge and release decision separate from preceding evidence.

A green Node test is not browser visual evidence. Headless SwiftShader is not a physical RTX benchmark. There are no executed game tests in this planning-only PR.

## BS-001 release gates

| System | Mandatory test |
| --- | --- |
| Boot | Real HTTP launch, subpath import resolution, WebGL unavailable message, local/installed offline startup |
| Movement | Body cannot pass through static walls; jump/steps validated; camera and aim consistent |
| Controls | Focus blur, hidden tab, pointer unlock, release outside window, restart and pause do not leave stuck keys or stale trigger |
| Combat | Three distinct real weapons, ammo depletion/reload, hit/miss, wall occlusion, splash/self-damage, held versus edge firing |
| CPU competitors | Three simultaneously active bots; visible acquisition, route/cover behaviour, **bot kills bot**, bot can kill human, human can kill bot |
| Score | Kill/death accounting from real damage events, deterministic ties, match timeout/frag target, simultaneous death, restart |
| Respawn | Valid clearance, bounded selection, resource reset, scoring preservation, no instant wall overlap |
| Arena | One original playable circuit, pickup placement with bounded cooldowns, all spawns reachable where expected |
| Replay | Versioned seed/command tape re-executes equal canonical state/event receipts on documented same-runtime configuration |
| Content safety | Invalid/nonfinite/oversized pack rejects before mutating active match; data never executed |
| Visual/audio | Actual browser screenshot/HUD, original media, safe GPU cleanup, audio opt-in and no-audio fallback |
| Performance | Honest measured callback/JS/GPU evidence (where available); budgets not magically extrapolated |

## Acceptance scenarios

**S1 — match finishes:** play with 3 bots; verify at least one real human-to-bot and bot-to-bot frag, reach frag target or timeout, show final ranking, rematch from new clean start.

**S2 — cover works:** on a straight ray put an accepted wall between shooter and actor. No damage passes stone. Check projectile occlusion and splash separately.

**S3 — time isolation:** re-execute a complete accepted command tape with presentation paced at 30, 60 and 120 Hz, preserving the same number of canonical ticks and game events, within documented runtime equality scope.

**S4 — adversarial lifecycle:** hold move/fire, blur and release keys off-window, then resume: no phantom movement or shots; repeat over death, pause and rematch.

**S5 — resource exhaustion:** generate allowed high projectile load and actor capacity; engine returns bounded rejected shots/events rather than leaking and gameplay stays viable.

**S6 — data transaction:** import malformed or over-budget level/weapon pack. Observe explicit rejection and byte-identical accepted state/level.

**S7 — packaged offline:** serve complete artifact, install if service-worker-based, reload, disconnect network/stop server where supported by worker, then complete a match without remote requests. Check old-cache-to-new-cache upgrade.

## PR evidence format

Record PR and tested exact head SHA; immutable engine pin; tools and versions; exact commands and exit codes; scenario seeds; source and replay digests; screenshots; physical GPU/browser identity if measured; known failures and **not-run** conditions. Do not manufacture hashes or describe a future manual game test as completed. All source, browser and performance claims must match attached evidence.

## Ownership

Agent code changes require a reviewable PR. No auto-merge, tag, deploy or release. Owner acceptance after personal play-through is required even if every automated check passes.

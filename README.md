# BOOMER-SHOOTER — The Foundry Pit

A fast, offline industrial arena FPS for one human and three CPU rivals. Kiln closes with the Arc Repeater, Vise peeks from cover with a Rivet Rifle, and Flux patrols with a travelling Slag Launcher. Every combatant can win. First to **10 frags** or the best score at **five minutes** takes the pit.

[Play The Foundry Pit on GitHub Pages](https://qsolkcb.github.io/Boomer-Shooter/)

## Play locally

Clone this repository, open a terminal in its root, and run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000/** in Chromium. Click **Enter the pit** to capture the mouse and start the match in one gesture. The clock, rivals and weapons wait for capture, including on resume and rematch. If your browser declines, click the arena to retry or select **Play without capture** for drag or arrow-key aiming. Activating the entry button with the keyboard starts keyboard play directly.

**Options** lets you choose Arcade or Classic movement, Easy/Normal/Hard rivals, frag and time limits, sensitivity, invert Y, render scale and sound. Sound starts muted. Once cloned, the game runs without internet access. Keep the local HTTP server running for cold starts and reloads.

| Control | Action |
| --- | --- |
| WASD / Shift | Move, strafe / sprint |
| Mouse / arrow keys | Aim. Drag to look if pointer capture is unavailable |
| Hold right mouse / Q | Raise sights for a tighter field of view and finer aim |
| Left click / F | Fire. Tap the rifle or launcher, hold the repeater |
| Space / R | Jump / reload the selected weapon |
| 1 / 2 / 3 | Rivet Rifle / Arc Repeater / Slag Launcher |
| Tab | Hold for the live scoreboard |
| P / Escape | Pause and release the mouse |
| Rematch | Start a fresh match with the selected rules |

The green cross restores health. Cyan plates restore armour, and amber rounds replenish reserves. Look for the large plate on the west gantry or contest the casting circle on the floor. Slag splash can hurt its owner. Self-eliminations earn zero frags. Ties resolve by fewer deaths, then stable combatant ID.

In Arcade handling, tap Space just before landing to chain the next jump. The orange bearing marker points toward incoming damage. Amber, cyan and magenta flashes distinguish the rifle, repeater and launcher. Health pads recharge in nine seconds and ammo in six. A full reserve leaves the rounds on the floor until someone has reloaded and can use them.

## Engine and verification

VANILLAJS **v3.2.0 — SEDIMENT & SIGNAL**, commit `7a3a5a3ec49aed5b7063a05614951e69bb257da6`, owns movement, weapon handling, combat, collision, navigation primitives and rendering. The browser checks the vendoring receipt at startup. The consumer armour extension and its regression are documented in the [engine integration notes](docs/ENGINE_INTEGRATION.md).

```sh
node --test tests/*.test.mjs
node scripts/verify-replay.mjs evidence/bs-001/node-reference-replay.json
```

Use **Save command replay** from pause or results to export your run. In the same browser, open **Options → Verify saved replay** and select that JSON. The game independently re-executes the commands from tick zero and compares the state and event hashes. The CLI example uses the Node-generated fixture. Chromium and Node produced different hashes for the same reference commands in this study.

The developer browser probe packages the runtime into a fresh nested directory, serves it on loopback, drives Chromium, captures screenshots and records raw timings. It uses Python Playwright for testing. With Playwright and a Chromium executable installed:

```sh
python3 scripts/browser.py --chromium /path/to/chromium --out /tmp/foundry-evidence
```

The [BS-001 evidence](evidence/bs-001/README.md) includes the packaged browser run, screenshots, replay, frame samples and hardware limitations.

BS-002 records movement and bot skill in each replay and still reads BS-001 tapes. [Arcade tuning notes](docs/BS_002.md) · [Mouse capture regression, match replays and 1080p timings](evidence/bs-002/README.md).

## Project documents

- [AGENTS.md](AGENTS.md) and [original Work handoff](docs/WORK_HANDOFF.md)
- [Roadmap](ROADMAP.md), [game design](docs/GAME_DESIGN.md) and [architecture](docs/ARCHITECTURE.md)
- [Engine baseline](docs/ENGINE_BASELINE.md), [integration notes](docs/ENGINE_INTEGRATION.md) and [vendoring manifest](vendor/vanillajs/manifest.json)
- [Acceptance](docs/ACCEPTANCE.md), [performance programme](docs/PERFORMANCE.md), [provenance](docs/PROVENANCE.md) and [credits](CREDITS.md)

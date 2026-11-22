# The Foundry Pit credits

QSOL-IMC • BS-001. The project distributes its first-party game under Apache-2.0.

| Source | Authorship and method | Rights |
| --- | --- | --- |
| `content/foundry.json` | Original QSOL-IMC arena layout, tuning, machine identities and supply placements authored for this project | Repository LICENSE |
| `src/view/steelworks.js` | Original stencil lettering, casting wheels, furnace banks, grilles, stairs, floor inlays and crane skyline built from procedural geometry | Repository LICENSE |
| `src/view/models.js`, `src/view/scene.js` | Original machine silhouettes, weapon models, pickup shapes and event-driven effects authored in source | Repository LICENSE |
| `src/view/audio.js` | Original arrays of short noise, triangle, saw and square-wave events synthesized locally with VANILLAJS audio2d | Repository LICENSE |
| `index.html`, `style.css` | Original interface and mark. Font selection uses installed system fonts | Repository LICENSE for the layout and mark |
| `src/storm/scene.js`, `storm.html`, `src/storm/storm.css` | Original reactor court, turbine blades, induction stacks, hazard geometry and operator interface authored for this encounter. The Arc Driver reuses the project’s Arc Repeater view model | Repository LICENSE |
| `src/storm/game.js` | Original reactor pulse, fifth, warning bell, driver and impact score synthesized from local oscillators and noise | Repository LICENSE |
| `vendor/vanillajs/` | QSOLKCB/VANILLAJS v3.2.0. Exact upstream bytes, paths and SHA-256 digests | Upstream LICENSE and NOTICE in that directory |
| `src/engine/combat3d.js` | Generated from the pinned Combat3D source plus the isolated consumer armour adapter | Upstream Apache-2.0 and NOTICE apply. See the manifest and integration recipe |

The screenshots in the evidence directory were captured from the packaged game in Chromium. The game generates the displayed art and sound locally.

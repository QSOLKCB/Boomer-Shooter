# Game design — THE FOUNDRY PIT (working title)

## Core match loop

One human combatant enters an industrial arena against autonomous CPU rivals. Combat is **free-for-all**: the bots fight one another, and every participant can win. The player can observe bot frag exchanges on the kill feed. Continuous movement, accurate timing, smart cover and health/armour control define the match. No campaign progression, quest chains, keys or locked story doors in the first release.

Default **BS-001** match: one human, three CPU opponents, first to **10 frags** or **five minutes**. All alive combatants can target any other living rival. Match server is a **single local authoritative simulation**, not a network server. Score is recorded only from accepted combat death events. A frag awards the eliminator 1; self-death gives no frag. Define a stable winner/tie-break policy before implementation, e.g. top frags, then fewer deaths, then stable participant ID. A player who loses should still see the final ranking, summary and **Rematch**.

Respawns reset character condition and transient weapon triggers without altering existing scores. Respawn placement must be validated for solid clearance and avoid predictable immediate spawn kills; choose from a bounded list with explicit scoring and deterministic ties, **not** an unsupported promise of perfect fairness. A finite protection window (if enabled) must apply symmetrically to bots and player through the actual damage policy.

## Weapons and pickups

First slice reuses the existing public `Combat3D` weapon archetypes:
- **Rivet Rifle (precision):** discrete high-impact hitscan, measured cadence and aim discipline.
- **Arc Repeater (automatic):** sustained fire, spread buildup/recovery, distinct magazine and ammunition economy.
- **Slag Launcher (projectile):** real travelling shot and line-of-sight-checked splash damage, with self-damage where the engine permits.

These are **working names**, not engine APIs. Verify definitions against `defineWeapon3D` limits and actual source before coding. Cosmetic recoil, viewmodel, muzzle flash, trails and audio are derived from real combat events; don't move the canonical hit direction for cosmetic effect. No shotgun, rocket jump, weapon swapping exploit or alternate ammo type is promised in BS-001.

Pickups (bounded and deterministic) offer health, armour and compatible ammo. Use explicit cooldown/respawn state and tests for maximum resource caps, simultaneous claims and pickups after a player death. Give moving players tactical reasons to cross open sightlines.

## AI opponents

Use an independent seed, bounded simulation work and engine navigation queries; bots do not read the player's input or use hidden omniscience. State machine: **spawn → patrol/seek → acquire visible target → react → pursue/strafe/engage → retreat or seek pickups when weakened → death → respawn**. Include predictable fallback when routing fails.

Bots may engage **each other**. Every bot shares health, line-of-sight, collision, ammunition/cooldown, death and score attribution with human rules. Difficulty modifies reaction time, aim dispersion, aggression and tactical update budgets — not magic through-wall damage. Record targeting, ray and path search work counters. Bots must respect cover and cooldown; they may not gain extra ticks from a higher render FPS.

Three initial rivals should differ by colour/shape and behaviour: a close-range aggressive pursuer, a cautious cover user and a mobile opportunist. Keep their characteristics data-driven and original. Extend to 1–8 bots only after validating source pack limits and performance.

## Arena art direction

One original, looping **industrial foundry** arena of modest bounded size. Broad readable loops, a central dangerous sightline, multiple cover islands, at least one useful height change (using tested stair/ramp geometry), and clear spawn zones. Prioritise readable combat over exotic shader complexity. High-contrast silhouettes, large pixels or sharp-edged models, restrained industrial palette, original procedural effect sounds and an optional original soundtrack.

The arena design must validate **real collisions** separately from visible geometry. Bots' ground-plane navigation cannot pretend to understand every elevated route; plan traversable bot routes accordingly. Culling never deletes collision. Keep viewmodel geometry from obscuring the exact aim centre.

## Inputs / accessibility

Desktop first: WASD movement, mouse look/click fire, Space jump, Shift sprint only if implemented safely, R reload, 1–3 weapon change, Escape pause/capture release; optional gamepad/touch later. Provide sensitivity, invert-look, audio controls and a legible scoreboard. No forced audio on page load. Persist local preferences only with clear bounded versioned storage.

## Scope exclusions

No online matchmaking, player accounts, cooperative networking, campaign, lore exposition, non-inert mods, downloaded copyrighted assets, open-world physics or arbitrary numbers of simultaneous actors. The game can be playful and polished within explicit finite engine limits.

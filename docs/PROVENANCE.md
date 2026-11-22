# Source and asset provenance

## First-party game

BOOMER-SHOOTER carries Apache-2.0 in the repository. The game's own fiction, maps, names, sprites, meshes, textures, materials, dialogue, sound, music and interface should be original or demonstrably reusable under compatible terms. Genre conventions (arena combat, strafing, pickups) are fine; do **not** port copyrighted DOOM/Quake/Unreal maps, enemies, MIDI tracks, UI art, logos, textures, sounds, font packs or ripped weapon designs.

Maintain `CREDITS.md` and/or a machine-readable asset register when content is introduced: file path, author, creation method, rights/license, provenance, any source fingerprint, changes and redistribution permissions. Do not assert independently created content without reviewing its actual origin.

## VANILLAJS

Exact source repository: `https://github.com/QSOLKCB/VANILLAJS`.
Release: `v3.2.0`.
Commit: `7a3a5a3ec49aed5b7063a05614951e69bb257da6`.

Before first vendoring, inspect `MODULES.json`, resolve full imports, record each file path and SHA-256 of original bytes, copy upstream LICENSE and NOTICE, and document any modifications. A Git commit SHA identifies a source tree but does **not** replace a per-file vendoring receipt. Keep local changes isolated and preserve SPDX headers. Never copy an entire demo wholesale as if it were a public module.

## OPT and other QSOL projects

OPT is an optional **methodology/reference**, not automatic dependency or unreviewed code donor. Review every external QSOL repo's exact SHA, API, licence and compatibility before reuse; shared ownership is not a substitute for provenance. Any engine-level adaptation needs its own separate VANILLAJS PR.

## Build/release evidence

Record exact game and vendor commit IDs, manifest checksums, commands, browser/backend, source-only-versus-generated distinction, license inventory and packaged file list. Publish only after owner-approved reviewed main. No credentials, personal paths, user data or transient test profiles in the public package.

**This preparatory documentation does not attest that any game art, runtime or package has been built yet.**

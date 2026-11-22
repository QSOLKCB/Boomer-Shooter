# VANILLAJS #151 in the Cathedral Engine

Game baseline `79217d37fdf4f45d607907e7a946a96eb886dd1d` (merged BH-001B). Tested candidate runtime `5b97f500483798ae31eb59b30938fe0a9a340683`. The optional import-free packing module is byte-identical to VANILLAJS `a2bc2dbbb2e2a28fb8857eb7916f1bb374d3c85c`. The core engine remains at v3.2.0. [Integration and reproduction of the vendor bytes](../../docs/ENGINE_INTEGRATION.md#storm-protocol-geometry-stream)

## Rendering and gameplay parity

The comparison launched separate locally packaged games under distinct subpaths in Chromium 151. On both revisions it drew the same accepted commands, camera and interpolation fractions. At 45 checkpoints, the SHA-256 of each of the three dynamic WebGL uploads and the RGBA framebuffer matched exactly. The checks cover all five attacks, three phases, victory and compacted field sizes of 256, 64, zero and 128. The winning command tape, state and checksum also matched. [Per-frame upload and pixel digests](parity.json)

The core, grilles and warning markers share one bounded upstream box stream. Bullet slots cache the emissive colours that the published mode used. Per-frame movement still updates every live head from its simulated position and dimensions. Static arena geometry, the gun and gameplay rules retain their original paths. There are five draws with a populated field. The full [packaged browser playthrough](browser.json) also exercised a real dodge, defeat, restart, victory, 70% replay, context loss and ten mode switches.

## Paired performance

Chrome Headless Shell 151, WebGL1 via ANGLE Vulkan SwiftShader, 1280 × 720, native render scale. The order was baseline, candidate, candidate, baseline, each with real 64/128/256-hazard workloads and a 60-tick warm-up per case. The table pools the two runs of each version using the nearest-rank 95th percentile. Draw time includes CPU packing and WebGL submission. The frame interval includes scheduling. The raw rows also record dropped time and per-tick collision checks.

| Hazards | Baseline / candidate p95 draw (ms) | Baseline / candidate p95 frame interval (ms) |
| ---: | ---: | ---: |
| 64 | 1.1 / 0.8 | 50.0 / 33.4 |
| 128 | 1.0 / 1.0 | 66.6 / 66.6 |
| 256 | 1.6 / 1.8 | 99.9 / 116.7 |

In the two 256-hazard trials, candidate p95 draw times ranged from 0.5 to 4.0 ms. These runs show mixed performance. They do not establish a general FPS gain, shorter GC pauses, or native GPU throughput. [Per-trial summaries](paired.json) · [Raw paired frame and tick samples](paired-raw.json.gz)

## Verification

All 35 game tests passed. The archived 4,220-tick Deathmatch replay reproduced its state and event hashes. At the separate upstream pin, all 1,401 tests passed, the module/documentation check passed and the build packaged 1,093 files. The upstream CPU box-assembly workload is included separately. The historical ALIEN-MATH test requires the older source object `ce7e38eb3c7412407a3ba2bc472120b589e6eb9e`. Fetching that object into the shallow upstream checkout allowed the full suite to run. [Game tests](tests.log) · [Upstream output](upstream-tests.log.gz) · [Upstream workload](upstream-workload.json)

```sh
node --test tests/*.test.mjs
node scripts/verify-replay.mjs evidence/bs-001/node-reference-replay.json
python scripts/packing_compare.py --chromium "$CHROMIUM" --out /tmp/packing-ab
python scripts/storm_browser.py --chromium "$CHROMIUM" --suite play --out /tmp/packing-play
(cd evidence/render-packing-001 && sha256sum -c SHA256SUMS)
```

The paired probe needs the baseline commit in the local game clone. The raw array rows use the same column order as the [BH-001B load probe](../../scripts/storm-load.js).

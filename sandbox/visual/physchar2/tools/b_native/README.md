# Investigation B: native Jolt v5.6.0 harness (diagnostic only)

This harness reproduces the smallest reproducer of the one-step energy blow-up: **one** narrow-phase query (one boot hull piece vs the turf box) against a native build of the **same Jolt version** as the vendored WASM (`jolt-physics@1.1.0` = Jolt v5.6.0). That makes it possible to trace GJK / EPA at source level.

**Nothing here touches the production engine.** The vendored `vendor/jolt-physics.wasm-compat.js` is unchanged.

## Build

```sh
git clone --depth 1 --branch v5.6.0 https://github.com/jrouwe/JoltPhysics.git jolt_src
mkdir jolt_build && cd jolt_build
cmake -S ../jolt_src/Build -B . -DCMAKE_BUILD_TYPE=Release -DCROSS_PLATFORM_DETERMINISTIC=ON \
  -DTARGET_UNIT_TESTS=OFF -DTARGET_HELLO_WORLD=OFF -DTARGET_PERFORMANCE_TEST=OFF -DTARGET_SAMPLES=OFF -DTARGET_VIEWER=OFF \
  -DENABLE_OBJECT_STREAM=OFF -DDISABLE_CUSTOM_ALLOCATOR=ON -DOBJECT_LAYER_BITS=32 -DINTERPROCEDURAL_OPTIMIZATION=OFF \
  -DFLOATING_POINT_EXCEPTIONS_ENABLED=OFF -DUSE_ASSERTS=OFF -DJPH_USE_MTL=OFF -DJPH_USE_VK=OFF -DJPH_USE_DX12=OFF \
  -DJPH_USE_CPU_COMPUTE=OFF -DENABLE_ALL_WARNINGS=OFF -DDEBUG_RENDERER_IN_DEBUG_AND_RELEASE=OFF \
  -DPROFILER_IN_DEBUG_AND_RELEASE=OFF -DUSE_FMADD=OFF -DGENERATE_DEBUG_SYMBOLS=OFF
cmake --build . -j 8
```

**Trace build.** Apply `review_artifacts/physical_character_v2/engine_blowup_B/native/jolt_v5.6.0_trace_instrumentation.diff` to `jolt_src/Jolt` and rebuild. The diff:
- adds `fprintf` traces in `GJKClosestPoint.h` (`GetClosestPoints` exits) and `EPAPenetrationDepth.h` (GJK step result, EPA iterations, the defect / flip branch, the result);
- defines `jph_b_trace` in `ConvexShape.cpp`.

**Harness.** It needs the trace build, because it references `jph_b_trace`:

```sh
clang++ -DJPH_CROSS_PLATFORM_DETERMINISTIC -DJPH_DISABLE_CUSTOM_ALLOCATOR -DJPH_OBJECT_LAYER_BITS=32 -DNDEBUG -I jolt_src \
  -fno-rtti -fno-exceptions -ffp-contract=off -O3 -std=c++17 b_query.cpp jolt_build/libJolt.a -o b_query
```

## Inputs and use

1. Write the exact float32 inputs of a reproducer:
   ```sh
   V2_ANKLE_NEUTRAL_K=<k> node tools/b_narrow.mjs ... --dump=q.json
   ```
2. Convert them to bit patterns:
   ```sh
   node tools/b_native/dump2bits.mjs q.json q.bits
   ```
3. Run the query:
   ```sh
   ./b_query q.bits                  # result only
   B_TRACE=1 ./b_query q.bits        # GJK / EPA trace
   ./b_query q.bits 0 25 0           # position offset in float32 ulps (scans)
   ```

The four reproducer fixtures are in `review_artifacts/physical_character_v2/engine_blowup_B/fixtures/`.

| k (N·m/°) | case |
|---|---|
| 0.15 | V1-matched singleLeg, 240 Hz |
| 0.10 | V2-REF leanF@1e-5, 720 Hz |
| 0.075 | V2-long-legs drop1m, 240 Hz |
| 0.5 | V2-REF leanF@1e-5, 720 Hz |

The native build reproduces each one bit-for-bit: the same reversed penetration axis and the same depth as the WASM build.

## Batch tools (same build)

- **`b_scan.cpp`** (inputs from `scan_poses.mjs --set=near|flush|random`): classifies every hit as reversed / far-face / tilted / valid. `B_ONLY=<index>` runs one query (combine with `B_TRACE=1`).
- **`b_genscan.cpp`**: generates millions of face-flush poses of a cuboid or a fixture hull against any turf box. Use `B_CR` / `B_SEP` to override the convex radius or the speculative distance, and `B_TRACE_FIRST=1` to trace the first reversed pose.

## Switches (instrumented build only; all opt-in, default off)

| switch | effect |
|---|---|
| `B_TRACE=1` | GJK / EPA trace |
| `B_P1=1` | GJK without the relative overlap test (falsification probe; **not viable**: creates new reversals) |
| `B_P2=1` | EPA returns the triangle with the smallest support distance instead of the last processed one, and clears `flip_v_sign` when substituting |

`B_P2` removed every reversal in all tests. Its first version kept a stale `flip_v_sign` in one thin-box case; that was fixed and recorded in DECISIONS B-6.

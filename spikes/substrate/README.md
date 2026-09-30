# Physics-substrate spike (disposable — NOT Gate A, not production)
One identical tiny scene per engine (`common.js`): a 2-capsule leg (asymmetric hip limits, hinge knee, our own PD torques) hit by a fast
dynamic capsule — a motor-driven rotating sweep at 9 / 15 m/s and a free capsule at 13 m/s. Metrics are our own exact capsule distances,
worst case over 5 contact phases, each run twice. `bench.mjs` = 28-body / 26-joint scale probe. Results: `review_artifacts/physical_character_v1/substrate_spike_results.txt`.
Reproduce (Node ≥ 20, one process at a time):
    mkdir deps && cd deps && npm init -y && npm i @dimforge/rapier3d-deterministic-compat@0.21.0 @dimforge/rapier3d-compat@0.21.0 jolt-physics@1.1.0
    mkdir ammo && for f in builds/ammo.wasm.js builds/ammo.wasm.wasm; do curl -sSLo ammo/$(basename $f) https://cdn.jsdelivr.net/gh/kripken/ammo.js@main/$f; done
    export PHYS_SPIKE_DEPS=$PWD/node_modules AMMO_DIR=$PWD/ammo && cd ..
    node spike_rapier.js ; node spike_jolt.mjs ; node spike_bullet.js ; node bench.mjs rapier|jolt|bullet     (ONLY=variant,... to filter)

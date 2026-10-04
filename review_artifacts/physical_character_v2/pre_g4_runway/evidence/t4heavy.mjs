// held-out attack: G3 T4 (five repeated R 90 % ↔ L 90 % cycles) on a given body under a policy — pelvis yaw / drift at the cycle marks, outcome
const P = process.argv[2], body = process.argv[3], stand = JSON.parse(process.argv[4] || "{}"); const { loadJolt } = await import(P + "/core/v2_jolt.js"), { generateSpec } = await import(P + "/spec/v2_spec.js"), { VARIATION_SET } = await import(P + "/spec/v2_human.js"), { G3Sim, g3Def } = await import(P + "/gates/v2_g3.js"), { ankleNeutralKPerDeg } = await import(P + "/spec/v2_joints.js");
const J = await loadJolt(P + "/vendor/jolt-physics.wasm-compat.js"), spec = generateSpec(VARIATION_SET.find(h => h.id === body)), s = new G3Sim(J, spec, g3Def("T4"), Object.keys(stand).length ? { stand } : {});
while (s.tick()); const g = s.g3summary(), m = g.g3.marks; s.destroy();
const y = m.map(x => x.yaw), d = m.map(x => x.drift ?? x.pelvisDriftMm ?? null);
console.log(`k ${ankleNeutralKPerDeg()} ${body} ${JSON.stringify(stand)} T4: ${g.outcome}; pelvis yaw at marks ${y.map(v => v.toFixed(2)).join(" ")}° (Δ first→last ${(y[y.length - 1] - y[1]).toFixed(2)}°; row D limit 1°)`);

// ensemble: leanF at 720 Hz with lift perturbations; does the one-step energy explosion occur with the historical plant (k = 0) too?
const P2 = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2";
const { loadJolt } = await import(P2 + "/core/v2_jolt.js"); const { generateSpec } = await import(P2 + "/spec/v2_spec.js"); const H = await import(P2 + "/spec/v2_human.js"); const G1 = await import(P2 + "/gates/v2_g1.js"); const JS = await import(P2 + "/spec/v2_joints.js");
const J = await loadJolt(P2 + "/vendor/jolt-physics.wasm-compat.js"), spec = generateSpec(H.V2_REF), hz = +(process.argv[2] || 720), base = process.argv[3] || "leanF", out = [];
for (const e of process.argv.slice(4).map(Number)) { const key = G1.ensembleKey(base, e); G1.ensureScenario(key); const r = G1.runScenario(J, spec, key, { cfg: { ...G1.G1_WORLD, hz } });
  const bad = (r.checks || []).filter(c => c.pass === false).map(c => c.id); out.push({ k: JS.ankleNeutralKPerDeg(), hz, eps: e, maxRiseJ: +r.energy.maxRiseJ.toFixed(3), sepMaxMm: +r.joints.sepMaxMm.toFixed(2), hardExcMaxDeg: +r.joints.hardExcMaxDeg.toFixed(2), engine: r.engine.ticks, posture: r.outcome.posture }); }
for (const o of out) console.log(JSON.stringify(o));

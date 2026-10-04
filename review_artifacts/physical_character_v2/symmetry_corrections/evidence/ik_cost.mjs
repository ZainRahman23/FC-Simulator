const P2 = process.argv[2], label = process.argv[3];
const { loadJolt } = await import(P2 + "/core/v2_jolt.js"); const { generateSpec } = await import(P2 + "/spec/v2_spec.js"); const { VARIATION_SET } = await import(P2 + "/spec/v2_human.js"); const { G3Sim, g3Def } = await import(P2 + "/gates/v2_g3.js");
const J = await loadJolt(P2 + "/vendor/jolt-physics.wasm-compat.js"), spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), res = [];
for (let trial = 0; trial < 6; trial++) { const s = new G3Sim(J, spec, g3Def("T5"), { stand: { timeIK: true } }); let its = 0, calls = 0; const o = s.ctrl.legIK.bind(s.ctrl); s.ctrl.legIK = (...a) => { const r = o(...a); calls++; its += r.it ?? NaN; return r; };
  let ticks = 0, ik0 = 0; while (s.tick()) { if (s.n * s.dt >= 1 && !ik0) { ik0 = s.ctrl.cpuIK || 1e-12; ticks = 0; } ticks++; } const ikMs = (s.ctrl.cpuIK - ik0) / ticks; s.destroy(); if (trial > 0) res.push({ ikMs, itPerSolve: its / calls }); }
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(`${label}: IK per tick (both legs, t ≥ 1 s) median of 5 trials ${med(res.map(r => r.ikMs)).toFixed(4)} ms (range ${Math.min(...res.map(r => r.ikMs)).toFixed(4)}–${Math.max(...res.map(r => r.ikMs)).toFixed(4)}); iterations per solve ${isNaN(res[0].itPerSolve) ? "n/a (old IK does not report)" : res[0].itPerSolve.toFixed(2)}`);

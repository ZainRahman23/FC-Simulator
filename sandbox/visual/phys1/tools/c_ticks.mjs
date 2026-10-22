// tc_controlled1/tools/c_ticks.mjs — THE TICK-TIME TAIL (owner §23): every tick of 8 seeded torture programs × 60 s per model, the 8 worst ticks
// (with the SECURE fallback's share in each) and p99 / p99.9 / ticks over 8 ms — the single worst tick is a GC / JIT pause, the tail is the measure
//   node c_ticks.mjs
const TD = new URL("../", import.meta.url).pathname;
const { makeSim, DT } = await import(TD + "tools/u_env.mjs"); const { presetLayers } = await import(TD + "c_sim.js"); const { program, PAGE } = await import(TD + "tools/c_torture.mjs");
for (const ctl of ["FREE", "CONTROLLED"]) { const W = [];
  for (let s = 1; s <= 8; s++) { const P = program(s, 60), sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL") }, ctl === "CONTROLLED" ? { control: "CONTROLLED" } : {})); let fbT = 0, fbN = 0;
    if (ctl === "CONTROLLED") { const F0 = sim.fallback.bind(sim); sim.fallback = () => { const a = performance.now(); const r = F0(); fbT += performance.now() - a; fbN++; return r; }; }
    for (let k = 0; k < Math.round(60 / DT); k++) { fbT = 0; fbN = 0; const a = performance.now(); sim.step(P.req(k * DT)); const w = performance.now() - a; W.push({ w, s, t: sim.t, fbT, fbN, reason: sim.plan.reason, fb: sim.poss && sim.poss.fallback }); } }
  W.sort((a, b) => b.w - a.w); console.log("■", ctl); for (const x of W.slice(0, 8)) console.log(`   ${x.w.toFixed(1)} ms seed ${x.s} t ${x.t.toFixed(3)} fallback ${x.fbN}× ${x.fbT.toFixed(1)} ms · plan reason ${x.reason} · ${x.fb || ""}`);
  const q = (p) => W.map((x) => x.w).sort((a, b) => a - b)[Math.floor(p * (W.length - 1))]; console.log(`   p99 ${q(0.99).toFixed(2)} ms, p99.9 ${q(0.999).toFixed(2)} ms, ticks > 8 ms: ${W.filter((x) => x.w > 8).length} of ${W.length}`); }

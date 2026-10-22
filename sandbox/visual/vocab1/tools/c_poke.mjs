// tc_controlled1/tools/c_poke.mjs — THE PAGE'S OPPONENT POKE (a tracking lunging foot, 8 m/s, r 10 cm): fired at 40 random moments of controlled
// play (seeded torture input) — how many hit the real ball, and how many broke control (classified)
//   node c_poke.mjs
const TD = new URL("../", import.meta.url).pathname;
const { makeSim, DT } = await import(TD + "tools/u_env.mjs"); const { presetLayers } = await import(TD + "c_sim.js"); const { program, PAGE } = await import(TD + "tools/c_torture.mjs");
let hits = 0, broken = 0, n = 0; const why = {};
for (let s = 1; s <= 40; s++) { const P = program(s, 30), sim = makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), control: "CONTROLLED" })); const tP = 4 + (s % 20);
  for (let k = 0; k < Math.round((tP + 1.5) / DT); k++) { if (k === Math.round(tP / DT)) { if (sim.poss.state !== "CONTROLLED") break; n++; sim.addOpponent(sim.pokeProbe(s % 2 ? 1 : -1, 8)); } sim.step(P.req(k * DT)); }
  if (sim.extLog.length) { hits++; const e = sim.poss.log.find((x) => x.from === "CONTROLLED" && x.t >= sim.extLog[0].t - 1e-9); if (e) { broken++; why[e.why] = (why[e.why] || 0) + 1; } } }
console.log(`tracking poke: ${n} pokes on a controlled ball, ${hits} hit the ball, ${broken} broke control ${JSON.stringify(why)}`);

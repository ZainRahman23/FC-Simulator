// ballon1/tools/b_share.mjs — BALL-ON PACE V1: THE MEASUREMENT BEHIND THE ACCELERATION SHAPE — how many of the steps are touch steps, by speed,
// in the S99 build's own carry (no envelope: the touch organisation as it is): standing → sprint, standing → run, and tight control (±45° every
// 0.4 s at RUN). A touching stride cannot push fully: carry_env.js's touchShare() is this table (≈ ½ from rest, in the running carry and in tight
// control; ≈ ¼ in the 38 km/h sprint carry — every other stride)
//   node b_share.mjs [--carry A|B|C]   (with a candidate: the same count under its envelope)
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
const AR = process.argv, carry = AR.includes("--carry") ? AR[AR.indexOf("--carry") + 1] : undefined, DEG = Math.PI / 180;
for (const [label, req] of [["standing → sprint", (t) => ({ h: t < 1 ? null : 0, mode: "SPRINT" })], ["standing → run", (t) => ({ h: t < 1 ? null : 0, mode: "RUN" })], ["tight control (±45° every 0.4 s, RUN)", (t) => ({ h: t < 1 ? null : t < 3 ? 0 : (Math.floor((t - 3) / 0.4) % 2 ? -1 : 1) * 45 * DEG, mode: "RUN" })]]) {
  const sim = makeSim("TL", Object.assign({ layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [20, 34], h: 0 }, control: "CONTROLLED", pace: "D38", vocab: "EXPANDED" }, carry ? { carry } : {}));
  const seen = new Set(), steps = [], bands = {};
  for (let k = 0; k < 240 * 9; k++) { const t = k * DT; sim.step({ ...req(t), keys: 0 }); for (const F of ["R", "L"]) { const s = sim.plan.stances[F].find((x) => x.t0 <= sim.t && x.t1 > sim.t); if (s && !seen.has(s.id) && sim.t > 1) { seen.add(s.id); steps.push({ t: sim.t, v: sim.stateAt(sim.t).s }); } } }
  const C = sim.contacts.filter((c) => !c.missed && c.t > 1).map((c) => ({ t: c.t, v: sim.stateAt(c.t).s }));
  for (const [a, b] of [[0, 2], [2, 4], [4, 6], [6, 8], [8, 9.5], [9.5, 11]]) { const ns = steps.filter((x) => x.v >= a && x.v < b).length, nc = C.filter((x) => x.v >= a && x.v < b).length; if (ns) bands[`${a}–${b}`] = `${nc}/${ns} = ${(nc / ns * 100).toFixed(0)} %`; }
  console.log(`${label.padEnd(40)} touches per step by speed band (m/s): ${JSON.stringify(bands)}`); }

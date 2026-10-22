// ballon1/tools/b_pace.mjs — BALL-ON PACE V1: BALL OFF against the D99 ball-carrying candidates (owner: "standing → sprint, 5 / 10 / 20 / 30 /
// 40 / 60 m, long top-speed run; peak speed, time to peak, time to 70 / 80 / 90 / 95 % of the AVAILABLE vmax"). S99 38 km/h · D38 · A99-C · D99 ·
// BC99 · CONTROLLED · EXPANDED, standing 1 s then the stick straight ahead at SPRINT for 12 s (≈ 110 m), simulation only. Also the acceleration
// CURVE itself, measured: the mean acceleration in each speed band, and the ball-on / ball-off ratio at the same speed (the shape is not D38 × k)
//   node b_pace.mjs [--json f]
import fs from "node:fs";
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { CARRY_ENV } from "../carry_env.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; };
const MARKS = [5, 10, 20, 30, 40, 60, 80, 100], PCT = [70, 80, 90, 95], BANDS = [[0, 2], [2, 4], [4, 6], [6, 8], [8, 9], [9, 10]];
export const CONFIGS = [["BALL OFF", { ballOn: false }], ["CARRY-A", { carry: "A" }], ["CARRY-B", { carry: "B" }], ["CARRY-C", { carry: "C" }], ["no envelope (the S99 build)", {}]];
export function paceRun(o) { const sim = makeSim("TL", Object.assign({ layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [10, 34], h: 0 }, control: "CONTROLLED", pace: "D38", vocab: "EXPANDED" }, o));
  for (let k = 0; k < 240; k++) sim.step({ h: null, mode: "SPRINT", keys: 0 });
  const vmax = sim.P.speed.SPRINT, avail = o.carry ? CARRY_ENV[o.carry].open * vmax : vmax, P0 = sim.stateAt(sim.t).P.slice(), n0 = sim.contacts.length, tr = { t: [], s: [], d: [] };
  for (let k = 0; k < 240 * 12; k++) { sim.step({ h: 0, mode: "SPRINT", keys: 0 }); const st = sim.stateAt(sim.t); tr.t.push((k + 1) * DT); tr.s.push(st.s); tr.d.push(st.P[0] - P0[0]); }
  const out = { vmaxPhys: vmax, avail, splits: {}, pct: {}, vAt: {}, band: {}, touches: sim.contacts.length - n0, exits: sim.poss ? sim.poss.log.filter((e) => e.from === "CONTROLLED").length : 0 };
  let peak = 0; for (const s of tr.s) peak = Math.max(peak, s); out.peak = peak; out.tPeak = tr.t[tr.s.findIndex((s) => s >= 0.995 * peak)];
  for (const m of MARKS) { const i = tr.d.findIndex((d) => d >= m); out.splits[m] = i >= 0 ? tr.t[i] : null; }
  for (const p of PCT) { const i = tr.s.findIndex((s) => s >= p / 100 * avail - 1e-9); out.pct[p] = i >= 0 ? tr.t[i] : null; }
  for (const x of [0.25, 0.5, 1.0, 1.5, 2.0]) out.vAt[x] = tr.s[Math.round(x / DT) - 1];
  for (const [a, b] of BANDS) { let sa = 0, n = 0; for (let i = 1; i < tr.s.length; i++) if (tr.s[i] >= a && tr.s[i] < b) { sa += (tr.s[i] - tr.s[i - 1]) / DT; n++; } out.band[`${a}–${b}`] = n ? sa / n : null; }
  return out; }
if ((process.argv[1] || "").endsWith("b_pace.mjs")) { const R = {};
  for (const [name, o] of CONFIGS) R[name] = paceRun(o);
  const f2 = (x) => (x == null ? "—" : x.toFixed(2)), off = R["BALL OFF"];
  for (const [name] of CONFIGS) { const r = R[name];
    console.log(`■ ${name.padEnd(28)} peak ${r.peak.toFixed(2)} m/s (${(r.peak * 3.6).toFixed(1)} km/h) at ${f2(r.tPeak)} s · available vmax ${r.avail.toFixed(2)} m/s (${(r.avail * 3.6).toFixed(1)} km/h, ${(r.avail / r.vmaxPhys * 100).toFixed(1)} % of physical) · touches ${r.touches} · exits ${r.exits}`);
    console.log(`   splits ${MARKS.map((m) => `${m} m ${f2(r.splits[m])}${name !== "BALL OFF" && r.splits[m] != null ? ` (+${(r.splits[m] - off.splits[m]).toFixed(2)})` : ""}`).join(" · ")}`);
    console.log(`   to ${PCT.map((p) => `${p} % ${f2(r.pct[p])}`).join(" · ")} s of the AVAILABLE vmax · speed at ${Object.entries(r.vAt).map(([x, v]) => `${x} s ${v.toFixed(2)}`).join(" · ")} m/s`);
    console.log(`   mean acceleration by speed band (m/s²) ${Object.entries(r.band).map(([b, a]) => `${b}: ${a == null ? "—" : a.toFixed(2)}${name !== "BALL OFF" && a != null && off.band[b] ? ` (${(a / off.band[b] * 100).toFixed(0)} % of ball off)` : ""}`).join(" · ")}`); }
  const at40 = (n) => R[n].splits[40], gap = (n) => (at40(n) - at40("BALL OFF")) * R["BALL OFF"].peak;
  console.log(`■ the race: at the moment BALL OFF passes 40 m, CARRY-A is ≈ ${gap("CARRY-A").toFixed(1)} m behind, CARRY-B ≈ ${gap("CARRY-B").toFixed(1)} m, CARRY-C ≈ ${gap("CARRY-C").toFixed(1)} m (from the 40 m split difference × ball-off top speed)`);
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(R, null, 1)); }

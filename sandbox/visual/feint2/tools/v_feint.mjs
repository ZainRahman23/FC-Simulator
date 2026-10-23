// vocab1/tools/v_feint.mjs — ANALOG FEINT RECOGNITION, measured: (1) intended feints (a 1 s established line, a fake of ±25 / 40 / 60° for
// 0.08 – 0.25 s, then the real exit the other way) → confirmed, and the ball never played toward the fake; (2) genuine cuts (the same fake
// held) → never confirmed; (3) stick noise (±60° every 0.35 s, ±30° every 0.12 s, a 270°/s circle) and the seeded random torture programs
// (c_torture.mjs) → confirmed feints per minute (the false-positive rate)
//   node v_feint.mjs [--minutes 6]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = Math.PI / 180;
const mk = () => makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", carry: "B" }));
function run(f, dur, mode = "RUN") { const sim = mk(); for (let k = 0; k < Math.round(dur / DT); k++) { const t = k * DT, h = f(t); sim.step({ h: h == null ? null : h * DEG, mode: typeof mode === "function" ? mode(t) : mode, keys: 0 }); } return sim; }
const conf = (sim) => sim.log.feints.filter((x) => x.confirmed);
// (1) intended feints
let nI = 0, okI = 0, towardFake = 0; const rows = [];
for (const fake of [25, 40, 60]) for (const hold of [0.08, 0.14, 0.20, 0.25]) for (const side of [1, -1]) for (const mode of ["RUN", "SPRINT"]) { const T0 = 2.0;
  const sim = run((t) => (t < T0 ? 0 : t < T0 + hold ? side * fake : -side * 45), T0 + 2.0, mode); nI++; const c = conf(sim).filter((x) => x.t >= T0 - 0.01); if (c.length) okI++;
  const bad = sim.contacts.filter((x) => x.t >= T0 && x.t <= T0 + hold + 0.02 && x.vOut && Math.hypot(...x.vOut) > 0.5 && Math.sign(Math.atan2(Math.sin(Math.atan2(x.vOut[1], x.vOut[0])), Math.cos(Math.atan2(x.vOut[1], x.vOut[0])))) === side && Math.abs(Math.atan2(x.vOut[1], x.vOut[0])) > 12 * DEG).length; towardFake += bad ? 1 : 0;
  rows.push(`${mode} fake ${side > 0 ? "+" : "-"}${fake}° for ${hold.toFixed(2)} s → ${c.length ? "FEINT" : "—"}${bad ? " (ball played toward the fake)" : ""}`); }
console.log(`(1) INTENDED feints: ${okI}/${nI} confirmed · ${towardFake} with the ball played toward the fake side`);
// (2) genuine cuts
let nG = 0, fpG = 0; for (const ang of [25, 40, 60, 75]) for (const side of [1, -1]) for (const mode of ["RUN", "SPRINT"]) { const sim = run((t) => (t < 2.0 ? 0 : side * ang), 4.0, mode); nG++; if (conf(sim).length) fpG++; }
console.log(`(2) GENUINE held cuts: ${fpG}/${nG} wrongly confirmed as feints`);
// (3) noise + torture
const noise = { "±60° every 0.35 s": (t) => (t < 1.5 ? 0 : Math.floor(t / 0.35) % 2 ? -60 : 60), "±30° every 0.12 s": (t) => (t < 1.5 ? 0 : Math.floor(t / 0.12) % 2 ? -30 : 30), "circle 270°/s": (t) => (t < 1.5 ? 0 : 270 * (t - 1.5)), "jitter ±12° every 0.05 s": (t) => (t < 1.5 ? 0 : Math.floor(t / 0.05) % 2 ? -12 : 12) };
for (const [n, f] of Object.entries(noise)) { const sim = run(f, 20, "RUN"); console.log(`(3) noise · ${n}: ${conf(sim).length} feints in 20 s`); }
const mins = +opt("minutes", 6); let fc = 0, secs = 0; for (let s = 1; secs < mins * 60; s++) { const P = program(s, 60), sim = mk(); for (let k = 0; k < Math.round(60 / DT); k++) sim.step(P.req(k * DT)); fc += conf(sim).length; secs += 60; }
console.log(`(3) RANDOM JOYSTICK TORTURE: ${fc} confirmed feints in ${(secs / 60).toFixed(0)} min (${(fc / (secs / 60)).toFixed(2)} per minute)`);

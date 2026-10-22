// phys1/tools/r_agility.mjs — PHYSICAL RATINGS V1: THE AGILITY TABLES — for each scale (A / B / C) and anchor (99 · 90 · 80 · 70 · 60 · 50 · 40 ·
// 20 · 1), at Sprint Speed 99 · Acceleration 99 · BALL OFF, each test entered at 4 phases of a stride:
//   CUTS 30 / 45 / 60 / 90 / 120 / 150 / 180° from a 4 s full sprint (38 km/h):
//     establish   the time from the request until the travel runs within 5° of the new line (at > 1 m/s)
//     vMin        the lowest speed on the way           vEst  the speed WHEN the line is established (before Acceleration rebuilds it)
//     retained    vEst ÷ the entry speed                headErr  the mean |request − travel| over the first 1.0 s
//     steps       footfalls from the request to the establishment (the support solution)
//     stable      the time until the travel holds the line within 2° turning < 20°/s for 0.2 s
//     demand      the redirection demand of the request (ratings.js)
//   REPEATED (4 s): ±30° every 0.45 s · ±60° every 0.35 s and 0.7 s · circles 270°/s (fast) and 120°/s · 0 → 90 → 0 → −90 every 1.0 s and
//     0.5 s (rapid 90° changes) — the mean and p90
//     heading lag |request − travel|, the mean and lowest speed
//   GENTLE: a 15° adjustment at 20 km/h (RUN-held 5.56 m/s), a 10°/s curve at top speed — low demand stays human
//   node r_agility.mjs [--scales A,B,C] [--ratings 99,90,…] [--json f]
import fs from "node:fs";
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; };
const DEG = Math.PI / 180, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), alt = (A, per) => (t) => (Math.floor(t / per) % 2 ? -A : A) * DEG;
export const CUTS = [30, 45, 60, 90, 120, 150, 180];
export const REPEATED = { "repeated ±30° (0.45 s)": alt(30, 0.45), "repeated ±60° (0.35 s)": alt(60, 0.35), "repeated ±60° (0.7 s)": alt(60, 0.7), "fast circle 270°/s": (t) => 270 * DEG * t, "circle 120°/s": (t) => 120 * DEG * t,
  "0 → 90 → 0 → −90 (1.0 s each)": (t) => [0, 90, 0, -90][Math.floor(t / 1.0) % 4] * DEG, "rapid 90° changes (0.5 s each)": (t) => [0, 90, 0, -90][Math.floor(t / 0.5) % 4] * DEG };
function mkSim(phys) { return makeSim("TL", { layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [20, 34], h: 0 }, ballOn: false, pace: "D38", phys }); }
function sprintUp(sim, phase, mode = "SPRINT", h = 0, dur = 4) { for (let k = 0; k < 240; k++) sim.step({ h: null, mode, keys: 0 }); for (let k = 0; k < Math.round((dur + phase) / DT); k++) sim.step({ h, mode, keys: 0 }); }
const motionAt = (sim, t) => { const P = sim.planAt(t), L = P.am || []; let m = null; for (const x of L) if (x.t <= t + 1e-9) m = x.m; return m; };
export function cutRun(phys, angle, phase) { const sim = mkSim(phys); sprintUp(sim, phase); const t0 = sim.t, s0 = sim.stateAt(t0).s, H = angle * DEG, seen = new Set();
  let est = null, vMin = Infinity, vEst = null, errSum = 0, nErr = 0, steps = 0, stable = null, run = 0, demand = null, mot = null, vReor = null;
  for (let k = 0; k < Math.round(3.0 / DT); k++) { sim.step({ h: H, mode: "SPRINT", keys: 0 }); const t = sim.t - t0, st = sim.stateAt(sim.t), err = Math.abs(wrap(st.h - H)) / DEG;
    if (demand == null) { const m = motionAt(sim, sim.t); if (m && m.target != null && Math.abs(wrap(m.target - H)) < 1e-6) { demand = m.demand; mot = m; } }
    if (mot && vReor == null && sim.t >= mot.t0 + mot.duration - 1e-9) vReor = st.s;   // (the speed when the REORIENTATION completes: Agility alone — no gain before it)
    if (est == null) { vMin = Math.min(vMin, st.s); for (const F of ["R", "L"]) { const s = sim.plan.stances[F].find((x) => x.t0 <= sim.t && x.t1 > sim.t); if (s && !seen.has(s.id) && s.t0 > t0) { seen.add(s.id); steps++; } } if (st.s > 1 && err < 5) { est = t; vEst = st.s; } }
    if (t <= 1.0) { errSum += err; nErr++; }
    if (est != null && stable == null) { if (err < 2 && Math.abs(st.turnRate || 0) / DEG < 20) { run += DT; if (run >= 0.2) stable = t - 0.2; } else run = 0; } }
  return { angle, entry: s0, establish: est, vMin: vMin === Infinity ? null : vMin, vEst, retained: vEst != null ? vEst / s0 : null, vReor, reorRetained: vReor != null ? vReor / s0 : null, reorTime: mot ? mot.duration : null, headErr: errSum / nErr, steps, stable, demand }; }
export function repRun(phys, name, phase) { const f = REPEATED[name], sim = mkSim(phys); sprintUp(sim, phase); const t0 = sim.t, E = [], V = [];
  for (let k = 0; k < Math.round(4 / DT); k++) { const t = k * DT, h = f(t); sim.step({ h, mode: "SPRINT", keys: 0 }); const st = sim.stateAt(sim.t); E.push(Math.abs(wrap(h - st.h)) / DEG); V.push(st.s); }
  const sE = E.slice().sort((a, b) => a - b); return { lag: E.reduce((a, b) => a + b, 0) / E.length, lagP90: sE[Math.floor(0.9 * sE.length)], vMean: V.reduce((a, b) => a + b, 0) / V.length, vMin: Math.min(...V) }; }
export function gentleRun(phys, kind, phase) { const sim = mkSim(phys);
  if (kind === "15° at 20 km/h") { sprintUp(sim, phase, "RUN", 0, 3); const t0 = sim.t, s0 = sim.stateAt(t0).s, H = 15 * DEG; let est = null, vMin = Infinity; for (let k = 0; k < Math.round(1.5 / DT); k++) { sim.step({ h: H, mode: "RUN", keys: 0 }); const st = sim.stateAt(sim.t); vMin = Math.min(vMin, st.s); if (est == null && Math.abs(wrap(st.h - H)) < 2 * DEG) est = sim.t - t0; } return { establish: est, retainedMin: vMin / s0, entry: s0 }; }
  sprintUp(sim, phase); const E = [], V = []; for (let k = 0; k < Math.round(3 / DT); k++) { const h = 10 * DEG * k * DT; sim.step({ h, mode: "SPRINT", keys: 0 }); const st = sim.stateAt(sim.t); E.push(Math.abs(wrap(h - st.h)) / DEG); V.push(st.s); } return { lag: E.reduce((a, b) => a + b, 0) / E.length, vMean: V.reduce((a, b) => a + b, 0) / V.length }; }
const mean = (R, k) => { const v = R.map((r) => r[k]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
if ((process.argv[1] || "").endsWith("r_agility.mjs")) { const scales = opt("scales", "A,B,C").split(","), ratings = opt("ratings", "99,90,80,70,60,50,40,20,1").split(",").map(Number), PH = [0, 0.05, 0.1, 0.15], out = {};
  for (const sc of scales) { out[sc] = {}; for (const r of ratings) { const phys = { sprint: 99, accel: 99, agility: r, agiScale: sc }, row = (out[sc][r] = { cuts: {}, repeated: {}, gentle: {} });
      for (const a of CUTS) { const R = PH.map((ph) => cutRun(phys, a, ph)); row.cuts[a] = Object.fromEntries(["establish", "vMin", "vEst", "retained", "vReor", "reorRetained", "reorTime", "headErr", "steps", "stable", "demand"].map((k) => [k, mean(R, k)])); }
      for (const n of Object.keys(REPEATED)) { const R = PH.map((ph) => repRun(phys, n, ph)); row.repeated[n] = Object.fromEntries(["lag", "lagP90", "vMean", "vMin"].map((k) => [k, mean(R, k)])); }
      for (const g of ["15° at 20 km/h", "10°/s curve at top speed"]) { const R = PH.map((ph) => gentleRun(phys, g, ph)); row.gentle[g] = Object.fromEntries(Object.keys(R[0]).map((k) => [k, mean(R, k)])); }
      const f = (x, d = 2) => (x == null ? "—" : x.toFixed(d));
      console.log(`■ scale ${sc} · A${r}: ` + CUTS.map((a) => { const c = row.cuts[a]; return `${a}° ${f(c.establish)}s reor ${f(c.reorRetained * 100, 0)}% min${f(c.vMin, 1)} st${f(c.steps, 1)}`; }).join(" | "));
      console.log(`   repeated: ` + Object.entries(row.repeated).map(([n, x]) => `${n.split(" (")[0]} lag ${f(x.lag, 1)}° (p90 ${f(x.lagP90, 0)}) v ${f(x.vMean, 1)} min ${f(x.vMin, 1)}`).join(" | ") + ` · gentle: 15°@20km/h ${f(row.gentle["15° at 20 km/h"].establish)}s min ${f(row.gentle["15° at 20 km/h"].retainedMin * 100, 1)}% · curve lag ${f(row.gentle["10°/s curve at top speed"].lag, 1)}°`); } }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

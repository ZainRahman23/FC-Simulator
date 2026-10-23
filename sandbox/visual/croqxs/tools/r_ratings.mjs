// phys1/tools/r_ratings.mjs — PHYSICAL RATINGS V1: SPRINT SPEED · ACCELERATION · the attribute separations · PHYSICAL-80 (BALL OFF, in the sim)
//   (1) SPRINT SPEED: every rating 1–99 → km/h / m/s, each step against the band's 0.1 / 0.2 / 0.3 km/h, the brief's anchor list, continuity
//   (2) ACCELERATION: per anchor the profile (c, the measured capability, launch, p, the late floor) and, IN THE SIM (S99 · A99 · from rest),
//       the times to 25 / 50 / 70 / 80 / 90 / 95 / 99 % of the available vmax and the 5 / 10 / 20 / 40 m splits
//   (3) INDEPENDENCE: S99 / Acc50 vs S50 / Acc99 (speed at 0.5 … 8 s, time to their own 90 / 95 / 99 %); Acceleration never changes vmax;
//       Agility never changes vmax (A40 and A1 on every scale reach 38 km/h on a straight)
//   (4) PHYSICAL-80-A / B / C vs PHYSICAL-99: splits, vmax, milestones, cuts 30 – 180° (from its own full sprint), repeated steering, cut →
//       accelerate, stop → accelerate
//   node r_ratings.mjs [--json f]
import fs from "node:fs";
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { sprintKmh, sprintMs, accCapability, accProfile, measuredCapability, agiCapability, curveCapacity, PHYS_PRESETS, AGI_SCALES } from "../ratings.js";
import { cutRun, repRun, CUTS, REPEATED } from "./r_agility.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, out = {}, f = (x, d = 2) => (x == null ? "—" : x.toFixed(d));
const DEG = Math.PI / 180, mk = (phys) => makeSim("TL", { layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [20, 34], h: 0 }, ballOn: false, pace: "D38", phys });
// ── (1) SPRINT SPEED ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
{ const T = [], bad = []; for (let r = 1; r <= 99; r++) { T.push({ r, kmh: sprintKmh(r), ms: sprintMs(r) }); if (r > 1) { const step = Math.round((sprintKmh(r) - sprintKmh(r - 1)) * 10), want = r >= 91 ? 3 : r >= 41 ? 2 : 1; if (step !== want) bad.push(`${r - 1}→${r}: ${step / 10} km/h (want ${want / 10})`); } }
  const BRIEF = { 99: 38.0, 98: 37.7, 97: 37.4, 96: 37.1, 95: 36.8, 94: 36.5, 93: 36.2, 92: 35.9, 91: 35.6, 90: 35.3, 89: 35.1, 85: 34.3, 80: 33.3, 75: 32.3, 70: 31.3, 60: 29.3, 50: 27.3, 40: 25.3, 39: 25.2, 30: 24.3, 20: 23.3, 10: 22.3, 1: 21.4 };
  const anchorBad = Object.entries(BRIEF).filter(([r, v]) => sprintKmh(+r) !== v).map(([r, v]) => `${r}: ${sprintKmh(+r)} ≠ ${v}`);
  const clampOk = sprintKmh(0) === 21.4 && sprintKmh(-5) === 21.4 && sprintKmh(120) === 38.0 && sprintKmh(99.0) === 38.0;
  out.sprint = { table: T, stepErrors: bad, anchorErrors: anchorBad, clampOk, s80ms: sprintMs(80), s99ms: sprintMs(99), s99isS99Build: sprintMs(99) === 38 / 3.6 };
  console.log(`■ SPRINT SPEED: 99 values · step errors ${bad.length} · brief anchors ${Object.keys(BRIEF).length - anchorBad.length}/${Object.keys(BRIEF).length} exact · clamp ${clampOk ? "OK" : "FAIL"} · 39→40 ${sprintKmh(39)}→${sprintKmh(40)} · 89→90 ${sprintKmh(89)}→${sprintKmh(90)} · S80 = ${sprintMs(80)} m/s (${sprintKmh(80)} km/h) · S99 = 38/3.6 exactly: ${sprintMs(99) === 38 / 3.6}`);
  for (const x of bad.concat(anchorBad)) console.log("   ! " + x); }
// ── a straight run from rest (1 s standing, then SPRINT ahead) — per tick speed and distance ────────────────────────────────────────────────
function fromRest(phys, dur = 10) { const sim = mk(phys); for (let k = 0; k < 240; k++) sim.step({ h: null, mode: "SPRINT", keys: 0 }); const t0 = sim.t, P0 = sim.stateAt(t0).P.slice(), S = [];
  let d = 0, prev = P0; for (let k = 0; k < Math.round(dur / DT); k++) { sim.step({ h: 0, mode: "SPRINT", keys: 0 }); const st = sim.stateAt(sim.t); d += Math.hypot(st.P[0] - prev[0], st.P[1] - prev[1]); prev = st.P.slice(); S.push({ t: sim.t - t0, s: st.s, d }); }
  return { S, vmaxRating: sim.P.speed.SPRINT, sim }; }
const MS = [0.25, 0.5, 0.7, 0.8, 0.9, 0.95, 0.99], SPL = [5, 10, 20, 40];
function profileOf(phys, dur = 12) { const R = fromRest(phys, dur), V = R.vmaxRating, ms = MS.map((x) => { const e = R.S.find((q) => q.s >= x * V - 1e-6); return e ? e.t : null; }), sp = SPL.map((m) => { const e = R.S.find((q) => q.d >= m); return e ? e.t : null; });
  const peak = Math.max(...R.S.map((q) => q.s)), at = (t) => (R.S.find((q) => q.t >= t - 1e-9) || R.S[R.S.length - 1]).s; return { vmax: V, peak, ms, splits: sp, at, S: R.S }; }
// ── (2) ACCELERATION ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
{ const rows = []; console.log(`■ ACCELERATION (S99 · A99 · BALL OFF · from rest, in the sim): rating · c · measured · launch m/s² · p · floor · time to 25/50/70/80/90/95/99 % vmax · 5/10/20/40 m`);
  for (const r of [99, 95, 90, 85, 80, 75, 70, 60, 50, 40, 30, 20, 10, 1]) { const A = accProfile(r), pr = profileOf({ sprint: 99, accel: r, agility: 99, agiScale: "B" }, 25);
    rows.push({ r, c: A.c, measuredModel: A.measured, launch: A.a0, p: A.p, aEnd: A.aEnd, L: A.L, ms: pr.ms, splits: pr.splits, peak: pr.peak });
    console.log(`   Acc${String(r).padStart(2)}  c ${f(A.c * 100, 1)} % · measured ${f(A.measured * 100, 2)} % · ${f(A.a0)} · ${f(A.p)} · ${f(A.aEnd, 3)} · ${pr.ms.map((x) => f(x)).join(" / ")} s · ${pr.splits.map((x) => f(x)).join(" / ")} s · peak ${f(pr.peak * 3.6, 2)} km/h`); }
  const sim99 = rows[0]; out.acceleration = { rows, note: "c = mean over the 25/50/70/80/90/95 % milestones of (Acc99's time ÷ this time), at the same vmax (model integration); ms/splits measured in the sim" };
  // the sim's own capability (the same definition, the sim's times) — the integration in ratings.js IS the sim's
  for (const row of rows) row.measuredSim = row.ms.slice(0, 6).reduce((s, x, i) => s + sim99.ms[i] / x, 0) / 6;
  console.log(`   capability measured from the SIM's milestone times: ` + rows.map((x) => `${x.r} ${f(x.measuredSim * 100, 1)}`).join(" · ")); }
// ── (3) INDEPENDENCE ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
{ const A = profileOf({ sprint: 99, accel: 50, agility: 99, agiScale: "B" }, 14), B = profileOf({ sprint: 50, accel: 99, agility: 99, agiScale: "B" }, 14), T = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 13];
  out.independence = { S99_Acc50: { vmax: A.vmax, peak: A.peak, ms: A.ms, splits: A.splits, speedAt: T.map((t) => A.at(t)) }, S50_Acc99: { vmax: B.vmax, peak: B.peak, ms: B.ms, splits: B.splits, speedAt: T.map((t) => B.at(t)) }, times: T };
  console.log(`■ S99 / Acc50 vs S50 / Acc99 (from rest) — speed (km/h) at ${T.join(" / ")} s:`);
  console.log(`   S99/Acc50  ${T.map((t) => f(A.at(t) * 3.6, 1)).join(" / ")} · peak ${f(A.peak * 3.6, 2)} (vmax ${f(A.vmax * 3.6, 1)}) · own 90/95/99 % at ${[4, 5, 6].map((i) => f(A.ms[i])).join(" / ")} s · 5/10/20/40 m ${A.splits.map((x) => f(x)).join(" / ")}`);
  console.log(`   S50/Acc99  ${T.map((t) => f(B.at(t) * 3.6, 1)).join(" / ")} · peak ${f(B.peak * 3.6, 2)} (vmax ${f(B.vmax * 3.6, 1)}) · own 90/95/99 % at ${[4, 5, 6].map((i) => f(B.ms[i])).join(" / ")} s · 5/10/20/40 m ${B.splits.map((x) => f(x)).join(" / ")}`);
  const cross = A.S.find((q, i) => q.d > B.S[i].d); console.log(`   the S99/Acc50 runner passes the S50/Acc99 runner at ${cross ? f(cross.t) + " s, " + f(cross.d, 1) + " m" : "— (not within 14 s)"}`); out.independence.passAt = cross ? { t: cross.t, d: cross.d } : null;
  const agi = []; for (const sc of ["A", "B", "C"]) for (const r of [40, 1]) { const p = profileOf({ sprint: 99, accel: 99, agility: r, agiScale: sc }, 8); agi.push({ scale: sc, r, peak: p.peak, ms: p.ms, splits: p.splits }); }
  const p99 = profileOf({ sprint: 99, accel: 99, agility: 99, agiScale: "B" }, 8), same = agi.every((x) => x.splits.every((y, i) => y === p99.splits[i]) && x.peak === p99.peak);
  out.independence.agility = { rows: agi, identicalToA99: same }; console.log(`   AGILITY vs vmax (straight from rest, S99 · Acc99): A40 / A1 on scales A, B, C peak ${agi.map((x) => f(x.peak * 3.6, 2)).join(" / ")} km/h · splits identical to A99: ${same}`);
  const acc = []; for (const r of [80, 50, 20, 1]) { const p = profileOf({ sprint: 80, accel: r, agility: 99, agiScale: "B" }, 30); acc.push({ r, peak: p.peak }); } out.independence.accVmax = acc;
  console.log(`   ACCELERATION vs vmax (S80, from rest, 30 s): Acc80 / 50 / 20 / 1 peak ${acc.map((x) => f(x.peak, 4)).join(" / ")} m/s (S80 = ${sprintMs(80)})`); }
// ── (4) PHYSICAL-80-A / B / C vs PHYSICAL-99 ────────────────────────────────────────────────────────────────────────────────────────────────
function cutAccel(phys, angle, phase) { const sim = mk(phys); for (let k = 0; k < 240; k++) sim.step({ h: null, mode: "SPRINT", keys: 0 }); for (let k = 0; k < Math.round((4 + phase) / DT); k++) sim.step({ h: 0, mode: "SPRINT", keys: 0 });
  const V = sim.P.speed.SPRINT, t0 = sim.t, H = angle * DEG; let t90 = null, t95 = null, d = 0, prev = sim.stateAt(t0).P.slice(), d2 = null;
  for (let k = 0; k < Math.round(6 / DT); k++) { sim.step({ h: H, mode: "SPRINT", keys: 0 }); const st = sim.stateAt(sim.t), t = sim.t - t0, onLine = Math.abs(Math.atan2(Math.sin(st.h - H), Math.cos(st.h - H))) < 5 * DEG;
    const dp = [st.P[0] - prev[0], st.P[1] - prev[1]]; prev = st.P.slice(); d += dp[0] * Math.cos(H) + dp[1] * Math.sin(H); if (d2 == null && t >= 2) d2 = d;
    if (onLine && t90 == null && st.s >= 0.9 * V) t90 = t; if (onLine && t95 == null && st.s >= 0.95 * V) { t95 = t; } }
  return { t90, t95, along2s: d2 }; }
function stopAccel(phys, phase, reverse) { const sim = mk(phys); for (let k = 0; k < 240; k++) sim.step({ h: null, mode: "SPRINT", keys: 0 }); for (let k = 0; k < Math.round((4 + phase) / DT); k++) sim.step({ h: 0, mode: "SPRINT", keys: 0 });
  const t0 = sim.t; let tStop = null; for (let k = 0; k < Math.round(4 / DT); k++) { sim.step({ h: null, mode: "SPRINT", keys: 0 }); if (sim.stateAt(sim.t).s < 0.05) { tStop = sim.t - t0; break; } }
  const V = sim.P.speed.SPRINT, H = reverse ? Math.PI : 0, t1 = sim.t; let prev = sim.stateAt(t1).P.slice(), d = 0; const sp = {}; let t90 = null;
  for (let k = 0; k < Math.round(6 / DT); k++) { sim.step({ h: H, mode: "SPRINT", keys: 0 }); const st = sim.stateAt(sim.t), t = sim.t - t1; d += Math.hypot(st.P[0] - prev[0], st.P[1] - prev[1]); prev = st.P.slice(); for (const m of [5, 10]) if (sp[m] == null && d >= m) sp[m] = t; if (t90 == null && st.s >= 0.9 * V) t90 = t; }
  return { tStop, t5: sp[5], t10: sp[10], t90 }; }
{ const PH = [0, 0.05, 0.1, 0.15], mean = (A) => { const v = A.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }; out.physical = {};
  for (const id of Object.keys(PHYS_PRESETS)) { const phys = PHYS_PRESETS[id], pr = profileOf(phys, 12), row = (out.physical[id] = { phys, vmax: pr.vmax, peak: pr.peak, ms: pr.ms, splits: pr.splits, accCap: accCapability(phys.accel), agiCap: phys.agility === 99 ? 1 : agiCapability(phys.agility, phys.agiScale), curveCap: phys.agility === 99 ? null : curveCapacity(agiCapability(phys.agility, phys.agiScale)), cuts: {}, repeated: {}, cutAccel: {}, stopAccel: {} });
    for (const a of CUTS) { const R = PH.map((ph) => cutRun(phys, a, ph)); row.cuts[a] = Object.fromEntries(["establish", "vMin", "vEst", "retained", "vReor", "reorRetained", "reorTime", "headErr", "steps", "stable", "demand", "entry"].map((k) => [k, mean(R.map((x) => x[k]))])); }
    for (const n of Object.keys(REPEATED)) { const R = PH.map((ph) => repRun(phys, n, ph)); row.repeated[n] = Object.fromEntries(["lag", "lagP90", "vMean", "vMin"].map((k) => [k, mean(R.map((x) => x[k]))])); }
    for (const a of [45, 90, 135]) { const R = PH.map((ph) => cutAccel(phys, a, ph)); row.cutAccel[a] = { t90: mean(R.map((x) => x.t90)), t95: mean(R.map((x) => x.t95)), along2s: mean(R.map((x) => x.along2s)) }; }
    for (const rev of [false, true]) { const R = PH.map((ph) => stopAccel(phys, ph, rev)); row.stopAccel[rev ? "reverse" : "same"] = { tStop: mean(R.map((x) => x.tStop)), t5: mean(R.map((x) => x.t5)), t10: mean(R.map((x) => x.t10)), t90: mean(R.map((x) => x.t90)) }; }
    console.log(`■ ${id}: vmax ${f(pr.vmax, 4)} m/s (${f(pr.vmax * 3.6, 1)} km/h) peak ${f(pr.peak, 4)} · 5/10/20/40 m ${pr.splits.map((x) => f(x)).join(" / ")} s · 25/50/70/80/90/95/99 % ${pr.ms.map((x) => f(x)).join(" / ")} s · Acc cap ${f(row.accCap * 100, 1)} % · Agi cap ${f(row.agiCap * 100, 1)} %${row.curveCap ? " · curve " + f(row.curveCap, 1) + " m/s²" : ""}`);
    console.log(`   cuts: ` + CUTS.map((a) => { const c = row.cuts[a]; return `${a}° ${f(c.establish)} s · reor ${f(c.reorRetained * 100, 0)} % · min ${f(c.vMin, 1)}`; }).join(" | "));
    console.log(`   repeated: ` + Object.entries(row.repeated).map(([n, x]) => `${n.split(" (")[0]}${n.includes("(") ? " (" + n.split(" (")[1] : ""} lag ${f(x.lag, 1)}° v ${f(x.vMean, 1)}`).join(" | "));
    console.log(`   cut → accelerate (to 90 / 95 % vmax on the new line): ` + Object.entries(row.cutAccel).map(([a, x]) => `${a}° ${f(x.t90)} / ${f(x.t95)} s · ${f(x.along2s, 1)} m along in 2 s`).join(" | ") + ` · stop → accelerate: stop ${f(row.stopAccel.same.tStop)} s, then 5 / 10 m ${f(row.stopAccel.same.t5)} / ${f(row.stopAccel.same.t10)} s, 90 % ${f(row.stopAccel.same.t90)} s · (reverse: 5 / 10 m ${f(row.stopAccel.reverse.t5)} / ${f(row.stopAccel.reverse.t10)} s)`); } }
if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, (k, v) => (k === "S" ? undefined : v), 1));

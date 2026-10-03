// ═══ physchar2/tools/g1_heel.mjs — focused investigation of the feet-first 1.0 m drop heel rise (measurement only; nothing adopted) ═══════════
// PERMANENT INSTRUMENTATION (user decision 2026-10-03, review_artifacts/physical_character_v2/DECISIONS.md): preserve; do not remove.
// Runs the EXACT G1 validated-baseline drop1m (V2-REF, 240 Hz, 150 it, 10-piece boot) with gates/v2_g1_ankle.js on both feet, plus diagnostic
// counterfactuals (single hull, ankle tissue / end-stop / damping disabled, other contact geometries, couplings off). Per tick from just before
// first foot contact to 1.8 s: kinematics, exact ground-contact wrench + centre of pressure, per-piece contact, ankle torque decomposition,
// work on the foot by source, ankle and whole-body passive energy audit. Writes g1/heel/heel_<variant>.json, SVG plots and heel_summary.json.
// usage: node tools/g1_heel.mjs
import fs from "fs"; import path from "path"; import { fork } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { V2_REF } from "../spec/v2_human.js";
import { G1Sim } from "../gates/v2_g1.js";
import { applyMods } from "../gates/v2_g1_dx.js";
import { AnkleProbe } from "../gates/v2_g1_ankle.js";
import { V } from "../core/v2_math.js";
const G1G = 9.81;
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g1/heel"), VEND = path.join(here, "../vendor/jolt-physics.wasm-compat.js");
const BOTH = (o) => ({ ankle_L: o, ankle_R: o });
export const VARIANTS = [
  { id: "V0", label: "validated baseline (10-piece boot)", mods: [], po: {} },
  { id: "V1", label: "old single-hull boot", mods: ["singleHull"], po: {} },
  { id: "V2", label: "C3 two-piece boot (contact geometry)", mods: ["bootGridC3"], po: {} },
  { id: "V3", label: "12-piece boot (contact geometry)", mods: ["bootGridAP4xML3"], po: {} },
  { id: "V4", label: "ankle elastic tissue OFF (end-range law + end-stop; damping kept)", mods: [], po: { diagJoint: BOTH({ elastic: false }) } },
  { id: "V5", label: "ankle end-stop OFF (end-range law kept)", mods: [], po: { diagJoint: BOTH({ stop: false }) } },
  { id: "V6", label: "ankle passive tissue fully OFF (elastic + end-stop + damping)", mods: [], po: { diagJoint: BOTH({ elastic: false, damping: false }) } },
  { id: "V7", label: "all pose couplings OFF (gastrocnemius / hamstring / screw-home / hip rotation)", mods: [], po: { couplings: false } },
  { id: "V8", label: "feet collide with the turf only (foot self-contact OFF)", mods: [], po: {}, footSelf: false },
  { id: "V9", label: "480 Hz (numerical convergence)", mods: [], po: {}, cfg: { hz: 480 } },
  { id: "V12", label: "720 Hz (numerical convergence; the G1 timestep reference rate)", mods: [], po: {}, cfg: { hz: 720 } },
  { id: "V10", label: "960 Hz (numerical convergence)", mods: [], po: {}, cfg: { hz: 960 } },
  { id: "V11", label: "300 velocity iterations (numerical convergence)", mods: [], po: {}, cfg: { velSteps: 300 } },
];
const T0 = 0.40, T1 = 1.80;
const mat3 = (q) => { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]; };
const mv3 = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
const keRot = (q, I, w) => { const R = mat3(q), wl = [R[0] * w[0] + R[3] * w[1] + R[6] * w[2], R[1] * w[0] + R[4] * w[1] + R[7] * w[2], R[2] * w[0] + R[5] * w[1] + R[8] * w[2]]; return 0.5 * [0, 1, 2].reduce((a, i) => a + wl[i] * (I[i][0] * wl[0] + I[i][1] * wl[1] + I[i][2] * wl[2]), 0); };
// pitch at which the boot, standing on its lowest point, has the ankle (foot origin) directly above that point: the torque-free "strut" pose
function strutAngle(probe) { const pts = probe.pieces.flatMap(p => p.P); let prev = null;
  for (let a = 0.5; a <= 89.5; a += 0.01) { const r = a * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r); let best = null;
    for (const p of pts) { const y = p[1] * c - p[2] * sn, z = p[1] * sn + p[2] * c; if (!best || y < best.y - 1e-9) best = { y, z, p }; }
    if (prev && prev.z > 0 && best.z <= 0) return { deg: +a.toFixed(2), contactLocal: best.p.map(x => +x.toFixed(4)), ankleAboveContactMm: +(-best.y * 1000).toFixed(1) }; prev = best; } return null; }
function runVariant(J, v) {
  let spec = applyMods(generateSpec(V2_REF), v.mods);
  if (v.footSelf === false) { const fi = spec.bodies.map((b, i) => (/^foot_/.test(b.name) ? i : -1)).filter(i => i >= 0), have = new Set(spec.disabledPairs.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b)));
    spec = { ...spec, disabledPairs: spec.disabledPairs.slice() }; for (const f of fi) spec.bodies.forEach((b, i) => { const key = Math.min(f, i) + "-" + Math.max(f, i); if (i !== f && !fi.includes(i) && !have.has(key)) { spec.disabledPairs.push([f, i]); have.add(key); } }); }
  const s = new G1Sim(J, spec, "drop1m", { passiveOpts: v.po, cfg: v.cfg }), probes = ["L", "R"].map(sd => new AnkleProbe(s, sd)), pR = probes[1];
  const B = spec.bodies, nb = B.length, M = s.M, nj = spec.joints.length, rowsBody = [], pel = B.findIndex(b => b.name === "pelvis"), kR = B.findIndex(b => b.name === "shank_R"), fR = pR.fi;
  const com = (st) => st.reduce((a, x, i) => V.add(a, V.sc(V.add(x.pos, mv3(mat3(x.rot), B[i].comLocal)), B[i].mass / M)), [0, 0, 0]);
  const mom = (st) => st.reduce((a, x, i) => V.add(a, V.sc(x.v, B[i].mass)), [0, 0, 0]);
  const ke = (st) => st.reduce((a, x, i) => a + 0.5 * B[i].mass * V.dot(x.v, x.v) + keRot(x.rot, B[i].inertia, x.w), 0);
  while (true) { probes.forEach(p => p.before()); const st0 = s.st.map(x => ({ v: x.v.slice(), w: x.w.slice(), pos: x.pos.slice(), rot: x.rot.slice() })), plan = new Map(s.up.joints.map(pl => [pl.k, pl.axW.map(a => a.slice())])), U0 = s.up.ev.U;
    if (!s.tick()) break; const t = s.n * s.dt; probes.forEach(p => p.after()); if (t < T0 || t > T1) { for (const p of probes) p.rows.pop(); continue; }
    // whole body: exact total external (turf) impulse from the momentum change; COM; kinetic energy; passive-layer drive work (mid-step) vs ΔU
    const P0 = mom(st0), P1 = mom(s.st), GRF = V.sc(V.add(V.sub(P1, P0), [0, G1G * M * s.dt, 0]), 1 / s.dt), c1 = com(s.st), KE = ke(s.st), KEcom = 0.5 * V.dot(P1, P1) / M;
    let Wdrive = 0; for (let k = 0; k < nj; k++) { const d = s.P.jd[k], ax = plan.get(k); if (!ax || !d.rows.some(Boolean)) continue; const lm = s.w.lambdaMotor(k);
      const wr = V.sc(V.add(V.sub(st0[d.child].w, st0[d.parent].w), V.sub(s.st[d.child].w, s.st[d.parent].w)), 0.5); Wdrive += [0, 1, 2].reduce((a, i) => a + lm[i] * V.dot(wr, ax[i]), 0); }
    const touch = new Set(), spc = new Set(); for (const c of s.lastContacts || []) if (c.a < 0 || c.b < 0) { const n = B[c.a < 0 ? c.b : c.a].name; if (c.depth > -0.0005) touch.add(n); else spc.add(n); }
    const ft = s.st[fR], Rf = mat3(ft.rot), fw = mv3(Rf, [0, 0, 1]), fH = V.norm([fw[0], 0, fw[2]]), heelW = V.add(ft.pos, mv3(Rf, pR.heelRear)), toeW = V.add(ft.pos, mv3(Rf, [0, pR.heelRear[1], pR.z1]));
    const fr = probes.map(p => p.rows.at(-1));
    rowsBody.push({ t, E: s.last.E, U: s.up.ev.U, dU: s.up.ev.U - U0, Wdrive, D: s.A.Dstep.at(-1), comY: c1[1], vComY: P1[1] / M, vComFwd: V.dot(P1, fH) / M, GRFy: GRF[1], GRFfeetY: fr[0].JyN + fr[1].JyN,
      grounded: [...touch], groundedSpec: [...spc].filter(n => !touch.has(n)), KE, KEcom, KEint: KE - KEcom, comAlongR: V.dot(V.sub(c1, heelW), fH), ankleAlongR: V.dot(V.sub(ft.pos, heelW), fH), toeAlongR: V.dot(V.sub(toeW, heelW), fH),
      kneeYR: s.st[kR].pos[1], pelvisY: s.st[pel].pos[1] }); }
  const sum = s.summary(), nCoup = s.P.coup.length; s.destroy();
  return { id: v.id, label: v.label, M, hz: s.cfg.hz, velSteps: s.cfg.velSteps, hash: sum.hash, nCoup, disabledPairs: spec.disabledPairs.length, engineTicks: sum.engine.ticks, engineAxes: sum.engine.axes, maxRiseJ: sum.energy.maxRiseJ,
    strut: strutAngle(pR), feet: probes.map(p => ({ side: p.side, len: p.len, ankleAlong: -p.z0, mass: p.m, rows: p.rows })), body: rowsBody };
}
// ── analysis ──
const ANK = { softPF: -50, hardPF: -60 };
const sumOf = (rows, k) => rows.reduce((a, r) => a + (r[k] || 0), 0), maxAbs = (rows, k) => Math.max(0, ...rows.map(r => Math.abs(r[k] || 0)));
function phaseStats(name, R, a, b) {
  if (a < 0 || b < a) return null; const rows = R.slice(a, b + 1); if (!rows.length) return null; const dt = rows[0].dt, before = R[a - 1] || rows[0];
  const loaded = rows.filter(r => r.copFrac != null && r.JyN > 20), wsum = loaded.reduce((s2, r) => s2 + r.JyN, 0);
  const pieceTicks = {}; for (const r of rows) for (const pc of r.pieces) if (pc.touch) pieceTicks[pc.sub] = (pieceTicks[pc.sub] || 0) + 1;
  const pieceShare = {}; for (const r of loaded) for (const pc of r.pieces) if (pc.share) pieceShare[pc.sub] = (pieceShare[pc.sub] || 0) + pc.share * r.JyN / wsum;
  return { name, i0: a, i1: b, t0: rows[0].t, t1: rows.at(-1).t, ticks: rows.length, heel0: before.heelMm, heel1: rows.at(-1).heelMm, pitch0: before.pitchDeg, pitch1: rows.at(-1).pitchDeg, df0: before.dfDeg, df1: rows.at(-1).dfDeg,
    impY: sumOf(rows, "JyN") * dt, impH: sumOf(rows, "JxzN") * dt, meanJyN: sumOf(rows, "JyN") / rows.length, maxJyN: Math.max(...rows.map(r => r.JyN)), minJyN: Math.min(...rows.map(r => r.JyN)),
    copFracLoadW: wsum > 0 ? loaded.reduce((s2, r) => s2 + r.copFrac * r.JyN, 0) / wsum : null, copUnderAnkleLoadWmm: wsum > 0 ? loaded.reduce((s2, r) => s2 + r.copUnderAnkleMm * r.JyN, 0) / wsum : null,
    W_point: sumOf(rows, "W_point"), W_rows: sumOf(rows, "W_rows"), W_ext: sumOf(rows, "W_ext"), W_contactEst: sumOf(rows, "W_contact"), W_grav: sumOf(rows, "W_grav"), dEfoot: sumOf(rows, "dEfoot"),
    angImp: { drive: sumOf(rows, "motorDF") * dt, law: sumOf(rows, "lawTau") * dt, stop: sumOf(rows, "stopTau") * dt, damping: sumOf(rows, "dampDF") * dt, emergency: sumOf(rows, "limDF") * dt, contactAboutAnkle: sumOf(rows, "McA_pitch") * dt, gravityAboutAnkle: sumOf(rows, "gravPitch") * dt },
    maxTau: { drive: maxAbs(rows, "motorDF"), law: maxAbs(rows, "lawTau"), stop: maxAbs(rows, "stopTau"), damping: maxAbs(rows, "dampDF"), emergency: maxAbs(rows, "limDF") }, emergencyTicks: rows.filter(r => r.limAny).length,
    ankleDriveWork: rows.reduce((s2, r) => s2 + (r.P_motor + r.P_lim + r.P_expl) * dt, 0), dU_ankle: rows.at(-1).U_ankle - before.U_ankle, U_ankleMax: Math.max(...rows.map(r => r.U_ankle)),
    selfContact: [...new Set(rows.flatMap(r => r.otherContacts))], selfContactTicks: rows.filter(r => r.otherContacts.length).length, pieceTicks, pieceShare };
}
function analyse(res) {
  const out = { id: res.id, label: res.label, hz: res.hz, velSteps: res.velSteps, hash: res.hash, nCoup: res.nCoup, engineTicks: res.engineTicks, engineAxes: res.engineAxes, maxRiseJ: res.maxRiseJ, strut: res.strut, feet: [] };
  for (const f of res.feet) { const R = f.rows, dt = R[0].dt; R.forEach((r, i) => { r.aDF = i ? (r.wDF - R[i - 1].wDF) / dt : 0; });
    const i0 = R.findIndex(r => r.pieces.some(p => p.touch)); let iImp = i0; for (let i = i0; i < Math.min(R.length, i0 + Math.round(0.02 / dt)); i++) if (R[i].JyN > R[iImp].JyN) iImp = i;
    const iOff = R.findIndex((r, i) => i > iImp && r.heelMm > 1), after = (pred, from) => { const k = R.findIndex((r, i) => i >= from && pred(r)); return k; };
    const iFree = after(r => r.otherContacts.length > 0 || r.dfDeg < ANK.softPF || r.limAny, iOff);          // end of the free rise: first self-contact manifold, PF soft limit or emergency stop
    const iUp = after(r => r.heelMm > 20, iOff), iRet0 = iUp > 0 ? after(r => r.heelMm < 5, iUp) : -1, iPkEnd = iRet0 > 0 ? iRet0 : R.length - 1; let iPk = iOff; for (let i = iOff; i <= iPkEnd; i++) if (R[i].heelMm > R[iPk].heelMm) iPk = i;
    const iRet = after(r => r.heelMm < 5, iPk + 1), iSoft = after(r => r.dfDeg < ANK.softPF, iOff), iSelf = after(r => r.otherContacts.length > 0, iOff);
    let iPF = iImp; for (let i = iImp; i < (iRet > 0 ? iRet : R.length); i++) if (R[i].dfDeg < R[iPF].dfDeg) iPF = i;
    let i2 = -1; if (iRet > 0) for (let i = iRet; i < R.length; i++) if (i2 < 0 || R[i].heelMm > R[i2].heelMm) i2 = i;
    const freeEnd = (iFree > 0 ? iFree : iPk + 1) - 1, loadedStrut = R.slice(iOff, freeEnd + 1).filter(r => r.JyN > 100 && r.pitchDeg > 30);
    // line of action of the turf force relative to the ankle: perpendicular distance |M_A,pitch| / |F| (0 = the force passes through the ankle: torque-free two-force strut)
    loadedStrut.forEach(r => { r.lineDistMm = Math.abs(r.McA_pitch) / Math.hypot(r.JyN, r.JxzN) * 1000; r.forceTiltDeg = Math.atan2(r.JxzN, r.JyN) * 180 / Math.PI; }); const lw = loadedStrut.reduce((a, r) => a + r.JyN, 0);
    const iLift = after(r => r.foreMm > 10, iImp + 1), plantEnd = iLift > 0 ? iLift - 1 : R.length - 1; let iPl = iImp; for (let i = iImp; i <= plantEnd; i++) if (R[i].heelMm > R[iPl].heelMm) iPl = i;
    out.feet.push({ side: f.side, mass: f.mass, len: f.len, ankleFrac: f.ankleAlong / f.len, firstContactT: R[i0].t, impactT: R[iImp].t, impact: { JyNs: R[iImp].Jc[1], JxzNs: Math.hypot(R[iImp].Jc[0], R[iImp].Jc[2]), copFrac: R[iImp].copFrac, McA_pitchNs: R[iImp].McA_pitch * dt, wDFafter: R[iImp].wDF, shankRateAfter: R[iImp].shankPitchRate, pieces: R[iImp].pieces.filter(p => p.touch).map(p => p.sub) },
      heelOffT: R[iOff].t, freeRiseEndT: R[freeEnd].t, heelAtFreeEndMm: R[freeEnd].heelMm, pitchAtFreeEndDeg: R[freeEnd].pitchDeg, heelPeakMm: R[iPk].heelMm, heelPeakT: R[iPk].t, pitchPeakDeg: Math.max(...R.slice(iImp, iRet > 0 ? iRet : R.length).map(r => r.pitchDeg)),
      pfPeakDeg: R[iPF].dfDeg, pfPeakT: R[iPF].t, pfBeyondHardDeg: Math.max(0, ANK.hardPF - R[iPF].dfDeg), softReachedT: iSoft >= 0 ? R[iSoft].t : null, heelAtSoftMm: iSoft >= 0 ? R[iSoft].heelMm : null,
      firstSelfContactT: iSelf >= 0 ? R[iSelf].t : null, heelAtFirstSelfMm: iSelf >= 0 ? R[iSelf].heelMm : null, heelReturnT: iRet >= 0 ? R[iRet].t : null, secondPeakMm: i2 >= 0 ? R[i2].heelMm : null, secondPeakT: i2 >= 0 ? R[i2].t : null,
      kneeMaxDeg: Math.max(...R.map(r => r.kneeDeg)), strutTicks: loadedStrut.length, strutPitchDeg: lw ? loadedStrut.reduce((a, r) => a + r.pitchDeg * r.JyN, 0) / lw : null, strutLineDistMm: lw ? loadedStrut.reduce((a, r) => a + r.lineDistMm * r.JyN, 0) / lw : null,
      strutForceTiltDeg: lw ? loadedStrut.reduce((a, r) => a + r.forceTiltDeg * r.JyN, 0) / lw : null, strutMaxLineDistMm: loadedStrut.length ? Math.max(...loadedStrut.map(r => r.lineDistMm)) : null, strutMeanFyN: loadedStrut.length ? lw / loadedStrut.length : null,
      footLiftT: iLift > 0 ? R[iLift].t : null, plantedPeakMm: R[iPl].heelMm, plantedPeakT: R[iPl].t, endHeelMm: R.at(-1).heelMm, endForeMm: R.at(-1).foreMm,
      maxStepAnkleExcessJ: Math.max(...R.slice(iImp).map((r, k) => (r.P_motor + r.P_lim + r.P_expl) * dt + (r.U_ankle - R[iImp + k - 1].U_ankle))),
      phases: [phaseStats("impact tick", R, iImp, iImp), phaseStats("free rise (no self-contact, ankle inside its soft range, no emergency stop)", R, iImp + 1, freeEnd), phaseStats("to the peak (self-contact and / or PF end range)", R, freeEnd + 1, iPk),
        phaseStats("return to heel contact", R, iPk + 1, iRet > 0 ? iRet : R.length - 1)].filter(Boolean) });
  }
  const tc = out.feet[0].firstContactT, B = res.body, at = (t) => B.reduce((b, r) => (Math.abs(r.t - t) < Math.abs(b.t - t) ? r : b), B[0]), fR = out.feet[1];
  const pre = B.filter(r => r.t < tc + 0.03 && Math.abs(r.GRFy) < 0.01 * res.M * G1G && r.t < fR.impactT).at(-1) || B[0], imp = at(fR.impactT), free = B.filter(r => r.t > fR.impactT + 1e-9 && r.t <= fR.freeRiseEndT + 1e-9), ev = B.filter(r => r.t >= tc && r.t <= 1.2);
  out.body = { end: { t: B.at(-1).t, comY: B.at(-1).comY, grounded: B.at(-1).grounded }, preImpact: { t: pre.t, vComY: pre.vComY, KE: pre.KE, KEint: pre.KEint }, postImpact: { t: imp.t, vComY: imp.vComY, KE: imp.KE, KEint: imp.KEint, GRFyN: imp.GRFy, impulseNs: B.filter(r => r.t >= tc && r.t <= imp.t + 1e-9).reduce((a, r) => a + r.GRFy * res.feet[1].rows[0].dt, 0) },
    freeRise: free.length ? { t0: free[0].t, t1: free.at(-1).t, meanGRFpctBW: free.reduce((a, r) => a + r.GRFy, 0) / free.length / (res.M * G1G) * 100, maxGRFpctBW: Math.max(...free.map(r => r.GRFy)) / (res.M * G1G) * 100, comAccelY: (free.at(-1).vComY - free[0].vComY) / (free.at(-1).t - free[0].t), comDropM: free[0].comY - free.at(-1).comY,
      comAlong0: free[0].comAlongR, comAlong1: free.at(-1).comAlongR, ankleAlong1: free.at(-1).ankleAlongR, toeAlong1: free.at(-1).toeAlongR, kneeRiseM: free.at(-1).kneeYR - free[0].kneeYR, pelvisDropM: free[0].pelvisY - free.at(-1).pelvisY, groundedOther: [...new Set(free.flatMap(r => r.grounded.concat(r.groundedSpec)).filter(n => !/^foot_/.test(n)))] } : null,
    audit: { Wdrive: ev.reduce((a, r) => a + r.Wdrive, 0), dU: ev.reduce((a, r) => a + r.dU, 0), damping: ev.reduce((a, r) => a + r.D, 0), dE: ev.at(-1).E - ev[0].E, maxStepExcessJ: Math.max(...ev.map(r => r.Wdrive + r.dU)) } };
  return out;
}
// ── SVG plots ──
const COLS = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#9a6324", "#000075", "#808000", "#469990", "#aaaaaa"];
function svgPanels(title, t, panels, W = 1150, Hp = 140) {
  const H = 40 + panels.reduce((a, p) => a + (p.h || Hp) + 30, 0), x0 = 70, x1 = W - 250, tx = (v) => x0 + (v - t[0]) / (t.at(-1) - t[0]) * (x1 - x0);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Helvetica,Arial,sans-serif" font-size="11"><rect width="100%" height="100%" fill="#fff"/><text x="${x0}" y="20" font-size="14" font-weight="bold">${title}</text>`, y0 = 40;
  for (const p of panels) { const hp = p.h || Hp;
    s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${hp}" fill="none" stroke="#999"/><text x="${x0 + 4}" y="${y0 - 4}" font-weight="bold">${p.title}</text>`;
    (p.marks || []).forEach((m, k) => { s += `<line x1="${tx(m.t)}" x2="${tx(m.t)}" y1="${y0}" y2="${y0 + hp}" stroke="#bbb"/><text x="${tx(m.t) + 2}" y="${y0 + hp - 3 - 10 * (k % 3)}" fill="#888" font-size="9">${m.label}</text>`; });
    const span = t.at(-1) - t[0], st = span < 0.6 ? 0.05 : 0.1; for (let v = Math.ceil(t[0] / st - 1e-9) * st; v <= t.at(-1) + 1e-9; v += st) s += `<line x1="${tx(v)}" x2="${tx(v)}" y1="${y0 + hp}" y2="${y0 + hp + 4}" stroke="#999"/><text x="${tx(v)}" y="${y0 + hp + 14}" text-anchor="middle" font-size="9" fill="#666">${v.toFixed(2)}</text>`;
    if (p.raster) { const n = p.raster.length, rh = hp / n; p.raster.forEach((rw, k) => { const yy = y0 + k * rh; s += `<text x="${x0 - 6}" y="${yy + rh * 0.7}" text-anchor="end" font-size="9">${rw.name}</text>`;
        for (let i = 0; i < rw.v.length - 1;) { const st = rw.v[i]; let j = i + 1; while (j < rw.v.length - 1 && rw.v[j] === st) j++; if (st) { const xa = tx(t[i]), xb = tx(t[j]); s += `<rect x="${xa.toFixed(1)}" y="${(yy + (st === 2 ? 1 : rh * 0.4)).toFixed(1)}" width="${Math.max(0.6, xb - xa).toFixed(1)}" height="${(st === 2 ? rh - 2 : rh * 0.2).toFixed(1)}" fill="${st === 2 ? "#4363d8" : "#bbb"}"/>`; } i = j; } });
      s += `<text x="${x1 + 8}" y="${y0 + 12}" fill="#4363d8">touching (≤ 0.5 mm)</text><text x="${x1 + 8}" y="${y0 + 25}" fill="#999">speculative only</text>`; y0 += hp + 30; continue; }
    const vals = p.series.flatMap(sr => sr.v.filter(Number.isFinite)); let lo = Math.min(...vals, p.min ?? Infinity), hi = Math.max(...vals, p.max ?? -Infinity); if (!(hi - lo > 1e-9)) { hi = (hi || 0) + 1; lo = (lo || 0) - 1; }
    const ty = (v) => y0 + hp - (v - lo) / (hi - lo) * hp; s += `<text x="${x0 - 6}" y="${y0 + 10}" text-anchor="end">${+hi.toPrecision(3)}</text><text x="${x0 - 6}" y="${y0 + hp}" text-anchor="end">${+lo.toPrecision(3)}</text>`;
    if (lo < 0 && hi > 0) s += `<line x1="${x0}" x2="${x1}" y1="${ty(0)}" y2="${ty(0)}" stroke="#ccc" stroke-dasharray="3,3"/>`;
    p.series.forEach((sr, j) => { let d = "", pen = false; sr.v.forEach((v, i) => { if (!Number.isFinite(v)) { pen = false; return; } d += `${pen ? "L" : "M"}${tx(t[i]).toFixed(1)},${ty(v).toFixed(1)}`; pen = true; });
      const col = sr.color || COLS[j % COLS.length]; s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sr.w || 1.4}"${sr.dash ? ' stroke-dasharray="4,3"' : ""}/><text x="${x1 + 8}" y="${y0 + 12 + 12 * j}" fill="${col}">${sr.name}</text>`; });
    y0 += hp + 30; }
  s += `<text x="${(x0 + x1) / 2}" y="${H - 6}" text-anchor="middle">time (s)</text></svg>`; return s;
}
const clip = (v, L) => (Number.isFinite(v) ? Math.max(-L, Math.min(L, v)) : NaN);
function footMarks(a) { return [{ t: a.impactT, label: "impact" }, { t: a.freeRiseEndT, label: "free rise ends" }, { t: a.heelPeakT, label: "peak" }, a.heelReturnT ? { t: a.heelReturnT, label: "heel down" } : null].filter(Boolean); }
function plotsFor(res, an, win = null, suffix = "") {
  for (const f of res.feet) { const R = win ? f.rows.filter(r => r.t >= win[0] && r.t <= win[1]) : f.rows, t = R.map(r => r.t), a = an.feet.find(x => x.side === f.side), marks = footMarks(a), i0 = R.findIndex(r => r.t > a.impactT + 1e-9);
    const cum = (k) => { let s2 = 0; return R.map((r, i) => (i < i0 ? NaN : (s2 += r[k]))); }, pcs = R[0].pieces.map(p => p.sub);
    const svg = svgPanels(`${res.id} — ${res.label} — foot_${f.side}${win ? ` — zoom ${win[0]}–${win[1]} s` : ""} (drop1m, V2-REF${res.hz !== 240 ? ", " + res.hz + " Hz" : ""}${res.velSteps !== 150 ? ", " + res.velSteps + " it" : ""})`, t, [
      { title: "heights above turf (mm)", marks, series: [{ name: "heel (lowest rear-20 % point)", v: R.map(r => r.heelMm) }, { name: "forefoot (lowest front-35 % point)", v: R.map(r => r.foreMm) }, { name: "ankle joint centre", v: R.map(r => r.ankleYmm) }] },
      { title: "angles (deg): foot pitch (+ heel up), shank tilt (+ top toward the toes), ankle DF (+) / PF (−), knee flexion / 3", marks, series: [{ name: "foot pitch", v: R.map(r => r.pitchDeg) }, { name: "shank tilt", v: R.map(r => r.shankPitchDeg) }, { name: "ankle DF", v: R.map(r => r.dfDeg) }, { name: "knee flexion / 3", v: R.map(r => r.kneeDeg / 3) }, { name: "PF soft −50", v: R.map(() => -50), dash: true, color: "#bbb" }, { name: "PF hard −60", v: R.map(() => -60), dash: true, color: "#777" }] },
      { title: "angular velocity (rad/s): ankle DF (+ dorsiflexing), foot pitch rate, shank pitch rate", marks, series: [{ name: "ankle ω_DF", v: R.map(r => r.wDF) }, { name: "foot pitch rate", v: R.map(r => r.footPitchRate) }, { name: "shank pitch rate", v: R.map(r => r.shankPitchRate) }] },
      { title: "ankle DF angular acceleration (rad/s², clipped ±1500)", marks, h: 90, series: [{ name: "ankle α_DF", v: R.map(r => clip(r.aDF, 1500)) }] },
      { title: "external force on the foot (N, clipped −500…1500; impact tick ≈ 27 kN; includes any self-contact)", marks, series: [{ name: "vertical", v: R.map(r => clip(r.JyN, 1500)) }, { name: "horizontal", v: R.map(r => clip(r.JxzN, 1500)) }] },
      { title: `centre of pressure along the boot (0 heel rear → 1 toe tip; shown while Fy > 20 N); ankle at ${(f.ankleAlong / f.len).toFixed(2)}`, marks, h: 100, series: [{ name: "CoP", v: R.map(r => (r.copFrac != null && r.JyN > 20 ? clip(r.copFrac, 1.15) : NaN)) }, { name: "ankle", v: R.map(() => f.ankleAlong / f.len), dash: true, color: "#999" }] },
      { title: "horizontal offset ankle − CoP along the foot (mm; 0 = the turf force passes under the ankle: torque-free strut)", marks, h: 100, series: [{ name: "ankle − CoP", v: R.map(r => (r.copUnderAnkleMm != null && r.JyN > 20 ? clip(r.copUnderAnkleMm, 250) : NaN)) }] },
      { title: "boot pieces in turf contact (piece index: 0–1 heel row … 8–9 toe row)", marks, raster: pcs.map(sub => ({ name: "piece " + sub, v: R.map(r => { const pc = r.pieces.find(p => p.sub === sub); return pc && pc.touch ? 2 : pc && pc.spec ? 1 : 0; }) })), h: 12 * pcs.length },
      { title: "torques about the ankle (N·m; DF-sign for the ankle rows; contact moment + = heel-up, clipped ±200)", marks, series: [{ name: "ankle drive applied", v: R.map(r => r.motorDF) }, { name: "elastic law", v: R.map(r => r.lawTau) }, { name: "end-stop part", v: R.map(r => r.stopTau) }, { name: "damping", v: R.map(r => r.dampDF) }, { name: "emergency stop", v: R.map(r => r.limDF) }, { name: "contact moment about ankle", v: R.map(r => clip(r.McA_pitch, 200)) }] },
      { title: `work on the foot after the impact tick, cumulative (J): Δ(KE + PE) = point + rows + external (impact tick itself: point ${a.phases[0].W_point.toFixed(0)} J, turf ${a.phases[0].W_ext.toFixed(0)} J)`, marks, series: [{ name: "ankle point force (shank)", v: cum("W_point") }, { name: "ankle rotation rows", v: cum("W_rows") }, { name: "external (turf + self-contact)", v: cum("W_ext") }, { name: "foot Δ(KE + PE)", v: cum("dEfoot"), color: "#000", dash: true }, { name: "foot ΔPE (= −gravity work)", v: cum("W_grav").map(v => -v), color: "#888", dash: true }] },
      { title: "ankle elastic energy U (J) and cumulative ankle drive work on the joint (J)", marks, series: (() => { let s2 = 0; return [{ name: "U ankle", v: R.map(r => r.U_ankle) }, { name: "Σ drive work", v: R.map((r, i) => (i < i0 ? NaN : (s2 += (r.P_motor + r.P_lim + r.P_expl) * r.dt))) }]; })() },
    ]);
    fs.writeFileSync(path.join(OUT, `heel_${res.id}_foot_${f.side}${suffix}.svg`), svg); }
  if (win) return;
  const B = res.body, tb = B.map(r => r.t), a = an.feet[1], marks = footMarks(a);
  fs.writeFileSync(path.join(OUT, `heel_${res.id}_body.svg`), svgPanels(`${res.id} — ${res.label} — whole body (drop1m)`, tb, [
    { title: "heights (m): whole-body COM, pelvis origin, right knee centre", marks, series: [{ name: "COM", v: B.map(r => r.comY) }, { name: "pelvis", v: B.map(r => r.pelvisY) }, { name: "knee_R", v: B.map(r => r.kneeYR) }] },
    { title: "COM vertical velocity (m/s)", marks, h: 100, series: [{ name: "v_COM,y", v: B.map(r => r.vComY) }] },
    { title: "turf force on the whole body from its momentum change (% body weight, clipped 0…200); feet sum (incl. self-contact)", marks, series: [{ name: "total turf force", v: B.map(r => clip(r.GRFy / (res.M * G1G) * 100, 200)) }, { name: "Σ feet external", v: B.map(r => clip(r.GRFfeetY / (res.M * G1G) * 100, 200)), dash: true }] },
    { title: "along the right foot, horizontal, from its heel's rear edge (m): COM vs ankle vs toe tip", marks, series: [{ name: "COM", v: B.map(r => r.comAlongR) }, { name: "ankle", v: B.map(r => r.ankleAlongR) }, { name: "toe tip", v: B.map(r => r.toeAlongR) }] },
    { title: "kinetic energy (J): total and internal (total − COM translation)", marks, series: [{ name: "KE", v: B.map(r => r.KE) }, { name: "KE internal", v: B.map(r => r.KEint) }] }]));
}
// ── main ──
if (process.argv.includes("--worker")) { const J = await loadJolt(VEND); process.on("message", (v) => { if (v === "exit") process.exit(0); try { process.send({ ok: true, res: runVariant(J, v) }); } catch (e) { process.send({ ok: false, err: String(e.stack || e), id: v.id }); } }); process.send({ ready: true }); }
else {
  fs.mkdirSync(OUT, { recursive: true }); for (const f of fs.readdirSync(OUT)) if (/^heel_.*\.(svg|json)$/.test(f)) fs.rmSync(path.join(OUT, f));
  const results = [], q = VARIANTS.slice(), t0 = Date.now();
  await new Promise((resolve) => { let live = 0; const spawn = () => { const v = q.shift(); if (!v) { if (live === 0) resolve(); return; } live++; const cp = fork(fileURLToPath(import.meta.url), ["--worker"], { stdio: ["ignore", "inherit", "inherit", "ipc"] });
      cp.on("message", (m) => { if (m.ready) return cp.send(v); if (m.ok) results.push(m.res); else console.error(m.id, m.err); cp.send("exit"); live--; process.stdout.write(`  ${results.length}/${VARIANTS.length}\r`); if (q.length) spawn(); else if (live === 0) resolve(); }); };
    for (let i = 0; i < Math.min(8, q.length); i++) spawn(); });
  const order = VARIANTS.map(v => v.id); results.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)); const summary = [];
  // time series on disk: the baseline in full (every probe field, per piece), the counterfactuals compact (scalar fields; reproducible in ≈ 10 s)
  const RND = (k, v) => (typeof v === "number" ? (Number.isInteger(v) ? v : +v.toPrecision(5)) : v), KEEP = ["t", "heelMm", "foreMm", "ankleYmm", "pitchDeg", "shankPitchDeg", "dfDeg", "wDF", "aDF", "kneeDeg", "JyN", "JxzN", "copFrac", "copUnderAnkleMm", "McA_pitch", "motorDF", "lawTau", "stopTau", "dampDF", "limDF", "U_ankle", "W_point", "W_rows", "W_ext", "dEfoot", "otherContacts"];
  for (const r of results) { const an = analyse(r); summary.push(an); plotsFor(r, an); if (r.id === "V0") plotsFor(r, an, [0.44, 0.76], "_zoom");
    const out = r.id === "V0" ? r : { ...r, compact: true, feet: r.feet.map(f => ({ ...f, rows: f.rows.map(x => ({ ...Object.fromEntries(KEEP.map(k => [k, x[k]])), touching: x.pieces.filter(p => p.touch).map(p => p.sub).join("") })) })) };
    fs.writeFileSync(path.join(OUT, `heel_${r.id}.json`), JSON.stringify(out, RND)); }
  const base = results[0].feet[1].rows.map(x => x.t), onBase = (r, k) => base.map(t => { const rows = r.feet[1].rows; let lo = 0, hi = rows.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rows[m].t < t) lo = m; else hi = m; } return (Math.abs(rows[lo].t - t) < Math.abs(rows[hi].t - t) ? rows[lo] : rows[hi])[k]; });
  const groups = [["contact", ["V0", "V1", "V2", "V3"]], ["ankle_tissue", ["V0", "V4", "V5", "V6"]], ["coupling_selfcontact", ["V0", "V7", "V8"]], ["numerics", ["V0", "V9", "V12", "V10", "V11"]]];
  for (const [g, ids] of groups) { const rs = ids.map(id => results.find(r => r.id === id)).filter(Boolean);
    fs.writeFileSync(path.join(OUT, `heel_compare_${g}.svg`), svgPanels(`drop1m — foot_R — ${ids.join(" / ")}: ${rs.map(r => r.id + " " + r.label).join("; ")}`.slice(0, 220), base, [
      { title: "heel height (mm)", series: rs.map((r, k) => ({ name: r.id + " " + r.label.slice(0, 34), v: onBase(r, "heelMm"), w: k ? 1.3 : 2.2, color: k ? COLS[k] : "#000" })) },
      { title: "foot pitch (deg)", series: rs.map((r, k) => ({ name: r.id, v: onBase(r, "pitchDeg"), w: k ? 1.3 : 2.2, color: k ? COLS[k] : "#000" })) },
      { title: "ankle DF (deg)", series: rs.map((r, k) => ({ name: r.id, v: onBase(r, "dfDeg"), w: k ? 1.3 : 2.2, color: k ? COLS[k] : "#000" })) },
      { title: "external vertical force on the foot (N, clipped −500…1500)", series: rs.map((r, k) => ({ name: r.id, v: onBase(r, "JyN").map(v => clip(v, 1500)).map(v => Math.max(-500, v)), w: k ? 1.1 : 1.8, color: k ? COLS[k] : "#000" })) },
      { title: "knee flexion (deg)", series: rs.map((r, k) => ({ name: r.id, v: onBase(r, "kneeDeg"), w: k ? 1.3 : 2.2, color: k ? COLS[k] : "#000" })) }])); }
  fs.writeFileSync(path.join(OUT, "heel_summary.json"), JSON.stringify({ generated: "tools/g1_heel.mjs", scenario: "drop1m, V2-REF, G1 validated baseline + diagnostic counterfactuals (none adopted)", variants: VARIANTS.map(v => ({ id: v.id, label: v.label })), summary }, null, 1));
  const f1 = (x, n = 0) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(n));
  for (const a of summary) { const b = a.body; console.log(`\n${a.id} ${a.label} | ${a.hz} Hz ${a.velSteps} it | hash ${a.hash} couplings ${a.nCoup} engine ticks ${a.engineTicks} max step rise ${a.maxRiseJ.toFixed(3)} J | strut pose ${a.strut ? a.strut.deg + "°" : "—"}`);
    console.log(`  body: v_COM,y ${f1(b.preImpact.vComY, 2)} → ${f1(b.postImpact.vComY, 2)} m/s at impact (impulse ${f1(b.postImpact.impulseNs)} N·s, KE ${f1(b.preImpact.KE)} → ${f1(b.postImpact.KE)} J, internal ${f1(b.postImpact.KEint)} J) | free rise ${f1(b.freeRise?.t0, 3)}–${f1(b.freeRise?.t1, 3)}: turf force mean ${f1(b.freeRise?.meanGRFpctBW, 1)} % BW max ${f1(b.freeRise?.maxGRFpctBW, 1)} %, COM accel ${f1(b.freeRise?.comAccelY, 2)} m/s², COM drop ${f1(b.freeRise?.comDropM, 3)} m, knee rise ${f1(b.freeRise?.kneeRiseM, 3)} m, COM along ${f1(b.freeRise?.comAlong0, 3)} → ${f1(b.freeRise?.comAlong1, 3)} (ankle ${f1(b.freeRise?.ankleAlong1, 3)}, toe ${f1(b.freeRise?.toeAlong1, 3)}) other grounded: ${b.freeRise?.groundedOther.join(",") || "none"} | audit Σdrive ${f1(b.audit.Wdrive, 2)} ΔU ${f1(b.audit.dU, 2)} damping ${f1(b.audit.damping, 2)} max step (drive+ΔU) ${f1(b.audit.maxStepExcessJ, 4)}`);
    for (const f of a.feet) { console.log(`  foot_${f.side}: impact ${f1(f.impactT, 4)} (Jy ${f1(f.impact.JyNs, 1)} N·s, CoP ${f1(f.impact.copFrac, 2)}, M_A ${f1(f.impact.McA_pitchNs, 3)} N·m·s, pieces ${f.impact.pieces.join("")}) heel-off ${f1(f.heelOffT, 4)} free-rise end ${f1(f.freeRiseEndT, 3)} heel ${f1(f.heelAtFreeEndMm)} mm pitch ${f1(f.pitchAtFreeEndDeg, 1)}° | peak ${f1(f.heelPeakMm)} mm @ ${f1(f.heelPeakT, 3)} pitch ${f1(f.pitchPeakDeg, 1)}° PF ${f1(f.pfPeakDeg, 1)}° (+${f1(f.pfBeyondHardDeg, 1)}° past hard) | first self-contact ${f1(f.firstSelfContactT, 3)} (heel ${f1(f.heelAtFirstSelfMm)}) PF-soft ${f1(f.softReachedT, 3)} (heel ${f1(f.heelAtSoftMm)}) | return ${f1(f.heelReturnT, 3)} 2nd peak ${f1(f.secondPeakMm)} @ ${f1(f.secondPeakT, 3)} | loaded strut (${f.strutTicks} ticks, mean Fy ${f1(f.strutMeanFyN)} N): pitch ${f1(f.strutPitchDeg, 1)}° line of action ${f1(f.strutLineDistMm, 1)} mm (max ${f1(f.strutMaxLineDistMm, 1)}) tilt ${f1(f.strutForceTiltDeg, 1)}° | planted peak ${f1(f.plantedPeakMm)} @ ${f1(f.plantedPeakT, 3)} foot lift ${f1(f.footLiftT, 3)} end heel/fore ${f1(f.endHeelMm)}/${f1(f.endForeMm)} | max step ankle (W+ΔU) ${f1(f.maxStepAnkleExcessJ, 4)} J`);
      for (const p of f.phases) console.log(`     ${p.name.slice(0, 40).padEnd(40)} ${f1(p.t0, 4)}–${f1(p.t1, 4)} heel ${f1(p.heel0)}→${f1(p.heel1)} | ∫Fy ${f1(p.impY, 2)} ∫Fh ${f1(p.impH, 2)} N·s Fy mean ${f1(p.meanJyN)} CoP ${f1(p.copFracLoadW, 2)} off ${f1(p.copUnderAnkleLoadWmm, 1)} mm | W point ${f1(p.W_point, 3)} rows ${f1(p.W_rows, 3)} ext ${f1(p.W_ext, 3)} (CoP est ${f1(p.W_contactEst, 3)}) = ΔE ${f1(p.dEfoot, 3)} [ΔPE ${f1(-p.W_grav, 3)}] | τmax drive ${f1(p.maxTau.drive, 1)} law ${f1(p.maxTau.law, 1)} stop ${f1(p.maxTau.stop, 1)} damp ${f1(p.maxTau.damping, 1)} emerg ${p.emergencyTicks} | ankle W ${f1(p.ankleDriveWork, 3)} ΔU ${f1(p.dU_ankle, 3)} | self ${p.selfContact.join(",") || "—"} | pieces ${Object.entries(p.pieceTicks).map(([k, v]) => k + ":" + v).join(" ")}`); } }
  console.log(`\n${results.length} variants in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${path.relative(ROOT, OUT)}`);
}

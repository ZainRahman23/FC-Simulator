// technical_control11/tools/tc11_diag.mjs — THE FEET / ANKLE DIAGNOSTICS (owner, feet pass): on the posed skeleton at 240 Hz, TECHNICAL-CONTROL-1's
// action phase, per leg — ankle angular velocity and acceleration (the foot relative to the shin), the foot's own angular velocity in the world,
// foot yaw relative to the shin (tibial rotation + forefoot abduction), ankle dorsi / plantarflexion, inversion / eversion, knee flexion, hip
// rotation, the time beyond the hard / comfort ranges; at every contact: the boot – ball gap and the boot face that meets the ball (DRIBBLE-1's
// boot hull), the contact surface's orientation against the impulse, the foot's orientation change in the 50 ms before and after, the touching
// leg's reach (hip – ankle over the leg's length), the support leg's knee; planted-foot slip. RUN-1 (the frozen running gait) is measured the same
// way as the human reference.
//   node tc11_diag.mjs <out.json> <body tc1|tc11> <ids, comma> [ratings B99_D99_A99] [--rows]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { makeTech } from "../../technical_control1/tools/tc_env.mjs"; import { TechBody } from "../../technical_control1/tc_body.js"; import { anyCase } from "../../technical_control1/tc_course.js";
import { Q, DEG, legAngles, overROM, bootHull, ballGap, surfaceDir } from "../tc11_leg.js";
export { HULL_OF as HULL };
const HERE = path.dirname(fileURLToPath(import.meta.url)), DT = 1 / 240, SIDES = ["R", "L"], hyp = Math.hypot;
const HULL_OF = () => HULL;
const COL = JSON.parse(fs.readFileSync(path.join(HERE, "../../dribble1/d1_colliders.json"))), HULL = { R: bootHull(COL.sides.R.boot.points), L: bootHull(COL.sides.L.boot.points) };
export const pct = (a, q) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * (b.length - 1) + 1e-9))]; };
const r1 = (x, n = 1) => (x == null ? null : +x.toFixed(n));
export async function bodyClass(kind) { if (kind === "tc1") return TechBody; const m = await import("../tc11_body.js"); return m.LegBody; }
// the root-frame rotation of each bone of a leg (pelvis → thigh → shin → foot)
const chain = (rot, X) => { const P = rot.pelvis, T = Q.mul(P, rot["thigh_" + X]), S = Q.mul(T, rot["shin_" + X]), F = Q.mul(S, rot["foot_" + X]); return { P, T, S, F }; };
const toM = (q, S, psi) => { const c = Math.cos(psi), s = Math.sin(psi), dx = q[0] - S[0], dy = q[1] - S[1]; return [-dx * s + dy * c, q[2], dx * c + dy * s]; };
const dirM = (n, psi) => { const c = Math.cos(psi), s = Math.sin(psi); return [-n[0] * s + n[1] * c, 0, n[0] * c + n[1] * s]; };
const hAng = (a, b) => { const x = Math.atan2(a[0], a[2]), y = Math.atan2(b[0], b[2]); let d = x - y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
// one run: the frames (per tick, per leg) and the contacts
export function runDiag(id, Body, o = {}) {
  const cs = anyCase(id, o.seed || 1), S = makeTech(cs, { seed: o.seed || 1, anim: true, Body, foot: o.foot }), n = Math.round(cs.scenario.dur * 240), fr = [];
  for (let i = 0; i < n && !S.fault; i++) { S.step(); const c2 = S.rc2, pz = c2 && c2.kind === "ELITE" && c2.phase === "action" ? c2.pose : null; if (!pz) { fr.push(null); continue; }
    const f = { k: S.k, t: pz.t, S: pz.S.slice(), psi: pz.psi, legs: {}, ball: c2.frame.loc(S.W.ball.p) };
    for (const X of SIDES) { const rot = pz.pose.rot, C = chain(rot, X), a = legAngles(rot, X), ft = pz.feet[X], aj = pz.J["foot_" + X].j, th = pz.J["thigh_" + X].j, tj = pz.J["toe_" + X].j;
      f.legs[X] = { a, Rl: rot["foot_" + X], Rw: Q.mul(Q.y(pz.psi), C.F), Rs: Q.mul(Q.y(pz.psi), C.S), RfM: C.F, ank: aj.slice(), hip: th.slice(), toe: tj.slice(), planted: !!ft.planted, pivot: !!ft.pivot, roll: pz.legs && pz.legs[X] ? pz.legs[X].roll || 0 : 0, turn: pz.legs && pz.legs[X] ? pz.legs[X].turn || 0 : 0, sup: pz.legs && pz.legs[X] && pz.legs[X].sup ? pz.legs[X].sup.slice() : null, edge: pz.legs && pz.legs[X] ? pz.legs[X].edge || 0 : 0, ballPt: ft.ballPt ? ft.ballPt.slice() : null, want: ft.ank ? ft.ank.slice() : null }; }
    fr.push(f); }
  const ep = S.rc2 && S.rc2.ep, cons = ep ? ep.contacts.map((c) => ({ k: c.k, t: c.t, F: c.F, surface: c.surface, role: c.role || null, B: c.B.slice(), vIn: c.vIn.slice(0, 2), vOut: c.vExec.slice(0, 2), fam: c.fam || null })) : [];
  const acts = ep ? (ep.techLog || []).filter((e) => e.ev === "action").map((e) => ({ fam: e.fam, t: e.t, tc: e.tc })) : [];
  const flags = (S.rc2 && S.rc2._tc11flags) || []; for (const c of cons) { const f = flags.find((q) => Math.abs(q.t - c.t) < 0.003 && q.F === c.F); if (f) c.late = f; }
  return { id, seed: o.seed || 1, foot: o.foot || "R", fr, cons, acts, flags, legLen: S.body2 ? S.body2.b.legLen : 0.8336, fault: S.fault || null, S };
}
// angular velocity (rad/s, vector) of a rotation series at i: R(i−1)ᵀ R(i+1)
const angVel = (A, B, dt) => { const d = Q.log(Q.mul(Q.tr(A), B)); return [d[0] / dt, d[1] / dt, d[2] / dt]; };
export function analyse(run, o = {}) {
  const fr = run.fr, idx = new Map(); fr.forEach((f, i) => f && idx.set(f.k, i));
  // the boots against the ball on EVERY frame (a swinging foot must go round the ball, never through it): penetration depth per foot
  const pen = { swing: [], planted: [], frames: 0, deep: 0 }; for (const f of fr) { if (!f || !f.ball) continue; const bM = toM([f.ball[0], f.ball[1], Math.max(0.11, f.ball[2])], f.S, f.psi);
    for (const X of SIDES) { const L = f.legs[X], g = ballGap(HULL[X], X, L.RfM, toM(L.ank, f.S, f.psi), bM, 0.11).gap; pen.frames++; if (g < -0.005) { (L.planted ? pen.planted : pen.swing).push(-g); if (g < -0.02) pen.deep++; } } }
  const S = { ankW: [], ankA: [], footW: [], yawShin: [], df: [], inv: [], knee: [], hip: [], tib: [], abd: [], swingAnkW: [] }, over = { hard: { hip: 0, knee: 0, tib: 0, df: 0, inv: 0, abd: 0 }, comfort: { hip: 0, knee: 0, tib: 0, df: 0, inv: 0, abd: 0 } };
  let nL = 0, slip = 0, kneeLock = 0; const ref = { R: null, L: null }, wSeries = { R: [], L: [] };
  for (let i = 1; i < fr.length - 1; i++) { const f = fr[i], a0 = fr[i - 1], a1 = fr[i + 1]; if (!f || !a0 || !a1) { ref.R = ref.L = null; continue; }
    for (const X of SIDES) { const L = f.legs[X], A = L.a; nL++;
      const w = angVel(a0.legs[X].Rl, a1.legs[X].Rl, 2 * DT), wf = angVel(a0.legs[X].Rw, a1.legs[X].Rw, 2 * DT); wSeries[X][i] = w; const wm = hyp(...w) / DEG;
      S.ankW.push(wm); if (!L.planted) S.swingAnkW.push(wm); S.footW.push(hyp(...wf) / DEG); S.yawShin.push(Math.abs(A.footYawShin)); S.df.push(A.df); S.inv.push(A.inv); S.knee.push(A.knee); S.hip.push(A.hipRot); S.tib.push(A.tib); S.abd.push(A.abd);
      if (A.knee < 4) kneeLock++;
      for (const set of ["hard", "comfort"]) { const ex = overROM(A, set); for (const k in ex) if (ex[k] > 0.5) over[set][k]++; }
      // planted slip: the planted foot (or the pivot's ball of the foot) must not move while that foothold lasts
      // (measured at the ball of the foot — the MTP joint — which a planted foot keeps on the turf whether flat or with the heel rising)
      // (TECHNICAL-CONTROL-1.1's body names its support point — the ball of the foot, or the sole's edge it rolls on — and a planted foot must keep it
      // still; the reference restarts when the support changes between the ball of the foot and an edge)
      // (the support point of the POSED boot: the ankle joint + the posed foot's rotation × the support point's offset in the foot)
      const supPosed = () => { const off = Q.v(L.RfM, [-(L.edge || 0) * 0.072, -0.057, 0.1805]), aM = toM(L.ank, f.S, f.psi), w = [aM[0] + off[0], aM[1] + off[1], aM[2] + off[2]], c = Math.cos(f.psi), sn = Math.sin(f.psi); return [f.S[0] + w[2] * c - w[0] * sn, f.S[1] + w[2] * sn + w[0] * c, w[1]]; };
      if (!L.planted) ref[X] = null; else { const pt = L.sup ? supPosed() : L.toe, key = "p" + (L.ballPt || [0, 0]).map((x) => x.toFixed(4)).join() + "|" + (L.edge || 0);
        if (!ref[X] || ref[X].id !== key) ref[X] = { id: key, p: pt.slice() }; else slip = Math.max(slip, hyp(pt[0] - ref[X].p[0], pt[1] - ref[X].p[1])); } } }
  for (const X of SIDES) for (let i = 1; i < fr.length - 1; i++) { const a = wSeries[X][i - 1], b = wSeries[X][i + 1]; if (!a || !b) continue; S.ankA.push(hyp(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / (2 * DT) / DEG); }
  // the contacts
  const C = []; for (const c of run.cons) { const i = idx.get(c.k); if (i == null) continue; const f = fr[i], X = c.F, L = f.legs[X], Y = X === "R" ? "L" : "R", sup = f.legs[Y];
    const ankM = toM(L.ank, f.S, f.psi), ballM = toM([c.B[0], c.B[1], Math.max(0.11, c.B[2])], f.S, f.psi), g = ballGap(HULL[X], X, L.RfM, ankM, ballM, 0.11);
    const dv = [c.vOut[0] - c.vIn[0], c.vOut[1] - c.vIn[1]], dl = hyp(dv[0], dv[1]), nM = dirM(dl > 1e-6 ? [dv[0] / dl, dv[1] / dl] : [Math.cos(f.psi), Math.sin(f.psi)], f.psi), sd = Q.v(L.RfM, surfaceDir(c.surface, X));
    const oriErr = c.surface === "SOLE" ? Math.acos(Math.max(-1, Math.min(1, -sd[1]))) / DEG : Math.abs(hAng(sd, nM)) / DEG;
    const at = (dk) => { const j = idx.get(c.k + dk); return j == null ? null : fr[j]; }, rotCh = (dk) => { const q = at(dk); return q ? Q.angle(q.legs[X].Rw, L.Rw) / DEG : null; };
    // the ankle's own rotation (the foot relative to the shin) and the foot's world yaw (the toe swinging toward / away from the ball) in the 50 ms
    // before / after the contact — the leg swinging through turns the foot in the world; these isolate the ankle snapping and the toe pointing
    const ankCh = (dk) => { const q = at(dk); return q ? Q.angle(q.legs[X].Rl, L.Rl) / DEG : null; }, fyaw = (q) => { const f = Q.v(q.legs[X].Rw, [0, 0, 1]); return Math.atan2(f[0], f[2]); };
    const yawCh = (dk) => { const q = at(dk); if (!q) return null; let d = fyaw(q) - fyaw(f); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) / DEG; };
    let wPk = 0; for (let dk = -24; dk <= 24; dk++) { const j = idx.get(c.k + dk); if (j != null && wSeries[X][j]) wPk = Math.max(wPk, hyp(...wSeries[X][j]) / DEG); }
    const reach = hyp(L.ank[0] - L.hip[0], L.ank[1] - L.hip[1], L.ank[2] - L.hip[2]) / run.legLen;
    C.push({ t: r1(c.t, 3), F: X, surface: c.surface, role: c.role, late: c.late ? `${c.late.planned}→${c.late.executed} Δ${c.late.dImpulse}°` : null, gap: r1(g.gap * 100, 1), face: g.face, faceOk: g.face === c.surface || (c.surface === "LACES" && g.face === "TOE"), oriErr: r1(oriErr), pre50: r1(rotCh(-12)), post50: r1(rotCh(12)), pre50Ank: r1(ankCh(-12)), post50Ank: r1(ankCh(12)), pre50Yaw: r1(yawCh(-12)), post50Yaw: r1(yawCh(12)), ankWpk: Math.round(wPk),
      df: r1(L.a.df), inv: r1(L.a.inv), abd: r1(L.a.abd), tib: r1(L.a.tib), yawShin: r1(L.a.footYawShin), hip: r1(L.a.hipRot), knee: r1(L.a.knee), reach: r1(reach, 3), supKnee: r1(sup.a.knee), supPlanted: sup.planted }); }
  const P = (a, q) => r1(pct(a, q)), n = Math.max(1, nL);
  const sum = { frames: nL, ankW: { p50: P(S.ankW, 0.5), p95: P(S.ankW, 0.95), p99: P(S.ankW, 0.99), max: P(S.ankW, 1) }, ankA: { p95: Math.round(pct(S.ankA, 0.95) || 0), p99: Math.round(pct(S.ankA, 0.99) || 0), max: Math.round(pct(S.ankA, 1) || 0) },
    footW: { p95: P(S.footW, 0.95), p99: P(S.footW, 0.99), max: P(S.footW, 1) }, yawShin: { p95: P(S.yawShin, 0.95), max: P(S.yawShin, 1) },
    df: { min: P(S.df, 0), p01: P(S.df, 0.01), p99: P(S.df, 0.99), max: P(S.df, 1) }, inv: { min: P(S.inv, 0), p01: P(S.inv, 0.01), p99: P(S.inv, 0.99), max: P(S.inv, 1) },
    knee: { min: P(S.knee, 0), p01: P(S.knee, 0.01) }, hip: { min: P(S.hip, 0), max: P(S.hip, 1) }, tib: { min: P(S.tib, 0), max: P(S.tib, 1) }, abd: { min: P(S.abd, 0), max: P(S.abd, 1) },
    overHard: Object.fromEntries(Object.entries(over.hard).map(([k, v]) => [k, r1(100 * v / n, 2)])), overComfort: Object.fromEntries(Object.entries(over.comfort).map(([k, v]) => [k, r1(100 * v / n, 2)])),
    kneeLock: r1(100 * kneeLock / n, 2), slipMm: r1(slip * 1000, 1),
    ballPen: { swingFrames: pen.swing.length, swingMaxCm: r1(Math.max(0, ...pen.swing) * 100, 1), plantedFrames: pen.planted.length, plantedMaxCm: r1(Math.max(0, ...pen.planted) * 100, 1), deepFrames: pen.deep },
    contacts: { n: C.length, faceOk: C.filter((c) => c.faceOk).length, gapAbsMax: r1(Math.max(0, ...C.map((c) => Math.abs(c.gap))), 1), gapMin: r1(Math.min(0, ...C.map((c) => c.gap)), 1), gapMax: r1(Math.max(0, ...C.map((c) => c.gap)), 1),
      oriErrMax: r1(Math.max(0, ...C.map((c) => c.oriErr))), oriErrP50: P(C.map((c) => c.oriErr), 0.5), pre50Max: r1(Math.max(0, ...C.map((c) => c.pre50 || 0))), post50Max: r1(Math.max(0, ...C.map((c) => c.post50 || 0))), pre50AnkMax: r1(Math.max(0, ...C.map((c) => c.pre50Ank || 0))), post50AnkMax: r1(Math.max(0, ...C.map((c) => c.post50Ank || 0))), pre50YawMax: r1(Math.max(0, ...C.map((c) => c.pre50Yaw || 0))), post50YawMax: r1(Math.max(0, ...C.map((c) => c.post50Yaw || 0))), ankWpkMax: Math.max(0, ...C.map((c) => c.ankWpk)),
      reachMax: r1(Math.max(0, ...C.map((c) => c.reach)), 3), supKneeMin: r1(Math.min(180, ...C.map((c) => c.supKnee))), late: C.filter((c) => c.late).length,
      // the contacts the body could prepare (late decisions excluded: the simulation decided them at the contact itself)
      prepared: (() => { const P2 = C.filter((c) => !c.late); return { n: P2.length, faceOk: P2.filter((c) => c.faceOk).length, oriErrMax: r1(Math.max(0, ...P2.map((c) => c.oriErr))), pre50AnkMax: r1(Math.max(0, ...P2.map((c) => c.pre50Ank || 0))), post50AnkMax: r1(Math.max(0, ...P2.map((c) => c.post50Ank || 0))), pre50YawMax: r1(Math.max(0, ...P2.map((c) => c.pre50Yaw || 0))), post50YawMax: r1(Math.max(0, ...P2.map((c) => c.post50Yaw || 0))), ankWpkMax: Math.max(0, ...P2.map((c) => c.ankWpk)) }; })() } };
  return { sum, C };
}
// RUN-1 itself (the approved running gait), the same angles and rates — the human reference
export function run1Ref(E, b, v) { const G = E.r1GaitAt(b, E.RUN1.ref, v), T = 2 / G.cadence, nS = Math.round(T * 240) * 2, W = [], A = [], F = [], ang = { df: [], inv: [], knee: [], hip: [], yaw: [] }, Rl = [];
  for (let i = 0; i <= nS + 1; i++) { const u = (i * DT / T) % 1, pz = E.r1Pose({ body: b, p: G }, u, null); Rl.push(pz.rot ? pz.rot.foot_R : pz.pose.rot.foot_R); const a = legAngles(pz.rot || pz.pose.rot, "R"); ang.df.push(a.df); ang.inv.push(a.inv); ang.knee.push(a.knee); ang.hip.push(a.hipRot); ang.yaw.push(Math.abs(a.footYawShin)); }
  const w = []; for (let i = 1; i < Rl.length - 1; i++) w[i] = angVel(Rl[i - 1], Rl[i + 1], 2 * DT); for (let i = 1; i < Rl.length - 1; i++) W.push(hyp(...w[i]) / DEG); for (let i = 2; i < Rl.length - 2; i++) A.push(hyp(...[0, 1, 2].map((k) => w[i + 1][k] - w[i - 1][k])) / (2 * DT) / DEG);
  return { v, ankW: { p50: r1(pct(W, 0.5)), p95: r1(pct(W, 0.95)), p99: r1(pct(W, 0.99)), max: r1(pct(W, 1)) }, ankA: { p95: Math.round(pct(A, 0.95)), p99: Math.round(pct(A, 0.99)), max: Math.round(pct(A, 1)) },
    df: { min: r1(pct(ang.df, 0)), max: r1(pct(ang.df, 1)) }, inv: { min: r1(pct(ang.inv, 0)), max: r1(pct(ang.inv, 1)) }, knee: { min: r1(pct(ang.knee, 0)), max: r1(pct(ang.knee, 1)) }, hip: { min: r1(pct(ang.hip, 0)), max: r1(pct(ang.hip, 1)) }, yawShin: { max: r1(pct(ang.yaw, 1)) } };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const out = process.argv[2], kind = process.argv[3] || "tc1", ids = (process.argv[4] || "CUT90").split(","), rt = process.argv[5] && !process.argv[5].startsWith("--") ? process.argv[5] : "B99_D99_A99", rows = process.argv.includes("--rows");
  const Body = await bodyClass(kind), res = [];
  for (const spec of ids) { const [idr, seed, foot] = spec.split("@"), id = /_B\d+_D\d+_A\d+/.test(idr) ? idr : idr.replace(/^([A-Z0-9]+(?:_L)?(?:_V\d+)?)/, `$1_${rt}`); const t0 = Date.now(), run = runDiag(id, Body, { seed: +(seed || 1), foot: foot || "R" }), A = analyse(run);
    const r = { id, seed: run.seed, foot: run.foot, body: kind, fault: run.fault, ms: Date.now() - t0, sum: A.sum, contacts: rows ? A.C : undefined }; res.push(r); console.log(JSON.stringify({ id, seed: run.seed, ms: r.ms, ...A.sum }));
    if (rows) for (const c of A.C) console.log("   ", JSON.stringify(c));
    if (!res.ref) { const S = run.S; res.ref = [5.5, 8].map((v) => run1Ref(S.cfg.E, S.body2.b, v)); } }
  fs.writeFileSync(out, JSON.stringify({ body: kind, run1: res.ref, runs: res }, null, 1)); console.log("RUN-1", JSON.stringify(res.ref));
}

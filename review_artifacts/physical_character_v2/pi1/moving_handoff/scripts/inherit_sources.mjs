// MOVING-HANDOFF INVESTIGATION item 2 (read-only): what the presentation's vertical / angular / internal motion is made of, frame by frame,
// comparing the shipped presentation (base) with the procedural gait alone (procOnly: plant locks, pelvis drop and ground lift off — presentation-only
// OF_GAIT values; gameplay hashes verified identical). Both are mapped to V2 exactly as at promotion (frozen R-K + RF-1).
//   vertical : COM vertical velocity (PI-1 §6.2 2nd-order backward) and the ballistic residual in no-contact frames (F_y / BW, 0 = free fall)
//   angular  : L about the COM (centred, evaluation only) and its rate in no-contact frames (implied external torque about the COM; 0 = conserved)
//   internal : per body, the COM-relative velocity / angular velocity at promotion (2nd-order backward) — base vs procOnly at the same frame
//   numerics : 2nd-order backward vs centred estimate of the same signal (an estimator disagreement flags a position discontinuity, not noise);
//              rounding floor of the recorded positions (r8 = 1e-8 m)
// usage (worktree root): V13_WT=<v1.3> V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../inherit_sources.mjs <presdiag dir> <out.json> <case,...>
import fs from "fs";
const M = await import(new URL("../../rev1/scripts/pcg_rev1.mjs", import.meta.url).href); const { L, makeMapper, angVel, relRot } = M; const { V, Q, B, NB, bi, loadAir } = L;
const [PD, OUT, CASES] = process.argv.slice(2), G = 9.81, Mt = B.reduce((s, b) => s + b.mass, 0);
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), comOf = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mt), hl = (v) => Math.hypot(v[0], v[2]);
const q = (a, p) => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))].toFixed(4) : null; };
const st = (a) => ({ n: a.length, p10: q(a, 0.1), p50: q(a, 0.5), p90: q(a, 0.9), max: q(a, 1) });
const Iw = (S, i, w) => { const r = relRot(S, i), I = B[i].inertia, wl = Q.rot(Q.conj(r), w); return Q.rot(r, [0, 1, 2].map(a => I[a][0] * wl[0] + I[a][1] * wl[1] + I[a][2] * wl[2])); };
const vel2 = (mp, k) => { const S2 = mp.poseAt(k).S, S1 = mp.poseAt(k - 1).S, S0 = mp.poseAt(k - 2).S, v = [], w = [];
  for (let i = 0; i < NB; i++) { v[i] = V.sub(V.sc(V.sub(comW(S2, i), comW(S1, i)), 90), V.sc(V.sub(comW(S1, i), comW(S0, i)), 30)); w[i] = V.sub(V.sc(angVel(S1[i].rot, S2[i].rot), 1.5), V.sc(angVel(S0[i].rot, S1[i].rot), 0.5)); } return { v, w, S: S2 }; };
const velC = (mp, k) => { const Sp = mp.poseAt(k + 1).S, Sm = mp.poseAt(k - 1).S, S = mp.poseAt(k).S, v = [], w = [];
  for (let i = 0; i < NB; i++) { v[i] = V.sc(V.sub(comW(Sp, i), comW(Sm, i)), 30); w[i] = V.sc(angVel(Sm[i].rot, Sp[i].rot), 0.5); } return { v, w, S }; };
const Lof = (x) => { const c = comOf(x.S), vc = V.sc(x.v.reduce((s, v, i) => V.add(s, V.sc(v, B[i].mass)), [0, 0, 0]), 1 / Mt); let Lt = [0, 0, 0]; for (let i = 0; i < NB; i++) Lt = V.add(Lt, V.add(V.cross(V.sub(comW(x.S, i), c), V.sc(V.sub(x.v[i], vc), B[i].mass)), Iw(x.S, i, x.w[i]))); return { L: Lt, vc }; };
const out = { cases: {} };
for (const cs of CASES.split(",")) {
  const Rb = loadAir(PD + "/base", `${cs}_LOCO.json.gz`), Rp = loadAir(PD + "/procOnly", `${cs}_LOCO.json.gz`), mb = makeMapper(Rb, { knee: "RK", rf1: true }), mpp = makeMapper(Rp, { knee: "RK", rf1: true });
  const ev = Rb.events.filter(e => e.kind === "PLAYER_CONTACT"), first = ev[0] || null, kt = Rb.pred.findIndex(x => x != null && x <= 0.25); let kend;
  if (first) kend = first.tick - 2; else { let mn = Infinity, kc = null; for (let k = Math.max(1, kt); k < Rb.dnow.length; k++) if (Rb.dnow[k] != null && Rb.dnow[k] < mn) { mn = Rb.dnow[k]; kc = k; } kend = kc - 1; }
  const k0 = Math.max(5, kt - 45), res = {};
  for (const [nm, R, mp] of [["base", Rb, mb], ["procOnly", Rp, mpp]]) { const vY = [], vYc = [], Lm = [], estDisV = [], estDisW = [], estDisCom = [], legSpeed = [];
    for (let k = k0; k <= kend; k++) { const a = vel2(mp, k), c = velC(mp, k), La = Lof(a); vY.push(Math.abs(La.vc[1])); vYc.push(Math.abs(Lof(c).vc[1])); Lm.push(V.len(La.L));
      let dv = 0, dw = 0; for (let i = 0; i < NB; i++) { dv = Math.max(dv, V.dist(a.v[i], c.v[i])); dw = Math.max(dw, V.dist(a.w[i], c.w[i])); } estDisV.push(dv); estDisW.push(dw); estDisCom.push(V.dist(La.vc, Lof(c).vc)); }
    res[nm] = { comVyAbs2nd: st(vY), comVyAbsCentral: st(vYc), Labout: st(Lm), estimatorDisagreeBodyV: st(estDisV), estimatorDisagreeBodyW: st(estDisW), estimatorDisagreeCOM: st(estDisCom) }; }
  // internal velocity artefact: base vs procOnly COM-relative body velocities / angular velocities at the same frame (2nd-order, as at promotion)
  const dRel = [], dW = [], dRelWho = {}; for (let k = k0; k <= kend; k++) { const a = vel2(mb, k), b = vel2(mpp, k), va = Lof(a).vc, vb = Lof(b).vc; let mx = 0, who = null, mw = 0;
    for (let i = 0; i < NB; i++) { const d = V.dist(V.sub(a.v[i], va), V.sub(b.v[i], vb)); if (d > mx) { mx = d; who = B[i].name; } mw = Math.max(mw, V.dist(a.w[i], b.w[i])); } dRel.push(mx); dW.push(mw); dRelWho[who] = (dRelWho[who] || 0) + 1; }
  res.internalArtefact = { relVelMaxMs: st(dRel), angVelMaxRadS: st(dW), worstBody: dRelWho };
  out.cases[cs] = res; console.log(cs.padEnd(16), JSON.stringify({ vY: [res.base.comVyAbs2nd.p50, res.base.comVyAbs2nd.max, res.procOnly.comVyAbs2nd.p50, res.procOnly.comVyAbs2nd.max], vYc: [res.base.comVyAbsCentral.p50, res.procOnly.comVyAbsCentral.p50], L: [res.base.Labout.p50, res.procOnly.Labout.p50], estV: [res.base.estimatorDisagreeBodyV.p50, res.procOnly.estimatorDisagreeBodyV.p50], estCOM: [res.base.estimatorDisagreeCOM.p50, res.procOnly.estimatorDisagreeCOM.p50], intArt: [res.internalArtefact.relVelMaxMs.p50, res.internalArtefact.relVelMaxMs.p90, res.internalArtefact.angVelMaxRadS.p50] })); }
out.roundingFloor = { positionM: 1e-8, velocity2ndOrderMs: +(2 * 1e-8 * 60 * 2).toExponential(1) };
fs.writeFileSync(OUT, JSON.stringify(out));

// lw_geom.js — LA CROQUETA — LEG-WAVE V4: the leg wave `| | → \ \ → / / → | |` measured on any build's simulated and posed body for one
// croqueta replay (the Lab's landmarks and table, tools/croq_legwave.mjs). Build-independent: it only reads sim.contacts / sim.stateAt and
// body.pose.
//   the wave: each leg's hip → foot line seen from behind along the entry heading (the reference's rear view): its angle from vertical,
//   + = the foot to the RIGHT of its hip (the F side: `\`), − = to the left (`/`); the wave = the two legs' mean
//   landmarks (s from touch 1): L0 | | NORMAL (−0.40) · L1 \ \ RIGHT-SIDE MAX (the right-side wave held at its maximum: the last tick from
//   −0.20 to +0.04 with the wave ≥ 90 % of its largest — the owner's screenshot, at the first touch) · L2 EARLY SWEEP (halfway L1 → L3) · L3 MID-SWEEP (the wave through 0) · L4 / / LEFT-SIDE MAX (the wave's largest − up to
//   0.12 s after the receive) · L5 LEFT CUSHION (the receiving contact) · L6 | | EXIT RESOLUTION (both legs back within ±8° of vertical
//   after L4 and L5)
//   per tick, both legs: the foot's lateral / forward offset from the pelvis (the pelvis's own frame: out = away from the midline on that
//   leg's side), the hip's flexion / abduction, the thigh's and the shin's angle from vertical seen from behind, the knee's offsets, the
//   foot's yaw relative to the pelvis
//   the left (S) foot's continuity from L1 to L4: its largest forward / lateral velocity (pelvis frame and world), its largest displacement
//   in one tick and in one 60 fps frame, its largest acceleration and the time of each — and whether it ever gets ahead of the ball
const DEGR = 180 / Math.PI;
export const LW_LANDMARKS = [["L0", "| | NORMAL"], ["L1", "\\ \\ RIGHT-SIDE MAX"], ["L2", "EARLY SWEEP"], ["L3", "MID-SWEEP"], ["L4", "/ / LEFT-SIDE MAX"], ["L5", "LEFT CUSHION"], ["L6", "| | EXIT RESOLUTION"]];
export function lwGeom(sim, body, t0, ang, DT, mirror = false) {
  const cs = sim.contacts.filter((x) => x.t > t0 - 1e-9 && x.t < t0 + 2 && !x.missed), i = cs.findIndex((x) => /croq|LATERAL|transfer/i.test(x.role || "")); if (i < 0) return null;
  const cF = cs[i], cR = cs[i + 1], F = cF.F, S = F === "R" ? "L" : "R", tF = cF.t, tR = cR ? cR.t : tF + 0.25, s0 = sim.stateAt(t0), h0 = s0.s > 0.6 ? s0.h : s0.psi;
  // (the entry frame: fwd along the entry heading; rt = toward F's side (the right for the reference); + exit = toward S)
  const sF = F === "R" ? 1 : -1, fwW = [Math.cos(h0), Math.sin(h0)], rtW = [-Math.sin(h0) * sF, Math.cos(h0) * sF];   // (this world's right of a heading h is [−sin h, cos h])
  const eF = (p) => (p[0] - s0.P[0]) * fwW[0] + (p[1] - s0.P[1]) * fwW[1], eR = (p) => (p[0] - s0.P[0]) * rtW[0] + (p[1] - s0.P[1]) * rtW[1];
  const yawOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const rows = []; for (let t = tF - 0.45; t <= tR + 0.45 + 1e-9; t += DT) { const p = body.pose(t), J = p.J, pel = J.pelvis.j;
    const hF = J["thigh_" + F].j, hS = J["thigh_" + S].j, d = [hS[0] - hF[0], hS[1] - hF[1]], n = Math.hypot(d[0], d[1]) || 1, toS = [d[0] / n, d[1] / n];
    let fw = [-toS[1], toS[0]]; if (fw[0] * fwW[0] + fw[1] * fwW[1] < 0) fw = [-fw[0], -fw[1]];
    const rel = (q) => [(q[0] - pel[0]) * fw[0] + (q[1] - pel[1]) * fw[1], (q[0] - pel[0]) * toS[0] + (q[1] - pel[1]) * toS[1], q[2]];   // [forward, toward S, up]
    const pelYaw = Math.atan2(fw[1], fw[0]);
    const leg = (X) => { const sg = X === S ? 1 : -1, hip = J["thigh_" + X].j, kn = J["shin_" + X].j, ft = J["foot_" + X].j, toe = J["toe_" + X].j, a = rel(ft), k = rel(kn), hp = rel(hip);
      // (the rear view along the entry: + = toward F's side (the right))
      const wave = Math.atan2(eR(ft) - eR(hip), hip[2] - ft[2]) * DEGR, thighW = Math.atan2(eR(kn) - eR(hip), hip[2] - kn[2]) * DEGR, shinW = Math.atan2(eR(ft) - eR(kn), kn[2] - ft[2]) * DEGR;
      const th = [k[0] - hp[0], (k[1] - hp[1]) * sg, k[2] - hp[2]];
      let fy = (yawOf(ft, toe) - pelYaw) * DEGR; fy = ((fy + 540) % 360) - 180;
      return { out: a[1] * sg, fwd: a[0], up: ft[2], kneeOut: k[1] * sg, kneeFwd: k[0], hipFlex: Math.atan2(th[0], -th[2]) * DEGR, hipAbd: Math.atan2(th[1], -th[2]) * DEGR, wave, thighW, shinW, footYaw: fy * (X === "R" ? 1 : -1),
        wF: eF(ft), wR: eR(ft), planted: p.feet[X].planted }; };
    rows.push({ t: +(t - tF).toFixed(4), F: leg(F), S: leg(S), ball: { f: eF(p.ball), r: eR(p.ball), relF: rel(p.ball)[0], relOut: rel(p.ball)[1] }, pel: { f: eF(pel), r: eR(pel), h: pel[2] } });
    const q = rows[rows.length - 1]; q.wave = (q.F.wave + q.S.wave) / 2; }
  const at = (x) => rows.reduce((b, q) => (Math.abs(q.t - x) < Math.abs(b.t - x) ? q : b), rows[0]), dR = tR - tF;
  const pick = (f, a, b, sgn) => rows.filter((q) => q.t >= a - 1e-9 && q.t <= b + 1e-9).reduce((m, q) => (sgn * f(q) > sgn * f(m) ? q : m), at(a));
  const L1m = pick((q) => q.wave, -0.20, 0.04, 1), L1 = rows.filter((q) => q.t >= -0.20 - 1e-9 && q.t <= 0.04 + 1e-9 && q.wave >= 0.9 * L1m.wave).pop() || L1m, L3r = rows.find((q) => q.t > L1.t && q.wave <= 0), L3 = L3r || at(dR / 2), L4 = pick((q) => q.wave, L3.t, dR + 0.12, -1);
  const L6r = rows.find((q) => q.t > Math.max(L4.t, dR) && Math.abs(q.F.wave) <= 8 && Math.abs(q.S.wave) <= 8);   // (both legs back under the body)
  const L = { L0: -0.40, L1: L1.t, L2: +((L1.t + L3.t) / 2).toFixed(4), L3: L3.t, L4: L4.t, L5: +dR.toFixed(4), L6: L6r ? L6r.t : null };
  // (the left foot's continuity from L1 to L4, per tick and per 60 fps frame; the pelvis frame's forward / lateral and the world's)
  // (each foot's continuity from L1 to L4 — the left (S) foot first: it must open outward, never jump forward or ahead of the ball)
  const W = rows.filter((q) => q.t >= L.L1 - 1e-9 && q.t <= Math.max(L.L4, dR) + 1e-9), nF = Math.max(1, Math.round(1 / 60 / DT));
  const contOf = (X) => { const c = { fwdV: 0, tFwdV: null, latV: 0, tLatV: null, wV: 0, tWV: null, tick: 0, tTick: null, frame: 0, tFrame: null, acc: 0, tAcc: null, ahead: 0, tAhead: null, aheadP: 0, tAheadP: null }; let pv = null;
    for (let k = 1; k < W.length; k++) { const a = W[k - 1][X], b = W[k][X], vF = (b.fwd - a.fwd) / DT, vL = (b.out - a.out) / DT, vw = Math.hypot(b.wF - a.wF, b.wR - a.wR, b.up - a.up) / DT, dTick = vw * DT;
      if (Math.abs(vF) > Math.abs(c.fwdV)) { c.fwdV = vF; c.tFwdV = W[k].t; } if (Math.abs(vL) > Math.abs(c.latV)) { c.latV = vL; c.tLatV = W[k].t; } if (vw > c.wV) { c.wV = vw; c.tWV = W[k].t; } if (dTick > c.tick) { c.tick = dTick; c.tTick = W[k].t; }
      const v = [(b.wF - a.wF) / DT, (b.wR - a.wR) / DT, (b.up - a.up) / DT]; if (pv) { const ac = Math.hypot(v[0] - pv[0], v[1] - pv[1], v[2] - pv[2]) / DT; if (ac > c.acc) { c.acc = ac; c.tAcc = W[k].t; } } pv = v;
      // (ahead of the ball before the receive: along the entry, and in the body's own frame — the pelvis's forward, the way it is seen)
      if (W[k].t < dR - 1e-9) { const ah = b.wF - W[k].ball.f, ap = b.fwd - W[k].ball.relF; if (ah > c.ahead) { c.ahead = ah; c.tAhead = W[k].t; } if (ap > c.aheadP) { c.aheadP = ap; c.tAheadP = W[k].t; } } }
    for (let k = nF; k < W.length; k++) { const a = W[k - nF][X], b = W[k][X], dd = Math.hypot(b.wF - a.wF, b.wR - a.wR, b.up - a.up); if (dd > c.frame) { c.frame = dd; c.tFrame = W[k].t; } }
    return c; };
  const cont = contOf("S"), contF = contOf("F");
  const snap = (q) => ({ t: q.t, wave: q.wave, F: q.F, S: q.S, ball: q.ball, pel: q.pel });
  return { tF, tR, tFirst: +(tF - t0).toFixed(3), tReceive: +(tR - t0).toFixed(3), F, S, landmarks: L, contF, at: Object.fromEntries(Object.entries(L).filter(([, v]) => v != null).map(([k, v]) => [k, snap(at(v))])), cont, rows }; }

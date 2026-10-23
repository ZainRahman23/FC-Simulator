// x_geom.js — LA CROQUETA — X-SWEEP V3: the X-shape measured on any build's simulated and posed body for one croqueta replay (the Lab's
// landmarks and table, tools/croq_xgeom.mjs). Build-independent: it only reads sim.contacts / sim.stateAt and body.pose.
//   frame: the PELVIS's own (forward = the hip line's normal, the way the body faces; "out" = away from the body's midline on that leg's
//   side); F = the first-touch (ball-side) foot, S = the receiving foot; t = 0 the first croqueta contact
//   landmarks: NORMAL ENTRY (−0.40) · RIGHT LEG MAX OUT (F's out offset, its largest before the touch) · RIGHT-SIDE BODY BOW (the torso's side
//   bend toward F, its largest) · SWEEP BEGINS (the touch) · MID-SWEEP (halfway to the receive) · TORSO/PELVIS CROSS CENTRE (the bend crossing
//   0 toward S) · LEFT LEG OPENS (S's out offset > 0.15 m after it lifts) · LEFT-SIDE BODY BOW (the bend toward S, its largest) · LEFT LEG MAX
//   OUT · LEFT INSIDE RECEIVE (the second contact) · EXIT (+0.12 s after it)
//   at each leg's max out: the foot's out / forward offset from the pelvis, the thigh's angle from vertical (abduction, flexion), the knee's
//   out / forward offset, the other foot's forward offset, the pelvis roll (+ = F's hip higher) and yaw (+ = toward the exit), the torso side
//   bend (+ = toward F: the F-side shoulder dropped relative to the hip line) and lean (pelvis → neck, + = toward F)
//   the ball: from the touch → mid-sweep → the receive, its LATERAL (+ toward the exit) and FORWARD (along the entry heading) displacement, in the
//   world and relative to the pelvis
const DEGR = 180 / Math.PI;
export const XG_LANDMARKS = ["NORMAL ENTRY", "RIGHT LEG MAX OUT", "RIGHT-SIDE BODY BOW", "SWEEP BEGINS", "MID-SWEEP", "TORSO/PELVIS CROSS CENTRE", "LEFT LEG OPENS", "LEFT-SIDE BODY BOW", "LEFT LEG MAX OUT", "LEFT INSIDE RECEIVE", "EXIT"];
// (sim: the lane's simulation; body: its posed body; t0: the request; ang: the request's sign (− = left); mirror: the replay mirrored)
export function xGeom(sim, body, t0, ang, DT, mirror = false, rowsDT = DT) {
  const cs = sim.contacts.filter((x) => x.t > t0 - 1e-9 && x.t < t0 + 2 && !x.missed), i = cs.findIndex((x) => /croq|LATERAL|transfer/i.test(x.role || "")); if (i < 0) return null;
  const cF = cs[i], cR = cs[i + 1], F = cF.F, S = F === "R" ? "L" : "R", tF = cF.t, tR = cR ? cR.t : tF + 0.25, s0 = sim.stateAt(t0), h0 = s0.s > 0.6 ? s0.h : s0.psi;
  // (the exit side in the world, from the entry heading: + = toward the exit — the S side)
  const sideX = (ang > 0 ? 1 : -1) * (mirror ? -1 : 1), rtW = [-Math.sin(h0), Math.cos(h0)], fwW = [Math.cos(h0), Math.sin(h0)], latW = (p) => sideX * ((p[0] - s0.P[0]) * rtW[0] + (p[1] - s0.P[1]) * rtW[1]), fwdW = (p) => (p[0] - s0.P[0]) * fwW[0] + (p[1] - s0.P[1]) * fwW[1];
  const frame = (J) => { const hF = J["thigh_" + F].j, hS = J["thigh_" + S].j, d = [hS[0] - hF[0], hS[1] - hF[1]], n = Math.hypot(d[0], d[1]) || 1, toS = [d[0] / n, d[1] / n];
    // (forward = the normal of the hip line that points along the travel / the facing)
    let fw = [-toS[1], toS[0]]; if (fw[0] * fwW[0] + fw[1] * fwW[1] < 0) fw = [-fw[0], -fw[1]]; return { toS, fw }; };
  const rows = []; for (let t = tF - 0.45; t <= tR + 0.30 + 1e-9; t += rowsDT) { const p = body.pose(t), J = p.J, pel = J.pelvis.j, { toS, fw } = frame(J);
    const rel = (q) => [(q[0] - pel[0]) * fw[0] + (q[1] - pel[1]) * fw[1], (q[0] - pel[0]) * toS[0] + (q[1] - pel[1]) * toS[1], q[2]];   // [forward, toward S, up]
    const leg = (X) => { const sgnOut = X === S ? 1 : -1, hip = J["thigh_" + X].j, kn = J["shin_" + X].j, ft = J["foot_" + X].j, a = rel(ft), k = rel(kn), hp = rel(hip), th = [k[0] - hp[0], (k[1] - hp[1]) * sgnOut, k[2] - hp[2]];
      return { out: a[1] * sgnOut, fwd: a[0], kneeOut: k[1] * sgnOut, kneeFwd: k[0], thigh: Math.atan2(Math.hypot(th[0], th[1]), -th[2]) * DEGR, abd: Math.atan2(th[1], -th[2]) * DEGR, flex: Math.atan2(th[0], -th[2]) * DEGR }; };
    const tilt = (a, b) => Math.atan2(J[a].j[2] - J[b].j[2], Math.hypot(J[a].j[0] - J[b].j[0], J[a].j[1] - J[b].j[1])) * DEGR;   // (+ = a higher)
    const pelRoll = tilt("thigh_" + F, "thigh_" + S), shRoll = tilt("upperArm_" + F, "upperArm_" + S), nk = rel(J.neck.j);
    rows.push({ t: +(t - tF).toFixed(4), F: leg(F), S: leg(S), pelRoll, bend: pelRoll - shRoll, lean: Math.atan2(-nk[1], nk[2]) * DEGR, yaw: Math.atan2(sideX * (fw[0] * rtW[0] + fw[1] * rtW[1]), fw[0] * fwW[0] + fw[1] * fwW[1]) * DEGR,   // (+ = turned toward the exit)
      pelH: pel[2], pelLat: latW(pel), pelFwd: fwdW(pel), ballLat: latW(p.ball), ballFwd: fwdW(p.ball), Fp: p.feet[F].planted, Sp: p.feet[S].planted }); }
  const at = (x) => rows.reduce((b, q) => (Math.abs(q.t - x) < Math.abs(b.t - x) ? q : b), rows[0]), dR = tR - tF;
  const argmax = (f, a, b) => rows.filter((q) => q.t >= a - 1e-9 && q.t <= b + 1e-9).reduce((m, q) => (f(q) > f(m) ? q : m), at(a));
  const rMax = argmax((q) => q.F.out, -0.32, 0.02), rBow = argmax((q) => q.bend, -0.32, 0.10), lBow = argmax((q) => -q.bend, 0, dR + 0.2), lMax = argmax((q) => q.S.out, 0.02, dR + 0.10);
  const cross = rows.find((q) => q.t > rBow.t && q.bend <= 0) || null, sLift = rows.find((q) => q.t > 0 && !q.Sp) || null, lOpen = rows.find((q) => sLift && q.t >= sLift.t && q.S.out > 0.15) || null;
  const L = { "NORMAL ENTRY": -0.40, "RIGHT LEG MAX OUT": rMax.t, "RIGHT-SIDE BODY BOW": rBow.t, "SWEEP BEGINS": 0, "MID-SWEEP": +(dR / 2).toFixed(4), "TORSO/PELVIS CROSS CENTRE": cross ? cross.t : null, "LEFT LEG OPENS": lOpen ? lOpen.t : null, "LEFT-SIDE BODY BOW": lBow.t, "LEFT LEG MAX OUT": lMax.t, "LEFT INSIDE RECEIVE": +dR.toFixed(4), EXIT: +(dR + 0.12).toFixed(4) };
  const snap = (q, X, O) => ({ t: q.t, footOut: q[X].out, footFwd: q[X].fwd, thigh: q[X].thigh, thighAbd: q[X].abd, thighFlex: q[X].flex, kneeOut: q[X].kneeOut, kneeFwd: q[X].kneeFwd, otherFootFwd: q[O].fwd, otherFootOut: q[O].out, pelRoll: q.pelRoll, pelYaw: q.yaw, bend: q.bend, lean: q.lean, pelH: q.pelH });
  const b0 = at(0), bm = at(dR / 2), b1 = at(dR), ball = { lat: [bm.ballLat - b0.ballLat, b1.ballLat - bm.ballLat, b1.ballLat - b0.ballLat], fwd: [bm.ballFwd - b0.ballFwd, b1.ballFwd - bm.ballFwd, b1.ballFwd - b0.ballFwd],
    relLat: [(bm.ballLat - bm.pelLat) - (b0.ballLat - b0.pelLat), (b1.ballLat - b1.pelLat) - (bm.ballLat - bm.pelLat)], relFwd: [(bm.ballFwd - bm.pelFwd) - (b0.ballFwd - b0.pelFwd), (b1.ballFwd - b1.pelFwd) - (bm.ballFwd - bm.pelFwd)] };
  ball.angle = Math.atan2(ball.fwd[2], ball.lat[2]) * DEGR;   // (0 = straight across; negative = across AND back)
  return { tF, tR, tFirst: +(tF - t0).toFixed(3), tReceive: +(tR - t0).toFixed(3), F, S, landmarks: L, rightMax: snap(rMax, "F", "S"), atTouch: snap(b0, "F", "S"), leftMax: snap(lMax, "S", "F"), atReceive: snap(b1, "S", "F"), rBow: { t: rBow.t, bend: rBow.bend }, lBow: { t: lBow.t, bend: lBow.bend }, ball, rows }; }

// turn1/tools/t1_metrics.cjs — objective checks of one TURN-1 scenario: plant-foot slip while loaded (contact point horizontal displacement), leg reach
// clamps, joint ranges (knee, hip flex / abd / rotation), COM speed / heading / acceleration profile, maneuver timing. Pure replay (no rendering).
const { loadTurn1 } = require("./t1_load.cjs");
const X = loadTurn1(), T = X.TURN1, M4 = X.M4, DEG = Math.PI / 180, SCN = require("../turn1_scenarios.js");
function measure(scn, opts) {
  const o = opts || {}, A = T.t1Make(X.skel, o.t12 || process.env.T12 === "1" ? Object.assign({}, scn.init, { turn12: true }) : scn.init), n = Math.round((scn.dur || 4) * 240), b = A.body, idx = b.idx; if (o.l11 || process.env.T11 === "1") X.TURN11.attach(A);   // TURN-1.1 body layer
  const hz = b.heelZ + 0.012, padLoc = [0, -(b.ankleH + b.mtp[1]), X.ctx.RUN1_V13.R1_MTP.padAhead];
  const st = { R: null, L: null }, stances = [], jr = { knee: [1e9, -1e9], hipFlex: [1e9, -1e9], hipAbd: [1e9, -1e9], psi: [1e9, -1e9] }; let reachMax = 0, reachN = 0;
  for (let k = 0; k < n; k++) {
    T.t1Step(A, T.t1Input(scn, k / 240));
    if (k % (o.every || 2)) continue;
    const ev = T.t1Evaluate(A), fk = ev.fk, legs = ev.pose.legs;
    for (const F of ["R", "L"]) {
      const lg = legs[F]; reachMax = Math.max(reachMax, lg.reach); if (lg.reach > 1.0005) reachN++;
      for (const [key, v] of [["knee", lg.knee], ["hipFlex", lg.hipFlex], ["hipAbd", (F === "R" ? 1 : -1) * lg.hipAbd], ["psi", (F === "R" ? 1 : -1) * lg.psi]]) { jr[key][0] = Math.min(jr[key][0], v); jr[key][1] = Math.max(jr[key][1], v); }
      const heel = M4.transformPoint(fk.world[idx["foot_" + F]], [0, -b.ankleH, hz]), pad = M4.transformPoint(fk.world[idx["toe_" + F]], padLoc);
      if (lg.stance) {
        if (!st[F] || st[F].tTD !== A.legs[F].tTD) { st[F] = { F, tTD: A.legs[F].tTD, role: A.legs[F].role ? A.legs[F].role.kind : "RUN", samples: [] }; stances.push(st[F]); }
        st[F].samples.push({ s: lg.s, heel, pad, beta: ev.pose.diag.feet[F].beta, pivot: !!(A.legs[F].plant && A.legs[F].plant.pivot) });
      }
    }
  }
  // slip: the contact point on the turf (heel while the heel is down, toe pad once the heel is up) — horizontal displacement from where that point
  // first carried load, over the loaded window (10–90 % of the stance)
  const out = [];
  for (const S of stances) {
    let ref = null, refKind = null, mx = 0;
    for (const q of S.samples) {
      if (q.s < 0.10 || q.s > 0.90) continue;
      const kind = q.pivot || q.beta < -0.5 * DEG ? "pad" : "heel", p = kind === "pad" ? q.pad : q.heel;   // a pivot turns the foot about its toe pad
      if (kind !== refKind) { ref = p; refKind = kind; continue; }
      mx = Math.max(mx, Math.hypot(p[0] - ref[0], p[2] - ref[2]));
    }
    out.push({ F: S.F, t: +S.tTD.toFixed(3), role: S.role, slipCm: +(mx * 100).toFixed(2) });
  }
  const L = A.log, sp = L.map(r => r.s), am = L.map(r => Math.hypot(r.ax, r.ay));
  return { id: scn.id, events: A.events.filter(e => e[1] !== "TO" && e[1] !== "TD"), stances: out, slipMaxCm: Math.max(0, ...out.map(s => s.slipCm)), reachMax: +reachMax.toFixed(4), reachClampSamples: reachN,
    joints: Object.fromEntries(Object.entries(jr).map(([k, v]) => [k, v.map(x => +x.toFixed(1))])), speedMin: +Math.min(...sp).toFixed(2), accMax: +Math.max(...am).toFixed(1),
    headingEnd: +(L[L.length - 1].thv / DEG).toFixed(1), A };
}
module.exports = { measure, X, T };
if (require.main === module) {
  const ids = (process.argv[2] || "JOG_90R").split(",");
  for (const id of ids) { const r = measure(SCN.get(id)); delete r.A; console.log(JSON.stringify(r)); }
}

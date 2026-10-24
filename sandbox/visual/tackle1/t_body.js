// ═══ tackle1/t_body.js — THE POSED BODIES' INTEGRITY THROUGH AN ENCOUNTER (presentation measures, the same PlayBody the Lab draws; never fed back) ═
// Per tick, in order (the body's own filters are sequential), for the DEFENDER: the feet (jumps, a planted foot's ball-of-foot drift), the knees
// (angle jumps), the pelvis and trunk (spikes against the root's own motion), the legs crossing; and between the two players the capsules'
// overlap (no player-player collision exists — measured, never resolved). Every event is counted inside the tackle (commitment → control ready)
// and outside it, so a tackle's events are compared with the same footballer's ordinary movement.
import { PlayBody } from "../vocab2/u_body.js";
import { DT } from "../vocab2/c_sim.js";
const hyp = Math.hypot, D = 180 / Math.PI;
export const BODY_TH = { footJump: 0.05, plantDrift: 0.03, kneeJump: 6, pelvisJump: 0.02, trunkJump: 3, cross: 0.04 };   // m/tick · m · °/tick · m/tick · °/tick · m
const CAPS = [["pelvis", "chest", 0.15], ["chest", "neck", 0.15], ["thigh_R", "shin_R", 0.075], ["thigh_L", "shin_L", 0.075], ["shin_R", "foot_R", 0.055], ["shin_L", "foot_L", 0.055], ["foot_R", "toe_R", 0.045], ["foot_L", "toe_L", 0.045]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// the closest distance between two segments (p1 – q1, p2 – q2)
function segDist(p1, q1, p2, q2) { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r); let s, t;
  if (a <= 1e-9 && e <= 1e-9) return hyp(...r); if (a <= 1e-9) { s = 0; t = Math.max(0, Math.min(1, f / e)); } else { const c = dot(d1, r); if (e <= 1e-9) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else { const b = dot(d1, d2), dn = a * e - b * b; s = dn > 1e-12 ? Math.max(0, Math.min(1, (b * f - c * e) / dn)) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); } } }
  const c1 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s], c2 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t]; return hyp(...sub(c1, c2)); }
const knee = (J, X) => { const h = J["thigh_" + X].j, k = J["shin_" + X].j, a = J["foot_" + X].j, u = sub(h, k), v = sub(a, k); return Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (hyp(...u) * hyp(...v))))) * D; };
export function bodyAudit(env, W, t0, t1, o = {}) {
  const bA = new PlayBody(env, W.att), bD = new PlayBody(env, W.def), A = W.tk && W.tk.act, inT = (t) => !!(A && t >= A.t0 - 1e-9 && t <= A.tCtl + 1e-9);
  const ev = { in: {}, out: {} }, max = { footSpeed: 0, plantDrift: 0, kneeRate: 0, pelvisDev: 0, trunkRate: 0, overlap: 0, overlapIn: 0 }, list = [], pin = { R: null, L: null };
  const bump = (t, kind, v, extra) => { const b = inT(t) ? ev.in : ev.out; b[kind] = (b[kind] || 0) + 1; if (list.length < (o.keep || 40)) list.push(Object.assign({ t: +t.toFixed(4), kind, v: +v.toFixed(4), inTackle: inT(t) }, extra || {})); };
  let prev = null;
  for (let k = Math.round(t0 / DT); k <= Math.round(t1 / DT); k++) { const t = k * DT, pd = bD.pose(t), pa = bA.pose(t), J = pd.J, st = W.def.stateAt(t), feet = W.tk ? W.tk.feetAtPlan(W.def.planAt(t), t) : null;
    if (prev) { const dtk = DT;
      for (const X of ["R", "L"]) { const d = hyp(...sub(J["foot_" + X].j, prev.J["foot_" + X].j)); max.footSpeed = Math.max(max.footSpeed, d / dtk); if (d > BODY_TH.footJump) bump(t, "FOOT JUMP", d, { foot: X });
        const kr = Math.abs(knee(J, X) - knee(prev.J, X)); max.kneeRate = Math.max(max.kneeRate, kr / dtk); if (kr > BODY_TH.kneeJump) bump(t, "KNEE POP", kr, { foot: X }); }
      const dp = sub(J.pelvis.j, prev.J.pelvis.j), dr = [st.P[0] - prev.st.P[0], st.P[1] - prev.st.P[1], 0], dev = hyp(dp[0] - dr[0], dp[1] - dr[1], dp[2]); max.pelvisDev = Math.max(max.pelvisDev, dev); if (dev > BODY_TH.pelvisJump) bump(t, "PELVIS SPIKE", dev);
      const tv = sub(J.neck.j, J.pelvis.j), tp = sub(prev.J.neck.j, prev.J.pelvis.j), ta = Math.acos(Math.max(-1, Math.min(1, dot(tv, tp) / (hyp(...tv) * hyp(...tp))))) * D; max.trunkRate = Math.max(max.trunkRate, ta / dtk); if (ta > BODY_TH.trunkJump) bump(t, "TRUNK SPIKE", ta); }
    // a planted foot's ball of foot (the toe joint) must not slide while its stance holds (the pivot and the heel roll turn about it)
    if (feet) for (const X of ["R", "L"]) { const s = feet[X]; if (s) { const q = J["toe_" + X].j; if (!pin[X] || pin[X].id !== s.id) pin[X] = { id: s.id, p: q.slice(), t }; else if (t - pin[X].t > 0.05) { const d = hyp(q[0] - pin[X].p[0], q[1] - pin[X].p[1]); max.plantDrift = Math.max(max.plantDrift, d); if (d > BODY_TH.plantDrift && !pin[X].flag) { pin[X].flag = 1; bump(t, "PLANT SLIDE", d, { foot: X }); } } } else pin[X] = null; }
    // the legs crossing: in the pelvis's own frame (its heading), the right ankle left of the left one
    { const c = Math.cos(st.psi), s = Math.sin(st.psi), lat = (p) => -(p[0] - st.P[0]) * s + (p[1] - st.P[1]) * c, x = lat(J.foot_R.j) - lat(J.foot_L.j); if (x < -BODY_TH.cross) bump(t, "LEGS CROSSED", -x); }
    // the players' capsules: the deepest overlap this tick
    { let pen = 0; for (const [a, b, ra] of CAPS) for (const [c, d, rc] of CAPS) { const dd = segDist(J[a].j, J[b].j, pa.J[c].j, pa.J[d].j) - ra - rc; if (-dd > pen) pen = -dd; }
      max.overlap = Math.max(max.overlap, pen); if (inT(t)) max.overlapIn = Math.max(max.overlapIn, pen); if (pen > 0.03) bump(t, "PLAYER OVERLAP", pen); }
    prev = { J, st }; }
  return { ev, max: Object.fromEntries(Object.entries(max).map(([k, v]) => [k, +v.toFixed(4)])), list }; }

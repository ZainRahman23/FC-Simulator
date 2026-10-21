// ═══ tc_unified1/u_gait.js — THE SUPPORT GAIT: Astra's bodyGaitFrom (../agility99/body_gait.js, copied unchanged: the demand-driven cadence —
// shortened re-organisation steps on hard turns / braking, compact restarts) + ONE line from the TC gait (u_tc.js gaitFrom): an anchor without
// its own stance length (B2's shortened step; B4 / B5's "after the action" step, its generic plant) gets the gait's — Astra's BALL OFF probe never
// schedules such anchors, so its copy never needed it (without it the stance has t1 = null: the foot drawn lifting at once, a 2 m jump) — and
// a stance already lifted is never re-extended by lift() (88573ef0's lift moved an ENDED stance's end to t + 0.02; each re-plan repeated it, the
// foot drawn planted ↔ swinging every other tick in the fast circle)
// ── (Astra's header, unchanged) ──
// BALL OFF support adapter, derived verbatim from the locked baseline gaitFrom.
// Retain RUN1 duty at speed, shorten reorganization steps smoothly on hard
// turns/braking, and use compact low-speed restart steps. No contact is scheduled.
// No new root path, foot proxy, ball contact, technique or IK solver.
import {DT,DEG,wrap,fromLocal,toLocal,rgt} from '../tc_baseline_88573ef0/pt_sim.js';
import {WIDTH,lead} from '../tc_baseline_88573ef0/pt_params.js';
import {predict} from '../tc_baseline_88573ef0/pt_ball.js';
import {accCadence,accLead,topContact,topCadence} from './pace.js';   // (SPEED-99-V1: the acceleration gait — only with a candidate's pace.accGait)
const {abs,min,max,hypot:hyp}=Math;
const sgn=X=>X==='R'?1:-1,other=X=>X==='R'?'L':'R';
export function bodyGaitFrom(plan, keep, anchors, tTo) {
    const S = { R: keep.stances.R.map((x) => Object.assign({}, x)), L: keep.stances.L.map((x) => Object.assign({}, x)) }, lastOf = (X) => S[X][S[X].length - 1], t = this.t;
    // a footfall: the lead ahead of the centre of mass on the foot's side — kept on its own side of the other foot (no crossing outside an
    // authored crossover) and off the free ball's path while it stands (the ball is authoritative: the presentation never has it roll through a
    // planted boot). Positions only: no decision reads them
    const bp0 = this.ball.p, bv0 = this.ball.v;
    const place = (X, tt, t1) => { const s0 = this.stateAt(tt, plan), v = s0.s, th = v > 0.6 ? s0.h : s0.psi, w = (v > 2.4 ? WIDTH.run : WIDTH.walk) + 0.04 * Math.min(1, abs(wrap((plan.req?.h ?? s0.h)-s0.h))/(60*DEG)), ld0 = v < 0.3 ? 0 : lead(v), ld = this.P.pace && this.P.pace.accGait ? accLead(ld0, v, this.stateAt(tt + 0.3, plan).s) : ld0;
      let p = fromLocal(fromLocal(s0.P, th, ld, 0), s0.psi, 0, sgn(X) * w); const r = rgt(s0.psi), sx = sgn(X);
      const o = lastOf(other(X)); if (o && o.pos) { const l = ((p[0] - o.pos[0]) * r[0] + (p[1] - o.pos[1]) * r[1]) * sx; if (l < 0.13) { p = [p[0] + r[0] * sx * (0.13 - l), p[1] + r[1] * sx * (0.13 - l)]; } }
      return offBall(p, s0.psi, X, tt, min(t1 != null ? t1 : tt + 0.25, tt + 0.6)); };
    // a stance off the free ball's path while it stands (a stance that never lifts: off where the ball comes to rest)
    const offBall = (p, psi, X, tt, tEnd) => { const r = rgt(psi); let need = 0, side = sgn(X);
      for (let x = max(t, tt - 0.04); x <= tEnd + 1e-9; x += x > tt + 0.6 ? 0.2 : 0.02) { const b = predict(bp0, bv0, x - t).p, d = [b[0] - p[0], b[1] - p[1]], a = d[0] * Math.cos(psi) + d[1] * Math.sin(psi), l = d[0] * r[0] + d[1] * r[1];
        if (a > -0.24 && a < 0.30 && abs(l) < 0.20) { const nd = 0.20 - abs(l); if (nd > need) { need = nd; side = l >= 0 ? -1 : 1; } } }
      return need > 0 ? [p[0] + r[0] * side * min(0.20, need), p[1] + r[1] * side * min(0.20, need)] : p; };
    const yawOf = (X, tt) => { const s0 = this.stateAt(tt, plan); return (s0.s > 0.6 ? s0.h : s0.psi) + sgn(X) * 5 * DEG; };
    const cad = (tt) => { const v = this.stateAt(tt, plan).s, G = this.gait(max(v, 0.01)), v2 = this.stateAt(tt + 0.3, plan).s;
      const turn=plan.req?.h==null?0:abs(wrap(plan.req.h-this.stateAt(tt,plan).h))/DEG;
      const cut=Math.min(1,Math.max(0,(turn-20)/60)), braking=Math.min(1,Math.max(0,(v-v2)/2));
      const reorg=Math.max(cut,braking);let Ts=G.Ts,D=G.D;
      const AG=this.P.pace&&this.P.pace.accGait;
      if(AG){const c0=D*2*Ts,fc=topCadence(v);if(fc>0&&1/fc<Ts){Ts=1/fc;D=c0/(2*Ts);}const A=accCadence(G,v,v2,{Ts,D});Ts=A.Ts;D=A.D;const cM=topContact(v,lead(v));if(D*2*Ts>cM&&reorg<0.3)D=cM/(2*Ts);}   // (the top-speed contact cap: steady running only — never a braking / cutting plant)
      else if(v2>v+.6&&v<3){Ts=min(Ts,.23);D=min(D,.43);}
      Ts=Ts*(1-reorg)+min(Ts,.20+.04*Math.min(v/8,1))*reorg;
      const stance=AG?D*2*Ts:G.D*2*Ts;D=(stance*(1-reorg)+min(stance,.13)*reorg)/(2*Ts);
      // (S99 MISSION, the 99 pace: a braking / reorganising step at LOW speed keeps a foot on the ground — the short reorganisation contact (≤ 0.13 s)
      // left ≈ 0.08 s of flight every step below 3 m/s: the player hopped while stopping. No flight below 2.5 m/s, a partial one up to 5.5 m/s)
      // (… and a HARD BRAKE or a CUT PLANT keeps the foot down until the next touchdown whatever the speed: braking from 38 km/h, A99-C sheds
      // ≈ 10 m/s in 0.4 s — the plan had a 0.075 s top-speed contact and then 0.165 s with both feet in the air while the speed fell 5.4 → 0.3)
      if(AG&&reorg>0){const Dmin=Math.max(0.5*(1-Math.min(1,Math.max(0,(v-2.5)/3))),0.5*Math.max(braking,0.8*cut));if(D<Dmin)D=D+(Dmin-D)*Math.max(reorg,braking);}
      return {Ts,D}; }; // accelerating: quick short steps
    const stanceD = (tt) => { const G = cad(tt); return G.D * 2 * G.Ts; };
    const step = (X, td) => { const st = { id: ++this.sid, F: X, t0: td, t1: td + stanceD(td), pos: place(X, td, td + stanceD(td)), yaw: yawOf(X, td), kind: this.stateAt(td, plan).s < 2.4 ? "walk" : "stride", src: "gait" }; S[X].push(st); return st; };
    // a planted foot that must step lifts in time (a standing foot: now)
    const lift = (X, tdNext) => { const l = lastOf(X); if (l.t1 !== Infinity && l.t1 <= t + 1e-9) return;   // (TC-UNIFIED-1: a stance already lifted stays lifted — never re-extended to t + 0.02)
      if (l.t1 === Infinity || l.t1 > tdNext - 0.14) l.t1 = max(l.t0 + 0.06, min(tdNext - 0.14, l.t1 === Infinity ? t + 0.02 : l.t1), t + 0.02); };
    // the last touchdown (a tie — both feet down together — goes to a technique's own stance, else to the right foot: never the mirror's opposite)
    const lastTD = () => { const r = lastOf("R"), l = lastOf("L"); if (abs(r.t0 - l.t0) < 1e-9) return r.src === "tech" ? r : l.src === "tech" ? l : r; return r.t0 > l.t0 ? r : l; };
    const moving = plan.req && plan.req.h != null;
    // standing and asked to move: the rear foot (relative to the request) steps first, quickly
    // (S99 MISSION: … and, nearly at rest (< 0.4 m/s), a planted foot already given an end by an earlier re-plan is still a standing foot —
    // without it a standing 90° start re-placed the rear foot in a 15 ms hop: lifted at t + 0.005, down 13 cm away at t + 0.02)
    // (SPEED-99-V1.1, the pace candidates: a standing stance shortened by the early-release rule — a hard launch leaves it ≥ 0.6 m behind within
    // 0.32 s — is still a standing start: without this E38 skipped the start step for an immediate re-step and a 0.16 s float)
    const AGS = !!(this.P.pace && this.P.pace.accGait), standing = (l) => l.t1 === Infinity || (AGS && l.t0 < t && l.t1 > t && (l.src === "stand" || this.stateAt(t, plan).s < 0.4));
    if (standing(lastOf("R")) && standing(lastOf("L"))) {
      if (!moving && !anchors.length) return S;
      const hq = plan.req.h, rr = toLocal(lastOf("R").pos, this.stateAt(t, plan).P, hq)[0], ll = toLocal(lastOf("L").pos, this.stateAt(t, plan).P, hq)[0];
      let X = rr < ll - 0.02 ? "R" : ll < rr - 0.02 ? "L" : (this.o.foot === "L" ? "R" : "L"); if (anchors.length) { const A0 = anchors[0]; X = A0.t0 - t < 0.3 ? A0.F : other(A0.F); }
      const td = t + 0.03 + 0.17; lastOf(X).t1 = t + 0.03; if (!(anchors.length && anchors[0].F === X && anchors[0].t0 < td + 0.1)) step(X, td); lastOf(other(X)).t1 = Infinity;
      // (SPEED-99-V1.1, the pace candidates: THE PUSH FOOT — the standing foot that does not step first stays planted, driving, until just before
      // the first step lands (a 0.03 s flight); the free-running loop below lifted it at once ("a standing foot: now"), both feet airborne for
      // the first 0.17 s of the hardest push — a hop, not a start)
      if (AGS && moving && !anchors.length) lastOf(other(X)).t1 = td - 0.03; }
    // the anchors (a technique's own stances): the steps before each spread evenly to land it on its foot at its time
    for (const A of anchors.slice().sort((x, y) => x.t0 - y.t0)) { if (A.t0 <= t + this.P.react) continue;
      const L0 = lastTD(), N = other(L0.F), gap = A.t0 - L0.t0, Ts = this.gait(max(this.stateAt(L0.t0, plan).s, 0.5)).Ts;
      let best = null; for (let j = (A.F === N ? 0 : 1); j <= 7; j += 2) { const per = gap / (j + 1); if (per < 0.13) break; const e = abs(per - Ts); if (!best || e < best.e) best = { j, per, e }; }
      if (!best) best = { j: A.F === N ? 0 : 1, per: gap / ((A.F === N ? 0 : 1) + 1) };
      for (let i = 1; i <= best.j; i++) { const X = i % 2 === 1 ? N : other(N), td = L0.t0 + i * best.per; lift(X, td); step(X, td); }
      if (A.t1 == null) A.t1 = A.t0 + stanceD(A.t0);   // (TC-UNIFIED-1: the TC gait's anchor fill)
      if (!A.pos) { A.pos = place(A.F, A.t0); A.yaw = yawOf(A.F, A.t0); }
      lift(A.F, A.t0); const prev = lastOf(other(A.F)); if (prev.t1 === Infinity) prev.t1 = A.t0 + 0.08; S[A.F].push(A); }
    // free running / walking after: the cadence at the speed then; stopping: the last step beside the other foot, both planted
    for (let guard = 0; guard < 30; guard++) {
      const L0 = lastTD(), X = other(L0.F), s0 = this.stateAt(max(t, L0.t0), plan), v = s0.s, G = cad(max(t, L0.t0));
      const tEnd = this.stateAt(min(tTo, max(t, L0.t0) + 0.4), plan).s;
      if (!moving && v < 0.45 && tEnd < 0.3) { // settle
        const lx = lastOf(X); if (lx.t1 === Infinity && L0.t1 === Infinity) break;
        const td = max(L0.t0 + 0.14, lx.t1 === Infinity ? t + 0.16 : lx.t1 + 0.16, t + 0.05); if (td > tTo) break; lift(X, td); const s1 = this.stateAt(td, plan);
        S[X].push({ id: ++this.sid, F: X, t0: td, t1: Infinity, pos: offBall(fromLocal(s1.P, s1.psi, X === (this.o.foot === "L" ? "L" : "R") ? -0.02 : 0.04, sgn(X) * WIDTH.stand), s1.psi, X, td, td + 3.0), yaw: s1.psi + sgn(X) * 6 * DEG, kind: "settle", src: "gait" }); L0.t1 = Infinity; break; }
      let td = L0.t0 + G.Ts; const lx = lastOf(X); if (lx.t1 !== Infinity) td = max(td, lx.t1 + 0.16); td = max(td, t + 0.02); if (td > tTo) break;
      lift(X, td); step(X, td); if (L0.t1 === Infinity) L0.t1 = td + 0.6 * stanceD(td); }
    // a stance ends before its foot's next one begins (the swing ≥ 0.14 s), never before it began
    for (const X of ["R", "L"]) { const L = S[X]; for (let i = 0; i + 1 < L.length; i++) if (L[i].t1 > L[i + 1].t0 - 0.14 && L[i].t1 > t) L[i].t1 = max(L[i].t0 + 0.05, L[i + 1].t0 - 0.14, t + 0.005); }
    return S;
  }
// ═══ TC-UNIFIED-1: THE GAIT'S OWN FOOTFALL PLACE, for revising a COMMITTED landing (u_sim.js gaitFrom) — the same rule as place() / offBall()
// above (the lead / width on the plan's path, its own side of the other foot's stance, off the free ball's path while it stands); `this` is the
// simulation, S the kept stances (the other foot's stance before tt is the one it keeps its side of)
export function gaitPlace(plan, S, X, tt, t1) {
  const t = this.t, bp0 = this.ball.p, bv0 = this.ball.v, s0 = this.stateAt(tt, plan), v = s0.s, th = v > 0.6 ? s0.h : s0.psi, w = (v > 2.4 ? WIDTH.run : WIDTH.walk) + 0.04 * Math.min(1, abs(wrap((plan.req?.h ?? s0.h) - s0.h)) / (60 * DEG)), ld0 = v < 0.3 ? 0 : lead(v), ld = this.P.pace && this.P.pace.accGait ? accLead(ld0, v, this.stateAt(tt + 0.3, plan).s) : ld0;
  let p = fromLocal(fromLocal(s0.P, th, ld, 0), s0.psi, 0, sgn(X) * w); const r = rgt(s0.psi), sx = sgn(X), L = S[other(X)]; let o = null; for (const q of L) if (q.t0 <= tt + 1e-9) o = q;
  if (o && o.pos) { const l = ((p[0] - o.pos[0]) * r[0] + (p[1] - o.pos[1]) * r[1]) * sx; if (l < 0.13) p = [p[0] + r[0] * sx * (0.13 - l), p[1] + r[1] * sx * (0.13 - l)]; }
  const tEnd = min(t1 != null ? t1 : tt + 0.25, tt + 0.6); let need = 0, side = sgn(X);
  for (let x = max(t, tt - 0.04); x <= tEnd + 1e-9; x += x > tt + 0.6 ? 0.2 : 0.02) { const b = predict(bp0, bv0, x - t).p, d = [b[0] - p[0], b[1] - p[1]], a = d[0] * Math.cos(s0.psi) + d[1] * Math.sin(s0.psi), l = d[0] * r[0] + d[1] * r[1];
    if (a > -0.24 && a < 0.30 && abs(l) < 0.20) { const nd = 0.20 - abs(l); if (nd > need) { need = nd; side = l >= 0 ? -1 : 1; } } }
  return need > 0 ? [p[0] + r[0] * side * min(0.20, need), p[1] + r[1] * side * min(0.20, need)] : p; }

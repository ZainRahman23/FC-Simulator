// receive11/tools/rx_metrics.mjs — the receive scorecard of one run (a finished ReceiveSim11), measured from the authoritative record (body, ball,
// touches, kernel events) — never from the planner's intentions. Outcome classes are RECEIVE-CONTROL-1's (comparable), with the failed-contact
// split the instruction asks for:
//   CLEAN      a receive contact (before the pass had gone by), the new line reached ≤ 2.5 s after it, the ball controlled at the end
//   TAKEN      a receive contact and the new line, but late or not controlled at the end
//   RECEIVED   a receive contact, no new line (the touch was made — what followed did not reach the exit)
//   RECOVERED  no receive contact before the pass went by; the loose ball was played later
//   MISSED     no touch at all — split into NO-ACTION (no feasible action was found) and CANCELLED (an action's contact was refused by the kernel)
//   kill intent: KILLED (the ball at rest ≤ 1.0 m in front of the feet within 1.2 s of the contact), SETTLED (at rest within 1.6 m), HEAVY (else)
import { DT } from "../rx_core.js";
const D = 180 / Math.PI, wrapD = (a) => { a = ((a + 180) % 360 + 360) % 360; return a - 180; };
const hdgP = (v) => Math.atan2(v[1], v[0]) * D, hdgA = (v) => Math.atan2(-v[2], v[0]) * D;
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100), r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
export function score(S, cs, cpu) {
  const rx = S.rx, sm = S.summary(), rec = S.rec, exitH = rx.exitDir * D, c = rx.contact, Tr = c && c.T.launched ? c.T : null, k1 = Tr ? Tr.k : null, act = rx.act;
  const T = S.touches.filter((t) => t.launched), last = rec[rec.length - 1];
  // the pass has GONE BY: moving away from the body, passMiss m beyond its closest approach — unless it runs ahead along his run (a ball into space)
  let dMin = Infinity, chase = null; for (let i = 0; i < rec.length && (k1 == null || i < k1); i++) { const r = rec[i], bx = r.ball.p[0] - r.P[0], by = r.ball.p[2] - r.P[1], d = Math.hypot(bx, by), bv = [r.ball.v[0], r.ball.v[2]];   // (record: the kernel frame [x, h, pitch y])
    const away = bx * (bv[0] - r.V[0]) + by * (bv[1] - r.V[1]) > 0, sp = Math.hypot(r.V[0], r.V[1]), bs = Math.hypot(bv[0], bv[1]), hd = sp > 1 ? Math.atan2(r.V[1], r.V[0]) : r.psi;
    const ahead = bx * Math.cos(hd) + by * Math.sin(hd) > 0.3, along = bs > 0.5 && Math.cos(Math.atan2(bv[1], bv[0]) - hd) > Math.cos(50 / D); dMin = Math.min(dMin, d);
    if (away && d > dMin + 0.6 && !(ahead && along)) { chase = i; break; } }
  // the new line: body velocity within 15° of the exit at ≥ 2.5 m/s and the ball's within 25° of it (RECEIVE-CONTROL-1's definition)
  let kLine = null; if (k1 != null && !rx.hold) for (let i = k1; i < rec.length; i++) { const r = rec[i], sp = Math.hypot(r.V[0], r.V[1]), bv = [r.ball.v[0], r.ball.v[2]], bs = Math.hypot(bv[0], bv[1]);
    if (sp >= 2.5 && Math.abs(wrapD(hdgP(r.V) - exitH)) <= 15 && bs > 0.8 && Math.abs(wrapD(hdgP(bv) - exitH)) <= 25) { kLine = i; break; } }
  const ctrlEnd = S.ctrl.state, lostAt = S.ctrl.changes.filter((ch) => ch.to === "LOOSE" && k1 != null && ch.k > k1).map((ch) => ch.k);
  const spAt = (k) => { const r = rec[Math.max(0, Math.min(rec.length - 1, k))]; return r ? Math.hypot(r.V[0], r.V[1]) : null; };
  // braking before the receive: the lowest body speed from the action start to the contact, against the speed at the start
  let vMinPrep = null; if (act && k1 != null) { vMinPrep = Infinity; for (let i = act.k0; i <= k1; i++) vMinPrep = Math.min(vMinPrep, spAt(i)); }
  // handoff continuity: the body's acceleration across the handoff tick (velocity difference over ±1 tick), facing change in that tick, the
  // DRIBBLE-V1 request after it vs the exit
  const ho = rx.handoff; let hoAcc = null, hoYaw = null, hoReq = null, hoBall = null;
  if (ho) { const a = rec[ho.k - 1], b = rec[ho.k + 1], m = rec[ho.k]; if (a && b) hoAcc = Math.hypot(b.V[0] - a.V[0], b.V[1] - a.V[1]) / (2 * DT); if (m && b) hoYaw = Math.abs(wrapD((b.psi - m.psi) * D)); if (b) hoReq = Math.abs(wrapD(b.dir * D - exitH)); hoBall = ho.ballRel; }
  // touches after the receive: double touches (two launches < 0.15 s apart), same-foot recontact ≤ 0.25 s after a launch
  const dbl = T.filter((t, i) => i > 0 && t.k - T[i - 1].k < Math.round(0.15 / DT)).length;
  const recon = T.filter((t) => S.contacts.some((cc) => cc.own && cc.k > t.k + 2 && cc.k - t.k <= Math.round(0.25 / DT) && (cc.part === "boot_" + t.F || cc.part === "toe_" + t.F))).length;
  const physPre = S.contacts.filter((cc) => cc.own && (k1 == null || cc.k < k1)).map((cc) => cc.part);
  const nextT = Tr ? T.find((t) => t.k > Tr.k) : null;
  // kill: the ball's rest relative to the body
  let kill = null; if (rx.intent === "kill" && Tr) { let kr = null; for (let i = k1 + 1; i < rec.length; i++) { const r = rec[i]; if (Math.hypot(r.ball.v[0], r.ball.v[2]) < 0.05) { kr = i; break; } }
    const r = rec[kr != null ? kr : rec.length - 1], bx = r.ball.p[0] - r.P[0], by = r.ball.p[2] - r.P[1], ah = bx * Math.cos(r.psi) + by * Math.sin(r.psi), lat = -bx * Math.sin(r.psi) + by * Math.cos(r.psi);
    kill = { restT: kr != null ? r3((kr - k1) * DT) : null, ahead: r2(ah), lat: r2(lat), dist: r2(Math.hypot(bx, by)), speedOut: r2(c.ex.speed) }; }
  const exOut = Tr ? hdgA(Tr.executed.v) : null;
  const res = {
    id: cs.id, dir: cs.dir, angle: cs.angle, side: cs.side, rs: cs.rs, ps: cs.ps, intent: rx.intent, bc: S.bc, seed: S.cfg.seed, cls: rx.cls.kind, rta: rx.cls.deg360, rtaSigned: rx.cls.signed,
    pass: { T: rx.pass.T, vArr: rx.pass.vArr },
    action: sm.action ? { fam: sm.action.fam, F: sm.action.F, side: sm.action.side, surface: sm.action.surface, t0: r3(sm.action.k0 * DT), tc: sm.action.tc, th: sm.action.th, prep: r3((sm.action.kc - sm.action.k0) * DT), D: sm.action.D,
      rotPre: sm.action.rotPre, rotExit: sm.action.rotExit, idealRel: sm.action.ideal.dirRel, idealVsExit: sm.action.ideal.vsExit, idealSpeed: sm.action.ideal.speed, sIn: sm.action.sIn, s0: sm.action.s0, sC: sm.action.sC, vH: sm.action.vH, weak: sm.action.F !== S.pref } : null,
    contact: sm.contact ? { launched: sm.contact.launched, cancelled: sm.contact.cancelled, dirErr: sm.contact.exec.dirErr, speedErr: sm.contact.exec.speedErr, sigDir: sm.contact.exec.sigDir, sigSpeed: sm.contact.exec.sigSpeed, speedOut: sm.contact.exec.speed, exitErr: exOut != null ? r2(wrapD(exOut - exitH)) : null } : null,
    chaseAt: chase != null ? r3(chase * DT) : null, onLineT: kLine != null ? r3(kLine * DT) : null, firstToLine: kLine != null && k1 != null ? r3((kLine - k1) * DT) : null,
    nextTouch: nextT ? { dt: r3((nextT.k - Tr.k) * DT), F: nextT.F, reg: nextT.reg, afterHandoff: ho ? nextT.k >= ho.k : null } : null,
    speed: { start: act ? r2(spAt(act.k0)) : null, minPrep: r2(vMinPrep), atContact: k1 != null ? r2(spAt(k1)) : null, atHandoff: ho ? r2(spAt(ho.k)) : null, at1s: k1 != null ? r2(spAt(k1 + 240)) : null, end: r2(spAt(rec.length - 1)) },
    handoff: ho ? { t: ho.t, acc: r2(hoAcc), yawStep: r2(hoYaw), reqVsExit: r2(hoReq), ballRel: hoBall, ballSpeed: ho.ballSpeed } : null,
    ctrlEnd, lostAfter: lostAt.length ? r3(lostAt[0] * DT) : null, heavy: Tr ? c.ex.speed - (spAt(k1) || 0) > 4.0 : null, doubleTouches: dbl, recontacts: recon, physBefore: physPre,
    touches: T.length, fault: S.fault ? S.fault.message : null, kill, plans: rx.plans, cands: rx.cands, rej: rx.rej, cpu,
  };
  const real = !!(Tr && (chase == null || Tr.k < chase)), anyTouch = T.length > 0;
  if (rx.intent === "kill") res.outcome = !Tr ? (sm.action ? "MISSED-CANCELLED" : "MISSED-NO-ACTION") : kill && kill.restT != null && kill.restT <= 1.2 && kill.dist <= 1.0 && kill.ahead > -0.1 ? "KILLED" : kill && kill.dist <= 1.6 ? "SETTLED" : "HEAVY";
  else res.outcome = !anyTouch ? (sm.action ? "MISSED-CANCELLED" : "MISSED-NO-ACTION") : !real ? "RECOVERED" : kLine == null ? "RECEIVED" : ctrlEnd === "CONTROLLED" && res.firstToLine <= 2.5 ? "CLEAN" : "TAKEN";
  res.cls5 = res.outcome.startsWith("MISSED") ? "MISSED" : res.outcome;
  return res;
}

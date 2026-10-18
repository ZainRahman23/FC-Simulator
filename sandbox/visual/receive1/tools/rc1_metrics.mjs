// receive1/tools/rc1_metrics.mjs — the receive scorecard of one run (a finished ReceiveSim): first touch, family, turn, new line, speed, control,
// handoff, CPU. Everything is measured from the authoritative record (body, ball, touches) — nothing is taken from the planner's intentions.
import { DT } from "../rc1_core.js";
const D = 180 / Math.PI, wrapD = (a) => { a = ((a + 180) % 360 + 360) % 360; return a - 180; };
const hdgP = (v) => Math.atan2(v[1], v[0]) * D;                         // pitch vector → heading (deg; + right, the lab convention)
const hdgA = (v) => Math.atan2(-v[2], v[0]) * D;                        // anim-frame vector → heading
// the contact FAMILY of the first touch, from geometry: which foot, which surface, where the ball was relative to the stance foot / body, and what
// the touch did to the ball (deg of redirect) — across-body (the far foot's inside, ball crossing in front of the stance), through-stance (behind /
// beside the standing leg), outside-foot, inside wrap (the near foot's inside turning it with the body), let-run (first touch after the ball passed
// the body line), front (toe / laces block)
export function family(S, T) {
  if (!T) return "none";
  const r = S.rec[T.k] || S.rec[S.rec.length - 1], c = Math.cos(r.psi), s = Math.sin(r.psi), bx = T.ball[0] - r.P[0], by = -T.ball[2] - r.P[1], ah = bx * c + by * s, lat = -bx * s + by * c;   // (+ lat = right)
  const side = lat >= 0 ? "R" : "L", far = T.F !== side;
  if (ah < -0.05) return "let-run";
  if (T.reg === "OUTSIDE") return "outside-foot";
  if (T.reg === "INSIDE") return far ? "across-body" : (Math.abs(lat) < 0.15 ? "through-stance" : "inside-wrap");
  return T.reg === "LACES" ? "laces" : "front";
}
export function score(S, cs, cpuMs) {
  const rc = S.rc, f = rc.first, rec = S.rec, exitH = rc.exitDir * D, T = S.touches.filter((t) => t.launched), Tf = f ? T.find((t) => t.k === f.k) : null;
  const k1 = f ? f.k : null, last = rec[rec.length - 1];
  // the new line: the first time after the first touch that the body's velocity heading is within 15° of the exit at ≥ 2.5 m/s, and the ball's
  // velocity heading within 25° of it (the ball travelling on the new line)
  let kLine = null; if (k1 != null) for (let i = k1; i < rec.length; i++) { const r = rec[i], sp = Math.hypot(r.V[0], r.V[1]), bv = [r.ball.v[0], r.ball.v[2]], bs = Math.hypot(bv[0], bv[1]);
    if (sp >= 2.5 && Math.abs(wrapD(hdgP(r.V) - exitH)) <= 15 && bs > 0.8 && Math.abs(wrapD(hdgP(bv) - exitH)) <= 25) { kLine = i; break; } }
  // after the first touch: the touch that put the ball on the exit (≤ 25°), the touches until then, control at the end, distance of ball to body
  const onLine = T.filter((t) => k1 != null && t.k >= k1 && Math.abs(wrapD(hdgA(t.executed.v) - exitH)) <= 25), tOn = onLine.length ? onLine[0] : null;
  const ctrlEnd = S.ctrl.state, lostAt = S.ctrl.changes.filter((c) => c.to === "LOOSE" && k1 != null && c.k > k1).map((c) => c.k);
  const sp = (t) => { const r = rec[Math.min(rec.length - 1, Math.round(t / DT))]; return r ? Math.hypot(r.V[0], r.V[1]) : null; };
  const fastest = k1 != null ? Math.max(...rec.slice(k1).map((r) => Math.hypot(r.V[0], r.V[1]))) : null;
  // handoff: double touches (two launches within 0.15 s), same-foot recontact (a physical contact of the touching boot ≤ 0.25 s after its launch,
  // not the launch itself), the player's speed jump across the handoff tick
  const dbl = T.filter((t, i) => i > 0 && t.k - T[i - 1].k < Math.round(0.15 / DT)).length;
  const recon = T.filter((t) => S.contacts.some((c) => c.own && c.k > t.k + 2 && c.k - t.k <= Math.round(0.25 / DT) && (c.part === "boot_" + t.F || c.part === "toe_" + t.F))).length;
  const dv = k1 != null && rec[k1 + 1] && rec[k1 - 1] ? Math.hypot(rec[k1 + 1].V[0] - rec[k1 - 1].V[0], rec[k1 + 1].V[1] - rec[k1 - 1].V[1]) / (2 * DT) : null;
  // the body's turn before the first touch: facing at contact relative to the facing when the pass was played; when the turn was released
  const rel = S.turnLog.find((e) => e.kind === "release"), relK = rel ? rel.k : null;
  const turnFirst = !!(f && (f.release === true || f.role === "cut" || f.role === "stage" || (relK != null && relK <= k1)));
  const heavy = f ? f.speedOut - f.playerSpeed > 4.0 : null;
  const physDefl = S.contacts.filter((c) => c.own && (k1 == null || c.k < k1) && !c.striking).map((c) => c.part);
  const res = {
    id: cs.id, dir: cs.dir, angle: cs.angle, side: cs.side, rs: cs.rs, ps: cs.ps, seed: S.cfg.seed, cls: rc.cls ? rc.cls.kind : null, rta: rc.cls ? rc.cls.deg360 : null, rtaSigned: rc.cls ? rc.cls.signed : null,
    pass: { T: rc.pass.T, vArr: rc.pass.vArr },
    first: f ? { t: f.t, F: f.F, reg: f.reg, role: f.role, family: family(S, Tf), speedIn: f.speedIn, speedOut: f.speedOut, dirOutRel: f.dirOutRel, exitErr: f.exitErrDeg, redirect: f.redirectDeg, sigmaK: f.sigmaK,
      facingAtContact: f.facingAtContact, playerSpeed: f.playerSpeed, err: f.err } : null,
    preDeflections: physDefl, turnReleasedAt: relK != null ? +(relK * DT).toFixed(3) : null, turnBy: rel ? rel.by : null, turnWithFirst: turnFirst,
    onLineT: kLine != null ? +(kLine * DT).toFixed(3) : null, firstToLine: kLine != null && k1 != null ? +((kLine - k1) * DT).toFixed(3) : null,
    touchOnExit: tOn ? { t: +(tOn.k * DT).toFixed(3), n: T.filter((t) => t.k >= k1 && t.k <= tOn.k).length, isFirst: tOn.k === k1 } : null,
    speed: { atFirst: f ? f.playerSpeed : null, at1s: k1 != null ? +sp(k1 * DT + 1.0).toFixed(2) : null, at2s: k1 != null ? +sp(k1 * DT + 2.0).toFixed(2) : null, max: fastest != null ? +fastest.toFixed(2) : null },
    ctrlEnd, lostAfterFirst: lostAt.length ? +(lostAt[0] * DT).toFixed(3) : null, heavy, doubleTouches: dbl, recontacts: recon, handoffAcc: dv != null ? +dv.toFixed(2) : null,
    touches: T.length, fault: S.fault ? S.fault.message : null, cpu: cpuMs,
  };
  // outcome classes: CLEAN — first touch, the new line reached within 2.5 s of it, and the ball controlled at the end; TAKEN — first touch, the
  // new line reached; RECEIVED — a first touch but no new line; MISSED — no first touch
  res.outcome = !f ? "MISSED" : kLine == null ? "RECEIVED" : ctrlEnd === "CONTROLLED" && res.firstToLine <= 2.5 ? "CLEAN" : "TAKEN";
  return res;
}

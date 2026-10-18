// dribble15/tools/d15_quality.mjs — CUT QUALITY (the owner's DRIBBLE-1.2 §13 / §28 / §29 measures) of one finished run of a cut scenario:
//   times from the request to: the first set-up touch, the first MEANINGFUL redirection (a launch ≥ 20° toward the cut from the pre-cut line), TURN-1.2's
//   plant, the BALL travelling within 20° of the request (> 1 m/s), the BODY travelling within 20°; the touches it took to get the ball there; the
//   DECISIVE touch (the first launched within 25° of the request): foot, surface, speed, direction; the set-up's target error at the decisive contact;
//   whether a recovery touch was needed; and TAKEN CLEANLY — taken with the ball (released by a touch, final heading within 20°, controlled at the end)
//   AND the ball within 20° of the request ≤ ballBy s after the request (60°: 1.3, 90°: 1.7) AND ≤ maxTouches touches to get it there (60°: 2,
//   90°: 3) AND a decisive touch ≤ 9 m/s AND no recovery touch before it AND the body not waiting > 0.6 s for the ball (ball20 − body20)
import { DT } from "./d15_env.mjs";
const D = 180 / Math.PI, wr = (a) => ((a + 540) % 360) - 180;
export function cutQuality(S, scn) {
  const cmd = (scn.cmds || []).find((c) => c.turn != null && Math.abs(c.turn) >= 30); if (!cmd) return null;
  const tR = cmd.t, want = cmd.turn, kR = Math.round(tR / DT), line0 = (scn.init.heading || 0) * D, sgn = Math.sign(want), big = Math.abs(want) > 60;
  const T = S.touches.filter((t) => t.launched && t.t >= tR - 1e-9), dirOf = (t) => Math.atan2(-t.executed.v[2], t.executed.v[0]) * D;
  const setup = T.find((t) => t.role === "setup" || t.setupSw), redirect = T.find((t) => sgn * wr(dirOf(t) - line0) >= 20), dec = T.find((t) => Math.abs(wr(dirOf(t) - want)) <= 25);
  const plant = (S.A.events || []).find((e) => e[1] === "TD" && e[3] === "PLANT" && e[0] >= tR);
  let tb = null, tc = null; const rec = S.rec || [];
  for (let i = kR; i < rec.length; i++) { const r = rec[i], bv = r.ball.v; if (tb == null && Math.hypot(bv[0], bv[2]) > 1 && Math.abs(wr(Math.atan2(bv[2], bv[0]) * D - want)) < 20) tb = r.t; if (tc == null && Math.hypot(r.V[0], r.V[1]) > 1 && Math.abs(wr(Math.atan2(r.V[1], r.V[0]) * D - want)) < 20) tc = r.t; if (tb != null && tc != null) break; }
  const touchesTo = tb != null ? T.filter((t) => t.t <= tb + 1e-9).length : null, recov = T.some((t) => t.recovery && (tb == null || t.t <= tb));
  let setupErr = null; if (dec) { const prev = [...T].reverse().find((t) => t.k < dec.k); if (prev && prev.expect && prev.expect.target) setupErr = +Math.hypot(dec.ball[0] - prev.expect.target[0], dec.ball[2] - prev.expect.target[2]).toFixed(3); }
  const rel = (S.turnLog || []).filter((e) => e.kind === "release").pop(), last = rec[rec.length - 1], headErr = Math.abs(wr(S.A.psi * D - want));
  const taken = !!(rel && /^touch/.test(rel.by) && headErr < 20 && last && last.ctrl === "CONTROLLED");
  const ballBy = big ? 1.7 : 1.3, maxT = big ? 3 : 2, wait = tb != null && tc != null ? tb - tc : null;
  const clean = taken && tb != null && tb - tR <= ballBy && touchesTo <= maxT && !!dec && dec.executed.speed <= 9 && !recov && (wait == null || wait <= 0.6);
  const r2 = (x) => (x == null ? null : +x.toFixed(2));
  return { requested: want, taken, takenCleanly: clean, toSetupS: setup ? r2(setup.t - tR) : null, toRedirectS: redirect ? r2(redirect.t - tR) : null, toPlantS: plant ? r2(plant[0] - tR) : null,
    toBall20S: tb != null ? r2(tb - tR) : null, toBody20S: tc != null ? r2(tc - tR) : null, bodyWaitsS: r2(wait), touchesToBall20: touchesTo, recoveryBefore: recov,
    setupUsed: !!setup, setupSpeed: setup ? r2(setup.executed.speed) : null, setupDirDeg: setup ? r2(dirOf(setup)) : null, setupFromExistingTouch: !setup && !!dec && T.indexOf(dec) === 0, decisive: dec ? { t: r2(dec.t - tR), F: dec.F, preferred: dec.F === S.pref, reg: dec.reg, speed: r2(dec.executed.speed), dirDeg: r2(dirOf(dec)), role: dec.role } : null,
    setupErrAtDecisiveM: setupErr, finalBallHeadingErrDeg: dec ? r2(Math.abs(wr(dirOf(dec) - want))) : null };
}

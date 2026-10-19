// receive_elite1/tools/re1_metrics.mjs — the owner's REQUIRED METRICS of one receive run, from the authoritative record only (the same function
// for the current pipeline and RECEIVE-ELITE-1):
//   ball–player separation (ball centre ↔ the receiver's root, horizontal) over time from the first receive contact: maximum and mean over the
//   receive (first contact → DRIBBLE-V1's first touch, capped at 2.5 s) and over the turn (first contact → the body on the exit heading + 0.3 s);
//   the contacts (every launched touch: receive contacts, then DRIBBLE-V1's) with their times and the intervals between them; speed before the
//   turn (at the pass's strike), the minimum, after (+0.5 s / +1.0 s after the first contact); the time to the desired body orientation (facing
//   within 10° of the exit, held); the time to stable continuation (DRIBBLE-V1's first touch after the takeover, the ball CONTROLLED from then on);
//   recovery touches; DRIBBLE-V1 takeover (RECEIVE-CONTROL-1.1's scorecard: CLEAN = taken over and controlled on the new line); tCont — the time to
//   stable continuation on the exit: the first contact (the receive's or DRIBBLE-V1's) played with the body facing the exit (≤ 15°), running along it
//   (≤ 25°, ≥ 2.5 m/s) and the ball ≤ 1.5 m from him
import { DT } from "../../receive_control2/rc2_core.js";
import { score } from "../../receive11/tools/rx_metrics.mjs";
const r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100), r3 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 1000) / 1000), D = 180 / Math.PI;
const wrapD = (a) => { a = ((a + 180) % 360 + 360) % 360; return a - 180; };
export const SEP = { every: 6, cap: 2.5, alignDeg: 10, alignHold: 0.15 };
export function sepAt(r) { return Math.hypot(r.ball.p[0] - r.P[0], r.ball.p[2] - r.P[1]); }
export function tight(S, cs) {
  const rec = S.rec, T = S.touches.filter((t) => t.launched), rxT = T.filter((t) => t.receive), dT = T.filter((t) => !t.receive), k1 = rxT.length ? rxT[0].k : null, exitH = S.rx.exitDir * D;
  const sp = (r) => Math.hypot(r.V[0], r.V[1]), at = (k) => rec[Math.max(0, Math.min(rec.length - 1, k))];
  const ho = S.rx.handoff, kTake = ho ? (ho.kDribble != null ? ho.kDribble : ho.k) : null, d1 = dT.find((t) => kTake != null && t.k >= kTake), kEnd = k1 == null ? null : Math.min(rec.length - 1, d1 ? d1.k : k1 + Math.round(SEP.cap / DT), k1 + Math.round(SEP.cap / DT));
  // the body's facing on the exit heading (within alignDeg, held alignHold s)
  let kAlign = null; if (k1 != null) { let run = 0; for (let k = Math.max(0, k1 - 240); k < rec.length; k++) { if (Math.abs(wrapD(rec[k].psi * D - exitH)) <= SEP.alignDeg) { run++; if (run * DT >= SEP.alignHold) { kAlign = k - run + 1; break; } } else run = 0; } }
  const kTurnEnd = k1 == null ? null : Math.min(rec.length - 1, Math.max(k1 + Math.round(0.3 / DT), (kAlign != null ? kAlign : k1) + Math.round(0.3 / DT)));
  const win = (a, b) => { if (a == null || b == null || b < a) return null; let mx = 0, sum = 0, n = 0, kMx = a; for (let k = a; k <= b; k++) { const d = sepAt(rec[k]); if (d > mx) { mx = d; kMx = k; } sum += d; n++; } return { max: r2(mx), mean: r2(sum / n), tMax: r3((kMx - a) * DT) }; };
  const curve = k1 == null ? [] : []; if (k1 != null) for (let k = Math.max(0, k1 - 48); k <= Math.min(rec.length - 1, k1 + Math.round(2.5 / DT)); k += SEP.every) curve.push([r3((k - k1) * DT), r3(sepAt(rec[k]))]);
  const contacts = T.filter((t) => k1 != null && t.k >= k1 && t.k <= k1 + Math.round(3.0 / DT)).map((t) => ({ t: r3((t.k - k1) * DT), k: t.k, F: t.F, role: t.receive ? (t.family || "RECEIVE") : "DRIBBLE", surface: t.reg, recovery: !!t.recovery || /RECOVER/.test(String(t.family)), speed: r2(t.executed ? t.executed.speed : null) }));
  const rxC = contacts.filter((c) => c.role !== "DRIBBLE"), gaps = rxC.slice(1).map((c, i) => r3(c.t - rxC[i].t));
  let tCont = null; for (const c of T) { if (k1 == null || c.k < k1) continue; const r = rec[Math.min(rec.length - 1, c.k)], v = sp(r), hv = Math.atan2(r.V[1], r.V[0]) * D;
    if (Math.abs(wrapD(r.psi * D - exitH)) <= 15 && v >= 2.5 && Math.abs(wrapD(hv - exitH)) <= 25 && sepAt(r) <= 1.5) { tCont = r3((c.k - k1) * DT); break; } }
  const v0 = sp(rec[0]); let vMin = Infinity; if (k1 != null) for (let k = 0; k <= Math.min(rec.length - 1, k1 + Math.round(1.0 / DT)); k++) vMin = Math.min(vMin, sp(rec[k]));
  const sc = score(S, Object.assign({ angle: cs.turn, side: null }, cs), { recvPerS: null, afterPerS: null, worst: 0 });
  const ctrlStable = d1 ? !S.ctrl.changes.some((c) => c.k > d1.k && c.to === "LOOSE") : false;
  return { id: cs.id, base: cs.base || cs.id, kind: cs.kind, turn: cs.turn, ratings: cs.ratings || null, outcome: sc.outcome, cls5: sc.cls5, family: sc.action ? sc.action.fam : (S.rc2 && S.rc2.cls ? S.rc2.cls.action : null), tContact: k1 != null ? r3(k1 * DT) : null,
    sep: { receive: win(k1, kEnd), turn: win(k1, kTurnEnd), first1s: win(k1, k1 == null ? null : Math.min(rec.length - 1, k1 + Math.round(1.0 / DT))), curve },
    contacts, receiveContacts: rxC.length, gaps, gapMin: gaps.length ? Math.min(...gaps) : null, gapMean: gaps.length ? r3(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
    speed: { before: r2(v0), min: k1 != null ? r2(vMin) : null, contact: k1 != null ? r2(sp(at(k1))) : null, after05: k1 != null ? r2(sp(at(k1 + 120))) : null, after10: k1 != null ? r2(sp(at(k1 + 240))) : null },
    tAlign: kAlign != null && k1 != null ? r3((kAlign - k1) * DT) : null, tCont, tStable: d1 && k1 != null && ctrlStable ? r3((d1.k - k1) * DT) : null, tTakeover: kTake != null && k1 != null ? r3((kTake - k1) * DT) : null,
    recoveryTouches: rxC.filter((c) => c.recovery).length + dT.filter((t) => t.recovery && kTake != null && t.k >= kTake && t.k <= kTake + Math.round(2.0 / DT)).length,
    takeover: sc.cls5 === "CLEAN" ? "OK" : sc.cls5, ctrlEnd: S.ctrl.state, fault: S.fault ? S.fault.message : null };
}

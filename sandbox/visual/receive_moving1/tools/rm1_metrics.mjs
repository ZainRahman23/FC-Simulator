// receive_moving1/tools/rm1_metrics.mjs — the MOMENTUM metrics of one receive run (the owner's §31), from the authoritative record only:
// speed before the receive (at the strike), the minimum during it (strike → contact + 0.5 s), at the contact, 0.25 / 0.50 / 1.00 s after it; the
// heading before (the run) and after (+1.0 s); the ball's distance from the receiver 0.5 s after the contact (and ahead along his run); the time to
// stable continuation (DRIBBLE-V1's first touch after the handoff, and CONTROLLED from then on)
import { DT } from "../../receive_control2/rc2_core.js";
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100), D = 180 / Math.PI;
export function momentum(S) {
  const rec = S.rec, c = S.rx.contact, k1 = c && c.T && c.T.launched ? c.T.k : (S.rc2 && S.rc2.kc != null ? S.rc2.kc : null), at = (k) => rec[Math.max(0, Math.min(rec.length - 1, k))], sp = (r) => Math.hypot(r.V[0], r.V[1]), hd = (r) => Math.atan2(r.V[1], r.V[0]) * D;
  const k0 = 0, v0 = sp(at(k0)); let vMin = Infinity, kMin = null; const kEnd = k1 != null ? k1 + Math.round(0.5 / DT) : rec.length - 1; for (let k = k0; k <= kEnd && k < rec.length; k++) { const s = sp(rec[k]); if (s < vMin) { vMin = s; kMin = k; } }
  const ho = S.rx.handoff, kD = ho ? (ho.kDribble != null ? ho.kDribble : ho.k) : null, drib = S.touches.filter((t) => t.launched && !t.receive && kD != null && t.k >= kD), first = drib[0];
  let ballAt = null; if (k1 != null) { const r = at(k1 + Math.round(0.5 / DT)), bx = r.ball.p[0] - r.P[0], by = r.ball.p[2] - r.P[1], h = Math.atan2(r.V[1], r.V[0]); ballAt = { dist: r2(Math.hypot(bx, by)), ahead: r2(bx * Math.cos(h) + by * Math.sin(h)) }; }
  return { vBefore: r2(v0), vMin: r2(vMin), tMin: kMin != null ? r2(kMin * DT) : null, vContact: k1 != null ? r2(sp(at(k1))) : null, v025: k1 != null ? r2(sp(at(k1 + 60))) : null, v050: k1 != null ? r2(sp(at(k1 + 120))) : null, v100: k1 != null ? r2(sp(at(k1 + 240))) : null,
    headingBefore: r2(v0 > 0.3 ? hd(at(k0)) : (S.rec[0].psi * D)), headingAfter: k1 != null ? r2(hd(at(k1 + 240))) : null, ballAfter: ballAt, tContact: k1 != null ? r2(k1 * DT) : null,
    tStable: first ? r2((first.k - (k1 || 0)) * DT) : null, firstDribble: first ? r2(first.k * DT) : null, ctrlEnd: S.ctrl.state, brakeRatio: k1 != null && v0 > 0.5 ? r2(vMin / v0) : null };
}

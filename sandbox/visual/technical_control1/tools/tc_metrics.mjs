// technical_control1/tools/tc_metrics.mjs — the owner's §46 METRICS of one TECHNICAL-CONTROL-1 run, from the authoritative record only:
//   ball–player separation (max / mean / p95; over the turn window) · contacts per second · the contact timing distribution (intervals p10 / p50 /
//   p90, min) · foot usage (R / L / preferred %) · surface usage (inside / outside / sole / laces %) · body orientation time (intent change → facing
//   within 15° of the new heading, held 0.15 s) · turn completion time (→ running along it within 10°, held 0.15 s) · speed loss (entry − minimum)
//   · exit speed (1.5 s after the intent change) · recovery touches (beyond-reach chases) · the actions chosen · DRIBBLE-V1 bridge / takeover ·
//   (with a body) foot sliding and contact IK error. The receive chain adds RECEIVE-ELITE-1's metrics (tight(): cls5, tCont, takeover …).
import { tight, sepAt } from "../../receive_elite1/tools/re1_metrics.mjs";
const D = 180 / Math.PI, DT = 1 / 240, r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100), r3 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 1000) / 1000);
const wrapD = (a) => { a = ((a + 180) % 360 + 360) % 360; return a - 180; }, pct = (a, q) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[Math.floor(q * (b.length - 1))]; };
const share = (o, n) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r3(v / Math.max(1, n))]));
export function techMetrics(S, cs) {
  const rec = S.rec, ep = S.rc2 && S.rc2.ep, kc = S.rc2 ? S.rc2.kc || 0 : 0, sp = (r) => Math.hypot(r.V[0], r.V[1]);
  const C = ep && ep.contacts ? ep.contacts.slice() : [], course = cs.kind === "course", base = course ? null : tight(S, cs);
  // the window: from the first technical contact to the end of the run (the receive: its first contact)
  const k1 = C.length ? C[0].k : 0, kEnd = rec.length - 1, seps = []; for (let k = k1; k <= kEnd; k++) seps.push(sepAt(rec[k]));
  const tSpan = (kEnd - k1) * DT, gaps = C.slice(1).map((c, i) => c.t - C[i].t);
  const feet = {}, surf = {}; for (const c of C) { feet[c.F] = (feet[c.F] || 0) + 1; surf[c.surface] = (surf[c.surface] || 0) + 1; }
  const pref = S.prefFoot ? S.prefFoot() : "R", nPref = pref ? C.filter((c) => c.F === pref).length : null;
  // the intent change (course: tTurn; the receive: the first contact, toward the exit)
  const tAbs = (k) => k * DT, kTurn = course ? (cs.tTurn != null ? Math.round(cs.tTurn / DT) + kc : null) : k1, thetaD = course ? (cs.turn || 0) : S.rx.exitDir * D;
  const held = (fn, from) => { if (from == null) return null; let run = 0; for (let k = from; k < rec.length; k++) { if (fn(rec[k])) { run++; if (run * DT >= 0.15) return r3((k - run + 1 - from) * DT); } else run = 0; } return null; };
  const tOrient = held((r) => Math.abs(wrapD(r.psi * D - thetaD)) <= 15, kTurn), tTurnDone = held((r) => sp(r) > 1.0 && Math.abs(wrapD(Math.atan2(r.V[1], r.V[0]) * D - thetaD)) <= 10, kTurn);
  let vMin = Infinity; if (kTurn != null) for (let k = Math.max(0, kTurn - 72); k <= Math.min(kEnd, kTurn + 480); k++) vMin = Math.min(vMin, sp(rec[k]));
  const vEntry = kTurn != null ? sp(rec[Math.max(0, kTurn - 1)]) : null, vExit = kTurn != null ? sp(rec[Math.min(kEnd, kTurn + 360)]) : sp(rec[kEnd]);
  const turnSeps = []; if (kTurn != null) for (let k = Math.max(k1, kTurn - 72); k <= Math.min(kEnd, kTurn + 360); k++) turnSeps.push(sepAt(rec[k]));
  const acts = ep && ep.techLog ? ep.techLog.filter((e) => e.ev === "action").map((e) => e.fam) : [], chases = ep && ep.techLog ? ep.techLog.filter((e) => e.ev === "chase").length : 0;
  const ho = S.rx && S.rx.handoff, out = {
    id: cs.id, section: cs.section || (course ? cs.section : "RECEIVE"), ratings: cs.ratings, style: typeof cs.style === "string" ? cs.style : "NEUTRAL", pref,
    sep: { max: r2(Math.max(...seps)), mean: r2(seps.reduce((a, b) => a + b, 0) / Math.max(1, seps.length)), p95: r2(pct(seps, 0.95)), turnMax: turnSeps.length ? r2(Math.max(...turnSeps)) : null },
    contacts: C.length, perS: r2(C.length / Math.max(0.5, tSpan)), gaps: { min: r3(gaps.length ? Math.min(...gaps) : null), p10: r3(pct(gaps, 0.1)), p50: r3(pct(gaps, 0.5)), p90: r3(pct(gaps, 0.9)) },
    feet: share(feet, C.length), prefShare: nPref != null ? r3(nPref / Math.max(1, C.length)) : null, surfaces: share(surf, C.length),
    tOrient, tTurnDone, speed: { entry: r2(vEntry), min: kTurn != null ? r2(vMin) : null, loss: kTurn != null ? r2(vEntry - vMin) : null, exit: r2(vExit) },
    recovery: C.filter((c) => c.recovery).length + chases, actions: acts, failed: ep ? !!ep.failed : null, notes: ep && ep.notes ? ep.notes.slice(0, 4) : [],
    takeover: ho ? r3(((ho.kDribble != null ? ho.kDribble : ho.k) - k1) * DT) : null, fault: S.fault ? String(S.fault.message || S.fault) : null };
  if (base) Object.assign(out, { cls5: base.cls5, tCont: base.tCont, tAlign: base.tAlign, receiveSep: base.sep.receive, family: base.family });
  return out;
}
// the body: foot sliding (a planted foot's drift) and the contact IK error (the posed ankle vs the contact pose at each contact tick) — run with anim
export function bodyMetrics(S) {
  const b = S, ref = { R: null, L: null }; return { step() { const c2 = b.rc2, pz = c2 && c2.kind === "ELITE" && c2.phase === "action" ? c2.pose : null; if (!pz) { ref.R = ref.L = null; return; } const ep = c2.ep, last = ep.contacts[ep.contacts.length - 1];
      if (last && b.k === last.k + 1 && b.body2) { const t = (last.k - c2.k0) / 240, po = b.body2.poseAt(t, null), want = b.body2.footAt(last.F, last.t), got = po.J["foot_" + last.F].j; this.cErr = Math.max(this.cErr, Math.hypot(got[0] - want.ank[0], got[1] - want.ank[1], got[2] - want.ank[2])); }
      for (const X of ["R", "L"]) { const f = pz.feet[X], aj = pz.J["foot_" + X].j; this.ik.push(Math.hypot(aj[0] - f.ank[0], aj[1] - f.ank[1], aj[2] - f.ank[2]));
        if (!f.planted) ref[X] = null; else { const pt = f.pivot ? pz.J["toe_" + X].j : aj, key = f.pivot ? "p" + f.ballPt[0].toFixed(4) + f.ballPt[1].toFixed(4) : "f" + f.ank[0].toFixed(4) + f.ank[1].toFixed(4); if (!ref[X] || ref[X].id !== key) ref[X] = { id: key, p: pt.slice() }; else this.slip = Math.max(this.slip, Math.hypot(pt[0] - ref[X].p[0], pt[1] - ref[X].p[1])); } } },
    cErr: 0, slip: 0, ik: [], result() { return { contactIkErr: r3(this.cErr), slip: r3(this.slip), ikP99: r3(pct(this.ik, 0.99)), ikMax: r3(this.ik.length ? Math.max(...this.ik) : null) }; } };
}

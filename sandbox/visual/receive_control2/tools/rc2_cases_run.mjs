// receive_control2/tools/rc2_cases_run.mjs — the INTEGRATED CASES (A–M, A′, I′) × Ball Control 50 / 70 / 80 / 90 / 99 × seeds, on the full pipeline:
// the resolver's action, the episode's contacts and class, the rejoin / set-off, the TURN-1.2 switch (speed / facing continuity), the DRIBBLE-V1
// handoff (ball ahead / lateral, ball vs runner speed), DRIBBLE-V1's first touch, recontacts, the control state; RECEIVE-CONTROL-1.1's scorecard
// outcome. Matched draws: the same seed at every rating.   node rc2_cases_run.mjs <out.json> [seeds 1,2,3] [anim 0|1]
import fs from "fs"; import { makeReceive2, DT } from "./rc2_env.mjs"; import { CASES, parseCase } from "../rc2_cases.js"; import { score } from "../../receive11/tools/rx_metrics.mjs";
const out = process.argv[2] || "rc2_cases.json", seeds = (process.argv[3] || "1,2,3").split(",").map(Number), anim = process.argv[4] === "1", BCS = [50, 70, 80, 90, 99], r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000), r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const wrapD = (a) => { a = ((a + 180) % 360 + 360) % 360; return a - 180; };
export function runCase(id, seed, o = {}) {
  const cs = parseCase(id), S = makeReceive2(cs, { seed, anim: o.anim }), t0 = performance.now(); S.run(cs.scenario.dur); const ms = performance.now() - t0;
  const sm = S.summary2(), c2 = S.rc2, rec = S.rec, row = score(S, cs, { recvPerS: null, afterPerS: null, worst: 0 }), ho = S.rx.handoff;
  // TURN-1.2 switch continuity: the body's velocity and facing either side of the switch tick
  let sw = null; if (c2.t12) { const k = c2.t12.k, a = rec[k - 1], b = rec[k + 1]; if (a && b) sw = { dv: r2(Math.hypot(b.V[0] - a.V[0], b.V[1] - a.V[1])), dPsi: r2(Math.abs(wrapD((b.psi - a.psi) * 180 / Math.PI))), vBefore: r2(Math.hypot(a.V[0], a.V[1])), vAfter: r2(Math.hypot(b.V[0], b.V[1])) }; }
  const T = S.touches.filter((t) => t.launched), kD = ho && ho.kDribble, drib = T.filter((t) => !t.receive), first = kD != null ? drib.find((t) => t.k >= kD) : null, preD = kD != null ? drib.filter((t) => t.k < kD).length : drib.length;
  const recon = T.filter((t) => S.contacts.some((cc) => cc.own && cc.k > t.k + 2 && cc.k - t.k <= Math.round(0.25 / DT) && (cc.part === "boot_" + t.F || cc.part === "toe_" + t.F))).length, dbl = T.filter((t, i) => i > 0 && t.k - T[i - 1].k < Math.round(0.15 / DT)).length;
  const lost = S.ctrl.changes.filter((ch) => ch.to === "LOOSE" && kD != null && ch.k > kD).length, last = rec[rec.length - 1];
  return { id, seed, bc: S.bc, action: sm.cls ? sm.cls.action : null, family: sm.family, foot: sm.foot, surface: sm.surface, episode: sm.episode ? (sm.episode.cls || null) : null, contacts: sm.launches.filter((l) => l.kind === "LAUNCH").length, cancelled: sm.launches.filter((l) => l.kind !== "LAUNCH").length,
    launches: sm.launches.map((l) => l.id), rejoin: sm.rejoin, stableAt: sm.stableAt, t12: c2.t12 ? Object.assign({ t: r3(c2.t12.k * DT) }, sw) : null,
    handoff: ho && ho.kDribble != null ? { t: r3(ho.kDribble * DT), ballAhead: ho.ballRel ? ho.ballRel[0] : null, ballLat: ho.ballRel ? ho.ballRel[1] : null, ballSpeed: ho.ballSpeed, runner: ho.vNow } : null,
    dribble: kD != null ? { first: first ? r3((first.k - kD) * DT) : null, firstFoot: first ? first.F : null, touches: drib.length, beforeHandoff: preD } : null, recontacts: recon, doubles: dbl, ctrlEnd: S.ctrl.state, lostAfterHandoff: lost,
    outcome: row.outcome, kill: row.kill, endSpeed: r2(Math.hypot(last.V[0], last.V[1])), fault: S.fault ? S.fault.message : null, ms: Math.round(ms) };
}
if (process.argv[1] && process.argv[1].endsWith("rc2_cases_run.mjs")) {
  const rows = []; for (const c of CASES) for (const bc of c.bc ? [c.bc] : BCS) for (const sd of seeds) { const id = c.bc ? c.id : c.id + "_BC" + bc; rows.push(runCase(id, sd, { anim })); }
  fs.writeFileSync(out, JSON.stringify(rows, null, 1)); console.log(rows.length, "runs");
  for (const c of CASES) { const R = rows.filter((r) => r.id.split("_")[0] === c.id), oc = {}; for (const r of R) oc[r.outcome] = (oc[r.outcome] || 0) + 1;
    const r99 = R.find((r) => r.bc === 99) || R[0]; console.log(c.id.padEnd(3), (r99.action || "").padEnd(18), JSON.stringify(oc), "· ep", [...new Set(R.map((r) => r.episode))].join("/"), "· handoff ahead", R.filter((r) => r.handoff).map((r) => r.handoff.ballAhead).slice(0, 3).join(","), "· 1st dribble", R.filter((r) => r.dribble && r.dribble.first != null).map((r) => r.dribble.first).slice(0, 3).join(","), "· sw dv", R.filter((r) => r.t12).map((r) => r.t12.dv).slice(0, 3).join(","), "· recon", R.reduce((a, r) => a + r.recontacts, 0), "· lost", R.reduce((a, r) => a + r.lostAfterHandoff, 0), "· faults", R.filter((r) => r.fault).length); }
}

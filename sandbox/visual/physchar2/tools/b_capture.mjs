// ═══ physchar2/tools/b_capture.mjs — INVESTIGATION B: find a one-step energy event and write its per-tick impulse / energy ledger ═════════
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/b_capture.mjs --human=V1-matched --key=singleLeg [--hz=240 --vel=150 --pos=2 --thr=1 --tmax=10
//        --pre=12 --post=10 --out=<json>]      DIAGNOSTIC ONLY (k is read from the environment by spec/v2_joints.js; default = accepted 0)
import fs from "fs";
import { jolt, specOf, makeSim, findEvent, runTo, ledgerTick, ledgerSummary, JS, D, V } from "./b_lib.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
const human = arg("human", "V1-matched"), key = arg("key", "singleLeg"), hz = +arg("hz", 240), vel = +arg("vel", 150), pos = +arg("pos", 2), thr = +arg("thr", 1), tmax = +arg("tmax", 10);
const pre = +arg("pre", 12), post = +arg("post", 10), out = arg("out", null);
const J = await jolt(), spec = specOf(human), cfg = { hz, velSteps: vel, posSteps: pos };
const s = makeSim(J, spec, key, cfg), t0 = Date.now(), ev = findEvent(s, { thr, tMax: tmax }); s.destroy();
const head = { human, key, hz, vel, pos, kNeutral: JS.ankleNeutralKPerDeg(), thr, event: ev.n, rise: ev.rise, t: ev.t ?? null, best: ev.best, secs: (Date.now() - t0) / 1000 };
console.log(JSON.stringify(head));
if (ev.n == null) { if (out) fs.writeFileSync(out, JSON.stringify({ ...head, ledger: [] }, null, 1)); process.exit(0); }
const s2 = makeSim(J, spec, key, cfg); runTo(s2, ev.n - 1 - pre); const L = [];
while (s2.n < ev.n + post) L.push(ledgerTick(s2));
const f = (x, n = 2) => (x == null ? "—" : (+x).toFixed(n));
for (const l of L) { const sm = ledgerSummary(l, spec, { topBodies: 3, topJoints: 3 });
  console.log(`n ${l.n1} t ${f(l.t1, 4)} dE ${f(l.dE, 3)} KE ${f(l.KE1, 2)} PE ${f(l.PE1, 2)} U ${f(l.U1, 3)} sep ${f(l.sep1 * 1000, 1)}mm | ` +
    sm.b.map(b => `${b.name} dK ${f(b.dK, 2)} [c ${f(b.Wc, 2)} j ${f(b.Wj, 2)} l ${f(b.Wl, 2)} m ${f(b.Wm, 2)} t ${f(b.Wt, 2)} g ${f(b.Wg, 2)} gy ${f(b.Wgy, 3)}]`).join(" ; ") + " || " +
    sm.j.map(j => `${j.name} Wp ${f(j.Wp, 2)} Wl ${f(j.Wl, 2)} Wm ${f(j.Wm, 2)} Wt ${f(j.Wt, 2)}`).join(" ; ") +
    ` || POS: dU int ${f(l.posLedger.dU_integration, 3)} corr ${f(l.posLedger.dU_positionCorrection, 3)} dPE int ${f(l.posLedger.dPE_integration, 3)} corr ${f(l.posLedger.dPE_positionCorrection, 3)} | ` + l.posLedger.bodies.filter(b => b.corrMm > 0.5 || b.corrDeg > 0.5).map(b => `${b.name} ${f(b.corrMm, 1)}mm/${f(b.corrDeg, 1)}°`).join(" ")); }
if (out) { const slim = L.map(l => ({ n0: l.n0, n1: l.n1, t1: l.t1, E0: l.E0, E1: l.E1, dE: l.dE, KE0: l.KE0, KE1: l.KE1, PE0: l.PE0, PE1: l.PE1, U0: l.U0, U1: l.U1, sepMm: l.sep1 * 1000,
    bodies: l.bodies.map(b => ({ name: b.name, dKt: b.dKt, dKr: b.dKr, dPE: b.dPE, kt1: b.kt1, kr1: b.kr1, W: b.W, v0: b.v0, v1: b.v1, w0: b.w0, w1: b.w1, Pc: b.Pc, Lc: b.Lc })),
    joints: l.joints.map(j => ({ name: j.name, Wpoint: j.Wpoint, Wlim: j.Wlim, Wmot: j.Wmot, Wtexp: j.Wtexp, lam: j.lam, lamPrev: j.lamPrev, limActive: j.limActive, clamp: j.clamp, desCurDeg: j.desCurDeg, q: j.q })),
    contacts: l.contacts.map(c => ({ a: c.a, b: c.b, sa: c.sa, sb: c.sb, normal: c.normal, depth: c.depth, n: c.pts.length, pts: c.pts, pts2: c.pts2 })),
    plan: l.plan.joints.map(p => ({ k: p.k, K: p.K, delta: p.delta, Texp: p.Texp, lim: p.lim, wt: p.wt, C: p.C, tau: p.tau, wi: p.wi })),
    posLedger: l.posLedger, S0: l.S0, S1: l.S1 }));
  fs.writeFileSync(out, JSON.stringify({ ...head, ledger: slim })); }
s2.destroy();

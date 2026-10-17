// dribble14/tools/d14_geomdiag.mjs — CUT CONTACT GEOMETRY DIAGNOSIS: while a cut is held, every contact the planner examines (generation in makePlan,
// the re-aim into the cut in switchCand, the window probes) is classified by its FIRST failing feasibility check — yaw (the region cannot face the
// launch), pitch, fwd (offset along the heading beyond the swing's bounds), lat (sideways), vert, unwind (rotation / offset cannot unwind before the
// plant), ground (a hull below the turf), ik (leg reach), other (the boot's other hull meets the ball first) — per foot, region and context; with the
// offset (forward / lateral / vertical, heading frame) the contact would need, and the launch direction relative to the heading.
// usage: node d14_geomdiag.mjs SCENARIO seeds [ver d11|d12] [prof HIGH] [out.json]
import fs from "fs"; import { makeSim, DT, CORES, PROFILES } from "./d14_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [id = "CUT60_RUN", seedsArg = "8", ver = "d11", prof = "HIGH", outFile] = process.argv.slice(2), N = +seedsArg;
const P = CORES[ver].DribbleSim.prototype, cg = P.contactGeom, yo = P.yawOut, sc = P.switchCand, wa = P.windowAt, mp = P.makePlan;
let ctx = "other"; const agg = {}, rows = [];
const D = 180 / Math.PI, hd = (n) => Math.atan2(-n[2], n[0]);
P.makePlan = function (k) { ctx = "plan"; try { return mp.call(this, k); } finally { ctx = "other"; } };
P.switchCand = function (c, k, held) { const c0 = ctx; ctx = "switch"; try { return sc.call(this, c, k, held); } finally { ctx = c0; } };
P.windowAt = function (...a) { const c0 = ctx; ctx = "window"; try { return wa.apply(this, a); } finally { ctx = c0; } };
P.yawOut = function (smp, F, reg, nL) { const r = yo.call(this, smp, F, reg, nL); if (r && this.held && !this.held.released && (reg === "INSIDE" || reg === "OUTSIDE")) { const key = ctx + ":" + F + ":" + reg + ":yaw"; agg[key] = (agg[key] || 0) + 1; } return r; };
P.contactGeom = function (smp, F, reg, nL, ball, vBall, elev) {
  const r = cg.call(this, smp, F, reg, nL, ball, vBall, elev);
  if (this.held && !this.held.released && (reg === "INSIDE" || reg === "OUTSIDE")) {
    const s = this.rej; this.rej = {}; cg.call(this, smp, F, reg, nL, ball, vBall, elev); const why = r ? "OK" : Object.keys(this.rej).filter((x) => x !== "samples")[0] || "?"; const smpl = (this.rej.samples || [])[0]; this.rej = s;
    const key = ctx + ":" + F + ":" + reg + ":" + why; agg[key] = (agg[key] || 0) + 1;
    if (rows.length < 200000) rows.push({ ctx, F, reg, why, elev: Math.round(elev * D), of: smpl ? smpl[3] : null, ol: smpl ? smpl[4] : null, ov: smpl ? smpl[5] : null, aim: +(((hd(nL) - smp.psi) * D + 540) % 360 - 180).toFixed(1), cut: Math.round((this.held.raw.dir - smp.psi) * D), w: +smp.legs[F].w.toFixed(2), dk: smp.k - this.k });
  }
  return r;
};
const runs = [];
for (let sd = 1; sd <= N; sd++) { const S = makeSim(get(id), { ver, seed: sd, player: PROFILES[prof], opts: { record: false } }); S.run(); runs.push({ seed: sd, touches: S.touches.filter((T) => T.launched).map((T) => `${T.t.toFixed(2)} ${T.F} ${T.reg}${T.release ? " " + T.release : ""}`) }); }
const tab = Object.entries(agg).sort((a, b) => a[0] < b[0] ? -1 : 1);
console.log(`${id} · ${ver} · ${prof} · seeds 1–${N}: first failing check of held-cut INSIDE / OUTSIDE contacts (context:foot:region:check count)`);
for (const [k, v] of tab) console.log("  " + k.padEnd(32), v);
const by = {}; for (const r of rows) { const k = r.ctx + ":" + r.F + ":" + r.reg + ":" + r.why; (by[k] = by[k] || []).push(r); }
const med = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
console.log("median required offset (m, heading frame) and launch direction rel. heading (deg) per class:");
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, 40)) console.log("  " + k.padEnd(32), String(v.length).padStart(6), "fwd", med(v.map((r) => r.of)), "lat", med(v.map((r) => r.ol)), "vert", med(v.map((r) => r.ov)), "aim", med(v.map((r) => r.aim)), "elev", med(v.map((r) => r.elev)), "w", med(v.map((r) => r.w)));
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ id, ver, prof, seeds: N, agg, runs, sample: rows.filter((_, i) => i % 7 === 0).slice(0, 20000) }));
for (const r of runs) console.log(`  seed ${r.seed}: ${r.touches.join(" · ")}`);

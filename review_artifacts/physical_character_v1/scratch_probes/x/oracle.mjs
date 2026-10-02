// DIAGNOSTIC ONLY — an oracle step-placement search with the deterministic simulator as a perfect model (bounds what any foot-placement
// decision layer could achieve with this inner loop, swing and body). Per step k: the controller's own step-start decision u_c, then candidates
// around it, each replayed from scratch with steps 0..k−1 fixed (commanded), scored at the START of step k+1 by the measured state's distance from
// the orbit (forward / sideways capture point, forward speed); a fall before that = +inf. The best is committed.
import { J, body, G2 } from "../fg/lib.mjs"; import fs from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/";
const models = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(JDM + "mU1_tau" + t + ".json", "utf8"))]));
const CTRL = { kind: "U", vd: 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false, identFixed: true, models };
const first = process.argv[2] || "R", at = +(process.argv[3] || 0.5), NS = +(process.argv[4] || 30), out = process.argv[5], tgt = { f: +(process.env.TF ?? 0.0), l: +(process.env.TL ?? 0.10), v: 0.45 };
const { spec, poses } = body("F0"), base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
function run(char, n) { const steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.62, rhythmOver: { steps, at, walk: { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] }, char: { ...(base.char || {}), ...char }, ctrl: { ...base.ctrl, ...CTRL } } }, onLoco: l => { LOCO = l; } });
  const P = LOCO.planner, D = P.exec.done.filter(d => d.kind === "rhythmic"), h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t;
  const at_ = (t) => { let lo = 0, hi = r.recs.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.recs[m].t < t) lo = m; else hi = m; } return r.recs[hi]; };
  const stateAt = (k) => { const d = D.find(e => e.stepIndex === k); if (!d || d.tSw0 > tF) return null; const q = at_(d.tSw0), ps = d.pSt, e = [q.xi[0] - ps[0], q.xi[1] - ps[1]], sd = d.sw === "R" ? 1 : -1;
    return { x: [e[0] * hd[0] + e[1] * hd[1], (e[0] * rt[0] + e[1] * rt[1]) * sd], v: q.vcom[0] * hd[0] + q.vcom[2] * hd[1], t: d.tSw0 }; };
  return { r, D, tF, stateAt, wl: P.rhythm.walkerLog || [] }; }
const fixed = {}, log = []; const t0 = Date.now();
for (let k = 2; k < NS; k++) {
  const ref = run(fixed, k + 3), lg = ref.wl.find(w => w.i === k), s0 = ref.stateAt(k); if (!lg || !s0) { log.push({ k, end: "no step k (fell before it)" }); break; }
  const uc = lg.u.slice(0, 3); const cands = [];
  const GRID = process.env.GRID === "narrow"; if (GRID) { for (const dd of [-0.06, -0.03, 0, 0.03, 0.06]) for (const T of [0.36, 0.40, 0.44]) cands.push([uc[0] + dd, uc[1], T]); } else { for (const df of (process.env.DFMAX ? [0.10, 0.16, 0.22, 0.28, 0.34, 0.40, 0.46, 0.52].filter(v => v <= +process.env.DFMAX + 1e-9) : [0.10, 0.16, 0.22, 0.28, 0.34, 0.40, 0.46])) for (const T of [0.34, 0.40, 0.46]) cands.push([df, uc[1], T]); }
  const score = (u) => { const ev = run({ ...fixed, [k]: { df: u[0], dl: u[1], T: u[2] } }, k + 3), s = ev.stateAt(k + 1); if (!s) return { c: Infinity }; return { c: ((s.x[0] - tgt.f) / 0.03) ** 2 + ((s.x[1] - tgt.l) / 0.03) ** 2 + ((s.v - tgt.v) / (+(process.env.SV || 0.1))) ** 2, s }; };
  let best = null; for (const u of cands) { const e = score(u); if (!best || e.c < best.c) best = { ...e, u }; }
  for (const dl of (GRID ? [-0.04, -0.02, 0.02, 0.04] : [-0.06, -0.03, 0.03, 0.06])) { const u = [best.u[0], best.u[1] + dl, best.u[2]], e = score(u); if (e.c < best.c) best = { ...e, u }; }
  if (!Number.isFinite(best.c)) { log.push({ k, s0, uc, end: "every candidate falls before step k+1" }); break; }
  fixed[k] = { df: +best.u[0].toFixed(4), dl: +best.u[1].toFixed(4), T: best.u[2] }; log.push({ k, s0, uc, u: best.u, cost: best.c, s1: best.s });
  console.log(`${first}@${at} k ${k} | x ${s0.x.map(v => v.toFixed(3))} v ${s0.v.toFixed(2)} | ctrl u ${uc.map(v => v.toFixed(3))} → oracle u ${best.u.map(v => v.toFixed(3))} | next x ${best.s.x.map(v => v.toFixed(3))} v ${best.s.v.toFixed(2)} cost ${best.c.toFixed(1)} | ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (out) fs.writeFileSync(out, JSON.stringify({ start: first + at, tgt, fixed, log })); }
const fin = run(fixed, Object.keys(fixed).length + 6); console.log(`${first}@${at} FINAL: committed ${Object.keys(fixed).length} oracle steps; upright steps in the replay ${fin.D.filter(d => d.td && d.td.t < fin.tF).length}, fall ${fin.tF < 1e8 ? fin.tF.toFixed(2) : "none"}`);
if (out) fs.writeFileSync(out, JSON.stringify({ start: first + at, tgt, fixed, log, final: { upright: fin.D.filter(d => d.td && d.td.t < fin.tF).length, tF: fin.tF } }));

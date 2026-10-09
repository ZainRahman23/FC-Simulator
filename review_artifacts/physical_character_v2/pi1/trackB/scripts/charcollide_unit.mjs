// CHARCOLLIDE-1 unit checks (TRACKB_PREREG §2.5 / §2.9 groundwork): root basis = gkRootMatrix; legacy path unchanged; determinism; landmarks
import { loadSim } from "./charcollide_sim.mjs"; import fs from "fs"; import path from "path"; import vm from "vm";
const V13 = process.argv[2], OLD = process.argv[3];
const S = loadSim(V13), L = loadSim(OLD, { charcollide: false }), out = {};
// (1) root basis vs gkRootMatrix (gk_graph.js loaded into the V1.3 context)
vm.runInContext(fs.readFileSync(path.join(V13, "sandbox/visual/anim3d/gk_graph.js"), "utf8"), S.ctx, { filename: "gk_graph.js" });
const gk = S.g("gkRootMatrix"), M4 = S.g("M4"); let rootErr = 0;
for (let k = 0; k < 200; k++) { const x = 40 + k * 0.37, y = 30 - k * 0.11, f = k * 0.31 - 3, l = [Math.sin(k), Math.cos(2 * k), Math.sin(3 * k + 1)];
  const w = M4.transformPoint(gk(x, y, f), l), pitch = [w[0], -w[2], w[1]], fx = Math.cos(f), fy = Math.sin(f), mine = [x + fx * l[2] - fy * l[0], y + fy * l[2] + fx * l[0], l[1]];
  rootErr = Math.max(rootErr, ...pitch.map((v, i) => Math.abs(v - mine[i]))); }
out.rootBasisMaxErr_vsFloat32Reference = rootErr;   // gkRootMatrix stores its matrix in a Float32Array (M4): float32 ulp at |x| ≈ 50 m ≈ 3.8e-6 m
// the same gkRootMatrix formula evaluated in float64 (its body, Array storage) → the identity itself
const gk64 = (px, py, f) => { const right = [-Math.sin(f), 0, -Math.cos(f)], up = [0, 1, 0], fwd = [Math.cos(f), 0, -Math.sin(f)]; return (l) => [px + right[0] * l[0] + up[0] * l[1] + fwd[0] * l[2], right[1] * l[0] + up[1] * l[1] + fwd[1] * l[2], -py + right[2] * l[0] + up[2] * l[1] + fwd[2] * l[2]]; };
let rootErr64 = 0; for (let k = 0; k < 200; k++) { const x = 40 + k * 0.37, y = 30 - k * 0.11, f = k * 0.31 - 3, l = [Math.sin(k), Math.cos(2 * k), Math.sin(3 * k + 1)], w = gk64(x, y, f)(l), pitch = [w[0], -w[2], w[1]], fx = Math.cos(f), fy = Math.sin(f), mine = [x + fx * l[2] - fy * l[0], y + fy * l[2] + fx * l[0], l[1]]; rootErr64 = Math.max(rootErr64, ...pitch.map((v, i) => Math.abs(v - mine[i]))); }
out.rootBasisMaxErr_float64Formula = rootErr64; out.rootBasisPass = rootErr64 <= 1e-12 && rootErr <= 1e-5;
// (2) legacy path: a non-profiled player (char null / gabriel) is byte-identical to e2c98ec's ptRxBody / ptRxSegments
let legacyDiff = 0, n = 0;
for (const ch of [null, "gabriel"]) for (const v of [0, 0.5, 3, 5.5, 7.5]) for (const ph of [0, 0.13, 0.25, 0.5, 0.71, 0.9]) for (const dt of [0, -1 / 240, -1 / 120, 0.05]) for (const fl of [null, 0.27]) {
  const c = { char: ch, p: { x: 50, y: 34, vx: v * 0.8, vy: v * 0.6, facing: 0.4, legLen: 0.865, gaitPhase: ph } };
  const a = JSON.stringify(S.segs(S.body(c, dt, fl))), b = JSON.stringify(L.segs(L.body(c, dt, fl))); if (a !== b) legacyDiff++; n++; }
out.legacy = { cases: n, differing: legacyDiff };
// (3) determinism + (4) landmarks for the profiled runner
const c = (v, ph) => ({ char: "vinicius", p: { x: 50, y: 34, vx: v, vy: 0, facing: 0, legLen: 0.865, gaitPhase: ph } });
let det = 0; for (const v of [0, 0.3, 3, 7.5]) for (const ph of [0, 0.37, 0.62]) { const a = JSON.stringify(S.segs(S.body(c(v, ph), -1 / 240))), b = JSON.stringify(S.segs(S.body(c(v, ph), -1 / 240))); if (a !== b) det++; }
out.deterministic = det === 0;
const r3 = (p) => p.map(x => +x.toFixed(3)); out.landmarks = {};
for (const [v, ph] of [[0, 0.08], [3, 0.0], [3, 0.25], [3, 0.5], [5.5, 0.4], [7.5, 0.6]]) { const B = S.body(c(v, ph), 0), segs = S.segs(B);
  out.landmarks[`v${v}_ph${ph}`] = { R: Object.fromEntries(["hip", "knee", "ankle", "mtp", "toe"].map(k => [k, r3(B.legs.R[k])])), Lplanted: B.legs.L.planted, Rplanted: B.legs.R.planted,
    segs: segs.filter(s => s.sd === "L").map(s => `${s.name} a${r3(s.a)} b${r3(s.b)} r${(s.ra != null ? s.ra.toFixed(3) + "→" + s.rb.toFixed(3) : s.r.toFixed(3))}`) }; }
console.log(JSON.stringify(out, null, 1));

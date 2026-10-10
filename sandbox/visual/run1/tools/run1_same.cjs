// run1/tools/run1_same.cjs — is the evolving run1_gait.js IDENTICAL to a frozen version where it must be? Bit-level hash of every joint world
// matrix (runtime replay path, 120 Hz over 1.25 s) at constant speeds, plus the maximum joint-position difference; and on a speed ramp that stays
// inside the identity range. RUN-1.3 must equal RUN-1.2 at every speed ≤ 8.0 m/s (and so RUN-1.1 at ≤ 4.0).
// usage: node run1_same.cjs [--vs v12|v11] [--v 3.0,4.0,5.5,7.8,8.0] [--ramp 3,8,1,4]
const { loadRun1 } = require("./run1_load.cjs"), crypto = require("crypto");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const X = loadRun1(), vs = arg("vs", "v12"), F = vs === "v11" ? X.RUN1_V11 : vs === "orig" ? X.RUN1_ORIG : X.RUN1_V12;
const own = () => { const s = Object.assign({}, X.charSkel("vinicius")); delete s._r1body; return s; };
function trace(E, vOf, xOf) { const A = E.r1Make(own()), h = crypto.createHash("sha256"), J = [];
  for (let k = 0; k < 150; k++) { const t = 1 + k / 120, rs = E.r1Replay(A, vOf, null, t), ev = E.r1Evaluate(A, { x: xOf(t), y: 0, heading: 0, v: vOf(t) }); rs();
    for (const m of ev.fk.world) h.update(Buffer.from(new Float32Array(m).buffer)); J.push(ev.fk.joint.map(p => Array.from(p))); }
  return { hash: h.digest("hex").slice(0, 16), J }; }
function cmp(name, vOf, xOf) { const a = trace(X, vOf, xOf), b = trace(F, vOf, xOf); let d = 0;
  for (let k = 0; k < a.J.length; k++) for (let i = 0; i < a.J[k].length; i++) d = Math.max(d, Math.hypot(a.J[k][i][0] - b.J[k][i][0], a.J[k][i][1] - b.J[k][i][1], a.J[k][i][2] - b.J[k][i][2]));
  return `${name}: ${a.hash} / ${b.hash} ${a.hash === b.hash ? "IDENTICAL" : "DIFFERENT (max joint Δ " + (d * 1000).toFixed(3) + " mm)"}`; }
const out = [];
for (const v of arg("v", "3.0,3.5,4.0,4.75,5.5,6.5,7.0,7.5,7.8,7.9,8.0").split(",").map(Number)) out.push(cmp(v.toFixed(2) + " m/s", () => v, (t) => v * t));
const r = arg("ramp", "3,8,1,2.25").split(",").map(Number), [ra, rb, t1, t2] = r, rv = (t) => t < t1 ? ra : t < t2 ? ra + (rb - ra) * (t - t1) / (t2 - t1) : rb;
out.push(cmp(`ramp ${ra} → ${rb} m/s`, rv, (t) => { let s = 0; const n = 200; for (let i = 0; i < n; i++) s += rv((i + 0.5) / n * t) * t / n; return s; }));
console.log(`${X.RUN1.id} vs ${F.RUN1.id} (frozen) — pose hash over 150 replay samples:\n  ` + out.join("\n  "));

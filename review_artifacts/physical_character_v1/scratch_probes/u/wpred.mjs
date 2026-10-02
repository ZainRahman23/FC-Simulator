// pelvis twist prediction over the feedback delay (50 ms) during swings: delayed vs extrapolated vs truth
import { J, body, G2, M } from "../fg/lib.mjs"; const { Q, V } = M;
const { spec, poses } = body("F0"); const out = { view: [], ext10: [], ext20: [], ext40: [] }, outV = { view: [], ext20: [] };
for (const [first, at] of [["R", 0.5], ["L", 0.55], ["R", 0.6]]) {
  const n = 14, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at }, onLoco: (l) => { LOCO = l; } });
  const R_ = r.recs, tF = (R_.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, d = 12; // 50 ms at 240 Hz
  for (let i = 60; i < R_.length; i++) { const q = R_[i]; if (q.t > tF - 0.3 || !q.exec || q.exec.stage !== "SWING") continue;
    const w = (j) => R_[j].states[0].w, v = (j) => R_[j].states[0].v, tw = w(i), vi = i - d;
    const ext = (k) => V.add(w(vi), V.sc(V.sub(w(vi), w(vi - k)), d / k));
    const e = (a) => Math.hypot(...V.sub(a, tw)); out.view.push(e(w(vi))); out.ext10.push(e(ext(2))); out.ext20.push(e(ext(5))); out.ext40.push(e(ext(10)));
    outV.view.push(Math.hypot(...V.sub(v(vi), v(i)))); outV.ext20.push(Math.hypot(...V.sub(V.add(v(vi), V.sc(V.sub(v(vi), v(vi - 5)), d / 5)), v(i)))); } }
const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
console.log("pelvis ω error over the 50 ms delay (rad/s, rms over swings):", Object.entries(out).map(([k, a]) => `${k} ${rms(a).toFixed(2)}`).join(" | "));
console.log("pelvis v error (m/s):", Object.entries(outV).map(([k, a]) => `${k} ${rms(a).toFixed(3)}`).join(" | "));

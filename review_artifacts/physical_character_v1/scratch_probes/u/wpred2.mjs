// pelvis twist predictors over the 50 ms delay during swings (pelvis frame axes: x = right, y = up, z = forward): rms error per axis
import { J, body, G2, M } from "../fg/lib.mjs"; const { Q, V } = M;
const { spec, poses } = body("F0"); const E = {}, add = (k, e) => { (E[k] = E[k] || []).push(e); };
for (const [first, at] of [["R", 0.5], ["L", 0.55], ["R", 0.6], ["L", 0.6]]) {
  const n = 14, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at } });
  const R_ = r.recs, tF = (R_.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, d = 12; const lp = {}; for (const tau of [0.05, 0.1, 0.2, 0.4]) { let x = null; lp[tau] = R_.map(q => { const w = q.states[0].w; x = x ? V.add(x, V.sc(V.sub(w, x), (1 / 240) / tau)) : w.slice(); return x.slice(); }); }
  let vx = null; const vlp = R_.map(q => { const v = q.states[0].v; vx = vx ? V.add(vx, V.sc(V.sub(v, vx), (1 / 240) / 0.1)) : v.slice(); return vx.slice(); });
  for (let i = 60; i < R_.length; i++) { const q = R_[i]; if (q.t > tF - 0.3 || !q.exec || q.exec.stage !== "SWING") continue; const vi = i - d, Rb = R_[vi].states[0].rot, loc = (w) => Q.rot(Q.conj(Rb), w), tw = loc(q.states[0].w);
    const e = (p) => V.sub(loc(p), tw); add("view", e(R_[vi].states[0].w)); add("zero", e([0, 0, 0])); for (const tau of [0.05, 0.1, 0.2, 0.4]) add("lp" + tau, e(lp[tau][vi]));
    add("v_view", V.sub(R_[vi].states[0].v, q.states[0].v)); add("v_lp0.1", V.sub(vlp[vi], q.states[0].v)); add("v_com", V.sub(R_[vi].vcom, q.states[0].v)); add("v_comNow", V.sub(R_[vi].vcom, q.vcom)); } }
const rms = (a, j) => Math.sqrt(a.reduce((s, x) => s + x[j] * x[j], 0) / a.length);
for (const [k, a] of Object.entries(E)) console.log(k.padEnd(9), [0, 1, 2].map(j => rms(a, j).toFixed(3)).join("  "), "  |  total", Math.sqrt(a.reduce((s, x) => s + V.dot(x, x), 0) / a.length).toFixed(3));

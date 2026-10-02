// pelvis angular velocity (pelvis frame) vs the swing's COMMAND phase (real-time aligned): how stereotyped is it?
import { J, body, G2, M } from "../fg/lib.mjs"; const { Q, V } = M;
const { spec, poses } = body("F0"); const pts = [];
for (const [first, at] of [["R", 0.5], ["L", 0.55], ["R", 0.6], ["L", 0.6], ["R", 0.55], ["L", 0.5]]) {
  const n = 14, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at } });
  const R_ = r.recs, tF = (R_.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, d = 12;
  for (let i = 60; i < R_.length - d; i++) { const q = R_[i]; if (q.t > tF - 0.3 || !q.exec || q.exec.stage !== "SWING" || q.exec.kind !== "rhythmic") continue; const sgn = q.exec.sw === "R" ? 1 : -1;
    // the command applied at record i+d was computed from view i: its phase = q.exec.u (the executor's u at view time); truth at i+d
    const qr = R_[i + d], loc = Q.rot(Q.conj(qr.states[0].rot), qr.states[0].w), locV = Q.rot(Q.conj(q.states[0].rot), q.states[0].w);
    pts.push({ u: q.exec.u, w: [loc[0], loc[1] * sgn, loc[2] * sgn], wv: [locV[0], locV[1] * sgn, locV[2] * sgn] }); } }
const bins = 10, B = Array.from({ length: bins }, () => []); for (const p of pts) B[Math.min(bins - 1, Math.floor(p.u * bins))].push(p);
const mean = (a, f) => a.reduce((s, x) => s + f(x), 0) / a.length;
console.log("u bin | n | pelvis ω_true (pitch, yaw·side, roll·side) mean ± sd (rad/s) | ω_view mean");
let tot = [0, 0, 0], res = [0, 0, 0], N = 0;
for (let b = 0; b < bins; b++) { const a = B[b]; if (!a.length) continue; const m = [0, 1, 2].map(j => mean(a, p => p.w[j])), s = [0, 1, 2].map(j => Math.sqrt(mean(a, p => (p.w[j] - m[j]) ** 2))), mv = [0, 1, 2].map(j => mean(a, p => p.wv[j]));
  for (const p of a) for (let j = 0; j < 3; j++) { res[j] += (p.w[j] - m[j]) ** 2; } N += a.length;
  console.log(`${(b / bins).toFixed(1)} | ${String(a.length).padStart(4)} | ${m.map((v, j) => `${v.toFixed(2).padStart(5)}±${s[j].toFixed(2)}`).join("  ")} | ${mv.map(v => v.toFixed(2).padStart(5)).join(" ")}`); }
const gm = [0, 1, 2].map(j => mean(pts, p => p.w[j])); for (const p of pts) for (let j = 0; j < 3; j++) tot[j] += (p.w[j] - gm[j]) ** 2;
const prof = []; for (let b = 0; b < bins; b++) { const a = B[b]; prof.push(a.length ? [0, 1, 2].map(j => +mean(a, p => p.w[j]).toFixed(3)) : [0, 0, 0]); } console.log("PROFILE", JSON.stringify(prof));
console.log("variance explained by the phase profile:", [0, 1, 2].map(j => (1 - res[j] / tot[j]).toFixed(2)).join(" "), " | residual rms", [0, 1, 2].map(j => Math.sqrt(res[j] / N).toFixed(2)).join(" "));

// BALANCE-2 P8 DIAGNOSTIC (post-hoc): WHERE the post-push AP COM offset lives. For B2M back.small on C3 (as frozen; and noise off / all controller
// integrals held from onset, to expose the static equilibrium shift), at chosen times: each body group's contribution to the AP COM offset
// (Σ m_i·Δx_i / M, push − twin), the joint-angle offsets (anatomical sagittal axes), and each segment's pitch offset in space.
// usage (worktree root): node .../p8_segments.mjs --variant C3|noNoise_holdAllI|hatPivot_noNoise_holdAllI --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { B2M } = await import(RA + "balance2/scripts/b2_qualify.mjs");
const { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs"), PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { Q } = PL, SPEC = PL.SPEC_R(), J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA)));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, BODY = J("balance1/params/B1_BODY.json"), C3P = J("balance2/c3/params/C3.json"), ON = B2M.onset;
class Hold extends C3Controller { constructor(p, hold) { super(p); this.hold = hold; }
  step(n, st, ev) { if (!(this.hold && n >= ON)) return super.step(n, st, ev); const s = { g: Object.fromEntries(Object.entries(this.grp).map(([k, g]) => [k, g.I ? g.I.slice() : null])), ci: this.ci.slice(), ciH: this.ciH ? this.ciH.slice() : null, sup: this.supI, ap: this.ciAP, aph: this.ciAPH };
    const out = super.step(n, st, ev); for (const [k, g] of Object.entries(this.grp)) if (s.g[k]) g.I = s.g[k]; this.ci = s.ci; if (s.ciH) this.ciH = s.ciH; this.supI = s.sup; this.ciAP = s.ap; this.ciAPH = s.aph; return out; } }
const nn = { ...C3P, noise: { ...C3P.noise, cv: 0 } }, V = arg("variant", "C3");
const mk = { C3: () => new C3Controller(C3P), noNoise_holdAllI: () => new Hold(nn, true), hatPivot_noNoise_holdAllI: () => new Hold({ ...nn, b2: { ...nn.b2, hatMap: "pivot" } }, true), hatPivot: () => new C3Controller({ ...C3P, b2: { ...C3P.b2, hatMap: "pivot" } }) }[V];
const base = await runOne({ law: "M1B", params: BODY, ctrl: mk, steps: ON + B2M.window }), o = await runOne({ law: "M1B", params: BODY, ctrl: mk, steps: ON + B2M.window, perturb: BT.pushJob("back", B2M.J.back.small, ON, B2M.pulse) });
const Bd = SPEC.bodies, M = Bd.reduce((s, b) => s + b.mass, 0), grp = { feet: /foot/, shanks: /shank/, thighs: /thigh/, pelvis: /^pelvis$/, abdomen: /abdomen/, thorax: /thorax/, head: /head/, arms: /Arm|forearm|hand/ };
const gOf = (n) => Object.keys(grp).find(g => grp[g].test(n)) || "other", R2D = 180 / Math.PI, pitch = (r, i) => { const f = Q.rot(r.S[i].rot, [0, 1, 0]); return Math.atan2(f[0], f[1]) * R2D; };
const JN = ["ankle_L", "ankle_R", "knee_L", "knee_R", "hip_L", "hip_R", "lumbar", "thoracic", "neck", "shoulder_L", "shoulder_R", "elbow_L", "elbow_R"].map(n => [n, SPEC.joints.findIndex(j => j.name === n)]).filter(([, k]) => k >= 0);
const at = (t) => { const q = ON + Math.round(t * 240), a = base.recs[q], b = o.recs[q], contrib = {}; Bd.forEach((bb, i) => { const g = gOf(bb.name); contrib[g] = (contrib[g] || 0) + bb.mass * (b.S[i].pos[0] + 0 - a.S[i].pos[0]) / M * 1000; });
  const segPitch = Object.fromEntries(["pelvis", "abdomen", "thorax", "head", "thigh_L", "shank_L", "upperArm_L", "forearm_L"].map(n => [n, Bd.findIndex(b => b.name === n)]).filter(([, i]) => i >= 0).map(([n, i]) => [n, +(pitch(b, i) - pitch(a, i)).toFixed(3)]));
  const ang = Object.fromEntries(JN.map(([n, k]) => [n, [0, 1, 2].map(i => +((b.chars.runner.th[k][i] - a.chars.runner.th[k][i]) * R2D).toFixed(3))]));
  return { t, comMm: +((b.chars.runner.com[0] - a.chars.runner.com[0]) * 1000).toFixed(2), contribMm: Object.fromEntries(Object.entries(contrib).map(([k, v]) => [k, +v.toFixed(2)])), segPitchDeg: segPitch, jointDeg: ang }; };
const out = { variant: V, note: "POST-HOC DIAGNOSTIC (B2M back.small); body-origin positions used for the per-group COM contribution (approximate: origin, not segment COM)", times: [0.3, 1.0, 2.0, 2.9, 3.5, 3.99].map(at) };
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); for (const r of out.times) console.log(V, "t", r.t, "ΔCOM", r.comMm, "contrib", JSON.stringify(r.contribMm), "\n    pitch", JSON.stringify(r.segPitchDeg), "\n    joints(sagittal idx1)", JSON.stringify(Object.fromEntries(Object.entries(r.jointDeg).map(([k, v]) => [k, v[1]]))));

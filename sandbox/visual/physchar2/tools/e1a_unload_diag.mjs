// ═══ physchar2/tools/e1a_unload_diag.mjs — DIAGNOSTIC of the E1a failure (e1a/official: every run timed out at the preregistered UNLOAD step).
// NOT E1a and no lift: the E1a pre-lift protocol only (settle; pelvis drop t0 1 s, 2 s, min-jerk; stance share 0.5 → 1.0 over 3–7 s, supervised;
// stop at 9.5 s), with ONE factor varied per run to find what holds the to-be-lifted foot's sensed load above the lifecycle's release threshold
// (loadOff = 1 % BW). Nothing here is a candidate configuration; no result is used to change E1a.
// Reports, over 7–9 s: the left foot's sensed load (N, % BW), its lifecycle state / transitions; at 8.5 s: left-leg sagittal joint torques —
// applied actuator (from the actuator impulses) and passive (the passive layer's generalised torque) — and joint angles; the left foot's CoP
// offset from the ankle.
// usage: node tools/e1a_unload_diag.mjs [--human=V2-REF] [--drop=0.025] [--knee=v2k|old] [--k=0.13] [--ref=1] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { setAnkleNeutralKOverride, ankleNeutralKPerDeg } from "../spec/v2_joints.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), DROP = +arg("drop", 0.025), KNEE = arg("knee", "v2k"), K = +arg("k", 0.13), REF = arg("ref", "1") === "1", OUT = arg("out", "");
setAnkleNeutralKOverride(K);
const seg = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * u * u * u * (10 - 15 * u + 6 * u * u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
const lam = (t) => lam.d(t)[0]; lam.d = (t) => (t <= 3 ? [0.5, 0, 0] : seg(t, 3, 4, 0.5, 1.0));   // λ_R (right stance; left foot to be lifted)
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), def = { ...g3Def("U:R"), key: "E1a-unload-diag", lam, supervise: {}, holds: [], seconds: 9.5, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ...(REF ? { ikRefTwist: true } : {}), lifecycle: true, pelvisDrop: { t0: 1, dur: 2, dz: DROP } }, passiveOpts: { kneeModel: KNEE === "v2k" ? "v2k" : null } });
if ((KNEE === "v2k") !== s.P.kneeIsV2K || ankleNeutralKPerDeg() !== K) throw new Error("configuration");
const JI = (n) => spec.joints.findIndex(j => j.name === n), LEG = ["hip_L", "knee_L", "ankle_L"].map(JI), fL = spec.bodies.findIndex(b => b.name === "foot_L"), W = s.ctrl.M * 9.81;
const fz = [], states = new Set(), series = [], pel = spec.bodies.findIndex(b => b.name === "pelvis"); let snap = null;
while (s.tick()) { const t = s.n * s.dt, lc = s.ctrl.lc.feet[0];
  if (t >= 7 && t < 9) { fz.push(s.ctrl.sense.Fz[0]); states.add(lc.state); }
  if (s.n % 6 === 0 && t >= 2.5) series.push({ t: +t.toFixed(3), FzL: +s.ctrl.sense.Fz[0].toFixed(3), st: lc.state, s: +lc.s.toFixed(3), lam: +s.ctrl.info.lam.toFixed(4), pelTargetY: s.ctrl.pelHT, pelY: s.st[pel].pos[1], ikErrL: s.ctrl.info.ikRes ? s.ctrl.info.ikRes[0] : null, kneeL: s.P.anat(s.P.jd[LEG[1]], s.up.ev.qs[LEG[1]], "flex") });
  if (!snap && t >= 8.5) { const qs = s.up.ev.qs, tauA = {}; for (const r of s.actRes || []) tauA[r.k * 3 + r.i] = r.tau; const pr = s.probeRows[0], ank = s.st[fL].pos;
    snap = { t, joints: LEG.map(k => ({ joint: spec.joints[k].name, angles: Object.fromEntries(["x", "y", "z"].map(a => spec.joints[k].def.axes[a]).filter(Boolean).map(x => [x.key, s.P.anat(s.P.jd[k], qs[k], x.key)])),
      tauAct: [0, 1, 2].map(i => tauA[k * 3 + i] ?? null), tauPas: s.up.joints[k] ? s.up.joints[k].tau.slice() : null })), copOffsetMm: pr && pr.cop ? [(pr.cop[0] - ank[0]) * 1000, (pr.cop[2] - ank[2]) * 1000] : null, JyN: pr ? pr.JyN : null, lcState: lc.state, s: lc.s }; } }
const mn = Math.min(...fz), mean = fz.reduce((a, x) => a + x, 0) / fz.length, out = { human: HUMAN, drop: DROP, knee: KNEE, k: K, ref: REF, W, fzMinN: mn, fzMeanN: mean, fzMinPct: 100 * mn / W, released: [...states].some(x => x !== "SUPPORT"), states: [...states], firstRelease: (series.find(x => x.st !== "SUPPORT") || {}).t ?? null, snap, series };
s.destroy(); if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
const f = (x, d = 2) => (x == null ? "—" : x.toFixed(d));
console.log(`${HUMAN} drop ${(DROP * 100).toFixed(1)} cm knee ${KNEE} k ${K} ref ${REF}: left-foot sensed load 7–9 s min ${f(mn)} N (${f(100 * mn / W, 3)} % BW), mean ${f(mean)} N; release threshold ${f(0.01 * W)} N; lifecycle ${[...states].join("/")}${out.released ? " (RELEASED)" : ""} | 8.5 s: ` +
  snap.joints.map(j => `${j.joint} ${Object.entries(j.angles).map(([k2, v]) => `${k2} ${f(v, 1)}°`).join(" ")} τ_act [${j.tauAct.map(v => f(v)).join(", ")}] τ_pas [${(j.tauPas || []).map(v => f(v)).join(", ")}]`).join(" | ") + ` | CoP − ankle (x, z) ${snap.copOffsetMm ? snap.copOffsetMm.map(v => f(v, 1)).join(", ") : "—"} mm`);

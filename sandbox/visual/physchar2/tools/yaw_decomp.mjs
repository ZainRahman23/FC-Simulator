// ═══ physchar2/tools/yaw_decomp.mjs — corrected knee qualification KV10: WHOLE-LEG YAW DECOMPOSITION (diagnostic; the observability requirement)
// review_artifacts/physical_character_v2/knee_correction/KNEE_CORRECTION_PREREG.md. Scenarios (G3 controller, the gate's own ledgered disturbances):
//   A  bilateral quiet stance (G3 T0), sustained pelvis yaw torque 2 N·m over 2–8 s (12 N·m·s), released; 16 s (the twist battery's SB)
//   B  single support on the lifecycle external-lift harness (G3 U:R, 30 N lift on the left shank 7.0–8.5 s, planned pelvis drop 2.5 cm over 1–3 s)
//      with a 0.5 N·m·s pelvis yaw impulse at 7.3 s while the left foot is airborne; 18 s
// Per stance leg (A: both; B: right), segment HEADINGS (horizontal projection of each body's anterior axis) of foot, shank, thigh, pelvis, thorax;
// contributions to pelvis yaw by telescoping: ground = Δψ_foot, ankle = Δ(ψ_shank − ψ_foot), knee = Δ(ψ_thigh − ψ_shank), hip = Δ(ψ_pelvis − ψ_thigh),
// upper body = Δ(ψ_thorax − ψ_pelvis). Joint-coordinate cross-check (closure): Δψ_pelvis vs Δψ_foot + Σ c_j·Δθ_j (ankle ab/adduction, knee axial,
// hip rotation), c_j = ∂(heading difference)/∂θ_j measured at the analysis-window start pose (also reported: at the initial stance pose). Range use: each element's anatomical value vs its passive
// soft (zero-torque) range and calibrated / hard bound; foot slip and foot yaw.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/yaw_decomp.mjs --scen=A|B [--human=V2-REF] [--policy=current|reference] [--model=v2k|old] [--stand=<json>] [--out=<json>]
//   --stand: extra controller options merged last (close-decisions stage; e.g. {"lifecycle":true} = the adopted E1a configuration in scenario A too)
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { ankleNeutralKPerDeg, anatomicalAngles } from "../spec/v2_joints.js"; import { posedBodies } from "../spec/v2_pose.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const SC = arg("scen", "A"), HUMAN = arg("human", "V2-REF"), POLICY = arg("policy", "reference"), MODEL = arg("model", "v2k"), OUT = arg("out", ""), D = 180 / Math.PI;
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), bi = (n) => spec.bodies.findIndex(b => b.name === n), ji = (n) => spec.joints.findIndex(j => j.name === n);
const def = SC === "A" ? { ...g3Def("T0"), seconds: 16, torque: { t0: 2, dur: 6, H: [0, 12, 0], body: "pelvis" } } : { ...g3Def("U:R"), supervise: {}, seconds: 18, torque: { t0: 7.3, dur: 0.1, H: [0, 0.5, 0], body: "pelvis" } };
const stand = { ...(POLICY === "reference" ? { ikRefTwist: true } : {}), ...(SC === "B" ? { lifecycle: true, pelvisDrop: { t0: 1, dur: 2, dz: 0.025 } } : {}), ...JSON.parse(arg("stand", "{}")) };
const s = new G3Sim(J, spec, def, { stand, passiveOpts: { kneeModel: MODEL === "v2k" ? "v2k" : null } }); if ((MODEL === "v2k") !== s.P.kneeIsV2K) throw new Error("model selection");
if (SC === "B") { const sh = bi("shank_L"), base = s._disturb.bind(s);   // the boundary-probe lift (ledgered as an external force)
  s._disturb = function () { const out = base(), t = this.n * this.dt, f = t < 7.0 ? 0 : t < 7.2 ? (t - 7.0) / 0.2 : t < 7.5 ? 1 : t < 8.5 ? 1 - (t - 7.5) / 1.0 : 0;
    if (f > 0) { const Fv = [0, 30 * f, 0], at = this.st[sh].com; this.w.addForceAt(sh, Fv, at); out.F = V.add(out.F, Fv); if (out.body < 0) { out.body = sh; out.at = at; } else out.extra = { body: sh, F: Fv }; } return out; }; }
const SIDES = SC === "A" ? ["L", "R"] : ["R"], SEG = (sd) => ["foot_" + sd, "shank_" + sd, "thigh_" + sd, "pelvis", "thorax"].map(bi);
const heading = (st, b) => { const f = Q.rot(st[b].rot, [0, 0, 1]); return Math.atan2(f[0], f[2]) * D; };
const wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
const JN = (sd) => ({ ankle: ji("ankle_" + sd), knee: ji("knee_" + sd), hip: ji("hip_" + sd) }), KEY = { ankle: "fabd", knee: "rot", hip: "rot" };
const anat = (k, key) => s.P.anat(s.P.jd[k], s.up.ev.qs[k], key);
const axisOf = (k, key) => s.P.jd[k].axes.findIndex(a => a && a.key === key);
// c_j at the initial stance pose: heading change of (parent − child) per +1° of the anatomical coordinate
const cAt = (base, prot) => { const c = {};
  for (const sd of SIDES) { c[sd] = {}; const segs = SEG(sd);
    for (const [jn, pair] of [["ankle", [1, 0]], ["knee", [2, 1]], ["hip", [3, 2]]]) { const name = jn + "_" + sd, a0 = { ...base, [name]: { ...(base[name] || {}) } }, a1 = { ...base, [name]: { ...(base[name] || {}), [KEY[jn]]: ((base[name] || {})[KEY[jn]] || 0) + 1 } };
      const S0 = posedBodies(spec, a0, { pos: null, rot: prot }), S1 = posedBodies(spec, a1, { pos: null, rot: prot }), d0 = wrap(heading(S0, segs[pair[0]]) - heading(S0, segs[pair[1]])), d1 = wrap(heading(S1, segs[pair[0]]) - heading(S1, segs[pair[1]])); c[sd][jn] = wrap(d1 - d0); } }
  return c; };
// c_j at the initial stance pose, and (used for the closure) at the analysis-window start pose (all joints' anatomical angles + the pelvis rotation then)
const cInit = cAt(s.stance.angles, s.stance.pelvisRot || [0, 0, 0, 1]); let cOf = cInit;
const anglesNow = () => Object.fromEntries(spec.joints.map((j, k) => [j.name, anatomicalAngles(j, s.st[j.parentIndex].rot, s.st[j.childIndex].rot)]));
const t0w = SC === "A" ? 1.9 : 7.25, win = SC === "A" ? [2, 8.5] : [7.3, 8.6], acc = {}, rows = [];
let ref = null; const foot0 = {};
while (s.tick()) { const t = s.n * s.dt, st = s.st;
  if (ref == null && t >= t0w) { cOf = cAt(anglesNow(), s.st[bi("pelvis")].rot); ref = {}; for (const sd of SIDES) { const segs = SEG(sd); ref[sd] = { h: segs.map(b => heading(st, b)), q: Object.fromEntries(Object.entries(JN(sd)).map(([n, k]) => [n, anat(k, KEY[n])])) }; foot0[sd] = st[segs[0]].pos.slice(); } }
  if (!ref || t < win[0] || t > win[1]) continue;
  for (const sd of SIDES) { const segs = SEG(sd), h = segs.map(b => heading(st, b)), d = h.map((x, i) => wrap(x - ref[sd].h[i])), jn = JN(sd);
    const con = { ground: d[0], ankle: wrap(d[1] - d[0]), knee: wrap(d[2] - d[1]), hip: wrap(d[3] - d[2]), upper: wrap(d[4] - d[3]), pelvis: d[3] };
    const dq = Object.fromEntries(Object.entries(jn).map(([n, k]) => [n, anat(k, KEY[n]) - ref[sd].q[n]])), lin = d[0] + Object.keys(jn).reduce((a, n) => a + cOf[sd][n] * dq[n], 0), closure = con.pelvis - lin;
    const closureInit = con.pelvis - (d[0] + Object.keys(jn).reduce((a, n) => a + cInit[sd][n] * dq[n], 0));
    const use = Object.fromEntries(Object.entries(jn).map(([n, k]) => { const i = axisOf(k, KEY[n]), T = s.up.ev.per[k].T[i], th = s.up.ev.per[k].th[i], soft = T.soft, hard = T.hard || s.P.jd[k].axes[i].hard; return [n, { outSoft: Math.max(0, th - soft[1], soft[0] - th) * D, outHard: Math.max(0, th - hard[1], hard[0] - th) * D, val: anat(k, KEY[n]) }]; }));
    const slip = Math.hypot(st[segs[0]].pos[0] - foot0[sd][0], st[segs[0]].pos[2] - foot0[sd][2]) * 1000, A = acc[sd] || (acc[sd] = { peak: null, closureMax: 0, slipMax: 0, footYawMax: 0, outSoft: {}, outHard: {} });
    A.closureMax = Math.max(A.closureMax, Math.abs(closure)); A.closureInitMax = Math.max(A.closureInitMax || 0, Math.abs(closureInit)); A.slipMax = Math.max(A.slipMax, slip); A.footYawMax = Math.max(A.footYawMax, Math.abs(d[0]));
    for (const n of Object.keys(use)) { A.outSoft[n] = Math.max(A.outSoft[n] || 0, use[n].outSoft); A.outHard[n] = Math.max(A.outHard[n] || 0, use[n].outHard); }
    if (!A.peak || Math.abs(con.pelvis) > Math.abs(A.peak.con.pelvis)) A.peak = { t, con, dq }; }
  if (s.n % 12 === 0) rows.push({ t, ...Object.fromEntries(SIDES.map(sd => [sd, null])) }); }
const g = s.g3summary(), out = { scen: SC, human: HUMAN, policy: POLICY, model: MODEL, k: ankleNeutralKPerDeg(), outcome: g.outcome, c: cOf, cInit, sides: {} };
for (const sd of SIDES) { const A = acc[sd], p = A.peak.con, legSum = Math.abs(p.ground) + Math.abs(p.ankle) + Math.abs(p.knee) + Math.abs(p.hip);
  out.sides[sd] = { peakT: A.peak.t, peak: p, dq: A.peak.dq, kneeShare: legSum > 1e-9 ? Math.abs(p.knee) / legSum : 0, closureMaxDeg: A.closureMax, closureInitPoseMaxDeg: A.closureInitMax, slipMaxMm: A.slipMax, footYawMaxDeg: A.footYawMax, outSoftDeg: A.outSoft, outHardDeg: A.outHard };
  console.log(`KV10 ${SC} ${HUMAN} ${POLICY} ${MODEL} k ${out.k} leg ${sd}: outcome ${g.outcome}; at peak pelvis yaw ${p.pelvis.toFixed(2)}° (t ${A.peak.t.toFixed(2)} s): ground ${p.ground.toFixed(2)}, ankle ${p.ankle.toFixed(2)}, knee ${p.knee.toFixed(2)}, hip ${p.hip.toFixed(2)}, upper ${p.upper.toFixed(2)}° → knee share ${(100 * out.sides[sd].kneeShare).toFixed(0)} %; closure ≤ ${A.closureMax.toFixed(2)}° (c at the initial stance: ${A.closureInitMax.toFixed(2)}°); slip ${A.slipMax.toFixed(2)} mm, foot yaw ${A.footYawMax.toFixed(2)}°; beyond soft ${JSON.stringify(Object.fromEntries(Object.entries(A.outSoft).map(([n, v]) => [n, +v.toFixed(2)])))} beyond bound ${JSON.stringify(Object.fromEntries(Object.entries(A.outHard).map(([n, v]) => [n, +v.toFixed(2)])))}`); }
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out)); s.destroy();

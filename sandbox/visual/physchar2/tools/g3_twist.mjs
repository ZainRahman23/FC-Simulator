// ═══ physchar2/tools/g3_twist.mjs — G3 resolution D2: causal characterisation of the leg / ankle axial twist (DIAGNOSTIC ONLY) ═════════════
// Per leg and tick: ankle coordinates (foot ab/adduction = axial, passive-only; inversion = the subtalar-like axis; DF), the foot's rotation
// relative to the shank about the shank long axis, shank / foot world yaw, shank tilt, knee and hip axial rotation, passive ankle torque by
// axis (passive layer), active ankle torque by axis (actuators), the ground's vertical moment about the ankle and the free moment at the CoP,
// per-foot CoP and load, pelvis yaw, whole-body yaw momentum. Scenarios: accepted-G2 pushes (bilateral), G3 transfers / pushes, and a
// torque-step probe (constant axial torque on one shank for 1 s, then release) at several support levels → restoring / neutral / unstable.
// No anatomy, tissue, actuator or controller change; external probe torques are diagnostic disturbances (ledgered like the G2 tests).
// usage: node tools/g3_twist.mjs [--human=<body id>] [--out=<json>] → review_artifacts/physical_character_v2/g3/json/g3_twist.json (V2-REF by default; pass --out= for another body)
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def, profile } from "../gates/v2_g3.js"; import { G2Sim, pushScenario } from "../gates/v2_g2.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), OUT = (process.argv.find(a => a.startsWith("--out=")) || "").slice(6) ? path.resolve((process.argv.find(a => a.startsWith("--out=")) || "").slice(6)) : path.join(ROOT, "review_artifacts/physical_character_v2/g3/json/g3_twist.json");
const Jolt = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), HUMAN = (process.argv.find(a => a.startsWith("--human=")) || "--human=V2-REF").slice(8), XST = JSON.parse((process.argv.find(a => a.startsWith("--stand=")) || "--stand={}").slice(8)), XO = Object.keys(XST).length ? { stand: XST } : {},   /* --stand: DIAGNOSTIC controller options */ spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN) || (() => { throw new Error("unknown --human " + HUMAN); })()), D = 180 / Math.PI, G = 9.81;
const B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n), J = (n) => spec.joints.findIndex(j => j.name === n);
const SH = [bi("shank_L"), bi("shank_R")], FT = [bi("foot_L"), bi("foot_R")], PEL = bi("pelvis"), AK = [J("ankle_L"), J("ankle_R")], KN = [J("knee_L"), J("knee_R")], HP = [J("hip_L"), J("hip_R")];
const axI = (k, key) => ["x", "y", "z"].findIndex(a => spec.joints[k].def.axes[a] && spec.joints[k].def.axes[a].key === key);
const rotvec = (q) => { let [x, y, z, w] = q; if (w < 0) { x = -x; y = -y; z = -z; w = -w; } const s = Math.hypot(x, y, z); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, w); return [x / s * a, y / s * a, z / s * a]; };
const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * D; };
const tiltOf = (q) => { const u = Q.rot(q, [0, 1, 0]); return Math.acos(Math.max(-1, Math.min(1, u[1]))) * D; };
function sample(s) { const ev = s.up.ev, P = s.P, st = s.st, pr = s.probeRows, W = (s.ctrl ? s.ctrl.M : 0) * G, Fz = pr ? pr.map(r => Math.max(0, r.JyN)) : [0, 0], sum = Fz[0] + Fz[1];
  const legs = [0, 1].map(n => { const k = AK[n], qa = ev.qs[k], pj = (s.up.joints || []).find(j => j.k === k), act = (s.actRes || []).filter(x => x.k === k);
    const qrel = Q.mul(Q.conj(st[SH[n]].rot), st[FT[n]].rot), r = pr && pr[n], dt = r ? r.dt : s.dt, A = st[FT[n]].pos;
    const Mz = r && r.McA ? r.McA[1] / dt : null, free = r && r.McA && r.cop ? (r.McA[1] + (V.cross(V.sub(A, r.cop), r.Jc))[1]) / dt : null;
    return { fabd: P.anat(P.jd[k], qa, "fabd"), inv: P.anat(P.jd[k], qa, "inv"), df: P.anat(P.jd[k], qa, "df"), qrel, shYaw: yawOf(st[SH[n]].rot), ftYaw: yawOf(st[FT[n]].rot), shTilt: tiltOf(st[SH[n]].rot),
      kneeRot: P.anat(P.jd[KN[n]], ev.qs[KN[n]], "rot"), hipRot: P.anat(P.jd[HP[n]], ev.qs[HP[n]], "rot"),
      passive: pj ? { fabd: pj.tau[axI(k, "fabd")] || 0, df: pj.tau[axI(k, "df")] || 0, inv: pj.tau[axI(k, "inv")] || 0 } : null,
      active: { df: (act.find(x => x.i === axI(k, "df")) || {}).tau ?? null, inv: (act.find(x => x.i === axI(k, "inv")) || {}).tau ?? null },
      Fz: Fz[n], load: sum > 1 ? Fz[n] / sum : 0.5, MzAnkle: Mz, freeMoment: free, touch: r ? r.pieces.filter(p => p.touch).length : null }; });
  return { t: s.n * s.dt, legs, pelYaw: yawOf(st[PEL].rot), Ly: s.last && s.last.L ? s.last.L[1] : null, W }; }
function run(name, mk, every = 12) { const s = mk(); let b = null; const series = [], ex = {}; const keys = ["fabd", "inv", "df", "twistRel", "shYaw", "ftYaw", "shTilt", "kneeRot", "hipRot"];
  const upd = (lab, v) => { ex[lab] = Math.max(ex[lab] || 0, Math.abs(v)); };
  let byLoad = { stance: [], unloading: [] }, maxPass = [0, 0], maxMz = [0, 0], maxFree = [0, 0];
  while (s.tick()) { const t = s.n * s.dt, x = sample(s); if (t >= 0.9 && !b) b = x; if (!b) continue;
    x.legs.forEach((L, n) => { const B0 = b.legs[n], d = { fabd: L.fabd - B0.fabd, inv: L.inv - B0.inv, df: L.df - B0.df, twistRel: rotvec(Q.mul(L.qrel, Q.conj(B0.qrel)))[1] * D, shYaw: L.shYaw - B0.shYaw, ftYaw: L.ftYaw - B0.ftYaw, shTilt: L.shTilt - B0.shTilt, kneeRot: L.kneeRot - B0.kneeRot, hipRot: L.hipRot - B0.hipRot };
      for (const k of keys) upd(k + ["L", "R"][n], d[k]); L.d = d; if (L.passive) maxPass[n] = Math.max(maxPass[n], Math.abs(L.passive.fabd)); if (L.MzAnkle != null && L.Fz > 5) maxMz[n] = Math.max(maxMz[n], Math.abs(L.MzAnkle)); if (L.freeMoment != null && L.Fz > 5) maxFree[n] = Math.max(maxFree[n], Math.abs(L.freeMoment));
      (L.load >= 0.5 ? byLoad.stance : byLoad.unloading).push([L.load, Math.abs(d.fabd)]); });
    upd("pelYaw", x.pelYaw - b.pelYaw);
    if (s.n % every === 0) series.push([+t.toFixed(3), ...x.legs.flatMap(L => [L.d.fabd, L.d.twistRel, L.d.shYaw, L.d.ftYaw, L.d.inv, L.d.hipRot, L.d.kneeRot, L.passive ? L.passive.fabd : null, L.active.inv, L.MzAnkle, L.freeMoment, L.load, L.touch].map(v => (v == null ? null : +(+v).toFixed(4)))), +(x.pelYaw - b.pelYaw).toFixed(3), x.Ly == null ? null : +x.Ly.toFixed(4)]);
    if (s.g2acc && s.g2acc.fallT != null && t > s.g2acc.fallT + 0.5) break; }
  const bins = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.01], loadBins = bins.slice(0, -1).map((lo, i) => { const v = byLoad.stance.filter(([l]) => l >= lo && l < bins[i + 1]).map(x => x[1]); return { load: `${lo}–${bins[i + 1]}`, n: v.length, fabdMaxDeg: v.length ? Math.max(...v) : null }; });
  const ubins = [0, 0.05, 0.15, 0.3, 0.5], uloadBins = ubins.slice(0, -1).map((lo, i) => { const v = byLoad.unloading.filter(([l]) => l >= lo && l < ubins[i + 1]).map(x => x[1]); return { load: `${lo}–${ubins[i + 1]}`, n: v.length, fabdMaxDeg: v.length ? Math.max(...v) : null }; });
  const res = { name, outcome: s.g3summary ? s.g3summary().outcome : s.g2summary().outcome, excursionDeg: Object.fromEntries(Object.entries(ex).map(([k, v]) => [k, +v.toFixed(3)])), passiveFabdMaxNm: maxPass.map(v => +v.toFixed(3)), groundVerticalMomentAtAnkleMaxNm: maxMz.map(v => +v.toFixed(3)), freeMomentMaxNm: maxFree.map(v => +v.toFixed(3)),
    stanceLegFabdByLoad: loadBins, unloadingLegFabdByLoad: uloadBins, series: { columns: ["t", ...["L", "R"].flatMap(sd => ["fabd", "twistRel", "shankYaw", "footYaw", "inv", "hipRot", "kneeRot", "passiveFabdNm", "activeInvNm", "groundMzAnkleNm", "freeMomentNm", "load", "pieces"].map(c => c + "_" + sd)), "pelvisYaw", "Ly"], rows: series } };
  s.destroy(); return res; }
const out = { generated: "tools/g3_twist.mjs", human: HUMAN, stand: XST, date: new Date().toISOString().slice(0, 10), ankleNeutralKPerDeg: (await import("../spec/v2_joints.js")).ankleNeutralKPerDeg(), scenarios: [], probes: [] };
const g2 = (sc) => () => new G2Sim(Jolt, spec, sc === "quiet" ? { title: "Quiet stance (10 s)", seconds: 10 } : pushScenario(sc.split(":")[0], +sc.split(":")[1]), XO);
for (const sc of ["quiet", "R:10", "R:20", "F:15", "L:15"]) out.scenarios.push(run("G2 " + sc, g2(sc)));
for (const k of ["T1", "T5", "U:R", "T7:R:2", "T7:R:1", "T8:hold:R:R:10", "T8:hold:R:F:15"]) out.scenarios.push(run("G3 " + k, () => new G3Sim(Jolt, spec, g3Def(k), XO)));
// torque-step probe: hold at λ (3 s ramp, then still); from t = 6 s a constant axial torque on one shank (world vertical, ≈ the shank long axis)
// for 1 s, then released; the leg's ankle ab/adduction before / during / after → compliance and restoring vs neutral vs unstable
for (const lam of [0.5, 0.7, 0.85, 0.95, 1.0]) for (const side of ["R", "L"]) for (const T of [0.5, 2]) {
  const def = { key: `TWP:${lam}:${side}:${T}`, title: `twist probe λ_R ${lam}, ${T} N·m on shank_${side}`, lam: profile([{ to: lam, dur: 3 }, { dur: 9 }], 0.5, 1.0), holds: [], seconds: 13, torque: { t0: 6, dur: 1, H: [0, T, 0], body: "shank_" + side } };
  const s = new G3Sim(Jolt, spec, def, XO), n = side === "R" ? 1 : 0, at = {}; let peak = 0;
  while (s.tick()) { const t = s.n * s.dt, x = sample(s), L = x.legs[n]; for (const m of [5.95, 6.5, 6.95, 7.5, 8, 9, 10, 12.9]) if (Math.abs(t - m) < s.dt / 2) at[m] = { fabd: L.fabd, hipRot: L.hipRot, kneeRot: L.kneeRot, shYaw: L.shYaw, pelYaw: x.pelYaw, passive: L.passive ? L.passive.fabd : null, load: L.load, Fz: L.Fz };
    if (t >= 6 && at[5.95]) peak = Math.max(peak, Math.abs(L.fabd - at[5.95].fabd)); }
  const b0 = at[5.95], rel = (m) => (at[m] ? +(at[m].fabd - b0.fabd).toFixed(3) : null);
  out.probes.push({ lam, side, torqueNm: T, legLoad: +b0.load.toFixed(3), legFzN: +b0.Fz.toFixed(1), fabdBeforeDeg: +b0.fabd.toFixed(3), dFabdDuringDeg: { "0.5s": rel(6.5), "0.95s": rel(6.95) }, peakDeg: +peak.toFixed(3),
    dFabdAfterReleaseDeg: { "0.5s": rel(7.5), "1s": rel(8), "2s": rel(9), "3s": rel(10), "5.9s": rel(12.9) }, dHipRotDuring: at[6.95] ? +(at[6.95].hipRot - b0.hipRot).toFixed(3) : null, dShankYawDuring: at[6.95] ? +(at[6.95].shYaw - b0.shYaw).toFixed(3) : null, dPelvisYawDuring: at[6.95] ? +(at[6.95].pelYaw - b0.pelYaw).toFixed(3) : null,
    passiveDuringNm: at[6.95] ? at[6.95].passive : null, outcome: s.g3summary().outcome });
  s.destroy(); }
fs.writeFileSync(OUT, JSON.stringify(out)); console.log("→ " + path.relative(ROOT, OUT));

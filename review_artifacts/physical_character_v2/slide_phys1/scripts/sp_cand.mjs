// SLIDE-PHYS-1 candidates (every generation is kept here, unchanged once run; successors are new entries).
// Conventions: travel +z; fold (plant) leg = L (−x side), tackling leg = R; anatomical degrees (V2 keys); t = 0 at the plant-foot touchdown.
export const ENTRY_RUN6 = { id: "E-RUN6", note: "plant-foot (L) touchdown of a 6.0 m/s run: swing leg R in early swing, arms counter-phase, late-flight vertical velocity",
  vRoot: [0, -0.45, 6.0], pelvis: { pitchDeg: 8, rollDeg: 0, yawDeg: 0 }, pelvisW: [0, 0, 0],
  anat: { lumbar: { flex: 4 }, thoracic: { flex: 3 }, neck: { flex: -8 },
    hip_L: { flex: 26, abd: 3, rot: 0 }, knee_L: { flex: 16 }, ankle_L: { df: 2 },
    hip_R: { flex: -8, abd: 0, rot: 0 }, knee_R: { flex: 95 }, ankle_R: { df: -25 },
    shoulder_L: { flex: -35, abd: 12 }, elbow_L: { flex: 95 }, shoulder_R: { flex: 45, abd: 12 }, elbow_R: { flex: 95 } },
  rate: { hip_L: { flex: -330 }, knee_L: { flex: 120 }, ankle_L: { df: 60 }, hip_R: { flex: 520 }, knee_R: { flex: 40 }, shoulder_L: { flex: 60 }, shoulder_R: { flex: -60 } } };

// G1 — joint-space choreography only (no root / COM objective): the "per-joint tracking alone" baseline of the new choreography
export const G1 = { id: "G1", entry: ENTRY_RUN6, steps: 420, lead: 0.04,
  gains: { default: { f: 3.0, zeta: 0.9 }, hip: { f: 3.5, zeta: 0.9 }, knee: { f: 3.5, zeta: 0.9 }, ankle: { f: 3.0, zeta: 0.9 }, neck: { f: 2.5, zeta: 0.9 } },
  chor: { name: "G1 bent-leg slide (joint space)", tracks: {
    "hip_L.flex": [[0, 26], [0.06, 18], [0.14, 25], [0.24, 45], [0.4, 50], [1.6, 45]], "hip_L.abd": [[0, 3], [0.1, 10], [0.25, 25], [0.5, 20]], "hip_L.rot": [[0, 0], [0.1, -15], [0.25, -35], [0.5, -30]],
    "knee_L.flex": [[0, 16], [0.06, 40], [0.14, 85], [0.24, 120], [0.4, 130], [1.6, 120]], "ankle_L.df": [[0, 2], [0.08, 15], [0.18, -10], [0.3, -35]], "ankle_L.inv": [[0, 0], [0.1, 15], [0.2, 25], [0.4, 15]],
    "hip_R.flex": [[0, -8], [0.06, 15], [0.16, 55], [0.26, 75], [0.6, 70], [1.6, 55]], "hip_R.abd": [[0, 0], [0.2, 8], [0.5, 10]], "hip_R.rot": [[0, 0], [0.3, 10]],
    "knee_R.flex": [[0, 95], [0.06, 100], [0.14, 85], [0.22, 35], [0.3, 12], [0.8, 18]], "ankle_R.df": [[0, -25], [0.15, -10], [0.3, 5], [0.8, 0]],
    "lumbar.flex": [[0, 4], [0.1, 0], [0.22, -12], [0.4, -15], [1.0, -5]], "lumbar.lat": [[0, 0], [0.15, 6], [0.35, 12], [1.0, 8]], "lumbar.rot": [[0, 0], [0.3, 6]],
    "thoracic.flex": [[0, 3], [0.22, -8], [0.4, -8], [1.0, 0]], "thoracic.lat": [[0, 0], [0.3, 8]], "neck.flex": [[0, -8], [0.25, 15], [0.5, 20]],
    "shoulder_L.flex": [[0, -35], [0.1, -45], [0.22, -30], [0.4, -20]], "shoulder_L.abd": [[0, 12], [0.15, 35], [0.3, 45]], "elbow_L.flex": [[0, 95], [0.2, 45], [0.35, 25]],
    "shoulder_R.flex": [[0, 45], [0.12, 80], [0.3, 110], [0.8, 90]], "shoulder_R.abd": [[0, 12], [0.2, 30], [0.5, 35]], "elbow_R.flex": [[0, 95], [0.25, 40], [0.8, 50]] } } };

// ── G2: the same kind of joint-space choreography + the support-chain objectives during the plant stance (root / COM physicalization) ──
const CT = await import(new URL("./sp_ctrl.mjs", import.meta.url).href), VF = await import(new URL("./sp_vf.mjs", import.meta.url).href), CH = await import(new URL("./sp_chor.mjs", import.meta.url).href);
const EN = await import(new URL("./sp_entry.mjs", import.meta.url).href);
export const herm = (t0, y0, v0, t1, y1, v1) => (t) => { const tc = Math.max(t0, Math.min(t1, t)), h = t1 - t0, s = (tc - t0) / h, s2 = s * s, s3 = s2 * s;
  const y = (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * h * v0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * h * v1, v = ((6 * s2 - 6 * s) * y0 + (3 * s2 - 4 * s + 1) * h * v0 + (-6 * s2 + 6 * s) * y1 + (3 * s2 - 2 * s) * h * v1) / h;
  const a = ((12 * s - 6) * y0 + (6 * s - 4) * h * v0 + (-12 * s + 6) * y1 + (6 * s - 2) * h * v1) / (h * h); return { y, vy: v, ay: t > t1 || t < t0 ? 0 : a }; };
export function pelvisPlan(tracks) { const P = { pitch: CH.pchip(tracks.pitch), roll: CH.pchip(tracks.roll), yaw: CH.pchip(tracks.yaw) };
  const R = (t) => EN.pelvisRot({ pitchDeg: P.pitch.f(t), rollDeg: P.roll.f(t), yawDeg: P.yaw.f(t) });
  return (t) => { const h = 1e-3, Ra = R(t - h), Rb = R(t + h), dq0 = Q.norm(Q.mul(Rb, Q.conj(Ra))), dq = dq0[3] < 0 ? dq0.map(x => -x) : dq0, s = Math.hypot(dq[0], dq[1], dq[2]), a = 2 * Math.atan2(s, dq[3]);
    return { R: R(t), w: s > 1e-12 ? [dq[0] / s * a / (2 * h), dq[1] / s * a / (2 * h), dq[2] / s * a / (2 * h)] : [0, 0, 0] }; }; }
const { V, Q } = await import(new URL("./sp_lib.mjs", import.meta.url).href);
export const ENTRY_PLANT6 = { id: "E-PLANT6", note: "plant-foot (L) touchdown of a 6.0 m/s run with the plant foot reaching ahead of the COM (the committed last stride): heel-first, swing leg R early swing, slight leftward drift",
  vRoot: [-0.3, -0.3, 6.0], pelvis: { pitchDeg: 4, rollDeg: 0, yawDeg: 0 }, pelvisW: [0, 0, 0],
  anat: { lumbar: { flex: 3 }, thoracic: { flex: 2 }, neck: { flex: -6 },
    hip_L: { flex: 34, abd: 0, rot: 0 }, knee_L: { flex: 10 }, ankle_L: { df: -8 },
    hip_R: { flex: -8, abd: 0, rot: 0 }, knee_R: { flex: 95 }, ankle_R: { df: -25 },
    shoulder_L: { flex: -35, abd: 12 }, elbow_L: { flex: 95 }, shoulder_R: { flex: 45, abd: 12 }, elbow_R: { flex: 95 } },
  rate: { hip_L: { flex: -300 }, knee_L: { flex: 80 }, ankle_L: { df: 80 }, hip_R: { flex: 480 }, knee_R: { flex: 60 }, shoulder_L: { flex: 60 }, shoulder_R: { flex: -60 } } };
const TR_G2 = {
  "hip_L.flex": [[0, 34], [0.08, 22], [0.17, 25], [0.3, 45], [0.6, 50], [1.6, 45]], "hip_L.abd": [[0, 0], [0.12, 8], [0.25, 22], [0.6, 18]], "hip_L.rot": [[0, 0], [0.12, -12], [0.25, -30], [0.6, -28]],
  "knee_L.flex": [[0, 10], [0.06, 35], [0.12, 70], [0.17, 100], [0.26, 125], [0.5, 130], [1.6, 120]], "ankle_L.df": [[0, -8], [0.06, 5], [0.12, 18], [0.2, 0], [0.3, -30]], "ankle_L.inv": [[0, 0], [0.12, 12], [0.2, 25], [0.4, 15]],
  "hip_R.flex": [[0, -8], [0.08, 20], [0.16, 50], [0.24, 72], [0.6, 68], [1.6, 55]], "hip_R.abd": [[0, 0], [0.2, 8], [0.5, 10]], "hip_R.rot": [[0, 0], [0.3, 10]],
  "knee_R.flex": [[0, 95], [0.08, 105], [0.14, 100], [0.22, 50], [0.3, 15], [0.8, 18]], "ankle_R.df": [[0, -25], [0.15, -15], [0.3, 5], [0.8, 0]],
  "lumbar.flex": [[0, 3], [0.12, -2], [0.25, -10], [0.5, -12], [1.2, -4]], "lumbar.lat": [[0, 0], [0.15, 5], [0.35, 12], [1.2, 8]], "lumbar.rot": [[0, 0], [0.3, 6]],
  "thoracic.flex": [[0, 2], [0.25, -6], [1.2, 0]], "thoracic.lat": [[0, 0], [0.3, 6]], "neck.flex": [[0, -6], [0.25, 10], [0.5, 18]],
  "shoulder_L.flex": [[0, -35], [0.1, -45], [0.22, -30], [0.4, -20]], "shoulder_L.abd": [[0, 12], [0.15, 35], [0.3, 45]], "elbow_L.flex": [[0, 95], [0.2, 45], [0.35, 25]],
  "shoulder_R.flex": [[0, 45], [0.12, 80], [0.3, 110], [0.8, 90]], "shoulder_R.abd": [[0, 12], [0.2, 30], [0.5, 35]], "elbow_R.flex": [[0, 95], [0.25, 40], [0.8, 50]] };
export const PEL_G2 = { pitch: [[0, 4], [0.08, 0], [0.17, -14], [0.3, -28], [0.6, -30]], roll: [[0, 0], [0.1, 6], [0.17, 18], [0.3, 45], [0.6, 60]], yaw: [[0, 0], [0.17, 8], [0.4, 15]] };
export const G2 = { id: "G2", entry: ENTRY_PLANT6, steps: 420, lead: 0.04, gains: G1.gains, chor: { name: "G2 bent-leg slide + support-chain objectives", tracks: TR_G2 },
  vfPlan: { side: "L", window: [0, 0.17], ramp: 0.015, comDrop: 0.28, vy1: -1.2, gains: { ky: 355, dy: 34, ko: 1900, do: 240 } },
  makeCtrl(cand, chor, E) { const p = cand.vfPlan, y0 = E.com[1], vy0 = E.comVel[1], hc = herm(0, y0, vy0, p.window[1], y0 - p.comDrop, p.vy1);
    const vf = VF.makeSupportVF({ side: p.side, window: p.window, ramp: p.ramp, com: (t) => hc(t), pelvis: pelvisPlan(cand.pelvis || PEL_G2), gains: p.gains });
    return new CT.SlideTracker({ chor, lead: cand.lead, gains: cand.gains, authority: cand.authority, yield: cand.yield, vf }); } };

// ── G3: G2 diagnosed (infeasible COM plan → zero support; swing foot strike; saturated orientation torques). Feasible plan: descent 0.10 m over a
// 0.12 s plant (a_y ≥ −0.5 g), plant reaching further ahead, earlier swing-hip flexion with the knee held flexed (clearance), shorter windows ──
export const ENTRY_PLANT6B = { ...ENTRY_PLANT6, id: "E-PLANT6B", vRoot: [-0.3, -0.2, 6.0], pelvis: { pitchDeg: 2, rollDeg: 0, yawDeg: 0 },
  anat: { ...ENTRY_PLANT6.anat, hip_L: { flex: 38, abd: 0, rot: 0 }, knee_L: { flex: 8 }, ankle_L: { df: -10 } } };
const TR_G3 = { ...TR_G2,
  "hip_L.flex": [[0, 38], [0.06, 30], [0.12, 40], [0.2, 58], [0.35, 60], [1.6, 50]], "knee_L.flex": [[0, 8], [0.05, 28], [0.1, 55], [0.16, 95], [0.24, 120], [0.5, 128], [1.6, 120]],
  "ankle_L.df": [[0, -10], [0.05, 2], [0.1, 15], [0.16, 0], [0.26, -30]],
  "hip_R.flex": [[0, -8], [0.06, 25], [0.14, 55], [0.22, 70], [0.6, 68], [1.6, 55]], "knee_R.flex": [[0, 95], [0.06, 108], [0.16, 105], [0.24, 60], [0.32, 18], [0.8, 18]] };
export const PEL_G3 = { pitch: [[0, 2], [0.12, -10], [0.3, -20]], roll: [[0, 0], [0.12, 8], [0.3, 30]], yaw: [[0, 0], [0.3, 8]] };
export const G3 = { ...G2, id: "G3", entry: ENTRY_PLANT6B, chor: { name: "G3 feasible plant", tracks: TR_G3 }, pelvis: PEL_G3,
  vfPlan: { side: "L", window: [0, 0.12], ramp: 0.012, comDrop: 0.10, vy1: -0.9, gains: { ky: 355, dy: 34, ko: 900, do: 120 } } };

// ── G4: G3 diagnosed (the plant leg's stiff joint tracking bounced the body up off the touchdown, so the COM objective asked for no support;
// tackling knee extended too late → boot strike). The support-chain objective governs the plant leg during the plant (its joint tracking at
// α = 0.3), softer COM gains (2 Hz), tackling knee extension starting at 0.10 s ──
const STANCE_J = new Set(["hip_L", "knee_L", "ankle_L"]);
const TR_G4 = { ...TR_G3, "hip_R.flex": [[0, -8], [0.05, 25], [0.12, 58], [0.2, 72], [0.6, 68], [1.6, 55]], "knee_R.flex": [[0, 95], [0.05, 105], [0.1, 100], [0.18, 55], [0.26, 20], [0.8, 18]] };
export const G4 = { ...G3, id: "G4", chor: { name: "G4 plant governed by the support objective", tracks: TR_G4 },
  authority: (t, jn) => (STANCE_J.has(jn) ? (t < 0.12 ? 0.3 : t < 0.16 ? 0.3 + 0.7 * (t - 0.12) / 0.04 : 1) : 1),
  vfPlan: { side: "L", window: [0, 0.12], ramp: 0.012, comDrop: 0.10, vy1: -0.9, gains: { ky: 158, dy: 25, ko: 900, do: 120 } } };

// ── G5: G4 diagnosed — a near-straight plant leg (knee 8°) ahead of the COM at 6 m/s is a strut: the body vaults (vy −0.54 → +0.29 m/s), the
// high-jump take-off mechanism. A slide plant lands with the knee already flexed and yielding: knee 22°, hip 32°, foot slightly less far ahead ──
export const ENTRY_PLANT6C = { ...ENTRY_PLANT6B, id: "E-PLANT6C", anat: { ...ENTRY_PLANT6B.anat, hip_L: { flex: 32, abd: 0, rot: 0 }, knee_L: { flex: 22 }, ankle_L: { df: -6 } },
  rate: { ...ENTRY_PLANT6B.rate, knee_L: { flex: 150 } } };
const TR_G5 = { ...TR_G4, "hip_L.flex": [[0, 32], [0.06, 28], [0.12, 40], [0.2, 58], [0.35, 60], [1.6, 50]], "knee_L.flex": [[0, 22], [0.05, 40], [0.1, 62], [0.16, 95], [0.24, 120], [0.5, 128], [1.6, 120]],
  "ankle_L.df": [[0, -6], [0.05, 5], [0.1, 15], [0.16, 0], [0.26, -30]] };
export const G5 = { ...G4, id: "G5", entry: ENTRY_PLANT6C, chor: { name: "G5 flexed yielding plant", tracks: TR_G5 }, vfPlan: { ...G4.vfPlan, comDrop: 0.12 } };

// ── G6 "feet-first": G5's angular-momentum audit showed the plant contributes ≈ −4 N·m·s (backward) while the tackling boot dragging BEHIND the COM
// added +73 N·m·s forward pitch (the trip that makes the belly-flop). Successor rule: no contact behind the COM before the seat; the tackling leg
// swings forward and extends early so its heel reaches the turf well AHEAD of the COM; the fold leg comes forward after the plant releases, its
// lateral shank landing ahead of the hips; COM objective = constant support fraction κ (feasible by construction) ──
const TR_G6 = { ...TR_G5,
  "hip_R.flex": [[0, -8], [0.06, 22], [0.12, 48], [0.2, 62], [0.4, 58], [1.6, 50]], "knee_R.flex": [[0, 95], [0.05, 92], [0.1, 65], [0.16, 32], [0.22, 12], [0.8, 15]], "ankle_R.df": [[0, -25], [0.1, -5], [0.2, 10], [0.8, 5]],
  "hip_L.flex": [[0, 32], [0.06, 26], [0.12, 22], [0.2, 40], [0.3, 62], [0.5, 60], [1.6, 50]], "knee_L.flex": [[0, 22], [0.06, 42], [0.12, 62], [0.2, 95], [0.3, 120], [0.6, 125], [1.6, 118]],
  "ankle_L.df": [[0, -6], [0.06, 8], [0.12, 12], [0.2, -15], [0.3, -30]],
  "lumbar.flex": [[0, 3], [0.15, 6], [0.3, 0], [0.6, -6], [1.2, -4]] };
export const PEL_G6 = { pitch: [[0, 2], [0.12, -2], [0.3, -15]], roll: [[0, 0], [0.12, 4], [0.3, 25]], yaw: [[0, 0], [0.3, 5]] };
export const G6 = { ...G5, id: "G6", chor: { name: "G6 feet-first", tracks: TR_G6 }, pelvis: PEL_G6,
  vfPlan: { side: "L", window: [0, 0.13], ramp: 0.012, kappa: 0.8, gains: { ky: 158, dy: 25, ko: 600, do: 80 } },
  makeCtrl(cand, chor, E) { const p = cand.vfPlan, y0 = E.com[1], vy0 = E.comVel[1], a = -(1 - p.kappa) * 9.81, plan = (t) => ({ y: y0 + vy0 * t + 0.5 * a * t * t, vy: vy0 + a * t, ay: a });
    const vf = VF.makeSupportVF({ side: p.side, window: p.window, ramp: p.ramp, com: plan, pelvis: pelvisPlan(cand.pelvis), gains: p.gains });
    return new CT.SlideTracker({ chor, lead: cand.lead, gains: cand.gains, authority: cand.authority, yield: cand.yield, vf }); } };

// ── G7: G6 diagnosed — extending the tackling knee while its thigh still pointed down drove the boot into the turf behind the COM at 0.07 s
// (+81 N·m·s forward). Natural swing order: the thigh comes through with the knee folded, the knee extends only once the thigh is forward; the
// body holds height (κ 1.05) until the swing leg is through (0.07 s), then the plant yields (κ 0.6) ──
export const kappaPlan = (y0, vy0, segs) => (t) => { let y = y0, vy = vy0, tp = 0; for (const [t1, k] of segs) { const a = -(1 - k) * 9.81, dt = Math.max(0, Math.min(t, t1) - tp); y += vy * dt + 0.5 * a * dt * dt; vy += a * dt; if (t <= t1) return { y, vy, ay: a }; tp = t1; } return { y, vy, ay: 0 }; };
const TR_G7 = { ...TR_G6,
  "hip_R.flex": [[0, -8], [0.06, 20], [0.12, 45], [0.18, 60], [0.4, 60], [1.6, 50]], "knee_R.flex": [[0, 95], [0.06, 102], [0.11, 96], [0.17, 55], [0.24, 15], [0.8, 15]], "ankle_R.df": [[0, -25], [0.1, -10], [0.2, 10], [0.8, 5]],
  "knee_L.flex": [[0, 22], [0.07, 32], [0.12, 55], [0.2, 95], [0.3, 120], [0.6, 125], [1.6, 118]], "hip_L.flex": [[0, 32], [0.07, 24], [0.13, 22], [0.2, 40], [0.3, 62], [0.5, 60], [1.6, 50]] };
export const G7 = { ...G6, id: "G7", chor: { name: "G7 swing-through then yield", tracks: TR_G7 },
  vfPlan: { side: "L", window: [0, 0.15], ramp: 0.012, kappa: [[0.07, 1.05], [0.15, 0.6]], gains: { ky: 158, dy: 25, ko: 600, do: 80 } },
  makeCtrl(cand, chor, E) { const p = cand.vfPlan, plan = kappaPlan(E.com[1], E.comVel[1], p.kappa);
    const vf = VF.makeSupportVF({ side: p.side, window: p.window, ramp: p.ramp, com: plan, pelvis: pelvisPlan(cand.pelvis), gains: p.gains });
    return new CT.SlideTracker({ chor, lead: cand.lead, gains: cand.gains, authority: cand.authority, yield: cand.yield, vf }); } };

// ── G8 "plant → low push-off → scissor → feet-first": G7 diagnosed — any plant that folds DURING stance at 6 m/s drops the hip onto the swinging
// boot. New structure (the brief's COMMIT → thigh drive → opposite leg sweeps back/down → asymmetric scissor): the plant is a LOWERED running
// stance that pushes off low (knee 22 → 55 → 35°, hip extending to toe-off); in the short flight the tackling leg drives forward and extends
// (heel leading) while the plant leg sweeps back and folds under, the counter-swing keeping the trunk from pitching; landing feet-first.
// TCF-1 on (studs grip only when the sole faces the turf). ──
const TR_G8 = { ...TR_G7,
  "hip_L.flex": [[0, 30], [0.08, 8], [0.16, -14], [0.22, -5], [0.3, 25], [0.45, 45], [1.6, 45]], "knee_L.flex": [[0, 22], [0.07, 52], [0.15, 38], [0.22, 85], [0.3, 120], [0.6, 125], [1.6, 118]],
  "ankle_L.df": [[0, -6], [0.07, 18], [0.15, -15], [0.25, -35]], "ankle_L.inv": [[0, 0], [0.15, 5], [0.3, 20]], "hip_L.rot": [[0, 0], [0.15, -5], [0.3, -30], [0.6, -28]], "hip_L.abd": [[0, 0], [0.15, 4], [0.3, 18], [0.6, 15]],
  "hip_R.flex": [[0, -8], [0.06, 22], [0.12, 45], [0.2, 62], [0.3, 68], [0.6, 62], [1.6, 52]], "knee_R.flex": [[0, 95], [0.06, 102], [0.12, 90], [0.2, 45], [0.28, 12], [0.8, 15]], "ankle_R.df": [[0, -25], [0.12, -5], [0.22, 10], [0.8, 5]],
  "lumbar.flex": [[0, 3], [0.12, 0], [0.25, -8], [0.5, -10], [1.2, -4]] };
export const G8 = { ...G7, id: "G8", chor: { name: "G8 plant, low push-off, scissor, feet-first", tracks: TR_G8 }, soleRule: { studded: 1.2, upper: 0.5 },
  authority: () => 1, pelvis: { pitch: [[0, 2], [0.16, -4], [0.3, -12]], roll: [[0, 0], [0.16, 4], [0.3, 15]], yaw: [[0, 0], [0.3, 5]] },
  vfPlan: { side: "L", window: [0, 0.16], ramp: 0.012, kappa: [[0.08, 1.35], [0.16, 1.05]], gains: { ky: 158, dy: 25, ko: 600, do: 80 } } };

// ── G9: G8 diagnosed (sp footR trace) — the tackling boot's toe caught the turf at 0.13 s: with the shank tilted back (knee 88°) a neutral /
// plantarflexed ankle points the toes down. Swing clearance = deeper knee fold (≥ 112° until the thigh is forward) + DORSIFLEXION (the walking
// toe-clearance mechanism); the plant foot is unloaded at toe-off by plantarflexion + an early knee fold instead of being dragged ──
const TR_G9 = { ...TR_G8,
  "knee_R.flex": [[0, 95], [0.05, 112], [0.12, 115], [0.18, 85], [0.24, 40], [0.3, 12], [0.8, 15]], "ankle_R.df": [[0, -25], [0.06, 8], [0.16, 12], [0.26, 10], [0.8, 5]],
  "hip_R.flex": [[0, -8], [0.06, 22], [0.12, 48], [0.2, 66], [0.3, 70], [0.6, 62], [1.6, 52]],
  "knee_L.flex": [[0, 22], [0.07, 50], [0.13, 42], [0.18, 70], [0.25, 105], [0.35, 122], [0.6, 125], [1.6, 118]], "ankle_L.df": [[0, -6], [0.07, 16], [0.13, -22], [0.2, -30], [0.3, -35]],
  "hip_L.flex": [[0, 30], [0.08, 8], [0.14, -12], [0.2, -4], [0.3, 22], [0.45, 42], [1.6, 45]] };
export const G9 = { ...G8, id: "G9", chor: { name: "G9 swing clearance + plant unload", tracks: TR_G9 } };

// ── G10: G9 diagnosed — the swing knee never reached its fold (94° vs 115°): distal joint feedback at 3.5 Hz on a 0.25 kg·m² shank is ~120 N·m/rad,
// far too weak against the thigh's whip, and M1b's force-development lag forbids much higher feedback gain. Successor: computed-torque control —
// a Newton–Euler feed-forward (motor program) for the free chains (tackling leg always; the plant leg once its foot has left the turf; both arms),
// with the same PD feedback around it. Everything still passes through M1b ──
const ffFree = (from) => (t) => (t < from ? 0 : t < from + 0.03 ? (t - from) / 0.03 : 1);
export const G10 = { ...G9, id: "G10", chor: { name: "G10 = G9 + inverse-dynamics feed-forward on free chains", tracks: TR_G9 },
  ff: [{ chain: ["hip_R", "knee_R", "ankle_R"], weight: () => 1 }, { chain: ["hip_L", "knee_L", "ankle_L"], weight: ffFree(0.16) },
    { chain: ["shoulder_L", "elbow_L"], weight: () => 1 }, { chain: ["shoulder_R", "elbow_R"], weight: () => 1 }],
  makeCtrl(cand, chor, E) { const p = cand.vfPlan, plan = kappaPlan(E.com[1], E.comVel[1], p.kappa);
    const vf = VF.makeSupportVF({ side: p.side, window: p.window, ramp: p.ramp, com: plan, pelvis: pelvisPlan(cand.pelvis), gains: p.gains });
    return new CT.SlideTracker({ chor, lead: cand.lead, gains: cand.gains, authority: cand.authority, yield: cand.yield, vf, ff: cand.ff, couple: cand.couple }); } };

// ── G11: literature (van den Eijnde 2017, the only lab study: approach 4.5–5.0 m/s; free fall → knee impact → hip/thigh → glide) → nominal 5.0 m/s.
// G10 diagnosed — the swing knee cannot be folded beyond its natural dynamics by M1b's knee flexors (97 N·m at 95°); in running the deep swing fold
// is inertial. Entry: the swing knee is already at its mid-swing fold (118°) at the plant touchdown; its extension is the natural delayed whip.
// Feed-forward anticipates the muscle lag (ffLead 0.08 s) while feedback tracks the present target (lead 0.01 s) ──
export const ENTRY_PLANT5 = { id: "E-PLANT5", note: "plant-foot (L) touchdown of a 5.0 m/s run, knee 22° flexed and yielding, the plant foot reaching slightly ahead; the swing leg R at mid-swing (knee 118°, thigh coming through at 450°/s)",
  vRoot: [-0.25, -0.2, 5.0], pelvis: { pitchDeg: 2, rollDeg: 0, yawDeg: 0 }, pelvisW: [0, 0, 0],
  anat: { lumbar: { flex: 3 }, thoracic: { flex: 2 }, neck: { flex: -6 }, hip_L: { flex: 30, abd: 0, rot: 0 }, knee_L: { flex: 22 }, ankle_L: { df: -6 },
    hip_R: { flex: -2, abd: 0, rot: 0 }, knee_R: { flex: 118 }, ankle_R: { df: -5 }, shoulder_L: { flex: -35, abd: 12 }, elbow_L: { flex: 95 }, shoulder_R: { flex: 45, abd: 12 }, elbow_R: { flex: 95 } },
  rate: { hip_L: { flex: -260 }, knee_L: { flex: 150 }, ankle_L: { df: 70 }, hip_R: { flex: 450 }, knee_R: { flex: 0 }, shoulder_L: { flex: 60 }, shoulder_R: { flex: -60 } } };
const TR_G11 = { ...TR_G9,
  "hip_R.flex": [[0, -2], [0.06, 24], [0.12, 46], [0.2, 64], [0.3, 70], [0.6, 62], [1.6, 52]], "knee_R.flex": [[0, 118], [0.06, 120], [0.12, 105], [0.19, 60], [0.26, 22], [0.32, 12], [0.8, 15]], "ankle_R.df": [[0, -5], [0.08, 8], [0.2, 12], [0.8, 5]] };
export const G11 = { ...G10, id: "G11", entry: ENTRY_PLANT5, lead: 0.01, ffLead: 0.08, chor: { name: "G11 5 m/s, natural swing fold, anticipatory feed-forward", tracks: TR_G11 } };

// ── G12 "sliding-in" (van den Eijnde 2017's controlled technique; reference clip 2): G11 diagnosed — at 5 m/s a body that drops while the tackling
// leg swings through lands that boot under the COM, studs down (trip). Instead the plant boot rolls onto its outer edge (inversion + hip external
// rotation + abduction) and, under TCF-1, slides on its upper (μ 0.5) while the plant leg folds under the body; the pelvis rolls toward the fold
// side (raising the tackling hip: swing clearance); the support objective follows the fold leg's lowest body (boot → shank → thigh) for 0.30 s ──
const TR_G12 = { ...TR_G11,
  "hip_L.flex": [[0, 30], [0.1, 24], [0.2, 34], [0.32, 45], [0.6, 48], [1.6, 45]], "hip_L.rot": [[0, 0], [0.08, -15], [0.16, -32], [0.3, -38], [1.6, -30]], "hip_L.abd": [[0, 0], [0.08, 8], [0.18, 22], [0.32, 25], [1.6, 18]],
  "knee_L.flex": [[0, 22], [0.07, 45], [0.14, 80], [0.22, 110], [0.32, 128], [0.6, 130], [1.6, 120]], "ankle_L.df": [[0, -6], [0.07, 5], [0.15, -10], [0.3, -30]], "ankle_L.inv": [[0, 0], [0.06, 15], [0.12, 28], [0.4, 20]] };
export const PEL_G12 = { pitch: [[0, 2], [0.15, -2], [0.3, -12]], roll: [[0, 0], [0.12, 14], [0.22, 30], [0.32, 42]], yaw: [[0, 0], [0.3, 6]] };
export const G12 = { ...G11, id: "G12", chor: { name: "G12 sliding-in bent-leg slide", tracks: TR_G12 }, pelvis: PEL_G12,
  vfPlan: { side: "L", window: [0, 0.3], ramp: 0.012, contactFrom: "lowest", kappa: [[0.08, 1.0], [0.3, 0.8]], gains: { ky: 158, dy: 25, ko: 600, do: 80 } },
  makeCtrl(cand, chor, E) { const p = cand.vfPlan, plan = kappaPlan(E.com[1], E.comVel[1], p.kappa);
    const vf = VF.makeSupportVF({ side: p.side, window: p.window, ramp: p.ramp, contactFrom: p.contactFrom, com: plan, pelvis: pelvisPlan(cand.pelvis), gains: p.gains });
    return new CT.SlideTracker({ chor, lead: cand.lead, ffLead: cand.ffLead, gains: cand.gains, authority: cand.authority, yield: cand.yield, vf, ff: cand.ff, couple: cand.couple }); } };

// ── G13 "jumping slide" (van den Eijnde 2017's jumping technique: free fall → knee impact → hip/thigh → glide). G12's audit: the dragged plant
// boot (+36 N·m·s) and tackling boot (+47) — friction below / behind the COM — produce the forward pitch. Rule: a SHORT powerful plant (0.11 s,
// support 1.8 → 1.4 BW: push-off), then NO contact while both hips flex (the legs get ahead by internal reconfiguration with near-zero angular
// momentum: ≈ 20° trunk pike, not a belly-flop), landing on the fold knee / outer thigh / hip with the legs forward ──
const TR_G13 = { ...TR_G11,
  "hip_L.flex": [[0, 30], [0.06, 18], [0.11, 8], [0.18, 12], [0.26, 30], [0.36, 45], [0.6, 48], [1.6, 45]], "knee_L.flex": [[0, 22], [0.05, 35], [0.11, 30], [0.18, 75], [0.26, 110], [0.36, 125], [0.6, 128], [1.6, 120]],
  "ankle_L.df": [[0, -6], [0.05, 10], [0.11, -15], [0.2, -30], [0.4, -30]], "hip_L.rot": [[0, 0], [0.11, -5], [0.25, -30], [0.6, -32], [1.6, -28]], "hip_L.abd": [[0, 0], [0.11, 4], [0.25, 18], [0.6, 20], [1.6, 16]], "ankle_L.inv": [[0, 0], [0.11, 4], [0.3, 15]],
  "hip_R.flex": [[0, -2], [0.06, 24], [0.12, 46], [0.2, 62], [0.3, 70], [0.6, 62], [1.6, 52]], "knee_R.flex": [[0, 118], [0.06, 120], [0.12, 108], [0.2, 70], [0.28, 30], [0.36, 15], [0.8, 15]],
  "lumbar.flex": [[0, 3], [0.11, -2], [0.3, -6], [0.6, -8], [1.2, -4]] };
export const G13 = { ...G12, id: "G13", chor: { name: "G13 jumping slide: short plant, flight reconfiguration, knee/hip landing", tracks: TR_G13 },
  pelvis: { pitch: [[0, 2], [0.11, -6]], roll: [[0, 0], [0.11, 10]], yaw: [[0, 0], [0.11, 3]] },
  vfPlan: { side: "L", window: [0, 0.11], ramp: 0.01, kappa: [[0.05, 1.8], [0.11, 1.4]], gains: { ky: 158, dy: 25, ko: 600, do: 80 } } };

// ── G14: G13 diagnosed — the plant leg delivered 30–70 N·m knee extension against 1.5–2 kN requested: M1b force develops over ~90–150 ms and the
// support objective only switched on at touchdown (weight 0 in the entry command). Human pre-landing activation: the support objective is ON in
// the entry command (window from −0.05 s), so the entry muscle state (the steady state of that command) is the pre-activated plant leg; its
// feed-forward anticipates the lag (plan at t + 0.06 s) ──
export const G14 = { ...G13, id: "G14", vfPlan: { ...G13.vfPlan, window: [-0.05, 0.11], lead: 0.06 },
  makeCtrl(cand, chor, E) { const p = cand.vfPlan, plan = kappaPlan(E.com[1], E.comVel[1], p.kappa);
    const vf = VF.makeSupportVF({ side: p.side, window: p.window, ramp: p.ramp, lead: p.lead, contactFrom: p.contactFrom, com: plan, pelvis: pelvisPlan(cand.pelvis), gains: p.gains });
    return new CT.SlideTracker({ chor, lead: cand.lead, ffLead: cand.ffLead, gains: cand.gains, authority: cand.authority, yield: cand.yield, vf, ff: cand.ff, couple: cand.couple }); } };

// ── G15: G14 (+ the entry-muscle-state fix in sp_lib SoloPlant) — the plant now supports and pushes off (vy −0.14 → +0.11, toe-off ≈ 0.15 s);
// the tackling boot still dropped onto the turf at 0.18 s in early flight (+80 N·m·s). Rule: the tackling leg stays FOLDED and HIGH (knee ≥ 115°,
// thigh driving to near horizontal) through the flight and extends only late, heel arriving ahead; the plant leg folds under after toe-off;
// lumbar extension counters the jackknife of both hips flexing; arms: tackling-side arm forward-up, fold-side arm back then out to post ──
const TR_G15 = { ...TR_G13,
  "hip_R.flex": [[0, -2], [0.06, 30], [0.13, 60], [0.22, 82], [0.32, 85], [0.45, 70], [0.8, 60], [1.6, 52]], "knee_R.flex": [[0, 118], [0.08, 125], [0.2, 120], [0.3, 92], [0.4, 35], [0.5, 15], [0.9, 15]], "ankle_R.df": [[0, -5], [0.1, 10], [0.6, 8]],
  "hip_L.flex": [[0, 30], [0.06, 18], [0.12, 8], [0.25, 35], [0.36, 55], [0.6, 52], [1.6, 45]], "knee_L.flex": [[0, 22], [0.05, 35], [0.12, 30], [0.22, 100], [0.32, 130], [0.6, 130], [1.6, 120]],
  "lumbar.flex": [[0, 3], [0.12, -2], [0.25, -12], [0.5, -12], [1.2, -5]], "thoracic.flex": [[0, 2], [0.25, -6], [1.2, 0]],
  "shoulder_R.flex": [[0, 45], [0.12, 85], [0.25, 120], [0.6, 110], [1.2, 80]], "shoulder_L.flex": [[0, -35], [0.12, -55], [0.25, -40], [0.5, -20]], "shoulder_L.abd": [[0, 12], [0.15, 30], [0.3, 50]] };
export const G15 = { ...G14, id: "G15", chor: { name: "G15 folded-high tackling leg in flight", tracks: TR_G15 } };

// ── G16 = G15 on the M1c muscle successor (sp_m1c.mjs). G15's diagnosis: the tackling hip flexors were fully excited AND fully developed (f = 1)
// yet delivered −1 … −19 N·m while the thigh swung at ≈ 8 rad/s — canonical M1b's short-range K / D on the full joint velocity cancels a driven
// group above ≈ 3–4 rad/s (evidence/m1b_effective_fv.json). M1c (label: candidate, not adopted) keeps M1b except that a group's short-range
// stiffness / damping fades with its own shortening speed (evidence/m1c_effective_fv.json: effective = the spec's Hill capacity) ──
export const G16 = { ...G15, id: "G16", muscle: "M1c" };

// ── G17: G16 diagnosed — with M1c the tackling hip delivers 70–150 N·m, but at 0.042 s its thigh collides with the plant thigh (12 N·s; the
// V1-matched thigh colliders leave ≈ 8 mm at the hip joints) and the swing stalls. Swing-through with slight abduction (both hips +5…8°) ──
const TR_G17 = { ...TR_G15, "hip_R.abd": [[0, 6], [0.06, 9], [0.2, 9], [0.5, 10]], "hip_L.abd": [[0, 3], [0.08, 6], [0.25, 18], [0.6, 20], [1.6, 16]] };
export const ENTRY_PLANT5B = { ...ENTRY_PLANT5, id: "E-PLANT5B", anat: { ...ENTRY_PLANT5.anat, hip_R: { flex: -2, abd: 6, rot: 0 }, hip_L: { flex: 30, abd: 3, rot: 0 } } };
export const G17 = { ...G16, id: "G17", entry: ENTRY_PLANT5B, chor: { name: "G17 = G16 + swing abduction", tracks: TR_G17 } };

// ── G18: G17 diagnosed — (a) M1b/M1c developed force reverses hip extension → flexion only over ≈ 0.15 s (hip τ_rise 135 ms, voluntary RTD data),
// so the plant leg, still pushing at 0.11 s, was dragged on its studs until 0.45 s (+16 N·m·s); (b) the fold thigh's landing friction (+28) had no
// counter-moment ahead because the tackling knee stayed bent (63°). Successor timing (anticipatory, as sprint late stance): shorter early push
// (support objective ends 0.07 s), fold excitation from 0.05 s, plantarflexion toe-off; tackling knee extends naturally to ≈ 15° so its heel meets
// the turf ahead as the thigh lands ──
const TR_G18 = { ...TR_G17,
  "hip_L.flex": [[0, 30], [0.05, 22], [0.1, 18], [0.18, 30], [0.28, 45], [0.4, 52], [0.8, 50], [1.6, 45]], "knee_L.flex": [[0, 22], [0.05, 32], [0.1, 45], [0.18, 90], [0.28, 120], [0.5, 128], [1.6, 120]],
  "ankle_L.df": [[0, -6], [0.04, 8], [0.1, -25], [0.2, -30], [0.5, -30]],
  "hip_R.flex": [[0, 0], [0.08, 35], [0.16, 62], [0.26, 82], [0.4, 78], [0.8, 65], [1.6, 55]], "knee_R.flex": [[0, 118], [0.08, 92], [0.16, 52], [0.26, 20], [0.4, 12], [0.9, 15]], "ankle_R.df": [[0, -4], [0.1, 10], [0.6, 6]] };
export const G18 = { ...G17, id: "G18", chor: { name: "G18 anticipatory plant fold + natural tackling extension", tracks: TR_G18 }, ffLead: 0.1, lead: 0.03,
  pelvis: { pitch: [[0, 2], [0.07, -6]], roll: [[0, 0], [0.07, 8]], yaw: [[0, 0], [0.07, 2]] },
  vfPlan: { side: "L", window: [-0.05, 0.07], ramp: 0.01, lead: 0.06, kappa: [[0.04, 1.7], [0.07, 1.3]], gains: { ky: 158, dy: 25, ko: 600, do: 80 } } };

// ── G19: G18 diagnosed — the time-keyed tackling-knee extension ran ahead of the hip actually achieved: boot strike at 0.09 s, +89 N·m·s. Successor:
// the tackling knee target follows the ACTUAL tackling-hip flexion (folded 118° until the thigh is at 30°, extended 15° once it is at 75°) during
// the swing-through; the time track resumes after 0.45 s. The knee's inverse-dynamics feed-forward is dropped (it assumes the clock track) ──
export const G19 = { ...G18, id: "G19", couple: [{ joint: "knee_R", key: "flex", from: ["hip_R", "flex"], map: [[30, 118], [55, 70], [75, 15]], window: [0, 0.45], blend: 0.02 }],
  ff: [{ chain: ["hip_R"], weight: () => 1 }, { chain: ["hip_L", "knee_L", "ankle_L"], weight: ffFree(0.12) }, { chain: ["shoulder_L", "elbow_L"], weight: () => 1 }, { chain: ["shoulder_R", "elbow_R"], weight: () => 1 }] };

// ── G20: G19 diagnosed — coupling works for clearance (tackling boot clear until 0.29 s) but is reactive: knee flexor force decays 0.77 → 0.26 over
// 0.11 s (M1b/M1c developed-force lag), so the extension arrives ≈ 0.1 s late. Predictive coordination (internal-model lead): the coupling uses the
// predicted hip angle (angle + rate × 0.10 s); joint feedback targets lead by 0.06 s ──
export const G20 = { ...G19, id: "G20", lead: 0.06, couple: [{ ...G19.couple[0], predict: 0.10 }] };

// ── G21: G20 rendered (review: kneeling lunge → dive onto the chest → prone; the support's centre of pressure never got ahead of the COM). Physics
// of a slide: friction below the COM pitches forward unless the support's centre of pressure is ≈ μ·h ahead of the COM — the slider sits back with
// the leading leg pressing the turf. Successor: a second support-chain objective through the TACKLING leg, gated by its own turf contact (tactile):
// press the heel into the turf (0.45 BW) and pitch the pelvis back (−25°), both realised only by that leg's joint torques against the real contact.
// The tackling leg reaches its heel to the turf ahead earlier (extension by 0.24 s, heel leading) ──
const TR_G21 = { ...TR_G18, "hip_R.flex": [[0, 0], [0.08, 35], [0.16, 60], [0.26, 70], [0.45, 62], [0.8, 55], [1.6, 50]], "ankle_R.df": [[0, -4], [0.1, 12], [0.6, 10]],
  "lumbar.flex": [[0, 3], [0.12, 0], [0.3, -14], [0.6, -16], [1.2, -8]], "thoracic.flex": [[0, 2], [0.3, -8], [1.2, -2]] };
export const G21 = { ...G20, id: "G21", chor: { name: "G21 leading-leg press + sit back", tracks: TR_G21 },
  press: { side: "R", window: [0.12, 1.6], ramp: 0.03, contactFrom: "lowest", gate: { clearM: 0.02, ramp: 0.03 }, fy: 0.45, gains: { ko: 500, do: 70 }, pelvis: { pitch: [[0, 0], [0.3, -25], [1.6, -25]], roll: [[0, 0], [0.3, 20], [1.6, 30]], yaw: [[0, 0], [1.6, 0]] } },
  makeCtrl(cand, chor, E) { const p = cand.vfPlan, plan = kappaPlan(E.com[1], E.comVel[1], p.kappa);
    const vf = VF.makeSupportVF({ side: p.side, window: p.window, ramp: p.ramp, lead: p.lead, contactFrom: p.contactFrom, com: plan, pelvis: pelvisPlan(cand.pelvis), gains: p.gains });
    const q = cand.press, pp = pelvisPlan(q.pelvis), vf2 = VF.makeSupportVF({ side: q.side, window: q.window, ramp: q.ramp, contactFrom: q.contactFrom, gate: q.gate, com: () => ({ press: q.fy }), pelvis: (t) => { const o = pp(t); return { R: o.R, w: [0, 0, 0] }; }, gains: q.gains });
    return new CT.SlideTracker({ chor, lead: cand.lead, ffLead: cand.ffLead, gains: cand.gains, authority: cand.authority, yield: cand.yield, ragdoll: cand.ragdoll, vf, vfs: [vf2], ff: cand.ff, couple: cand.couple }); } };

// ── G22: G21 diagnosed — the tackling boot still touched under the body at 0.11 s and the new press then pushed it down there (+87). Kinematic
// clearance analysis (hips ≈ 0.88 m): with the thigh at 40° the boot clears only for knee > 64° or < 16°; with the thigh ≥ 55° it clears at any knee
// angle. Rule: knee held ≥ 85° until the thigh passes 55°, then a fast extension (coupling map [[45,115],[55,85],[70,20]], prediction 0.03 s);
// the press engages only with the contact ≥ 0.30 m AHEAD of the COM; the plant holds the hips up during the swing-through (κ 1.7 → 1.4 to 0.10 s) ──
export const G22 = { ...G21, id: "G22", couple: [{ joint: "knee_R", key: "flex", from: ["hip_R", "flex"], map: [[45, 115], [55, 85], [70, 20]], window: [0, 0.5], blend: 0.02, predict: 0.03 }],
  press: { ...G21.press, gate: { clearM: 0.02, ramp: 0.03, aheadM: 0.3 } },
  vfPlan: { ...G21.vfPlan, window: [-0.05, 0.10], kappa: [[0.05, 1.7], [0.10, 1.4]] } };

// ── G23: G22 rendered — a knee slide (both knees down, trunk upright) that tips over: no roll toward the fold side, the tackling knee re-bent when its
// boot met the turf, the fold knee went under instead of out. Roll needs ≈ 25–30 N·m·s, which only the plant can give: a lateral support force
// (the plant pushes the COM toward the tackling side: base pushed out → top rolls toward the fold side) + the roll objective; the fold leg folds
// laterally (external rotation + abduction from 0.08 s); tackling knee extension finished by hip 62°; the press waits for the hip landing ──
export const G23 = { ...G22, id: "G23",
  chor: { name: "G23 roll to the fold side", tracks: { ...TR_G21, "hip_L.rot": [[0, 0], [0.08, -15], [0.2, -38], [0.6, -36], [1.6, -30]], "hip_L.abd": [[0, 3], [0.08, 10], [0.2, 26], [0.6, 24], [1.6, 18]],
    "lumbar.lat": [[0, 0], [0.12, 8], [0.3, 16], [1.2, 10]], "thoracic.lat": [[0, 0], [0.3, 8], [1.2, 6]] } },
  couple: [{ joint: "knee_R", key: "flex", from: ["hip_R", "flex"], map: [[40, 115], [50, 80], [62, 15]], window: [0, 0.6], blend: 0.02, predict: 0.03 }],
  pelvis: { pitch: [[0, 2], [0.10, -4]], roll: [[0, 0], [0.10, 14]], yaw: [[0, 0], [0.10, 4]] },
  vfPlan: { ...G22.vfPlan, kappa: [[0.05, 1.7], [0.10, 1.4]], lateral: 3.5, gains: { ky: 158, dy: 25, ko: 900, do: 110 } },
  press: { ...G22.press, window: [0.35, 1.6] },
  // frameYaw (deg): the world-frame parts of the intent (lateral support force, planned pelvis orientation) rotate with a scene placement; tOffset:
  // controller clock offset (t = 0 at the activation step when the tackler is parked first, Stage 3). Defaults reproduce Stage 1 exactly.
  makeCtrl(cand, chor, E) { const p = cand.vfPlan, base = kappaPlan(E.com[1], E.comVel[1], p.kappa), fy = (cand.frameYaw || 0) * Math.PI / 180, qf = [0, Math.sin(fy / 2), 0, Math.cos(fy / 2)];
    const lat = Q.rot(qf, [p.lateral || 0, 0, 0]), plan = (t) => ({ ...base(t), ax: lat[0], az: lat[2] || undefined });
    const rotP = (pp) => (t) => { const o = pp(t); return { R: Q.norm(Q.mul(qf, o.R)), w: Q.rot(qf, o.w) }; };
    const vf = VF.makeSupportVF({ side: p.side, window: p.window, ramp: p.ramp, lead: p.lead, contactFrom: p.contactFrom, com: plan, pelvis: rotP(pelvisPlan(cand.pelvis)), gains: p.gains });
    const q = cand.press, pp = rotP(pelvisPlan(q.pelvis)), vf2 = VF.makeSupportVF({ side: q.side, window: q.window, ramp: q.ramp, contactFrom: q.contactFrom, gate: q.gate, com: () => ({ press: q.fy }), pelvis: (t) => { const o = pp(t); return { R: o.R, w: [0, 0, 0] }; }, gains: q.gains });
    // optional SEAT objective (cand.seat, SP1): the same pelvis-orientation objective realised through the FOLD leg's hip while that leg's lowest
    // body (thigh / shank) is on the turf and the tackling-leg press is not engaged (yieldTo: it takes only the share the press leaves) — no support
    // force (fy 0), only the stance-hip orientation torque, the seated person's way of holding the trunk
    const vfs = [vf2]; if (cand.seat) { const s = cand.seat, ps = rotP(pelvisPlan(s.pelvis || q.pelvis));
      vfs.push(VF.makeSupportVF({ side: s.side || "L", window: s.window || q.window, ramp: s.ramp || q.ramp, contactFrom: "lowest", gate: s.gate || { clearM: 0.02, ramp: 0.03 }, yieldTo: vf2, com: () => ({ press: 0 }), pelvis: (t) => { const o = ps(t); return { R: o.R, w: [0, 0, 0] }; }, gains: s.gains || q.gains })); }
    return new CT.SlideTracker({ chor, lead: cand.lead, ffLead: cand.ffLead, gains: cand.gains, authority: cand.authority, yield: cand.yield, ragdoll: cand.ragdoll, vf, vfs, ff: cand.ff, couple: cand.couple, t0: cand.tOffset || 0 }); } };

// ── G24: G23 rendered — the first slide-tackle-like entry (tackling leg extended low ahead, fold leg tucked, trunk upright; pitch momentum balanced:
// tackling heel −38 vs fold thigh +46 N·m·s), then an over-roll (Lz +48) onto the front. Less roll: lateral support 2.0 m/s², plant roll 8°, slide
// pelvis roll target 10° ──
export const G24 = { ...G23, id: "G24", pelvis: { pitch: [[0, 2], [0.10, -4]], roll: [[0, 0], [0.10, 8]], yaw: [[0, 0], [0.10, 4]] },
  vfPlan: { ...G23.vfPlan, lateral: 2.0 }, press: { ...G23.press, pelvis: { pitch: [[0, 0], [0.3, -25], [1.6, -25]], roll: [[0, 0], [0.3, 10], [1.6, 12]], yaw: [[0, 0], [1.6, 0]] } } };
export const CANDS = { G1, G2, G3, G4, G5, G6, G7, G8, G9, G10, G11, G12, G13, G14, G15, G16, G17, G18, G19, G20, G21, G22, G23, G24 };

// SLIDE-PHYS-1 motor-authority models (finite tracking authority; contacts always win — the controller has no collision awareness).
//   A0  constant α = 1 (the Stage-1 search's model)
//   A1  phase schedule: commit 1.0 → flight 0.9 → ground entry 0.7 → slide 0.5 → follow-through 0.35 (smooth); local yield on every axis
//       (stiffness term saturates beyond e0 = 15° of tracking error: the joint gives instead of pushing harder)
//   A2  A1 + whole-body fallback: rms tracking error > 30° for 60 ms → authority decays (τ 80 ms) to 0.12 (muscle tone only): a "ragdoll"
//       that keeps every transform, velocity, contact and muscle state (nothing is reset or snapped)
//   A3  constant α = 0.6
const sm = (t, a, b) => { const s = Math.max(0, Math.min(1, (t - a) / (b - a))); return s * s * (3 - 2 * s); };
export const SCHED = (t) => { let a = 1; a += (0.9 - 1) * sm(t, 0.10, 0.16); a += (0.7 - 0.9) * sm(t, 0.32, 0.42); a += (0.5 - 0.7) * sm(t, 0.50, 0.65); a += (0.35 - 0.5) * sm(t, 1.0, 1.3); return a; };
// A4 (regional, from the A1–A3 failures: the sit-back slide needs ACTIVE trunk / hip bracing against the friction moment, so authority is
//     redistributed, not removed): trunk / hips / fold leg keep 1.0 → 0.9; the TACKLING leg (the limb that meets an opponent) 1.0 → 0.6 at entry
//     → 0.45 in the slide with local yield (e0 12°, from 0.5 s: yield is for disturbance of a held posture, never for the deliberate extension); arms 1.0 → 0.6.  A5 = A4 + the whole-body fallback of A2.
const TACKLE = new Set(["hip_R", "knee_R", "ankle_R"]), ARMS = new Set(["shoulder_L", "shoulder_R", "elbow_L", "elbow_R"]);
export const REGIONAL = (t, jn) => TACKLE.has(jn) ? 1 + (0.6 - 1) * sm(t, 0.55, 0.70) + (0.45 - 0.6) * sm(t, 0.8, 1.0) : ARMS.has(jn) ? 1 + (0.6 - 1) * sm(t, 0.6, 0.9) : 1 + (0.9 - 1) * sm(t, 0.8, 1.1);
export const MODELS = {
  A4: { authority: REGIONAL, yield: { e0Deg: 12, joints: TACKLE, from: 0.5 } },
  A5: { authority: REGIONAL, yield: { e0Deg: 12, joints: TACKLE, from: 0.5 }, ragdoll: { errDeg: 30, holdS: 0.06, floor: 0.12, tauS: 0.08 } },
  A0: { authority: () => 1 },
  A1: { authority: (t) => SCHED(t), yield: { e0Deg: 15 } },
  A2: { authority: (t) => SCHED(t), yield: { e0Deg: 15 }, ragdoll: { errDeg: 30, holdS: 0.06, floor: 0.12, tauS: 0.08 } },
  A3: { authority: () => 0.6 } };
export function apply(cand, name) { const m = MODELS[name]; if (!m) throw new Error("authority model " + name); return { ...cand, authority: m.authority, yield: m.yield || null, ragdoll: m.ragdoll || null, authorityModel: name }; }

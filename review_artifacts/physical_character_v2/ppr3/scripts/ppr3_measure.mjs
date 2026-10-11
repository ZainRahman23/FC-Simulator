// PPR-3 measurement (read-only on run records): per-step body / support / actuator / controller quantities and the causal chronology of a
// perturbed run against its unperturbed twin (same law, same entry, deterministic). Used by the battery, the evaluation and the review.
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL;
const spec = PL.SPEC_R(), B = spec.bodies, H = 1 / 240, R2D = 180 / Math.PI;
export const KEY_AXES = Object.freeze([["ankle_L.df", 11, 1], ["ankle_R.df", 12, 1], ["ankle_L.inv", 11, 2], ["ankle_R.inv", 12, 2], ["knee_L.flex", 9, 1], ["knee_R.flex", 10, 1],
  ["hip_L.flex", 7, 1], ["hip_R.flex", 8, 1], ["hip_L.abd", 7, 2], ["hip_R.abd", 8, 2], ["lumbar.flex", 0, 1], ["lumbar.lat", 0, 2], ["thoracic.flex", 1, 1], ["thoracic.lat", 1, 2], ["neck.flex", 2, 1], ["neck.lat", 2, 2]]);
const idx = (n) => B.findIndex(b => b.name === n), PELVIS = idx("pelvis"), THORAX = idx("thorax"), HEAD = idx("head");
// tilt of a body's up axis from vertical, as (pitch about world z = forward lean +, roll about world x = left lean +), degrees
const tilt = (s) => { const u = Q.rot(s.rot, [0, 1, 0]); return [Math.atan2(u[0], u[1]) * R2D, Math.atan2(-u[2], u[1]) * R2D]; };
export function cop(r) { let F = 0, x = 0, z = 0; for (const m of r.contacts || []) if (m.kind === "turf-runner") for (const p of m.points) if (p.lam > 0) { F += p.lam; x += p.lam * p.p[0]; z += p.lam * p.p[2]; } return F > 0 ? [x / F, z / F] : null; }
export function frame(rec, prev) { const c = rec.chars.runner, S = rec.S, v = prev ? V.sc(V.sub(c.com, prev.chars.runner.com), 240) : [0, 0, 0];
  return { n: rec.n, t: rec.n * H, com: c.com, comV: v, cop: cop(rec), feetN: [c.feet.L * 240, c.feet.R * 240], pelvisY: S[PELVIS].pos[1], tilt: { pelvis: tilt(S[PELVIS]), thorax: tilt(S[THORAX]), head: tilt(S[HEAD]) },
    w: { pelvis: S[PELVIS].w, thorax: S[THORAX].w, head: S[HEAD].w }, th: Object.fromEntries(KEY_AXES.map(([n, k, i]) => [n, c.th[k][i] * R2D])), sep: c.integrity.sepMaxMm, sat: c.sat, E: c.E, Wact: c.Wact, D: c.D, eRes: c.energyRes, extW: c.ext.W }; }
export const frames = (run) => run.recs.map((r, q) => frame(r, q ? run.recs[q - 1] : null));
// per axis actuator / law readback at one record: torque (actuator + V2 passive), activation, K, D, elastic, passive (B), drive, P2 Δτ, saturation
export function axisRow(rec, k, i) { const a = rec.act.find(x => x[0] === k && x[1] === i), L = (rec.law || []).find(x => x[0] === k && x[1] === i);
  return { tau: a ? a[2] + rec.passive[k][i] : null, act: a ? a[2] : null, v2passive: rec.passive[k][i], sat: a ? a[5] : null, aP: L ? L[5] : null, aM: L ? L[6] : null, K: L ? L[7] : null, D: L ? L[8] : null, elastic: L ? L[9] : null, tauB: L ? L[10] : null, drive: L ? L[11] : null, dTauP2: L ? L[12] : null, Rp: L ? L[13] : null, Rm: L ? L[14] : null }; }
// causal chronology of a perturbed run against its twin: onset → first mechanical difference → first sensed difference → first command difference →
// first activation difference → first neural torque difference (drive) → peak excursion / correction
export function chronology(base, pert, onsetStep, opts = {}) { const A = base.recs, Bp = pert.recs, n = Math.min(A.length, Bp.length), out = { onsetStep, onsetT: onsetStep * H };
  const firstRec = (pred) => { for (let q = 0; q < n; q++) if (pred(A[q], Bp[q])) return Bp[q].n; return null; };
  out.firstStateDiff = firstRec((a, b) => a.hash !== b.hash);
  out.firstJoint001deg = firstRec((a, b) => KEY_AXES.some(([, k, i]) => Math.abs(a.chars.runner.th[k][i] - b.chars.runner.th[k][i]) * R2D > 0.01));
  out.firstJoint01deg = firstRec((a, b) => KEY_AXES.some(([, k, i]) => Math.abs(a.chars.runner.th[k][i] - b.chars.runner.th[k][i]) * R2D > 0.1));
  out.firstActivationDiff = firstRec((a, b) => JSON.stringify((a.law || []).map(r => [r[3], r[4], r[5], r[6]])) !== JSON.stringify((b.law || []).map(r => [r[3], r[4], r[5], r[6]])));
  // neural torque difference: activation difference × the axis's entry isometric capacities (excludes the mechanical force–length / elastic terms)
  const cap = new Map(((pert.entry && pert.entry.law0) || []).map(e => [e.k + "_" + e.i, e.capIso]));
  out.firstNeuralTorque01Nm = firstRec((a, b) => (a.law || []).some((r, j) => { const c = cap.get(r[0] + "_" + r[1]); if (!c || !b.law[j]) return false; return Math.abs((b.law[j][5] - r[5]) * c[0] - (b.law[j][6] - r[6]) * c[1]) > 0.1; }));
  if (base.ctrlLog && pert.ctrlLog && base.ctrlLog.cmd.length) { const Lb = base.ctrlLog, Lp = pert.ctrlLog, same = (x, y) => x && y && x.length === y.length && x.every((v, i) => Object.is(v, y[i]));
    let q0 = null; for (let q = 0; q < Math.min(Lb.n.length, Lp.n.length); q++) if (!same(Lb.cmd[q], Lp.cmd[q])) { q0 = q; break; }
    out.firstCommandDiff = q0 == null ? null : Lp.n[q0]; out.firstCommandSensed = q0 == null ? null : Lp.sensed[q0];
    let q1 = null; for (let q = 0; q < Math.min(Lb.n.length, Lp.n.length); q++) { const a = Lb.cmd[q], b = Lp.cmd[q]; if (a && b && a.some((v, i) => Math.abs(v - b[i]) > 0.1)) { q1 = q; break; } } out.firstCommand01Nm = q1 == null ? null : Lp.n[q1];
    out.commandsIdenticalBeforeSensing = q0 == null || Lp.sensed[q0].some(s => s != null && s >= onsetStep + 1); }
  const lat = (s) => (s == null ? null : +((s - onsetStep) * H * 1000).toFixed(2)); out.ms = { stateDiff: lat(out.firstStateDiff), joint001: lat(out.firstJoint001deg), joint01: lat(out.firstJoint01deg), command: lat(out.firstCommandDiff), command01: lat(out.firstCommand01Nm), activation: lat(out.firstActivationDiff), neuralTorque01: lat(out.firstNeuralTorque01Nm) };
  return out; }

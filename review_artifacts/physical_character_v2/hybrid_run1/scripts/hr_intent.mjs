// HYBRID-RUN-1: the locomotor INTENT stream (RUN-1, read-only).
// RUN-1 (the frozen straight-line baseline, through the sp2a_run1.mjs run-in on the tacklers' V2 body, SP2A's leg-ratio mapping) is sampled at the
// simulation rate (240 Hz), so simulation step n corresponds exactly to RUN-1 frame k0 + n. Nothing is interpolated.
// Per frame the intent is:
//   the joint targets (V2 anatomical angles → joint rotations);
//   the pelvis world orientation and angular velocity;
//   the COM height, velocity and acceleration (central differences of the V2 FK of the animation);
//   both feet's stance flags and sole positions.
// Everything is in the SCENE frame: the animation is placed by a yaw qR and an offset offR. An optional heading schedule yaw(t) (deg) turns the
// intent itself (a deliberate change of running direction), about the COM at the time of turning.
// The intent never sees the physical body. It is what the athlete is trying to do.
const RA = new URL("../../", import.meta.url).href, S1 = RA + "slide_phys1/scripts/";
const L = await import(S1 + "sp_lib.mjs"), { V, Q, B, bi } = L, C = await import(S1 + "sp_chor.mjs");
const AA = await import(RA + "sp2a/scripts/sp2a_author.mjs"), EN = await import(S1 + "sp_entry.mjs");
export const H = 1 / 240;
// run = REC.loadRun(file) ({ d, F, h }); kRef: the frame whose placement anchors the local frame (PVP-1 used its handoff frame); k0: the frame at
// simulation step 0; qR / offR: the scene placement; heading: optional (t) => extra intent yaw (deg) applied about the intent's own COM path
export function makeIntent(run, { kRef, k0, qR = [0, 0, 0, 1], offR = [0, 0, 0], nSteps = 1200, heading = null }) {
  const F = run.F, RI = { d: run.d, F, k0: kRef, kTD: kRef, kS: Math.max(0, kRef - 200) }, st0 = F[kRef].stance, air = !st0.L && !st0.R;
  if (air) { for (let i = kRef + 1; i < F.length; i++) if (F[i].stance.L || F[i].stance.R) { RI.kTD = i; break; } }
  const E = EN.buildEntry(AA.entryFromRunIn(RI)), SA = AA.statesAtFrame(RI, E.root);
  const place = (S) => S.map(s => ({ pos: V.add(Q.rot(qR, s.pos), offR), rot: Q.norm(Q.mul(qR, s.rot)) }));
  const kMax = Math.min(F.length - 2, k0 + nSteps + 2), frames = [];
  // intent heading turn (optional): yaw about +y by heading(t), applied about the intent COM at the start (a rigid turn of the whole intent path
  // after time t is NOT applied: the heading schedule rotates the intended velocity and orientation only, see velAt / pelvisAt)
  for (let k = Math.max(1, k0 - 4); k <= kMax; k++) { const S = place(SA(k)); frames[k] = { S, com: L.comOf(S), anat: F[k].anat, stance: F[k].stance }; }
  const fr = (n) => frames[Math.max(Math.max(1, k0 - 4), Math.min(kMax, k0 + n))];
  const yawAt = (n) => (heading ? heading(n * H) : 0), qYaw = (n) => L.yawQ(yawAt(n));
  // COM kinematics (central differences, scene frame), turned by the intent heading
  const comVel = (n) => { const a = fr(n - 1).com, b = fr(n + 1).com; return Q.rot(qYaw(n), V.sc(V.sub(b, a), 1 / (2 * H))); };
  const comAcc = (n) => { const a = fr(n - 1).com, b = fr(n).com, c = fr(n + 1).com; return Q.rot(qYaw(n), V.sc(V.add(V.sub(c, V.sc(b, 2)), a), 1 / (H * H))); };
  const rotRate = (Ra, Rb, dt) => { const dq0 = Q.norm(Q.mul(Rb, Q.conj(Ra))), dq = dq0[3] < 0 ? dq0.map(x => -x) : dq0, s = Math.hypot(dq[0], dq[1], dq[2]); if (s < 1e-12) return [0, 0, 0]; return V.sc([dq[0] / s, dq[1] / s, dq[2] / s], 2 * Math.atan2(s, dq[3]) / dt); };
  const pelvis = (n) => { const R = Q.norm(Q.mul(qYaw(n), fr(n).S[0].rot)), Rm = Q.norm(Q.mul(qYaw(n - 1), fr(n - 1).S[0].rot)), Rp = Q.norm(Q.mul(qYaw(n + 1), fr(n + 1).S[0].rot)); return { R, w: rotRate(Rm, Rp, 2 * H) }; };
  const jointTargets = (n) => C.jointTargets(fr(n).anat);
  // anatAt for the free-chain inverse dynamics (sp_id.makeChainID): t is in seconds from step 0, linearly interpolated between frames
  const chor = { name: "RUN-1 intent", anatAt: (t) => { const u = t / H, i = Math.floor(u), f = u - i, a = fr(i).anat, b = fr(i + 1).anat, o = {}; for (const [j, v] of Object.entries(a)) { o[j] = {}; for (const [k, x] of Object.entries(v)) o[j][k] = x + ((b[j] && b[j][k] != null ? b[j][k] : x) - x) * f; } return o; } };
  // the initial physical state = the animation's own state at k0 (pose + every body's velocity from the FK of k0 ± 1: joint-consistent)
  const entry = () => { const p0 = fr(-1).S, p1 = fr(0).S, p2 = fr(1).S, vel = L.comVels(p1, L.bodyVels(p0, p2, 2 * H)); return { pose: p1, vel }; };
  // stance schedule (intended): per foot, the RUN-1 stance flag at step n
  const stance = (n) => fr(n).stance, sole = (n, s) => { const f = fr(n).S[bi("foot_" + s)]; return V.add(f.pos, Q.rot(f.rot, [0, -0.09, 0.07])); };
  // FRACTIONAL intent time (the hybrid runner's phase synchronisation plays RUN-1 at an adapted rate): every query at a non-integer τ blends the
  // two neighbouring frames (linear for vectors, slerp for rotations); the stance flags are those of the nearest frame
  const lerp = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u), fx = (f) => (t) => { const i = Math.floor(t), u = t - i; return u < 1e-9 ? f(i) : lerp(f(i), f(i + 1), u); };
  const jointTargetsF = (t) => { const i = Math.floor(t), u = t - i, a = jointTargets(i); if (u < 1e-9) return a; const b = jointTargets(i + 1); return a.map((q, k) => L.slerp(q, b[k], u)); };
  const pelvisF = (t) => { const i = Math.floor(t), u = t - i, a = pelvis(i); if (u < 1e-9) return a; const b = pelvis(i + 1); return { R: L.slerp(a.R, b.R, u), w: lerp(a.w, b.w, u) }; };
  const anatF = (t) => { const i = Math.floor(t), u = t - i, a = fr(i).anat; if (u < 1e-9) return a; const b = fr(i + 1).anat, o = {}; for (const [j, v] of Object.entries(a)) { o[j] = {}; for (const [k, x] of Object.entries(v)) o[j][k] = x + ((b[j] && b[j][k] != null ? b[j][k] : x) - x) * u; } return o; };
  // RUN-1's stance intervals per foot, in intent frames from step 0 (for the phase synchronisation)
  const stances = { L: [], R: [] }; for (const sd of ["L", "R"]) { let a = null; for (let n = Math.max(1, k0 - 4) - k0; n <= kMax - k0; n++) { const on = !!fr(n).stance[sd]; if (on && a == null) a = n; if (!on && a != null) { stances[sd].push([a, n - 1]); a = null; } } if (a != null) stances[sd].push([a, kMax - k0]); }
  return { k0, kRef, qR, offR, H, frame: fr, pose: (n) => fr(Math.round(n)).S, com: fx((n) => fr(n).com), comVel: fx(comVel), comAcc: fx(comAcc), pelvis: pelvisF, jointTargets: jointTargetsF, chor, entry, stance: (n) => fr(Math.round(n)).stance, sole: (n, sd) => sole(Math.round(n), sd), anat: anatF, yawAt, E, SA, stances };
}

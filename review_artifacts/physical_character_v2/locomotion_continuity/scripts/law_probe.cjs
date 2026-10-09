// LC-1 design probe (read-only): the shared pure locomotion law (ofLocoCycle) sampled finely in time at constant speed, FK on the vinicius rig, with a
// de Leva (1996) segment mass model on the rig bones. Reports, per speed: joint-angle velocity jumps (C0 kinks), the pelvis-term jumps, the flight bob
// vs a ballistic flight, the COM-vs-pelvis horizontal / vertical velocity oscillation (genuine, from the smooth parts) and L about the COM.
const H = require("./pres_harness.cjs"), WT = process.argv[2], P = H.loadPres(WT), g = P.g;
const skel = g("ofCharSkeleton")({ rig: JSON.parse(JSON.stringify(P.rig)), skel: null }), cyc = g("ofLocoCycle"), params = g("ofLocoParams"), skelFK = g("skelFK"), M4 = g("M4"), LEG_REF = 0.865;
// de Leva 1996 (male) mass fractions and COM fraction along the bone (joint → tip); trunk split pelvis / spine / chest; head+neck on head
const MASS = { pelvis: [0.1117, 0.5], spine: [0.1633, 0.5], chest: [0.1596, 0.5], head: [0.0694, 0.5], upperArm: [0.0271, 0.577], foreArm: [0.0162, 0.457], hand: [0.0061, 0.5], thigh: [0.1416, 0.41], shin: [0.0433, 0.446], foot: [0.0137, 0.5] };
const segs = skel.bones.map(b => { const k = b.name.replace(/_[RL]$/, ""); return MASS[k] ? { b, m: MASS[k][0], c: MASS[k][1] } : null; }).filter(Boolean);
const Mtot = segs.reduce((s, x) => s + x.m, 0);
function evalAt(v, t, phase0, lastBobIn) { const G = params(v), cad = v / (G.step * LEG_REF), u = (phase0 + t * cad / 2) % 1;
  const c = cyc(skel, G, u, { lean: 0, turnRoll: 0, twist: 0, lastBob: lastBobIn });
  const pel = skel.byName.pelvis, saved = pel.off.slice(), pd = c._pelvis || [0, 0, 0]; pel.off = [saved[0] + pd[0], saved[1] + pd[1], saved[2] + pd[2]];
  const root = M4.ident(); root[14] = v * t; const fk = skelFK(skel, c, root); pel.off = saved;
  let com = [0, 0, 0]; for (const s of segs) { const j = fk.joint[s.b.idx], tp = fk.tip[s.b.idx], p = [0, 1, 2].map(i => j[i] + (tp[i] - j[i]) * s.c); for (let i = 0; i < 3; i++) com[i] += p[i] * s.m / Mtot; }
  return { u, c, fk, com, pel: fk.joint[skel.byName.pelvis.idx], G, cad }; }
const out = {};
for (const v of (process.argv[3] || "1.45,2.2,3,4.2,5.5,6.5,7.5").split(",").map(Number)) {
  const G = params(v), cad = v / (G.step * LEG_REF), T = 2 / cad, N = 4000, dt = T / N;   // one full cycle
  let lastBob = null; const S = []; for (let n = 0; n <= N + 2; n++) { const e = evalAt(v, n * dt, 0.0, lastBob); if (!e.c._flight) lastBob = e.c._bob; S.push(e); }
  // joint angle kinks: per bone x-angle, |Δ slope| between consecutive fine steps (deg/s) — a C0 kink shows as a large jump
  const kinks = {}; for (const bn of ["thigh_R", "shin_R", "foot_R", "toe_R", "pelvis", "upperArm_R", "foreArm_R"]) { let mx = 0, at = 0; for (let n = 1; n < N; n++) { const a0 = S[n - 1].c[bn][0], a1 = S[n].c[bn][0], a2 = S[n + 1].c[bn][0]; const d = Math.abs((a2 - a1) - (a1 - a0)) / dt; if (d > mx) { mx = d; at = S[n].u; } } kinks[bn] = { maxSlopeJumpDegS: +mx.toFixed(0), atPhase: +at.toFixed(3) }; }
  // pelvis term: max one-sample step (m) and where; flight bob vs ballistic: implied vertical accel of the PELVIS in flight
  let pj = 0, pjAt = 0; for (let n = 1; n <= N; n++) { const d = Math.abs(S[n].c._pelvis[1] - S[n - 1].c._pelvis[1]); if (d > pj) { pj = d; pjAt = S[n].u; } }
  const flightN = S.filter(e => e.c._flight).length, Tf = flightN * dt / 2;   // per step
  // COM - pelvis velocity (smooth parts: exclude samples adjacent to a slope jump > 50 deg/s per step equivalent), and COM accel in flight
  const vrel = [], vrelY = [], aFl = []; for (let n = 2; n < N - 2; n++) { const d = (i, k) => (S[n + k].com[i] - S[n + k].pel[i]); const vh = (d(2, 1) - d(2, -1)) / (2 * dt), vy = (d(1, 1) - d(1, -1)) / (2 * dt); vrel.push(Math.abs(vh)); vrelY.push(Math.abs(vy));
    if (S[n - 2].c._flight && S[n + 2].c._flight) aFl.push((S[n + 2].com[1] - 2 * S[n].com[1] + S[n - 2].com[1]) / (4 * dt * dt)); }
  const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return +s[Math.floor(p * (s.length - 1))].toFixed(3); };
  out[v] = { gait: G.gait, stance: +G.stance.toFixed(3), cadenceStepsS: +cad.toFixed(3), cycleS: +T.toFixed(3), flightPerStepS: +Tf.toFixed(3), ballisticApexMm: +(9.81 * Tf * Tf / 8 * 1000).toFixed(1), bobAuthoredMm: +(G.bob * skel.legLen / 0.8272 * 1000).toFixed(1),
    pelvisTermMaxStepMm: +(pj * 1000).toFixed(1), pelvisTermMaxStepAtPhase: +pjAt.toFixed(3), comRelPelvisVh: { p50: q(vrel, 0.5), p90: q(vrel, 0.9), max: q(vrel, 1) }, comRelPelvisVy: { p50: q(vrelY, 0.5), max: q(vrelY, 1) }, comAccelFlightBW: aFl.length ? { min: +(Math.min(...aFl) / 9.81).toFixed(2), max: +(Math.max(...aFl) / 9.81).toFixed(2) } : null, kinks };
  console.log(v, JSON.stringify(out[v])); }

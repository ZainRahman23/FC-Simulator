// SLP-1 PRE-RUN DERIVATION (read-only; no SLP-1 run). Computes, from V2-REF's own geometry and the gait-timing inputs, every quantity the
// preregistration freezes before any SLP-1 simulation: per speed the stance sweep, the constant support height h_s (the highest pelvis height, 1-cm grid, at which
// the bounded leg IK — StandController.legIKBounded in the HARD anatomical box, no fallback, residual ≤ 1e-6; the soft box (E2's stepping envelope) cannot hold a flat
// mid-stance foot below 5 cm of pelvis drop (ankle dorsiflexion), slp1/derive_reach_explore.txt — reaches both ends of the stance sweep with a heel-pivot touchdown
// pitch ≤ 20° and a toe-pivot liftoff pitch ≤ 40°, and a flat mid-stance foot), the
// lateral one-step capture reach R (outward foot-placement authority at h_s), ω, the support caps, spring constants (per candidate frequency) and J* = M·ω·R.
// The state is the SLP-1 initial state: the solved quiet stance at t = 0 (G2 scenario S0short), exactly as an SLP-1 run starts.
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node review_artifacts/physical_character_v2/slp1/scripts/derive.mjs > .../slp1/derived.json
const P = new URL("../../../../sandbox/visual/physchar2/", import.meta.url).pathname;
const { loadJolt } = await import(P + "core/v2_jolt.js"), { e2Spec, CFG } = await import(P + "gates/v2_e2.js"), { G2Sim } = await import(P + "gates/v2_g2.js");
const { V, Q, unitStates, unitEv } = await import(P + "core/v2_math.js"), { bootSole, hull2 } = await import(P + "sim/v2_geom.js");
const { GAIT } = await import(new URL("../gait_inputs.mjs", import.meta.url).href);
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
const J = await loadJolt(P + "vendor/jolt-physics.wasm-compat.js"), G = 9.81, D = Math.PI / 180, r4 = (x) => +x.toFixed(4);
const spec = e2Spec("V2-REF"), s = new G2Sim(J, spec, { title: "SLP-1 derivation (initial state only)", seconds: 1 }, { stand: { ikRefTwist: true, lifecycle: true, ...CFG.PSTAR5CHABV }, passiveOpts: { kneeModel: "v2k" } });
const C = s.ctrl, st = unitStates(s.st), ev = unitEv(s.up.ev), B = spec.bodies, M = C.M;
const pel0 = st[C.pelvis], hipMid = V.sc(V.add(C.jointAt(st, C.hipK[0]), C.jointAt(st, C.hipK[1])), 0.5);
const com0 = (() => { let c = [0, 0, 0]; st.forEach((b, i) => { c = V.add(c, V.sc(b.com, B[i].mass)); }); return V.sc(c, 1 / M); })();
// boot sole geometry (foot-local): centroid, heel / toe edge points on the sole plane
const sole = C.feet.map(f => { const sb = bootSole(B[f]), h = hull2(sb.pts), zs = h.map(p => p[1]), xs = h.map(p => p[0]), cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { y0: sb.y0, c: [cx, sb.y0, zs.reduce((a, b) => a + b, 0) / zs.length], heel: [cx, sb.y0, Math.min(...zs)], toe: [cx, sb.y0, Math.max(...zs)], halfLen: (Math.max(...zs) - Math.min(...zs)) / 2 }; });
const W0 = Math.abs(st[C.feet[1]].pos[0] - st[C.feet[0]].pos[0]);
// a foot pose: flat at its initial height / yaw with the sole centroid `fwd` m ahead of the hip midpoint and `lat` m outward of its initial lateral position; then pitched
// about the heel edge (pivot "heel", toe up) or the toe edge (pivot "toe", heel up) by th (rad) keeping the pivot on the turf
function footPose(n, fwd, th = 0, pivot = null, lat = 0) { const f = st[C.feet[n]], R0 = f.rot, cW = V.add(f.pos, Q.rot(R0, sole[n].c)), out = n === 0 ? -1 : 1;
  let pos = V.add(f.pos, [out * lat, 0, hipMid[2] + fwd - cW[2]]), rot = R0.slice(); if (!th || !pivot) return { pos, rot };
  const pw = V.add(pos, Q.rot(R0, sole[n][pivot])), a = Q.rot(R0, [1, 0, 0]), other = pivot === "heel" ? "toe" : "heel";
  for (const sg of [1, -1]) { const q = Q.axis(a, sg * th), p2 = V.add(pw, Q.rot(q, V.sub(pos, pw))), r2 = Q.norm(Q.mul(q, R0)), oy = V.add(p2, Q.rot(r2, sole[n][other]))[1];
    if (oy > pw[1] + 1e-6) return { pos: p2, rot: r2 }; } throw new Error("pitch sign"); }
const pelAt = (dh) => ({ pos: V.add(pel0.pos, [0, dh, 0]), rot: pel0.rot.slice() });
const IKB = { limits: "hard", fallback: "none" }, feas = (n, dh, pose) => { const p = pelAt(dh); return C.legIKBounded(st, ev, n, p.pos, p.rot, pose, IKB).err <= 1e-6; };
const TD = [0, 5, 10, 15, 20], LO = [0, 5, 10, 15, 20, 25, 30, 35, 40];
// whole-body inertia about the pelvis COM in the initial pose (world axes)
const Iwb = (() => { const I = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], o = pel0.com; B.forEach((b, i) => { const R = st[i].rot, Ib = b.inertia, r = V.sub(st[i].com, o), m = b.mass;
  const col = (k) => Q.rot(R, [Ib[0][k], Ib[1][k], Ib[2][k]]), Rm = [0, 1, 2].map(k => Q.rot(R, [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0]));   // R·Ib·Rᵀ
  for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) { let v = 0; for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) v += Rm[p][a] * Ib[p][q] * Rm[q][c]; I[a][c] += v + m * ((a === c ? V.dot(r, r) : 0) - r[a] * r[c]); } });
  return I; })();
const out = { generated: "slp1/scripts/derive.mjs", body: "V2-REF", massKg: r4(M), W0m: r4(W0), pelvisCom0: pel0.com.map(r4), hipMid0: hipMid.map(r4), com0: com0.map(r4), comMinusPelvisCom0: V.sub(com0, pel0.com).map(r4),
  soleHalfLengthM: sole.map(x => r4(x.halfLen)), wholeBodyInertiaAboutPelvisComKgm2: [r4(Iwb[0][0]), r4(Iwb[1][1]), r4(Iwb[2][2])], ik: "StandController.legIKBounded, hard anatomical box, fallback none, residual ≤ 1e-6", speeds: {} };
for (const [key, g] of Object.entries(GAIT)) { const sweep = g.v * g.contactS, half = sweep / 2; let pick = null;
  for (let k = 0; k <= 30 && !pick; k++) { const dh = -0.01 * k; let ok = true; const thTD = [null, null], thLO = [null, null];
    for (const n of [0, 1]) { if (!feas(n, dh, footPose(n, 0))) { ok = false; break; }
      thTD[n] = TD.find(a => feas(n, dh, footPose(n, half, a * D, "heel"))) ?? null; thLO[n] = LO.find(a => feas(n, dh, footPose(n, -half, a * D, "toe"))) ?? null;
      if (thTD[n] == null || thLO[n] == null) { ok = false; break; } }
    if (ok) pick = { dh: +dh.toFixed(2), thTDdeg: Math.max(...thTD), thLOdeg: Math.max(...thLO) }; }
  if (!pick) { out.speeds[key] = { ...g, stanceSweepM: r4(sweep), feasible: false, note: "no constant support height in [0, −0.30] m reaches the stance sweep: kinematically infeasible for a constant-height reference" }; continue; }
  // lateral one-step capture reach at h_s: largest outward foothold offset (flat foot, under the hip) that stays feasible, both legs, 1-cm grid
  const Rn = [0, 1].map(n => { let best = 0; for (let k = 1; k <= 60; k++) { if (feas(n, pick.dh, footPose(n, 0, 0, null, 0.01 * k))) best = 0.01 * k; else break; } return best; }), R = Math.min(...Rn);
  const hCom = com0[1] + pick.dh, w = Math.sqrt(G / hCom), Fh = M * w * w * R, Jstar = M * w * R, halfLen = Math.min(...sole.map(x => x.halfLen));
  const springs = Object.fromEntries([1, 2, 4].map(f => { const W = 2 * Math.PI * f; return [f + "Hz", { Klin: r4(M * W * W), Dlin: r4(2 * M * W), Krot: Iwb.map((row, a) => r4(row[a] * W * W)), Drot: Iwb.map((row, a) => r4(2 * row[a] * W)) }]; }));
  out.speeds[key] = { ...g, stanceSweepM: r4(sweep), feasible: true, supportDhM: pick.dh, touchdownPitchDeg: pick.thTDdeg, liftoffPitchDeg: pick.thLOdeg, lateralReachPerLegM: Rn.map(r4), R: r4(R), hComM: r4(hCom), omega: r4(w),
    caps: { horizontalN: r4(Fh), verticalUpN: r4(1.5 * M * G), verticalDownN: r4(0.25 * M * G), torqueNm: r4(M * G * halfLen) }, Jstar: r4(Jstar), impulses: { small: r4(0.25 * Jstar), moderate: r4(0.75 * Jstar), large: r4(2 * Jstar) }, springs }; }
console.log(JSON.stringify(out, null, 1)); s.w.destroy();

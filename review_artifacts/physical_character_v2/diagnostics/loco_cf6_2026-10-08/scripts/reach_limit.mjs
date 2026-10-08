// CF-6 preregistration (read-only analysis): V2's FLAT-FOOT STEP-LENGTH LIMIT at the validated posture height — decision (a)'s physical envelope.
// For each body: settle quiet stance (PSTAR5CHABV, 3.4 s, no stepping), take the actual pelvis pose (validated posture height / orientation) as the leg IK frame, apply CF-2's coupled
// ankle-DF law to the bounded IK exactly as tools/loco_probe.mjs does, and test the planner's own feasibility check (ctrl/v2_footstep.js ikFeasible: bounded IK in the soft box, residual
// ≤ 1e-6) for a flat foot (its own stance height and orientation, i.e. its own toe-out) moved by d along the walking direction (bisector of the two feet's headings) at its own lateral
// position, d on a 1-cm grid. front(n) / back(n) = the largest feasible forward / backward offset of leg n from the pelvis. Flat-foot step-length limit s_max = min_n front(n) + min_n back(n):
// the longest step for which both legs can be either the leading or the trailing leg from one pelvis position. No heel / toe rotation (option (c) may add reach physically; not assumed).
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node review_artifacts/physical_character_v2/diagnostics/loco_cf6_2026-10-08/scripts/reach_limit.mjs
const P = new URL("../../../../../sandbox/visual/physchar2/", import.meta.url).pathname;
const { loadJolt } = await import(P + "core/v2_jolt.js"), { e2Spec, CFG } = await import(P + "gates/v2_e2.js"), { G3Sim, g3Def } = await import(P + "gates/v2_g3.js");
const { ikFeasible } = await import(P + "ctrl/v2_footstep.js"), { Q } = await import(P + "core/v2_math.js");
const J = await loadJolt(P + "vendor/jolt-physics.wasm-compat.js"), D0 = 180 / Math.PI, heading = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); };
for (const h of ["V2-REF", "V2-165-62", "V2-198-92", "V2-long-legs"]) { const spec = e2Spec(h), def = { ...g3Def("U:R"), lam: () => 0.5, holds: [], seconds: 3.5, push: null, torque: null };
  const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: { t0: 1, dur: 2, dz: 0.025 }, ...CFG.PSTAR5CHABV }, passiveOpts: { kneeModel: "v2k" } });
  while (s.tick() && s.n * s.dt < 3.4) {} const C = s.ctrl, st = s.st, ev = C.e2ev;
  // CF-2 (identical to tools/loco_probe.mjs): soft-box failures retried with the ankle DF bound = static bound + 15°·clamp(kneeFlex/90°)
  const orig = C.legIKBounded.bind(C); C.legIKBounded = (st_, ev_, n, pP, qP, fp = null, bo = null) => { const r = orig(st_, ev_, n, pP, qP, fp, bo); if (!(bo && bo.limits === "soft") || r.err <= 1e-6) return r;
    const rh = orig(st_, ev_, n, pP, qP, fp, { ...bo, limits: "hard" }); if (rh.err > 1e-6) return r; const ks = C.legK[n], ja = C.spec.joints[ks[2]], hi0 = ja.limits.soft.hi[1], kLo = C.spec.joints[ks[1]].limits.soft.lo[1];
    const extra = (x3) => (15 * Math.min(1, Math.max(0, (x3 - kLo) * D0 / 90))) / D0; let kx = rh.x[3], out = null;
    try { for (let it = 0; it < 3 && !out; it++) { ja.limits.soft.hi[1] = hi0 + extra(kx); const r2 = orig(st_, ev_, n, pP, qP, fp, bo), lim = hi0 + extra(r2.x[3]); if (r2.err <= 1e-6 && r2.x[4] <= lim + 1e-12) out = r2; else kx = r2.x[3]; } } finally { ja.limits.soft.hi[1] = hi0; }
    return out || r; };
  const ps = st[C.pelvis], pel = { pos: ps.pos.slice(), rot: ps.rot.slice() }, yb = (heading(st[C.feet[0]].rot) + heading(st[C.feet[1]].rot)) / 2, w = [Math.sin(yb), Math.cos(yb)];
  const reach = (n, sgn) => { const f = st[C.feet[n]], off = (f.pos[0] - ps.pos[0]) * w[0] + (f.pos[2] - ps.pos[2]) * w[1]; let best = null;
    for (let d = 0; d <= 0.6 + 1e-9; d += 0.01) { const dd = +d.toFixed(2), shift = sgn * dd - off, pose = { pos: [f.pos[0] + shift * w[0], f.pos[1], f.pos[2] + shift * w[1]], rot: f.rot.slice() };
      if (ikFeasible(C, st, ev, n, pel, pose)) best = dd; else if (best != null) break; } return best; };
  const fr = [reach(0, 1), reach(1, 1)], bk = [reach(0, -1), reach(1, -1)], sMax = Math.min(...fr) + Math.min(...bk);
  console.log(JSON.stringify({ body: h, pelvisHeightM: +ps.pos[1].toFixed(4), frontReachM: fr, backReachM: bk, flatFootStepLimitM: +sMax.toFixed(2) })); s.destroy(); }

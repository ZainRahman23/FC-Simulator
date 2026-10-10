// LV2-STATE-1 vs the authoritative simulation, and the old moving-runner blockers re-measured on the frozen baseline (READ-ONLY; nothing stepped).
// Source: the FROZEN Locomotion V2 baseline (git archive of tag locomotion-v2-straight-baseline-1 = 4a226b1f, LV2_ARCHIVE), through LV2_STATE only.
// Simulation: V1.3 at 5042230 (V13_WT archive), loaded read-only exactly as the PI-1 tooling does (pcg_f0 → charcollide_sim: ptRxBody / ptRxSegments,
// the shared locomotion law ofLocoParams, the vinicius CHARCOLLIDE profile). Nothing in the simulation, LV2 or V2 is modified.
//   1. stride clock: the simulation's (ofLocoParams(v): steps/s = v / (step · legLen 0.865), duty = stance) vs LV2's own cadence / duty; the
//      simulation's speed ceiling (PT.VMAX in match.js); support agreement under an instantaneous phase lock and the free-running drift
//   2. gameplay collision geometry vs the frozen runner: the simulation's leg segments (what decides contacts) vs the V2-mapped LV2 leg bodies —
//      the frozen CG-4 measure (leg body COM to the simulation's segment axis, horizontal, ≤ 0.10 m) at phase lock and at the best constant offset;
//      segment lengths / radii vs the rig
//   3. old-blocker metrics with the moving-handoff estimators (pres_sources.mjs, 60 Hz frames): pelvis-height step and second difference, the V2
//      joints' one-frame change, flight implied force / torque (three consecutive flight frames), on LV2 at the four ladder speeds
// usage (cwd = the physical-character-v2 worktree root): LV2_ARCHIVE=<dir> V13_WT=<dir> node .../lv2_vs_sim_probe.mjs [--n 120] [--json out.json]
import fs from "fs"; import vm from "vm"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const ARCH = process.env.LV2_ARCHIVE, WT = process.env.V13_WT; if (!ARCH || !WT) throw new Error("LV2_ARCHIVE and V13_WT required");
const { loadRun1 } = require(path.join(ARCH, "sandbox/visual/run1/tools/run1_load.cjs"));
const X = loadRun1({ extra: ["run1/lv2_state.js"] }), LV = vm.runInContext("LV2_STATE", X.ctx), E = X.RUN1_V13;
const M = await import(new URL("../../../../pi1/rev1/scripts/pcg_rev1.mjs", import.meta.url).href), M0 = await import(new URL("../../../../pi1/trackB/scripts/pcg_f0.mjs", import.meta.url).href);
const { L, makeMapper, angVel, relRot } = M, { SIMV } = M0, { V, Q, B, NB, bi } = L;
const HD = 0.3, N = +arg("n", 120), SPEEDS = [3.0, 5.5, 7.8, 9.5], G = 9.81, Mt = B.reduce((s, b) => s + b.mass, 0), LEGLEN = 0.865;
const VMAX = +(/VMAX:\s*([0-9.]+)/.exec(fs.readFileSync(path.join(WT, "sandbox/visual/match.js"), "utf8")) || [])[1];
const own = () => { const s = Object.assign({}, X.charSkel("vinicius")); delete s._r1body; return s; };
const bindW = X.skelFK(own(), {}, X.M4.ident()).world.map(m => Array.from(m));
const prof = (v) => ({ v, vOf: () => v, simAt: (t) => ({ x: 70 + v * t * Math.cos(HD), y: 30 + v * t * Math.sin(HD), heading: HD, v }) });
const mat = (j) => { const R = j.world.rotation, P = j.world.position; return [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, P[0], P[1], P[2], 1]; };
const frameOf = (q) => ({ world: q.joints.map(mat), feet: ["L", "R"].map(sd => ({ contact: !!q.legs[sd].stance, mode: q.legs[sd].contact.pivot || "swing" })) });
const recOf = (qs) => ({ bones: qs[0].joints.map(j => ({ name: j.name, parent: j.parent })), bind: bindW, pres: qs.map(frameOf) });
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), comOf = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mt);
const sim2r = (p) => [p[0], p[2], -p[1]], hl = (v) => Math.hypot(v[0], v[2]), r4 = (x) => (x == null || !Number.isFinite(x) ? x : +x.toFixed(4));
const qt = (a, p) => { const s = a.filter(x => x != null && Number.isFinite(x)).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))].toFixed(4) : null; };
const st = (a) => ({ n: a.length, p50: qt(a, 0.5), p90: qt(a, 0.9), max: qt(a, 1) });
const Iw = (S, i, w) => { const r = relRot(S, i), I = B[i].inertia, wl = Q.rot(Q.conj(r), w); return Q.rot(r, [0, 1, 2].map(a => I[a][0] * wl[0] + I[a][1] * wl[1] + I[a][2] * wl[2])); };
const Lc = (Sm, S, Sp) => { const c = comOf(S); let Lt = [0, 0, 0]; for (let i = 0; i < NB; i++) { const v = V.sc(V.sub(comW(Sp, i), comW(Sm, i)), 30), w = V.sc(angVel(Sm[i].rot, Sp[i].rot), 0.5); Lt = V.add(Lt, V.add(V.cross(V.sub(comW(S, i), c), V.sc(v, B[i].mass)), Iw(S, i, w))); } return Lt; };
const SEGB = { thigh: "thigh", shin: "shank", foot: "foot" };
// the simulation's runner body for a given root + speed + gait phase (V1.3 ptRxBody → ptRxBodyChar; the record convention of law_provider.mjs)
const simBody = (sim, phase) => { const vx = sim.v * Math.cos(sim.heading), vy = sim.v * Math.sin(sim.heading); return SIMV.body({ char: "vinicius", p: { x: sim.x, y: sim.y, vx, vy, facing: sim.heading, gaitPhase: phase, legLen: LEGLEN } }, 0, SIMV.footLenV12); };
const legVsSim = (S, segs) => { let mx = 0, who = null; for (const g of segs) { const bn = SEGB[g.seg]; if (!bn || !g.sd || g.name.startsWith("toe")) continue; const i = bi(bn + "_" + g.sd), a2 = sim2r(g.a), b2 = sim2r(g.b), p = comW(S, i), ab = V.sub(b2, a2), t = Math.max(0, Math.min(1, V.dot(V.sub(p, a2), ab) / V.dot(ab, ab))), d = hl(V.sub(p, V.add(a2, V.sc(ab, t)))); if (d > mx) { mx = d; who = B[i].name; } } return { d: mx, who }; };
const ofLocoParams = SIMV.g("ofLocoParams");
const out = { tool: "lv2_vs_sim_probe.mjs", note: "read-only; nothing stepped", simVMAX: VMAX, legLen: LEGLEN, speeds: {} };
for (const v of SPEEDS) {
  const P = prof(v), A = E.r1Make(own()); E.r1Replay(A, P.vOf, null, 1.9)();
  const T = E.r1GaitAt(A.body, A.prm, v).T, Qat = (t) => LV.queryAt(E, A, P.simAt, t, P.vOf, null, { provenance: false });
  const q0 = Qat(2.0), Gp = ofLocoParams(v), simSteps = v / (Gp.step * LEGLEN), simDuty = Gp.stance;
  const rec = { lv2: { stepsPerS: r4(q0.gait.cadence), duty: r4(q0.gait.duty), strideS: r4(q0.gait.strideTime), stepLengthM: r4(q0.gait.stepLength), flightMs: r4(q0.gait.flightTime * 1000), source: q0.gait.source },
    sim: { stepsPerS: r4(simSteps), duty: r4(simDuty), strideS: r4(2 / simSteps), stepLengthM: r4(Gp.step * LEGLEN), aboveVMAX: v > VMAX }, driftStridesPerS: r4(Math.abs(1 / q0.gait.strideTime - simSteps / 2)) };
  // per-leg support disagreement under an instantaneous phase lock (u_sim = u_LV2): |duty_sim − duty_LV2| of each stride, per leg
  rec.phaseLockedSupportDisagreePerLeg = r4(Math.abs(simDuty - q0.gait.duty));
  // ── 2. gameplay legs vs the V2-mapped LV2 legs, over one LV2 stride, phase offset scan ──
  const samples = []; for (let k = 0; k < N; k++) { const tt = 2.0 + (k + 0.5) / N * T, q = Qat(tt), R1 = recOf([q]), S = makeMapper(R1, { knee: "RK", rf1: true }).poseAt(0).S; samples.push({ tt, q, S, sim: P.simAt(tt) }); }
  const scan = []; for (let j = 0; j < 100; j++) { const phi = j / 100, ds = [], agree = []; for (const s of samples) { const Bd = simBody(s.sim, (s.q.gait.phase + phi) % 1), lv = legVsSim(s.S, SIMV.segs(Bd)); ds.push(lv.d);
      for (const sd of ["L", "R"]) agree.push(!!Bd.legs[sd].planted === !!s.q.legs[sd].stance ? 1 : 0); }
    scan.push({ phi, p50: qt(ds, 0.5), p90: qt(ds, 0.9), max: qt(ds, 1), within10cm: r4(ds.filter(d => d <= 0.10).length / ds.length), supportAgree: r4(agree.reduce((a, b) => a + b, 0) / agree.length) }); }
  const best = scan.slice().sort((a, b) => a.p90 - b.p90)[0], bestSup = scan.slice().sort((a, b) => b.supportAgree - a.supportAgree || a.p90 - b.p90)[0];
  rec.legVsSim = { phaseLocked: scan[0], bestOffsetByP90: best, bestOffsetBySupport: bestSup, note: "CG-4 measure: V2 leg body COM (thigh / shank / foot) to the simulation's segment axis, horizontal, max over legs; frozen limit 0.10 m" };
  // static: simulation segment lengths / radii vs the rig (at phase 0)
  { const Bd = simBody(samples[0].sim, 0), segs = SIMV.segs(Bd), sk = own(), len = (n) => sk.byName[n].len; rec.segments = segs.filter(g => g.sd === "R").map(g => ({ name: g.name, lengthM: r4(V.dist(g.a, g.b)), r: r4(g.r), ra: r4(g.ra), rb: r4(g.rb) }));
    rec.rigBones = { thigh: r4(len("thigh_R")), shin: r4(len("shin_R")), foot: r4(len("foot_R")), toe: r4(len("toe_R")), legLenRig: r4(sk.legLen) }; }
  // ── 3. old-blocker metrics with the moving-handoff estimators on 60 Hz frames (two LV2 strides) ──
  const nF = Math.ceil(2 * T * 60) + 4, fr = []; for (let k = 0; k < nF; k++) { const q = Qat(2.0 + k / 60); fr.push({ q, S: makeMapper(recOf([q]), { knee: "RK", rf1: false }).poseAt(0).S }); }
  const pelY = (k) => fr[k].q.joints.find(j => j.name === "pelvis").world.position[1], dPel = [], d2Pel = [], ownC = [], Fh = [], Fy = [], Tq = [], Ls = {};
  for (let k = 2; k < nF - 2; k++) { const y0 = pelY(k - 1), y1 = pelY(k), yp = pelY(k + 1); dPel.push(Math.abs(y1 - y0) * 1000); d2Pel.push(Math.abs(yp - 2 * y1 + y0) * 1000);
    const S = fr[k].S, Sm = fr[k - 1].S, Sp = fr[k + 1].S, a = V.sc(V.add(V.sub(comOf(Sp), V.sc(comOf(S), 2)), comOf(Sm)), 3600), fl3 = [k - 1, k, k + 1].every(j => fr[j].q.gait.support === "flight");
    if (fl3) { Fh.push(hl(a) / G); Fy.push((a[1] + G) / G); } Ls[k] = Lc(Sm, S, Sp);
    let o = 0; for (const j of [0].concat(L.spec.joints.map(x => x.childIndex))) o = Math.max(o, V.dist(V.sub(Sp[j].pos, S[j].pos), V.sub(S[j].pos, Sm[j].pos))); ownC.push(o * 1000); }
  for (let k = 3; k < nF - 3; k++) { const fl = [k - 1, k, k + 1].every(j => fr[j].q.gait.support === "flight"); if (fl && Ls[k + 1] && Ls[k - 1]) Tq.push(V.len(V.sub(Ls[k + 1], Ls[k - 1])) * 30); }
  rec.frames60 = { n: nF, pelvisStepMm: st(dPel), pelvis2ndDiffMm: st(d2Pel), jointOneFrameChangeMm: st(ownC), flightFhBW: st(Fh), flightFyBW: st(Fy), flightTorqueNm: st(Tq),
    note: "moving-handoff estimators (pres_sources.mjs): rig pelvis height steps / 2nd differences per 60 Hz frame; V2 joints' |Δ_k+1 − Δ_k|; COM 2nd difference × 3600 and L centred differences on three consecutive flight frames (mapping R-K, no RF-1, as there)" };
  out.speeds[v] = rec;
  console.log(`${v} m/s: LV2 ${rec.lv2.stepsPerS} steps/s duty ${rec.lv2.duty} | sim ${rec.sim.stepsPerS} steps/s duty ${rec.sim.duty}${rec.sim.aboveVMAX ? " (ABOVE sim VMAX " + VMAX + ")" : ""} | drift ${rec.driftStridesPerS} strides/s | phase-locked support disagreement ${rec.phaseLockedSupportDisagreePerLeg} per leg`);
  console.log(`   legs vs gameplay segments: phase-locked p50/p90/max ${scan[0].p50}/${scan[0].p90}/${scan[0].max} m (≤ 0.10: ${scan[0].within10cm}; support agree ${scan[0].supportAgree}) · best offset φ ${best.phi}: ${best.p50}/${best.p90}/${best.max} m (≤ 0.10: ${best.within10cm}; support ${best.supportAgree}) · best-support φ ${bestSup.phi}: support ${bestSup.supportAgree}, p90 ${bestSup.p90} m`);
  console.log(`   60 Hz: pelvis step p90/max ${rec.frames60.pelvisStepMm.p90}/${rec.frames60.pelvisStepMm.max} mm · 2nd diff p90/max ${rec.frames60.pelvis2ndDiffMm.p90}/${rec.frames60.pelvis2ndDiffMm.max} mm · joint one-frame change p50/max ${rec.frames60.jointOneFrameChangeMm.p50}/${rec.frames60.jointOneFrameChangeMm.max} mm · flight Fh/Fy/T p50 ${rec.frames60.flightFhBW.p50} / ${rec.frames60.flightFyBW.p50} / ${rec.frames60.flightTorqueNm.p50} (n ${rec.frames60.flightFhBW.n})`);
  console.log(`   segments (R): ${rec.segments.map(s => `${s.name} ${s.lengthM} m r ${s.r}`).join(" · ")} | rig: ${JSON.stringify(rec.rigBones)}`);
}
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

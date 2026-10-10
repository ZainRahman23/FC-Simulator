// run1/tools/lv2_state_check.cjs — CHECKS of the locomotion-side state contract (run1/lv2_state.js, LV2-STATE-1) on the FROZEN baseline (RUN1_V13),
// numbered after the Physical Character V2 draft's proposed handoff checks (HT-*) where they are the locomotion side's to run:
//   HT-4 purity + cost · HT-7 input echo · R-1 sub-tick query = the rendered replay state · R-2 float64 pose vs the rendered float32 pose ·
//   HT-2 exported velocities vs an independent float64 difference of exported poses (queryAt τ ± δ on the replay path), constant speeds and a ramp ·
//   HT-3 pivot velocity while planted · R-4 analytic pelvis vertical vs the pose function · COM stride mean (diagnostic) · contact sub-phase shares ·
//   the touchdown position step between grid speeds · determinism across two fresh loads.
// usage: node lv2_state_check.cjs [--json out.json]
const { loadRun1 } = require("./run1_load.cjs"), vm = require("vm"), crypto = require("crypto"), fs = require("fs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const load = () => { const X = loadRun1({ extra: ["run1/lv2_state.js"] }); return { X, S: vm.runInContext("LV2_STATE", X.ctx), E: X.RUN1_V13 }; };
const { X, S, E } = load(), own = () => { const s = Object.assign({}, X.charSkel("vinicius")); delete s._r1body; return s; };
const sha = (o) => crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16), out = { rows: [] }, row = (k, ok, txt) => { out.rows.push({ k, ok, txt }); console.log(`${ok ? "PASS" : "FAIL"}  ${k.padEnd(34)} ${txt}`); };
const len = (a) => Math.hypot(...a), dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const prof = (v) => ({ vOf: () => v, simAt: (t) => ({ x: 70 + v * t * Math.cos(0.3), y: 30 + v * t * Math.sin(0.3), heading: 0.3, v }) });   // travel along the heading
// a ramp 6 → 9.5 m/s (1.6 m/s²) with its closed-form distance; the authoritative input carries the acceleration
const ramp = (() => { const a = 1.6, t1 = 1.0, t2 = t1 + 3.5 / a, vOf = (t) => t < t1 ? 6 : t < t2 ? 6 + a * (t - t1) : 9.5, aOf = (t) => (t >= t1 && t < t2 ? a : 0);
  const dOf = (t) => t < t1 ? 6 * t : t < t2 ? 6 * t1 + 6 * (t - t1) + a * (t - t1) ** 2 / 2 : 6 * t1 + 6 * (t2 - t1) + a * (t2 - t1) ** 2 / 2 + 9.5 * (t - t2);
  return { vOf, aOf, simAt: (t) => ({ x: 70 + dOf(t) * Math.cos(0.3), y: 30 + dOf(t) * Math.sin(0.3), heading: 0.3, v: vOf(t), a: aOf(t) }) }; })();
const actorAt = (P, t) => { const A = E.r1Make(own()); E.r1Replay(A, P.vOf, null, t)(); return A; };   // committed on the replay grid at ≤ t (the partial step restored away)

// ── HT-4 purity + determinism of the query + cost ──
{ const P = prof(7.8), A = E.r1Make(own()), rs = E.r1Replay(A, P.vOf, null, 2.0), sim = P.simAt(2.0);
  const hA = () => sha({ p: A.phase, t: A.t, v: A.v, aF: A.aF, l: A.accLean, legs: A.legs, r: A._replayT, gv: A.gv }), hR = () => { const ev = E.r1Evaluate(A, sim); return sha(ev.fk.world.map(m => Array.from(m))); };
  const a0 = hA(), r0 = hR(), q1 = S.query(E, A, sim), q2 = S.query(E, A, sim), a1 = hA(), r1 = hR();
  row("HT-4 query purity", a0 === a1 && r0 === r1, `actor state hash ${a0} → ${a1}; rendered pose hash ${r0} → ${r1} across two queries`);
  row("query determinism (same load)", sha(q1) === sha(q2), `two queries ${sha(q1)} / ${sha(q2)}`);
  const n = 200, t0 = process.hrtime.bigint(); for (let i = 0; i < n; i++) S.query(E, A, sim, { provenance: false }); const us = Number(process.hrtime.bigint() - t0) / 1e3 / n;
  const t1 = process.hrtime.bigint(); for (let i = 0; i < 20; i++) S.query(E, A, sim); const usP = Number(process.hrtime.bigint() - t1) / 1e3 / 20;
  const T = (tt) => { const B = actorAt(P, tt), h0 = process.hrtime.bigint(); S.queryAt(E, B, P.simAt, tt + 0.003, P.vOf); return Number(process.hrtime.bigint() - h0) / 1e3; };
  const c5 = T(5), c300 = T(300);
  row("HT-4 cost, O(1) in match time", c300 < 4 * Math.max(c5, us), `query ${us.toFixed(0)} µs (with provenance stamp ${usP.toFixed(0)} µs); queryAt 3 ms past the committed time: at t = 5 s ${c5.toFixed(0)} µs, at t = 300 s ${c300.toFixed(0)} µs`);
  rs();
  // ── HT-7 input echo ──
  const sim2 = { x: 100.123456789, y: 33.3, heading: 0.3, v: 7.8, a: 0.25, yawRate: 0 }, q = S.query(E, A, sim2), ok = Object.keys(sim2).every(k => Object.is(q.input.echo[k], sim2[k]));
  row("HT-7 input echo (bitwise)", ok, Object.entries(q.input.bits).map(([k, b]) => `${k} ${b}`).join(" · "));
  // ── R-0 provenance ──
  const pv = q1.provenance; row("R-0 provenance", pv.implementation === "RUN-1.3 @ bdab1f5f" && pv.rigId === "vinicius", `${pv.contract} · ${pv.implementation} · params ${pv.paramHash} (${pv.paramBytes} B) · rig ${pv.rigId} bind ${pv.bindHash} · ${pv.bones} bones · ladder ${pv.anchorSpeeds.map(a => a.name + " " + a.v).join(" / ")}`);
}
// ── R-1 sub-tick query = the rendered replay state; R-2 float64 vs rendered float32 ──
{ const P = prof(9.5); let dmax = 0, dren = 0, n = 0;
  for (const tt of [1.0, 2.37, 3.1415, 4.0001]) { const B = actorAt(P, tt - 0.01), qa = S.queryAt(E, B, P.simAt, tt, P.vOf);
    const C = E.r1Make(own()), rs = E.r1Replay(C, P.vOf, null, tt), qb = S.query(E, C, P.simAt(tt)), ev = E.r1Evaluate(C, P.simAt(tt)); rs();
    qa.joints.forEach((j, i) => { dmax = Math.max(dmax, dist(j.world.position, qb.joints[i].world.position)); dren = Math.max(dren, dist(j.world.position, Array.from(ev.fk.joint[i]))); n++; }); }
  row("R-1 queryAt(τ) = rendered state at τ", dmax === 0, `max joint difference ${dmax} m over ${n} joint samples (queryAt from an earlier committed state vs the actor replayed to τ, as the viewer renders)`);
  row("R-2 float64 pose vs rendered float32", dren < 2e-5, `max ${(dren * 1e6).toFixed(2)} µm at pitch x ≈ 80–110 m (the rendered matrices are float32: this is their quantization, the contract's values are float64)`); }
// ── HT-2 velocities vs an independent float64 difference of exported poses; R-4 pelvis vertical; HT-3 pivots; sub-phase shares; COM mean ──
const shares = {}, ht2 = [];
// a touchdown inside the replay's uncommitted partial step takes its plant from the partial step's gait: on a speed change the plant record then
// differs between τ − δ and τ + δ until the grid commits the step (≤ 1/240 s). Such samples are counted and measured separately, not hidden
const plantKey = (z) => ["R", "L"].map(sd => (z.legs[sd].contact.plant && z.legs[sd].contact.plant.record ? z.legs[sd].contact.plant.record.zTD.toFixed(15) + "/" + z.legs[sd].contact.plant.record.footW.toFixed(15) : "-")).join("|");
for (const [name, P] of [["3.0", prof(3.0)], ["5.5", prof(5.5)], ["7.8", prof(7.8)], ["9.5", prof(9.5)], ["ramp 6→9.5", ramp]]) {
  const isRamp = !!P.aOf, dl = 1e-4, errs = []; let worst = null, nPS = 0, psShift = 0, dv = 0, dw = 0, dvH = 0, nS = 0, skip = 0, dPel = 0, pivMax = {}, sub = {}, sup = {}, mtp5 = 0, mtp15 = 0, nSt = 0, comV = [0, 0, 0], nC = 0, rootV = [0, 0, 0];
  const base = actorAt(P, 1.9), T = E.r1GaitAt(base.body, base.prm, P.vOf(2)).T, N = 240;
  for (let k = 0; k < N; k++) { const tt = (isRamp ? 1.3 : 2.0) + (k + 0.5) / N * T, A0 = actorAt(P, tt - 0.02);
    const q = S.queryAt(E, A0, P.simAt, tt, P.vOf, P.aOf), qp = S.queryAt(E, A0, P.simAt, tt + dl, P.vOf, P.aOf, { provenance: false }), qm = S.queryAt(E, A0, P.simAt, tt - dl, P.vOf, P.aOf, { provenance: false });
    const sig = (z) => z.gait.support + ["R", "L"].map(sd => z.legs[sd].contact.subPhase === "flat" ? "F" : z.legs[sd].contact.subPhase === "swing" ? "S" : "P").join("");
    if (sig(qp) !== sig(q) || sig(qm) !== sig(q) || q.method.velocities.indexOf("central") !== 0) { skip++; }
    else if (plantKey(qp) !== plantKey(q) || plantKey(qm) !== plantKey(q)) { nPS++; for (const n of ["foot_R", "toe_R", "foot_L", "toe_L"]) { const i = X.charSkel("vinicius").byName[n].idx; psShift = Math.max(psShift, dist(qp.joints[i].world.position, qm.joints[i].world.position) - 2 * dl * len(q.joints[i].world.linearVelocity)); } }
    else {
      q.joints.forEach((j, i) => { const fd = j.world.position.map((x, c) => (qp.joints[i].world.position[c] - qm.joints[i].world.position[c]) / (2 * dl)), e = dist(fd, j.world.linearVelocity); errs.push(e); if (e > dv) worst = { e, joint: j.name, t: tt, R: q.legs.R.contact.subPhase + (q.legs.R.s != null ? " s " + q.legs.R.s.toFixed(4) : " w " + q.legs.R.w.toFixed(4)), L: q.legs.L.contact.subPhase + (q.legs.L.s != null ? " s " + q.legs.L.s.toFixed(4) : " w " + q.legs.L.w.toFixed(4)), method: q.method.velocities }; dv = Math.max(dv, e); if (j.name === "head" || j.name === "hand_R") dvH = Math.max(dvH, e);
        const R0 = j.world.rotation, Rp = qp.joints[i].world.rotation, Rm = qm.joints[i].world.rotation, dR = Rp.map((x, c) => (x - Rm[c]) / (2 * dl));
        const W = [0, 1, 2].map(r => [0, 1, 2].map(c => dR[r * 3] * R0[c * 3] + dR[r * 3 + 1] * R0[c * 3 + 1] + dR[r * 3 + 2] * R0[c * 3 + 2])), w = [(W[2][1] - W[1][2]) / 2, (W[0][2] - W[2][0]) / 2, (W[1][0] - W[0][1]) / 2];
        dw = Math.max(dw, dist(w, j.world.angularVelocity)); }); nS++; }
    if (!isRamp) dPel = Math.max(dPel, Math.abs(q.pelvis.springMass.verticalVelocity - q.joints[1].root.linearVelocity[1]));
    sup[q.gait.support.startsWith("stance") ? "stance" : q.gait.support] = (sup[q.gait.support.startsWith("stance") ? "stance" : q.gait.support] || 0) + 1;
    for (const sd of ["R", "L"]) { const c = q.legs[sd].contact; if (c.subPhase === "swing") continue; nSt++; sub[c.subPhase] = (sub[c.subPhase] || 0) + 1; if (c.mtpExtension > 5 * Math.PI / 180) mtp5++; if (c.mtpExtension > 15 * Math.PI / 180) mtp15++;
      const vp = c.pivotMaterialVelocity ? len(c.pivotMaterialVelocity) : len(q.legs[sd].foot.linearVelocity); pivMax[c.pivot] = Math.max(pivMax[c.pivot] || 0, vp); }
    comV = comV.map((x, c) => x + q.com.world.linearVelocity[c]); rootV = rootV.map((x, c) => x + q.root.linearVelocity[c]); nC++; }
  errs.sort((a, b) => a - b); const p99 = errs[Math.floor(0.99 * (errs.length - 1))];
  ht2.push({ name, dv, dw, dvH, nS, skip, worst, p99, partialStepPlant: nPS, partialStepShiftPer2DeltaM: psShift }); if (process.env.WORST) console.log("   worst", JSON.stringify(worst));
  shares[name] = { sub: Object.fromEntries(Object.entries(sub).map(([k, x]) => [k, +(x / nSt).toFixed(3)])), support: Object.fromEntries(Object.entries(sup).map(([k, x]) => [k, +(x / N).toFixed(3)])), mtp5: +(mtp5 / nSt).toFixed(3), mtp15: +(mtp15 / nSt).toFixed(3), pivotSpeedMax: pivMax,
    comMinusRoot: comV.map((x, c) => +((x - rootV[c]) / nC).toFixed(4)), pelvisAnalyticVsPoseFn: dPel };
  row(`HT-2 velocities ${name}`, p99 < 1e-3 && dv < 0.01 && dw < 0.05, `|v − Δx/2δ| p99 ${(p99 * 1000).toFixed(3)} / max ${(dv * 1000).toFixed(2)} mm/s (head / hand ${(dvH * 1000).toFixed(3)}), max |ω − ΔR/2δ| ${dw.toFixed(4)} rad/s over ${nS} samples × 23 bones (independent: δ = 0.1 ms on the replay path; ${skip} samples with a declared event inside ±δ skipped${nPS ? `; ${nPS} samples with a touchdown in the replay's uncommitted partial step measured separately: the plant re-derives by ${(psShift * 1e6).toFixed(2)} µm per 2δ — a ≤ 0.1 mm presentation transient on speed changes` : ""})${worst ? ` · worst ${worst.joint}` : ""}`);
}
for (const [name, s] of Object.entries(shares)) {
  const piv = Object.entries(s.pivotSpeedMax).map(([k, x]) => `${k} ${(x * 1000).toFixed(2)} mm/s`).join(", ");
  row(`HT-3 pivot velocity planted ${name}`, Object.entries(s.pivotSpeedMax).every(([k, x]) => x < (k === "sole" ? 0.02 : 0.005)), `max material speed at the contact pivot: ${piv} (sole = the ankle while flat; its non-zero maximum is the heel-rise onset, where the foot-pitch rate starts from a small non-zero value)`);
  console.log(`      contact ${name}: support ${JSON.stringify(s.support)} · stance sub-phases ${JSON.stringify(s.sub)} · MTP ext > 5° ${(s.mtp5 * 100).toFixed(0)} % / > 15° ${(s.mtp15 * 100).toFixed(0)} % of stance · stride-mean COM − root velocity ${JSON.stringify(s.comMinusRoot)} m/s${name.startsWith("ramp") ? "" : " · pelvis ẏ analytic vs pose function " + s.pelvisAnalyticVsPoseFn.toExponential(1) + " m/s"}`); }
{ const s = Object.entries(shares).filter(([k]) => !k.startsWith("ramp")); row("R-4 pelvis vertical analytic", s.every(([, x]) => x.pelvisAnalyticVsPoseFn < 1e-4), `max |ẏ analytic − pose-function ẏ| ${Math.max(...s.map(([, x]) => x.pelvisAnalyticVsPoseFn)).toExponential(1)} m/s (constant speed)`);
  row("COM stride mean (diagnostic)", s.every(([, x]) => Math.abs(x.comMinusRoot[1]) < 0.02), `stride-mean COM velocity − root velocity: ${s.map(([k, x]) => `${k} m/s ${JSON.stringify(x.comMinusRoot)}`).join(" · ")}`); }
// ── the touchdown position step between grid speeds (swing end vs stance start, closed form) ──
{ const res = []; for (const v of [5.5, 5.6, 7.8, 8.9, 9.4]) { const A = E.r1Make(own()), G = { body: A.body, p: E.r1GaitAt(A.body, A.prm, v), late: null, accLean: 0 }, eps = 1e-9;
    const a = E.r1FK(G, E.r1Pose(G, 1 - eps), null), b = E.r1FK(G, E.r1Pose(G, eps), null), B = A.body.skel.byName; let d = 0;
    for (const n of ["shin_R", "foot_R", "toe_R"]) d = Math.max(d, dist(a.P[B[n].idx], b.P[B[n].idx]) - v * 2 * eps * G.p.T);
    res.push(`${v} m/s ${(Math.max(0, d) * 1000).toFixed(4)} mm`); }
  row("touchdown position step (C0)", true, res.join(" · ") + " (report only: grid speeds 5.5 / 7.8 / 9.5 are exact; between them the lerped swing end and the stance start differ slightly — the contract's one-sided stencil never straddles it)"); }
// ── determinism across two fresh loads ──
{ const L2 = load(), P = prof(9.5), q = (Z) => { const sk = Object.assign({}, Z.X.charSkel("vinicius")); delete sk._r1body; const A = Z.E.r1Make(sk); Z.E.r1Replay(A, P.vOf, null, 3.21); return sha(Z.S.queryAt(Z.E, A, P.simAt, 3.2345, P.vOf)); };
  const a = q({ X, S, E }), b = q(L2); row("determinism, two fresh loads", a === b, `state hash ${a} / ${b}`); }
console.log(`${out.rows.filter(r => r.ok).length}/${out.rows.length} PASS`);
out.shares = shares; out.ht2 = ht2; if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

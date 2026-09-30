// exploratory D6 causal-chain probe (read-only): node d6_probe.mjs <physchar dir> [test] [json-out]
import fs from "fs"; import path from "path";
const PC = process.argv[2], TEST = process.argv[3] || "D6_slide", ROOT = path.resolve(PC, "../../.."), PLATE = process.argv.includes("--plate");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js");
const { V, Q } = await import(PC + "/pc_math.js"); const { buildPoses } = await import(PC + "/pc_control.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const nb = spec.bodies.length, nj = spec.joints.length, g = 9.81, deg = (r) => r * 180 / Math.PI;
const parentJ = spec.bodies.map((b, i) => spec.joints.findIndex(j => j.childIndex === i)), childJ = spec.bodies.map((b, i) => spec.joints.map((j, k) => j.parentIndex === i ? k : -1).filter(k => k >= 0));
const swingTw = (q) => { let x = q[3] < 0 ? q.map(v => -v) : q; const tl = Math.hypot(x[0], x[3]), qt = tl > 1e-12 ? [x[0] / tl, 0, 0, x[3] / tl] : [0, 0, 0, 1], qs = Q.mul(x, Q.conj(qt));
  return { t: 2 * Math.atan2(qt[0], qt[3]), y: 2 * Math.atan2(qs[1], qs[3]), z: 2 * Math.atan2(qs[2], qs[3]) }; };
const LEGJ = ["hip_L", "knee_L", "ankle_L", "hip_R", "knee_R", "ankle_R"].map(n => spec.joints.findIndex(j => j.name === n));
const series = []; let prevStates = null, prevPlate = null;
const r = D.runD(J, spec, TEST, { poses, keepStates: true, world: PLATE ? { plateFrom: nb } : undefined, onStep: (x) => {
  const { n, t, dt, w, A, B, U } = x, all = [...A.states, ...B.states], prev = prevStates || all; prevStates = all;
  // per-body external impulse (N·s) from Newton on each body: m·Δv − m·g·dt − (joint impulses)
  const lam = []; for (let k = 0; k < 2 * nj; k++) lam.push(w.jointLambdaPosition(k));
  const extImp = (i) => { const li = i % nb, off = i < nb ? 0 : nj, m = spec.bodies[li].mass; let Jx = V.sub(V.sc(V.sub(all[i].v, prev[i].v), m), [0, -g * m * dt, 0]);
    if (parentJ[li] >= 0) Jx = V.sub(Jx, lam[off + parentJ[li]]); for (const k of childJ[li]) Jx = V.add(Jx, lam[off + k]); return Jx; };
  const cts = w.contacts, inter = cts.filter(c => c.a >= 0 && c.b >= 0 && (c.a < nb) !== (c.b < nb)), turfOf = (i) => cts.some(c => (c.a === i && c.b === -1) || (c.b === i && c.a === -1));
  const touchingInter = inter.filter(c => c.depth > -0.0005);
  // bodies of each side involved in A↔B manifolds (speculative included: the solver may act on them)
  const aInv = [...new Set(inter.map(c => c.a < nb ? c.a : c.b))], bInv = [...new Set(inter.map(c => c.a < nb ? c.b : c.a))];
  // A→B impulse: from the A side if its involved bodies have no turf contact, else from the B side if clean, else "mixed"
  let JAB = null, via = null; if (inter.length) { if (aInv.every(i => !turfOf(i))) { JAB = V.sc(aInv.reduce((s, i) => V.add(s, extImp(i)), [0, 0, 0]), -1); via = "A-side"; }
    else if (bInv.every(i => !turfOf(i))) { JAB = bInv.reduce((s, i) => V.add(s, extImp(i)), [0, 0, 0]); via = "B-side"; } else { via = "mixed"; JAB = V.sc(aInv.reduce((s, i) => V.add(s, extImp(i)), [0, 0, 0]), -1); } }
  let exact = null; if (PLATE) { const pm = w.plateMomentum(), dP = prevPlate ? V.sub(pm, prevPlate) : [0, 0, 0]; prevPlate = pm; const JturfB = V.sc(dP, -1);
    const M = spec.totalMass, PBn = B.states.reduce((s, q, i) => V.add(s, V.sc(q.v, spec.bodies[i].mass)), [0, 0, 0]), PBp = prev.slice(nb).reduce((s, q, i) => V.add(s, V.sc(q.v, spec.bodies[i].mass)), [0, 0, 0]);
    const PAn = A.states.reduce((s, q, i) => V.add(s, V.sc(q.v, spec.bodies[i].mass)), [0, 0, 0]), PAp = prev.slice(0, nb).reduce((s, q, i) => V.add(s, V.sc(q.v, spec.bodies[i].mass)), [0, 0, 0]);
    const Jab = V.sub(V.sub(V.sub(PBn, PBp), [0, -g * M * dt, 0]), JturfB), JturfA = V.add(V.sub(V.sub(PAn, PAp), [0, -g * M * dt, 0]), Jab);
    const fR = nb + spec.bodies.findIndex(b => b.name === "foot_R"), fL = nb + spec.bodies.findIndex(b => b.name === "foot_L");
    const turfBodies = [...new Set(cts.filter(c => (c.a === -1 && c.b >= nb) || (c.b === -1 && c.a >= nb)).map(c => c.a === -1 ? c.b : c.a))];
    const others = turfBodies.filter(i => i !== fL), cleanOthers = others.every(i => !bInv.includes(spec.bodies[i - nb].name) || !inter.some(c => c.a === i || c.b === i));
    const turfL = cleanOthers ? V.sub(JturfB, others.reduce((s2, i) => V.add(s2, extImp(i)), [0, 0, 0])) : null, abOnFootL = turfL ? V.sub(extImp(fL), turfL) : null;
    exact = { Jab, JturfB, JturfA, turfFootL: turfL, abOnFootL, turfBodies: turfBodies.map(i => spec.bodies[i - nb].name) }; }
  // contact locations in each body's frame
  const loc = touchingInter.map(c => { const ia = c.a < nb ? c.a : c.b, ib = c.a < nb ? c.b : c.a, p = c.pts[0], sb = all[ib], sa = all[ia];
    return { a: spec.bodies[ia].name, b: spec.bodies[ib - nb].name, y: p[1], pB: Q.rot(Q.conj(sb.rot), V.sub(p, sb.pos)), pA: Q.rot(Q.conj(sa.rot), V.sub(p, sa.pos)), depth: c.depth, normal: c.normal, pts: c.pts.length }; });
  // B: joints
  const jr = LEGJ.map(k => { const j = spec.joints[k], kk = nj + k, cap = B.caps[k], lm = w.motorLambda(kk);
    if (j.type === "hinge") { const a = w.hingeAngle(kk), tq = lm / dt, lim = tq >= 0 ? cap.hi : -cap.lo; const lr = w.cons[kk].c.GetTotalLambdaRotationLimits();
      return { j: j.name, a: deg(a), tgt: deg(U.B.final[k]), tq, sat: lim > 0 ? Math.abs(tq) / lim : 0, limitTq: lr / dt }; }
    const q = w.sixdofRot(kk), sw = swingTw(q), tg = swingTw(U.B.final[k]), tq = lm.map(v => v / dt), sat = tq.map((v, i) => { const lim = v >= 0 ? cap.hi[i] : -cap.lo[i]; return lim > 0 ? Math.abs(v) / lim : 0; });
    const Cq = Q.fromAxes(j.X, j.Y, j.Z), Rc = all[nb + j.childIndex].rot, wrel = Q.rot(Q.conj(Cq), Q.rot(Q.conj(Rc), V.sub(all[nb + j.childIndex].w, all[nb + j.parentIndex].w)));
    return { j: j.name, t: deg(sw.t), y: deg(sw.y), z: deg(sw.z), tgt: [deg(tg.t), deg(tg.y), deg(tg.z)], w: wrel.map(deg), tq, sat: Math.max(...sat), satAx: sat }; });
  const o = B.obs, ctl = B.ctrl, dbg = U.B.debug || {}, st = B.stepper;
  const MA = A.states.reduce((s, q, i) => V.add(s, V.sc(q.v, spec.bodies[i].mass)), [0, 0, 0]), MB = B.states.reduce((s, q, i) => V.add(s, V.sc(q.v, spec.bodies[i].mass)), [0, 0, 0]);
  const foot = (s) => { const f = o.feet[s], fs = B.states[spec.bodies.findIndex(b => b.name === "foot_" + s)]; return { state: f.state, touching: f.touching, loaded: f.loaded, load: f.load, shear: f.shear, slip: f.slipSpeed, slipping: f.slipping, fromAnchor: f.fromAnchor, pos: fs.pos, v: fs.v, w: fs.w, rot: fs.rot, pts: f.points.length, muUsed: f.muUsed, heel: f.heel, toe: f.toe, lat: f.lat, med: f.med }; };
  series.push({ n, t, exact, inter: inter.length, touch: touchingInter.length, loc, JAB, via, aInv: aInv.map(i => spec.bodies[i].name), bInv: bInv.map(i => spec.bodies[i - nb].name),
    PA: MA, PB: MB, B: { cls: ctl.cls.state, reason: ctl.cls.reason, com: o.com, vcom: o.vcom, xi: o.xi, xiMargin: o.xiMargin, comMargin: o.comMargin, region: o.region, cop: o.cop, grf: o.grf, L: o.L, trunk: o.trunkTiltDeg, hipCap: ctl.hipCapHere,
      feet: { L: foot("L"), R: foot("R") }, stance: dbg.stance, replant: dbg.replant, pRaw: dbg.pRaw, pStar: dbg.pStar, r: dbg.r, tauTrunk: dbg.tauTrunk, stage: st ? st.stage : null, refused: st ? st.refused || null : null, joints: jr },
    A: { com: A.obs.com, vcom: A.obs.vcom } });
} });
const out = process.argv[4]; if (out) fs.writeFileSync(out, JSON.stringify({ summary: { A: r.A, B: r.Bres, contact: { ...r.contact, invariant: r.contact.invariant } }, series }));
// ── compact console timeline ──
const f = (x, d = 2) => x == null ? "-" : (+x).toFixed(d), i0 = series.findIndex(q => q.inter), iT = series.findIndex(q => q.touch);
console.log(`${TEST}: first manifold step ${series[i0]?.n} t ${f(series[i0]?.t, 4)} · first touch step ${series[iT]?.n} t ${f(series[iT]?.t, 4)} · B ${r.Bres.fell ? "FELL" : "UP"} final ${r.Bres.finalCls} · stepper ${r.Bres.step ? JSON.stringify(r.Bres.step) : r.Bres.refused || "none"}`);
console.log("B events:", JSON.stringify(r.Bres.events));
let cum = [0, 0, 0]; const s0 = series[Math.max(0, i0 - 1)];
for (let k = Math.max(0, i0 - 4); k < Math.min(series.length, i0 + 150); k++) { const q = series[k]; if (q.JAB) cum = V.add(cum, q.JAB); if (!(k < i0 + 30 || k % 6 === 0)) continue; const b = q.B, fl = b.feet.L, fr = b.feet.R;
  const ank = b.joints.find(z => z.j === "ankle_L"), kn = b.joints.find(z => z.j === "knee_L"), hp = b.joints.find(z => z.j === "hip_L");
  console.log(`${q.n} ${f(q.t, 3)} ${q.touch ? "T" : q.inter ? "s" : " "} J ${q.JAB ? q.JAB.map(v => f(v, 2)).join(",") : "-"} (${q.via ?? ""}) cumJx ${f(cum[0], 2)} | ${q.loc.map(c => `${c.a}→${c.b} y${f(c.y, 3)} pB ${c.pB.map(v => f(v, 3)).join(",")}`).join(" ; ")}`);
  console.log(`      B cls ${b.cls} ξm ${f(b.xiMargin * 100, 1)}cm vcom ${b.vcom.map(v => f(v, 3)).join(",")} footL ${fl.state} N${f(fl.load, 0)} sh ${fl.shear.map(v => f(v, 0)).join(",")} v ${fl.v.map(v => f(v, 2)).join(",")} dx ${f((fl.pos[0] - s0.B.feet.L.pos[0]) * 100, 2)}cm slip ${f(fl.slip, 3)} | footR ${fr.state} N${f(fr.load, 0)} | ankL y${f(ank.y, 1)} z${f(ank.z, 1)} tq ${ank.tq.map(v => f(v, 0)).join(",")} sat ${f(ank.sat, 2)} | knL ${f(kn.a, 1)} tq ${f(kn.tq, 0)} | hipL y${f(hp.y, 1)} z${f(hp.z, 1)} tq ${hp.tq.map(v => f(v, 0)).join(",")} sat ${f(hp.sat, 2)} | stage ${b.stage}`); }

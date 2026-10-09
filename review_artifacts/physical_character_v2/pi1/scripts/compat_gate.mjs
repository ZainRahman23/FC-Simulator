// PI-1 simulation ↔ physical-contact COMPATIBILITY GATE + pose compatibility (PI1_COMPAT_GATE.md, thresholds fixed ab9a626). Read-only.
// usage (worktree root): node .../compat_gate.mjs <airDir> <out.json> <case>[,<case>...]
// Per case: the decisive gameplay contact (simulation primitives + segments at its sub-step, from the AIR) against the exact D-1 body posed from the LOCO
// stream with the §4 retarget rules (R-K always; R-B for presentation toe-contact feet) at the corresponding times (row k = after squad tick k+1; sample
// (k, n) = squad time k + n/4, the simulation's own sub-step). Both geometries are written out. Pose tolerances (§3) are evaluated with the plain mapping
// (A) and with R-K + R-B (B) over the promotion-relevant frames (trigger → contact) and, for the recover / near-miss cases, the reconciliation frames.
import fs from "fs"; import vm from "vm"; import path from "path";
const L = await import(new URL("./compat_lib.mjs", import.meta.url).href);
// the simulation's OWN pure runner model (ptRxBody / ptRxSegments) loaded read-only from the baseline worktree into a sandbox: the unperturbed
// gameplay path after the contact (the recorded post-contact simulation body already carries the reaction)
const SIMV = (() => { const ctx = { Math, PT: { LEG_REF: 0.865, IDLE_V: 0.18 }, PT_DT: 1 / 60 }; vm.createContext(ctx);
  vm.runInContext("const clamp01 = (v) => Math.max(0, Math.min(1, v)); const smooth01 = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };", ctx);
  for (const f of ["anim3d/of_loco.js", "pt_react.js"]) vm.runInContext(fs.readFileSync(path.join(process.argv[5], "sandbox/visual", f), "utf8"), ctx, { filename: f });
  return { body: vm.runInContext("ptRxBody", ctx), segs: vm.runInContext("ptRxSegments", ctx), footLenV12: vm.runInContext("PT_REACT.footLenV12", ctx) }; })();
const { V, Q, B, NB, bi, loadAir, m2q, m2p, qang, slerp, rawRotations, project, bootPitchFix, gjk, supportOf, capsuleSupport, capsulePen, bodySep, segSegDist, sim2r, bodyLowest, SELF_PAIRS, swingTwist, Z0, MAP } = L;
const [AIRDIR, OUT, CASES, WT] = process.argv.slice(2), RANK = { NEGLIGIBLE: 0, CORRECTION: 1, STUMBLE: 2, FALL: 3 };
const TOL = { pelvisMm: 10, pelvisDeg: 2, trunkDeg: 3, kneeMm: 10, ankleMm: 10, footContactLo: -0.005, footContactHi: 0.002, footDeg: 5, bootPenMm: 10, limbSwingDeg: 2, twistDeg: 10, armMm: 15, bodyVel: 0.25 };
const SEGMAP = { foot_L: "foot_L", foot_R: "foot_R", shin_L: "shank_L", shin_R: "shank_R", thigh_L: "thigh_L", thigh_R: "thigh_R", pelvis: "pelvis", torso: "abdomen" };
const ADJ = { foot_L: [["shank_L", "ankle"]], foot_R: [["shank_R", "ankle"]], shank_L: [["foot_L", "ankle"], ["thigh_L", "knee"]], shank_R: [["foot_R", "ankle"], ["thigh_R", "knee"]], thigh_L: [["shank_L", "knee"]], thigh_R: [["shank_R", "knee"]] };
// rig bone lengths for rendered rig points (toe-tip sole, elbow / wrist): from the AIR bind (child bind origin − parent bind origin)
function rigGeom(R) { const idx = Object.fromEntries(R.bones.map((b, i) => [b.name, i])), bo = (n) => m2p(R.bind[idx[n]]); return { idx, toeLen: { L: 0.0966, R: 0.0966 }, upperArmLen: V.dist(bo("upperArm_L"), bo("foreArm_L")), foreArmLen: V.dist(bo("foreArm_L"), bo("hand_L")) }; }
// pose a row with the plain mapping or the retarget (R-K + R-B on presentation toe-contact feet)
function pose(R, k, mode) { const pr = R.pres[k], rr = rawRotations(R.bones, R.bind, pr.world, { rk: mode === "B" }), pj = project(rr.raw, pr.world, rr.idx), fix = {};
  if (mode === "B") for (const [n, sd] of [[0, "L"], [1, "R"]]) { const f = pr.feet[n]; if (f.contact && f.mode === "toe") { const r = bootPitchFix(pj.S, sd); fix[sd] = r; if (isFinite(r.deg) && r.deg > 0) pj.S[bi("foot_" + sd)] = { pos: pj.S[bi("foot_" + sd)].pos, rot: r.rot }; } }
  return { ...pj, raw: rr.raw, rk: rr.info, rb: fix, idx: rr.idx }; }
const interp = (P0, P1, t) => P1.S.map((s, i) => ({ rot: slerp(P0.S[i].rot, s.rot, t), pos: V.lerp(P0.S[i].pos, s.pos, t) }));
// §3 tolerances on one frame (posed P vs the presentation row)
function tolerances(R, k, P, Pprev, G) { const pr = R.pres[k], w = pr.world, idx = P.idx, rot = (vb) => P.S[bi(vb)].rot, rigRot = (rb) => Q.norm(Q.mul(m2q(w[idx[rb]]), Q.conj(m2q(R.bind[idx[rb]]))));
  const rend = (vb) => Q.norm(Q.mul(rot(vb), Q.conj(Z0[bi(vb)].rot))), out = { fails: [] }, chk = (name, v, lim, cmp = "le") => { out[name] = +v.toFixed(3); if (cmp === "le" ? v > lim : false) out.fails.push(name); };
  const hipMidRig = V.sc(V.add(m2p(w[idx.thigh_L]), m2p(w[idx.thigh_R])), 0.5), hipMidV2 = V.sc(V.add(P.S[bi("thigh_L")].pos, P.S[bi("thigh_R")].pos), 0.5);
  chk("pelvisMm", V.dist(hipMidRig, hipMidV2) * 1000, TOL.pelvisMm); chk("pelvisDeg", qang(rend("pelvis"), rigRot("pelvis")), TOL.pelvisDeg);
  chk("trunkDeg", Math.max(qang(rend("abdomen"), rigRot("spine")), qang(rend("thorax"), rigRot("chest")), qang(rend("head"), rigRot("head"))), TOL.trunkDeg);
  let kn = 0, an = 0, fd = 0, ls = 0, tw = 0, arm = 0, bootPen = 0, footContact = [];
  for (const sd of ["L", "R"]) { kn = Math.max(kn, V.dist(m2p(w[idx["shin_" + sd]]), P.S[bi("shank_" + sd)].pos)); an = Math.max(an, V.dist(m2p(w[idx["foot_" + sd]]), P.S[bi("foot_" + sd)].pos));
    fd = Math.max(fd, qang(rend("foot_" + sd), rigRot("foot_" + sd)));
    for (const [rb, vb] of [["thigh_" + sd, "thigh_" + sd], ["shin_" + sd, "shank_" + sd]]) { const st = swingTwist(rigRot(rb), rend(vb), [0, -1, 0]); ls = Math.max(ls, st.swing); tw = Math.max(tw, Math.abs(st.twist)); }
    arm = Math.max(arm, qang(rend("upperArm_" + sd), rigRot("upperArm_" + sd)) * Math.PI / 180 * G.upperArmLen * 1000, qang(rend("forearm_" + sd), rigRot("foreArm_" + sd)) * Math.PI / 180 * (G.upperArmLen + G.foreArmLen) * 1000);
    const f = pr.feet[sd === "L" ? 0 : 1], lo = bodyLowest(B[bi("foot_" + sd)], P.S[bi("foot_" + sd)]).y; if (f.contact) { footContact.push({ foot: sd, mode: f.mode, lowestMm: +(lo * 1000).toFixed(1) }); if (lo < TOL.footContactLo || lo > TOL.footContactHi) out.fails.push("footContact_" + sd); }
    // rendered rig toe-tip sole under the V2 foot rotation (the rig foot is rendered with the V2 foot's rotation; toe keeps its local rotation)
    const qF = rend("foot_" + sd), qFr = rigRot("foot_" + sd), dq = Q.mul(qF, Q.conj(qFr)), A = m2p(w[idx["foot_" + sd]]), T = m2p(w[idx["toe_" + sd]]), toeM = w[idx["toe_" + sd]], tipLocal = [0, -0.031, G.toeLen[sd]];
    const tip = V.add(T, Q.rot(m2q(toeM), tipLocal)), tipR = V.add(A, Q.rot(dq, V.sub(tip, A))); bootPen = Math.max(bootPen, -Math.min(0, tipR[1]) * 1000 - Math.max(0, -tip[1]) * 1000); }
  chk("kneeMm", kn * 1000, TOL.kneeMm); chk("ankleMm", an * 1000, TOL.ankleMm); chk("footDeg", fd, TOL.footDeg); chk("limbSwingDeg", ls, TOL.limbSwingDeg); chk("twistDeg", tw, TOL.twistDeg); chk("armMm", arm, TOL.armMm); chk("bootPenAddedMm", bootPen, TOL.bootPenMm);
  out.footContact = footContact; if (P.rb) out.bootPitchFixDeg = Object.fromEntries(Object.entries(P.rb).map(([s, r]) => [s, +(+r.deg).toFixed(2)]));
  return out; }
// raw (unretargeted, unprojected) chain → body COM positions, for the velocity tolerance (retarget-induced velocity difference)
function rawChain(raw, world, idx) { const S = new Array(NB); const hm = V.sc(V.add(m2p(world[idx.thigh_L]), m2p(world[idx.thigh_R])), 0.5); S[0] = { rot: raw[0], pos: null };
  const hipL = L.spec.joints.find(j => j.name === "hip_L").at, hipR = L.spec.joints.find(j => j.name === "hip_R").at; S[0].pos = V.sub(hm, Q.rot(raw[0], V.sub(V.sc(V.add(hipL, hipR), 0.5), B[0].origin)));
  for (const j of L.spec.joints) S[j.childIndex] = { rot: raw[j.childIndex], pos: V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, V.sub(B[j.childIndex].origin, B[j.parentIndex].origin))) }; return S; }
const comOf = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, V.sub(B[i].com || B[i].origin, B[i].origin)));
const out = { gate: "PI1_COMPAT_GATE.md (ab9a626)", airDir: AIRDIR, cases: {} };
for (const cs of CASES.split(",")) {
  const R = loadAir(AIRDIR, `${cs}_LOCO.json.gz`), RF = loadAir(AIRDIR, `${cs}_FULL.json.gz`), G = rigGeom(R), N = R.pres.length;
  const contacts = R.events.filter(e => e.kind === "PLAYER_CONTACT"), finalCls = contacts.reduce((m, e) => (RANK[e.react || e.cls] > RANK[m] ? (e.react || e.cls) : m), "NEGLIGIBLE");
  const dec = contacts.find(e => (e.react || e.cls) === finalCls) || null, trigger = R.pred.findIndex(x => x != null && x <= 0.25);
  const res = { finalClass: contacts.length ? finalCls : "NO_CONTACT", trigger, contacts: contacts.map(e => ({ tick: e.tick, sub: e.sub, prim: e.prim, seg: e.seg, segPlanted: e.segPlanted, react: e.react || e.cls, J: e.J })), criteria: {}, pose: {} };
  const PA = [], PB = []; for (let k = 0; k < N; k++) { PA.push(null); PB.push(null); }
  const getP = (k, mode) => { const arr = mode === "A" ? PA : PB; return arr[k] || (arr[k] = pose(R, k, mode)); };
  const poseAt = (t) => { const k = Math.ceil(t - 1e-9) - 1, n = Math.round((t - k) * 4); return interp(getP(k - 1, "B"), getP(k, "B"), n / 4); };   // sample time t = k + n/4
  // ── pose compatibility (A / B) over the promotion frames and (recover / miss) the reconciliation frames ──
  const cRow = dec ? dec.tick - 1 : null, promoFrames = [], reconFrames = [];
  for (let k = trigger; k <= (cRow != null ? cRow : trigger + 6); k++) promoFrames.push(k);
  if (!dec || finalCls !== "FALL") { const r0 = cRow != null ? cRow + 7 : trigger + 7; for (let k = r0; k <= Math.min(N - 1, r0 + 24); k++) reconFrames.push(k); }
  for (const [label, frames, src] of [["promotion (LOCO)", promoFrames, R], ["reconciliation (FULL)", reconFrames, RF]]) for (const mode of ["A", "B"]) {
    const rows = []; for (const k of frames) { const P = src === R ? getP(k, mode) : pose(src, k, mode), t = tolerances(src, k, P, null, G); rows.push({ row: k, fails: t.fails, ...t }); }
    const failing = rows.filter(r => r.fails.length); res.pose[label + " " + mode] = { frames: frames.length, failingFrames: failing.length, worst: Object.fromEntries(["pelvisMm", "pelvisDeg", "trunkDeg", "kneeMm", "ankleMm", "footDeg", "limbSwingDeg", "twistDeg", "armMm", "bootPenAddedMm"].map(q => [q, rows.length ? Math.max(...rows.map(r => r[q] || 0)) : null])),
      failItems: [...new Set(failing.flatMap(r => r.fails))], failRows: failing.slice(0, 12).map(r => ({ row: r.row, fails: r.fails, footContact: r.footContact, bootPitchFixDeg: r.bootPitchFixDeg })) }; }
  const cls = (lbl) => { const a = res.pose[lbl + " A"], b = res.pose[lbl + " B"]; if (!a || !a.frames) return null; return a.failingFrames === 0 ? "A" : b.failingFrames === 0 ? "B" : "C"; };
  res.poseClass = { promotion: cls("promotion (LOCO)"), reconciliation: cls("reconciliation (FULL)") };
  // velocity tolerance: V2 (R-K + R-B) body COM velocity vs the presentation's own material point (the same COM offset carried rigidly by the rig bone, anchored at the rig joint)
  { const anchorOf = { pelvis: null, abdomen: "spine", thorax: "chest", head: "head", upperArm_L: "upperArm_L", upperArm_R: "upperArm_R", forearm_L: "foreArm_L", forearm_R: "foreArm_R", thigh_L: "thigh_L", thigh_R: "thigh_R", shank_L: "shin_L", shank_R: "shin_R", foot_L: "foot_L", foot_R: "foot_R" };
    const refCom = (k, i) => { const pr = R.pres[k], rr = rawRotations(R.bones, R.bind, pr.world, {}), nm = B[i].name, rb = anchorOf[nm], P0 = getP(k, "B"); const org = rb ? m2p(pr.world[rr.idx[rb]]) : P0.S[0].pos; return V.add(org, Q.rot(rr.raw[i], B[i].comLocal)); };
    const v2Com = (k, i) => { const P = getP(k, "B"); return V.add(P.S[i].pos, Q.rot(P.S[i].rot, B[i].comLocal)); };
    let worst = { d: 0 }; for (const k of promoFrames) { if (k < 1) continue; for (let i = 0; i < NB; i++) { if (/^(upperArm|forearm|abdomen|thorax|head)/.test(B[i].name) && false) continue; const v = V.sc(V.sub(v2Com(k, i), v2Com(k - 1, i)), 60), u = V.sc(V.sub(refCom(k, i), refCom(k - 1, i)), 60), d = V.dist(v, u); if (d > worst.d) worst = { d, body: B[i].name, row: k }; } }
    res.pose.velocityCheck = { maxBodyVelDiffMs: +worst.d.toFixed(3), body: worst.body, row: worst.row, limit: TOL.bodyVel, pass: worst.d <= TOL.bodyVel }; }
  // ── self-collision (CG-8): trigger → contact + 6 ticks, LOCO, R-K + R-B ──
  { let worst = { d: Infinity }; const k1 = Math.min(N - 1, (cRow != null ? cRow : trigger + 30) + 6); for (let k = Math.max(1, trigger); k <= k1; k++) for (let n = 1; n <= 4; n++) { const S = interp(getP(k - 1, "B"), getP(k, "B"), n / 4);
      for (const [i, j] of SELF_PAIRS) { const s = bodySep(i, j, S); if (s.d < worst.d) worst = { d: s.d, pair: B[i].name + "↔" + B[j].name, t: k + n / 4 }; } }
    res.criteria["CG-8 self-collision"] = { minSepMm: +(worst.d * 1000).toFixed(1), pair: worst.pair, at: worst.t, pass: worst.d >= -0.010 }; }
  if (!dec) {   // NEAR MISS
    let md = { d: Infinity }; for (let k = Math.max(1, trigger - 2); k < N; k++) for (let n = 1; n <= 4; n++) { const prs = R.prims[k] && R.prims[k][n - 1]; if (!prs || !prs.length) continue; const S = interp(getP(k - 1, "B"), getP(k, "B"), n / 4);
      for (const pr of prs) { const a = sim2r(pr.a), b = sim2r(pr.b); for (let i = 0; i < NB; i++) { const pen = capsulePen(a, b, pr.r, i, S, 60); if (-pen.pen < md.d) md = { d: -pen.pen, prim: pr.prim, body: B[i].name, t: k + n / 4 }; } } }
    res.criteria.NM = { simContact: false, predictorFires: trigger >= 0, minD1DistM: +md.d.toFixed(4), closest: md, pass: trigger >= 0 && md.d > 0 };
    res.pass = res.criteria.NM.pass && res.criteria["CG-8 self-collision"].pass; out.cases[cs] = res; console.log(cs, JSON.stringify(res.criteria), "poseClass", JSON.stringify(res.poseClass)); continue; }
  // ── decisive contact geometry ──
  const T = dec.tick, sub = dec.sub, tSim = T - 1 + sub / 4, row = T - 1, simB = R.simBody[row][sub - 1], simSeg = simB.segs.find(g => g.name === dec.seg), simPr = R.prims[row][sub - 1].find(p => p.prim === dec.prim), mapped = SEGMAP[dec.seg], mi = bi(mapped);
  res.decisive = { tick: T, sub, tSim, prim: dec.prim, seg: dec.seg, mappedBody: mapped, segPlanted: dec.segPlanted, react: finalCls, J: dec.J, point: dec.point, normal: dec.normal, vn: dec.vn, vt: dec.vt, support: dec.support };
  res.geometry = { simPrimitive: simPr, simSegment: simSeg };
  // per-sample series around the contact: simulation overlap (prim vs the struck segment) and D-1 penetration (prim vs every body; mapped body tracked)
  const pre = R.rows[row - 1], NPf = 6, pIdx = 8, cPre = { p: { x: pre[pIdx], y: pre[pIdx + 1], vx: pre[pIdx + 2], vy: pre[pIdx + 3], facing: pre[pIdx + 4], gaitPhase: pre[pIdx + 5], legLen: R.legLen[0] } }, tPre = row;   // state after squad tick T−1 = squad time T−1
  const series = []; let firstD1 = null, prevS = null, prevPr = null;
  for (let k = Math.max(1, row - 6); k <= Math.min(N - 1, row + 8); k++) for (let n = 1; n <= 4; n++) { const t = k + n / 4, prs = R.prims[k][n - 1], pr = prs.find(p => p.prim === dec.prim);
    const sbU = SIMV.segs(SIMV.body(cPre, (t - tPre) / 60, SIMV.footLenV12)), sgU = sbU.find(g => g.name === dec.seg), sb = R.simBody[k][n - 1], sg = sb.segs.find(g => g.name === dec.seg);
    const ovU = pr && sgU ? pr.r + sgU.r - segSegDist(pr.a, pr.b, sgU.a, sgU.b).d : null, ovR = pr && sg ? pr.r + sg.r - segSegDist(pr.a, pr.b, sg.a, sg.b).d : null, S = interp(getP(k - 1, "B"), getP(k, "B"), n / 4), a = sim2r(pr.a), b = sim2r(pr.b);
    const pens = {}; let best = { pen: -Infinity, body: null }; for (let i = 0; i < NB; i++) { const pp = capsulePen(a, b, pr.r, i, S, 160); pens[B[i].name] = pp.pen; if (pp.pen > best.pen) best = { pen: pp.pen, body: B[i].name, p: pp.p }; }
    const rec = { t, simOverlapUnperturbedMm: ovU != null ? +(ovU * 1000).toFixed(1) : null, simOverlapRecordedMm: ovR != null ? +(ovR * 1000).toFixed(1) : null, d1MappedPenMm: +(pens[mapped] * 1000).toFixed(1), d1AnyPenMm: +(best.pen * 1000).toFixed(1), d1AnyBody: best.body,
      d1Pens: Object.fromEntries(Object.entries(pens).filter(([, v]) => v > -0.06).map(([kk, v]) => [kk, +(v * 1000).toFixed(1)])), primAxis: [a, b], primR: pr.r, simSegUnperturbed: sgU };
    if (!firstD1 && best.pen > 0) { const bi1 = bi(best.body), Sp = prevS || S, prp = prevPr || pr, ap = sim2r(prp.a), bp = sim2r(prp.b); let wb = { d: Infinity }; for (const sh of B[bi1].shapes) { const q = gjk(capsuleSupport(ap, bp, prp.r), supportOf(sh, Sp[bi1])); if (!q.overlap && q.d < wb.d) wb = q; }
      firstD1 = { t, body: best.body, deepestAxisPoint: best.p, witness: isFinite(wb.d) ? { t: t - 0.25, pA: wb.pA, pB: wb.pB, S: Sp, primV: prp.v, body: best.body } : null }; }
    prevS = S; prevPr = pr; series.push(rec); }
  res.series = series;
  // CG-1 segment (adjacent body accepted if the D-1 contact point is ≤ 30 mm from the shared joint)
  const jointPos = (S, nm) => nm === "ankle_L" ? S[bi("foot_L")].pos : nm === "ankle_R" ? S[bi("foot_R")].pos : nm === "knee_L" ? S[bi("shank_L")].pos : nm === "knee_R" ? S[bi("shank_R")].pos : null;
  let adj = null; if (firstD1 && firstD1.body !== mapped && firstD1.witness) for (const [b2, jn] of ADJ[mapped] || []) if (b2 === firstD1.body) { const sd = mapped.slice(-1), jp = jointPos(firstD1.witness.S, jn + "_" + sd); adj = { body: b2, joint: jn, distMm: +(V.dist(firstD1.witness.pB, jp) * 1000).toFixed(1) }; }
  res.criteria["CG-1 segment"] = { sim: dec.seg, mapped, d1First: firstD1 ? firstD1.body : null, adjacency: adj, pass: !!firstD1 && (firstD1.body === mapped || (!!adj && adj.distMm <= 30)) };
  const region = [mapped].concat(adj && adj.distMm <= 30 ? [adj.body] : []);
  // CG-2 support state (both legs)
  { const Prow = getP(row, "B"), Pprev = getP(row - 1, "B"), S = interp(Pprev, Prow, sub / 4), agree = {}; let ok = true;
    for (const [n, sd] of [[0, "L"], [1, "R"]]) { const simPl = simB.legs[sd].planted, presFlags = [R.pres[row - 1].feet[n].contact, R.pres[row].feet[n].contact], lo = bodyLowest(B[bi("foot_" + sd)], S[bi("foot_" + sd)]).y, d1 = lo <= 0.005 ? true : lo >= 0.015 ? false : "transitional";
      const a = presFlags.includes(simPl) && d1 === simPl; agree[sd] = { sim: simPl, up: +simB.legs[sd].up.toFixed(3), presentation: presFlags, presModes: [R.pres[row - 1].feet[n].mode, R.pres[row].feet[n].mode], d1LowestMm: +(lo * 1000).toFixed(1), d1: d1, agree: a }; ok = ok && a; }
    res.criteria["CG-2 support"] = { ...agree, pass: ok }; }
  // CG-3 timing
  res.criteria["CG-3 timing"] = { tSim, tD1: firstD1 ? firstD1.t : null, dTicks: firstD1 ? +(firstD1.t - tSim).toFixed(2) : null, pass: !!firstD1 && Math.abs(firstD1.t - tSim) <= 1 + 1e-9 };
  // CG-4 location
  { const simP = sim2r(dec.point), w = firstD1 && firstD1.witness; let pass = false, dist = null, sSim = null, sD1 = null;
    if (w) { dist = Math.hypot(w.pB[0] - simP[0], w.pB[2] - simP[2]); const sa = sim2r(simSeg.a), sb2 = sim2r(simSeg.b), proj = (p, a, b) => V.dot(V.sub(p, a), V.sub(b, a)) / V.dot(V.sub(b, a), V.sub(b, a)); sSim = proj(simP, sa, sb2);
      const Sb = w.S, segA = Sb[mi].pos, segB = mapped.startsWith("shank") ? Sb[bi(mapped.replace("shank", "foot"))].pos : mapped.startsWith("thigh") ? Sb[bi(mapped.replace("thigh", "shank"))].pos : mapped.startsWith("foot") ? V.add(Sb[mi].pos, Q.rot(Sb[mi].rot, [0, -0.07, 0.22])) : V.add(Sb[mi].pos, [0, 0.2, 0]);
      sD1 = proj(w.pB, segA, segB); pass = dist <= 0.10 && Math.abs(sD1 - sSim) <= 0.25; }
    res.criteria["CG-4 location"] = { horizDistM: dist != null ? +dist.toFixed(3) : null, sSim: sSim != null ? +sSim.toFixed(3) : null, sD1: sD1 != null ? +sD1.toFixed(3) : null, simPoint: simP, d1Point: w ? w.pB : null, pass }; }
  // CG-5 overlap order over [tSim, tSim + 0.10 s], both UNPERTURBED (simulation: its own body model extrapolated from the pre-contact state;
  // D-1: the LOCO presentation), the D-1 region = the mapped body (+ the adjacent body CG-1 accepted)
  { const win = series.filter(r => r.t >= tSim - 1e-9 && r.t <= tSim + 6 + 1e-9), sMax = Math.max(...win.map(r => r.simOverlapUnperturbedMm != null ? r.simOverlapUnperturbedMm : -1e9)), dMax = Math.max(...win.map(r => Math.max(...region.map(nm => r.d1Pens[nm] != null ? r.d1Pens[nm] : -1e9)))), ratio = sMax > 0 ? dMax / sMax : null;
    res.criteria["CG-5 overlap"] = { region, simMaxUnperturbedMm: sMax, d1MaxMm: dMax, ratio: ratio != null ? +ratio.toFixed(3) : null, pass: ratio != null && ratio >= 1 / 3 && ratio <= 3 }; }
  // CG-6 approach direction (horizontal, simulation 2D frame: x = render x, y = −render z)
  { const w = firstD1 && firstD1.witness, n = dec.normal, simN = [n[0], n[1]], tng = [-n[1], n[0]], simRel = [dec.vn * n[0] + (dec.vt || 0) * tng[0], dec.vn * n[1] + (dec.vt || 0) * tng[1]], ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1)))) * 180 / Math.PI;
    let d1N = null, d1Rel = null, aN = null, aV = null;
    if (w) { const nn = V.sub(w.pB, w.pA); d1N = [nn[0], -nn[2]]; const S1 = w.S, S0 = poseAt(w.t - 0.25), local = Q.rot(Q.conj(S1[mi].rot), V.sub(w.pB, S1[mi].pos)), pB0 = V.add(S0[mi].pos, Q.rot(S0[mi].rot, local)), vB = V.sc(V.sub(w.pB, pB0), 240);
      const prv = w.primV ? [w.primV[0], w.primV[1]] : [0, 0]; d1Rel = [prv[0] - vB[0], prv[1] - (-vB[2])]; aN = ang(simN, d1N); aV = ang(simRel, d1Rel); }
    res.criteria["CG-6 approach"] = { simNormal: simN, d1Normal: d1N ? d1N.map(x => +x.toFixed(4)) : null, normalAngleDeg: aN != null ? +aN.toFixed(1) : null, simRelVel: simRel.map(x => +x.toFixed(3)), d1RelVel: d1Rel ? d1Rel.map(x => +x.toFixed(3)) : null, relVelAngleDeg: aV != null ? +aV.toFixed(1) : null, pass: aN != null && aN <= 45 && aV != null && aV <= 45 }; }
  // CG-7 no pose discontinuity: pose tolerances (B) over the promotion frames + primitive continuity
  { const pp = res.pose["promotion (LOCO) B"]; let jump = 0; const seq = []; for (let k = Math.max(1, trigger); k <= row + 2; k++) for (let n = 1; n <= 4; n++) seq.push(R.prims[k][n - 1]);
    for (let q = 2; q < seq.length; q++) for (const p of seq[q]) { const p1 = seq[q - 1].find(x => x.prim === p.prim), p0 = seq[q - 2].find(x => x.prim === p.prim); if (!p1 || !p0) continue;
      for (const e of ["a", "b"]) { const d1 = [0, 1, 2].map(i => p[e][i] - p1[e][i]), d0 = [0, 1, 2].map(i => p1[e][i] - p0[e][i]); jump = Math.max(jump, Math.hypot(d1[0] - d0[0], d1[1] - d0[1], d1[2] - d0[2])); } }
    res.criteria["CG-7 pose continuity"] = { poseFailingFrames: pp.failingFrames, poseFailItems: pp.failItems, primitiveMaxDisplacementChangeMm: +(jump * 1000).toFixed(1), velocity: res.pose.velocityCheck, pass: pp.failingFrames === 0 && jump <= 0.010 && res.pose.velocityCheck.pass }; }
  res.pass = Object.values(res.criteria).every(c => c.pass);
  out.cases[cs] = res; console.log(cs, "class", finalCls, "pass", res.pass, JSON.stringify(Object.fromEntries(Object.entries(res.criteria).map(([k, v]) => [k, v.pass]))), "poseClass", JSON.stringify(res.poseClass));
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

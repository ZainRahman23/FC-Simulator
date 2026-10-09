// PI-1 REV1 GATE RERUN (PI1_REV1_PREREG.md §6): compat_gate_v13.mjs with PCG-F0 → PCG-REV1 (knee R-K — PM-2 not adopted under §5 — + RF-1 rigid-foot
// reconciliation rows), on V1.3 unchanged; CG-1 … CG-8 / NM / the CG-7 window incl. the tackler-primitive sub-item unchanged. Derived from:
// PI-1 Track B: simulation ↔ physical-contact COMPATIBILITY GATE on slide-contact V1.3 (CHARCOLLIDE-1) with the F0 POSE-COMPATIBILITY GATE (PCG-F0).
// Thresholds: PI1_COMPAT_GATE.md (ab9a626) unchanged; PCG-F0 rows: TRACKB_PREREG.md §3 + A2. Derived from pi1/scripts/compat_gate.mjs (v1.2, unchanged):
// PM-1-F0 pose (R-K, no R-B, no vertical shift), toe_X → F0 foot_X, tapered simulation overlaps (ptRxSegR), PCG-F0 rows P-1 … P-17, frames per A2.
// usage (worktree root): node .../compat_gate_v13.mjs <airDir> <out.json> <case>[,<case>...] <v1.3 worktree>
import fs from "fs";
process.env.V13_WT = process.env.V13_WT || process.argv[5];
const M = await import(new URL("./pcg_rev1.mjs", import.meta.url).href);
const { L, SIMV, PROF, segR, TOL, SEGMAP, ADJ, AXES, relRot, onBody, rigGeom, interp, RANK, makeMapper, geomRowsRev1, kinRowsRev1 } = M; const KNEE = process.env.REV1_KNEE || "RK";
const { V, Q, B, NB, bi, loadAir, m2q, m2p, qang, slerp, rawRotations, project, gjk, supportOf, capsuleSupport, capsulePen, bodySep, sim2r, bodyLowest, SELF_PAIRS, swingTwist, Z0 } = L;
const [AIRDIR, OUT, CASES] = process.argv.slice(2);
const out = { gate: "PI1_COMPAT_GATE.md (ab9a626) + PI1_REV1_PREREG.md (PCG-REV1: knee " + KNEE + " + RF-1)", airDir: AIRDIR, profileSha: SIMV.g("PT_CHARCOLLIDE.profiles.vinicius.rigSha256"), cases: {} };
for (const cs of CASES.split(",")) {
  const R = loadAir(AIRDIR, `${cs}_LOCO.json.gz`), G = rigGeom(R), N = R.pres.length;
  const contacts = R.events.filter(e => e.kind === "PLAYER_CONTACT"), finalCls = contacts.reduce((m, e) => (RANK[e.react || e.cls] > RANK[m] ? (e.react || e.cls) : m), "NEGLIGIBLE");
  const dec = contacts.find(e => (e.react || e.cls) === finalCls) || null, trigger = R.pred.findIndex(x => x != null && x <= 0.25);
  const res = { finalClass: contacts.length ? finalCls : "NO_CONTACT", trigger, contacts: contacts.map(e => ({ tick: e.tick, sub: e.sub, prim: e.prim, seg: e.seg, segPlanted: e.segPlanted, react: e.react || e.cls, J: e.J })), criteria: {}, pcg: {} };
  if (trigger < 0) { res.pass = false; res.note = "the predictor never fires"; out.cases[cs] = res; console.log(cs, "no trigger"); continue; }
  const mapper = makeMapper(R, { knee: KNEE, rf1: true }), getP = (k) => mapper.poseAt(k);
  const poseAt = (t) => { const k = Math.ceil(t - 1e-9) - 1, n = Math.round((t - k) * 4); return interp(getP(k - 1), getP(k), n / 4); };
  const cRow = dec ? dec.tick - 1 : null; let endRow;
  if (dec) endRow = cRow; else { endRow = Math.min(N - 1, trigger + 60); for (let k = trigger + 1; k <= Math.min(N - 1, trigger + 60); k++) if (R.pred[k] != null && R.pred[k] > 0.25 && R.dnow[k] > R.dnow[k - 1]) { endRow = k; break; } }
  const frames = []; for (let k = trigger; k <= endRow; k++) frames.push(k);
  const rows = frames.map(k => { const g = geomRowsRev1(R, k, trigger, mapper, G), v = kinRowsRev1(R, k, trigger, mapper); return { row: k, ...g, ...v, fails: g.fails.concat(v.fails) }; });   // fails last: the spreads must not overwrite the combined list (bug fixed before any reported result)
  const atKp = rows[0], failing = rows.filter(r => r.fails.length);
  res.pcg = { promotionFrame: { row: trigger, eligible: atKp.fails.length === 0, fails: atKp.fails, values: atKp }, window: { from: trigger, to: endRow, frames: frames.length, failingFrames: failing.length, failItems: [...new Set(failing.flatMap(r => r.fails))],
    worst: Object.fromEntries(["P1_pelvisMm", "P2_pelvisDeg", "P3_trunkDeg", "P4_hipMm", "P4_kneeMm", "P4_ankleMm", "P6_limbSwingDeg", "P7_twistDeg", "P8_armMm", "P11_renderedBootPenMm", "P12_clampMaxDeg", "P14_bodyVelMs", "P15_angVelRadS", "P16_comVelMs", "P17_dL", "TR1_footIncDeg", "TR1_footAngVelRadS"].map(q => [q, Math.max(...rows.map(r => r[q] || 0))])),
    minP10Mm: Math.min(...rows.map(r => r.P10_nonContactLowestMm)), minP13Mm: Math.min(...rows.map(r => r.P13_minSelfSepMm)), failRows: failing.slice(0, 16).map(r => ({ row: r.row, fails: r.fails, foot: r.foot, p15: [r.P15_body, r.P15_axial, r.P15_transverse] })),
    report: rows.map(r => ({ row: r.row, foot: r.foot })) } };
  // CG-8 self-collision (trigger → contact + 6 ticks, sub-steps)
  { let worst = { d: Infinity }; const k1 = Math.min(N - 1, (cRow != null ? cRow : endRow) + 6); for (let k = Math.max(1, trigger); k <= k1; k++) for (let n = 1; n <= 4; n++) { const S = interp(getP(k - 1), getP(k), n / 4);
      for (const [i, j] of SELF_PAIRS) { const s = bodySep(i, j, S); if (s.d < worst.d) worst = { d: s.d, pair: B[i].name + "↔" + B[j].name, t: k + n / 4 }; } }
    res.criteria["CG-8 self-collision"] = { minSepMm: +(worst.d * 1000).toFixed(1), pair: worst.pair, at: worst.t, pass: worst.d >= -0.010 }; }
  if (!dec) {   // NEAR MISS: NM + CG-7 (PCG window) + CG-8
    let md = { d: Infinity }; for (let k = Math.max(1, trigger - 2); k < N; k++) for (let n = 1; n <= 4; n++) { const prs = R.prims[k] && R.prims[k][n - 1]; if (!prs || !prs.length) continue; const S = interp(getP(k - 1), getP(k), n / 4);
      for (const pr of prs) { const a = sim2r(pr.a), b = sim2r(pr.b); for (let i = 0; i < NB; i++) { const pen = capsulePen(a, b, pr.r, i, S, 60); if (-pen.pen < md.d) md = { d: -pen.pen, prim: pr.prim, body: B[i].name, t: k + n / 4 }; } } }
    res.criteria.NM = { simContact: false, predictorFires: trigger >= 0, minD1DistM: +md.d.toFixed(4), closest: md, pass: trigger >= 0 && md.d > 0 };
    res.criteria["CG-7 pose continuity (PCG-F0 window)"] = { failingFrames: res.pcg.window.failingFrames, failItems: res.pcg.window.failItems, pass: res.pcg.window.failingFrames === 0 };
    res.pass = Object.values(res.criteria).every(c => c.pass); out.cases[cs] = res; console.log(cs, "NO_CONTACT pass", res.pass, "PCG@kp", res.pcg.promotionFrame.eligible, JSON.stringify(Object.fromEntries(Object.entries(res.criteria).map(([k, v]) => [k, v.pass])))); continue; }
  // ── decisive contact geometry ──
  const T = dec.tick, sub = dec.sub, tSim = T - 1 + sub / 4, row = T - 1, simB = R.simBody[row][sub - 1], simSeg = simB.segs.find(g => g.name === dec.seg), simPr = R.prims[row][sub - 1].find(p => p.prim === dec.prim), mapped = SEGMAP[dec.seg], mi = bi(mapped);
  res.decisive = { tick: T, sub, tSim, prim: dec.prim, seg: dec.seg, mappedBody: mapped, segPlanted: dec.segPlanted, react: finalCls, J: dec.J, point: dec.point, normal: dec.normal, vn: dec.vn, vt: dec.vt, support: dec.support };
  res.geometry = { simPrimitive: simPr, simSegment: simSeg };
  const pre = R.rows[row - 1], pIdx = 8, cPre = { char: "vinicius", p: { x: pre[pIdx], y: pre[pIdx + 1], vx: pre[pIdx + 2], vy: pre[pIdx + 3], facing: pre[pIdx + 4], gaitPhase: pre[pIdx + 5], legLen: R.legLen[0] } }, tPre = row;
  const series = []; let firstD1 = null, prevS = null, prevPr = null;
  for (let k = Math.max(1, row - 6); k <= Math.min(N - 1, row + 8); k++) for (let n = 1; n <= 4; n++) { const t = k + n / 4, prs = R.prims[k][n - 1], pr = prs.find(p => p.prim === dec.prim);
    const sbU = SIMV.segs(SIMV.body(cPre, (t - tPre) / 60, SIMV.footLenV12)), sgU = sbU.find(g => g.name === dec.seg), sb = R.simBody[k][n - 1], sg = sb.segs.find(g => g.name === dec.seg);
    const ccU = pr && sgU ? SIMV.segseg(pr.a, pr.b, sgU.a, sgU.b) : null, ccR = pr && sg ? SIMV.segseg(pr.a, pr.b, sg.a, sg.b) : null;
    const ovU = ccU ? pr.r + segR(sgU, ccU.t) - ccU.d : null, ovR = ccR ? pr.r + segR(sg, ccR.t) - ccR.d : null, S = interp(getP(k - 1), getP(k), n / 4), a = sim2r(pr.a), b = sim2r(pr.b);
    const pens = {}; let best = { pen: -Infinity, body: null }; for (let i = 0; i < NB; i++) { const pp = capsulePen(a, b, pr.r, i, S, 160); pens[B[i].name] = pp.pen; if (pp.pen > best.pen) best = { pen: pp.pen, body: B[i].name, p: pp.p }; }
    series.push({ t, simOverlapUnperturbedMm: ovU != null ? +(ovU * 1000).toFixed(1) : null, simOverlapRecordedMm: ovR != null ? +(ovR * 1000).toFixed(1) : null, d1MappedPenMm: +(pens[mapped] * 1000).toFixed(1), d1AnyPenMm: +(best.pen * 1000).toFixed(1), d1AnyBody: best.body,
      d1Pens: Object.fromEntries(Object.entries(pens).filter(([, v]) => v > -0.06).map(([kk, v]) => [kk, +(v * 1000).toFixed(1)])), primAxis: [a, b], primR: pr.r, simSegUnperturbed: sgU });
    if (!firstD1 && best.pen > 0) { const bi1 = bi(best.body), Sp = prevS || S, prp = prevPr || pr, ap = sim2r(prp.a), bp = sim2r(prp.b); let wb = { d: Infinity }; for (const sh of B[bi1].shapes) { const q = gjk(capsuleSupport(ap, bp, prp.r), supportOf(sh, Sp[bi1])); if (!q.overlap && q.d < wb.d) wb = q; }
      firstD1 = { t, body: best.body, deepestAxisPoint: best.p, witness: isFinite(wb.d) ? { t: t - 0.25, pA: wb.pA, pB: wb.pB, S: Sp, primV: prp.v, body: best.body } : null }; }
    prevS = S; prevPr = pr; }
  res.series = series;
  // CG-1 segment
  const jointPos = (S, nm) => nm === "ankle_L" ? S[bi("foot_L")].pos : nm === "ankle_R" ? S[bi("foot_R")].pos : nm === "knee_L" ? S[bi("shank_L")].pos : nm === "knee_R" ? S[bi("shank_R")].pos : null;
  let adj = null; if (firstD1 && firstD1.body !== mapped && firstD1.witness) for (const [b2, jn] of ADJ[mapped] || []) if (b2 === firstD1.body) { const sd = mapped.slice(-1), jp = jointPos(firstD1.witness.S, jn + "_" + sd); adj = { body: b2, joint: jn, distMm: +(V.dist(firstD1.witness.pB, jp) * 1000).toFixed(1) }; }
  res.criteria["CG-1 segment"] = { sim: dec.seg, mapped, d1First: firstD1 ? firstD1.body : null, adjacency: adj, pass: !!firstD1 && (firstD1.body === mapped || (!!adj && adj.distMm <= 30)) };
  const region = [mapped].concat(adj && adj.distMm <= 30 ? [adj.body] : []);
  // CG-2 support (both legs)
  { const S = interp(getP(row - 1), getP(row), sub / 4), agree = {}; let ok = true;
    for (const [n, sd] of [[0, "L"], [1, "R"]]) { const simPl = simB.legs[sd].planted, presFlags = [R.pres[row - 1].feet[n].contact, R.pres[row].feet[n].contact], lo = bodyLowest(B[bi("foot_" + sd)], S[bi("foot_" + sd)]).y, d1 = lo <= 0.005 ? true : lo >= 0.015 ? false : "transitional";
      const a = presFlags.includes(simPl) && d1 === simPl; agree[sd] = { sim: simPl, up: +simB.legs[sd].up.toFixed(3), presentation: presFlags, presModes: [R.pres[row - 1].feet[n].mode, R.pres[row].feet[n].mode], d1LowestMm: +(lo * 1000).toFixed(1), d1, agree: a }; ok = ok && a; }
    res.criteria["CG-2 support"] = { ...agree, pass: ok }; }
  res.criteria["CG-3 timing"] = { tSim, tD1: firstD1 ? firstD1.t : null, dTicks: firstD1 ? +(firstD1.t - tSim).toFixed(2) : null, pass: !!firstD1 && Math.abs(firstD1.t - tSim) <= 1 + 1e-9 };
  // CG-4 location (A2 axes)
  { const simP = sim2r(dec.point), w = firstD1 && firstD1.witness; let pass = false, dist = null, sSim = null, sD1 = null;
    if (w) { dist = Math.hypot(w.pB[0] - simP[0], w.pB[2] - simP[2]); const sa = sim2r(simSeg.a), sb2 = sim2r(simSeg.b), proj = (p, a, b) => V.dot(V.sub(p, a), V.sub(b, a)) / V.dot(V.sub(b, a), V.sub(b, a)); sSim = proj(simP, sa, sb2);
      const Sb = w.S, kind = dec.seg.replace(/_[LR]$/, ""); let segA, segB;
      if (kind === "foot" || kind === "toe") { segA = onBody(Sb, mi, AXES[kind][0]); segB = onBody(Sb, mi, AXES[kind][1]); }
      else if (mapped.startsWith("shank")) { segA = Sb[mi].pos; segB = Sb[bi(mapped.replace("shank", "foot"))].pos; } else if (mapped.startsWith("thigh")) { segA = Sb[mi].pos; segB = Sb[bi(mapped.replace("thigh", "shank"))].pos; } else { segA = Sb[mi].pos; segB = V.add(Sb[mi].pos, [0, 0.2, 0]); }
      sD1 = proj(w.pB, segA, segB); pass = dist <= 0.10 && Math.abs(sD1 - sSim) <= 0.25; }
    res.criteria["CG-4 location"] = { horizDistM: dist != null ? +dist.toFixed(3) : null, sSim: sSim != null ? +sSim.toFixed(3) : null, sD1: sD1 != null ? +sD1.toFixed(3) : null, simPoint: simP, d1Point: w ? w.pB : null, pass }; }
  // CG-5 overlap order over [tSim, tSim + 0.10 s] (unperturbed both)
  { const win = series.filter(r => r.t >= tSim - 1e-9 && r.t <= tSim + 6 + 1e-9), sMax = Math.max(...win.map(r => r.simOverlapUnperturbedMm != null ? r.simOverlapUnperturbedMm : -1e9)), dMax = Math.max(...win.map(r => Math.max(...region.map(nm => r.d1Pens[nm] != null ? r.d1Pens[nm] : -1e9)))), ratio = sMax > 0 ? dMax / sMax : null;
    res.criteria["CG-5 overlap"] = { region, simMaxUnperturbedMm: sMax, d1MaxMm: dMax, ratio: ratio != null ? +ratio.toFixed(3) : null, pass: ratio != null && ratio >= 1 / 3 && ratio <= 3 }; }
  // CG-6 approach direction
  { const w = firstD1 && firstD1.witness, n = dec.normal, simN = [n[0], n[1]], tng = [-n[1], n[0]], simRel = [dec.vn * n[0] + (dec.vt || 0) * tng[0], dec.vn * n[1] + (dec.vt || 0) * tng[1]], ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1)))) * 180 / Math.PI;
    let d1N = null, d1Rel = null, aN = null, aV = null;
    if (w) { const nn = V.sub(w.pB, w.pA); d1N = [nn[0], -nn[2]]; const S1 = w.S, S0 = poseAt(w.t - 0.25), local = Q.rot(Q.conj(S1[mi].rot), V.sub(w.pB, S1[mi].pos)), pB0 = V.add(S0[mi].pos, Q.rot(S0[mi].rot, local)), vB = V.sc(V.sub(w.pB, pB0), 240);
      const prv = w.primV ? [w.primV[0], w.primV[1]] : [0, 0]; d1Rel = [prv[0] - vB[0], prv[1] - (-vB[2])]; aN = ang(simN, d1N); aV = ang(simRel, d1Rel); }
    res.criteria["CG-6 approach"] = { simNormal: simN, d1Normal: d1N ? d1N.map(x => +x.toFixed(4)) : null, normalAngleDeg: aN != null ? +aN.toFixed(1) : null, simRelVel: simRel.map(x => +x.toFixed(3)), d1RelVel: d1Rel ? d1Rel.map(x => +x.toFixed(3)) : null, relVelAngleDeg: aV != null ? +aV.toFixed(1) : null, pass: aN != null && aN <= 45 && aV != null && aV <= 45 }; }
  // CG-7: PCG-F0 over trigger → contact + primitive continuity
  { let jump = 0; const seq = []; for (let k = Math.max(1, trigger); k <= row + 2; k++) for (let n = 1; n <= 4; n++) seq.push(R.prims[k][n - 1]);
    for (let q = 2; q < seq.length; q++) for (const p of seq[q]) { const p1 = seq[q - 1].find(x => x.prim === p.prim), p0 = seq[q - 2].find(x => x.prim === p.prim); if (!p1 || !p0) continue;
      for (const e of ["a", "b"]) { const d1 = [0, 1, 2].map(i => p[e][i] - p1[e][i]), d0 = [0, 1, 2].map(i => p1[e][i] - p0[e][i]); jump = Math.max(jump, Math.hypot(d1[0] - d0[0], d1[1] - d0[1], d1[2] - d0[2])); } }
    res.criteria["CG-7 pose continuity (PCG-F0 window)"] = { failingFrames: res.pcg.window.failingFrames, failItems: res.pcg.window.failItems, primitiveMaxDisplacementChangeMm: +(jump * 1000).toFixed(1), pass: res.pcg.window.failingFrames === 0 && jump <= 0.010 }; }
  res.pass = Object.values(res.criteria).every(c => c.pass);
  out.cases[cs] = res; console.log(cs, "class", finalCls, "pass", res.pass, "PCG@kp", res.pcg.promotionFrame.eligible, res.pcg.promotionFrame.fails.join("+"), JSON.stringify(Object.fromEntries(Object.entries(res.criteria).map(([k, v]) => [k, v.pass]))));
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

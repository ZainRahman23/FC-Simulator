// PVP-1A(-DX) evaluator — the frozen criteria of PVP1A_PREREGISTRATION.md §6–§11, applied literally to the run records (written before any N2 run).
// usage: V2_KNEE_MODEL=v2k node pvp1a_eval.mjs <runs dir> <fixture.json> <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const PL = await import(new URL("./pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V, Q, MC } = PL;
const [DIR, FIXF, OUTF] = process.argv.slice(2), FIX = JSON.parse(fs.readFileSync(FIXF)), { OFF } = PL.records(), sR = PL.SPEC_R(), sT = PL.SPEC_T();
const rd = (f) => { const p = path.join(DIR, f); return fs.existsSync(p) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(p))) : null; };
const C0 = rd("C0.json.gz"), N2 = rd("N2.json.gz"), X2 = rd("X2.json.gz"), SOLO_R = rd("SOLO_R.json.gz"), SOLO_T = rd("SOLO_T.json.gz");
const NP = PV.primary, NS = PV.secondary, h = PV.h, mm = (x) => x * 1000, R2D = 180 / Math.PI, L = (v) => Math.hypot(...v), nR = sR.bodies.length;
const bi = (spec, n) => spec.bodies.findIndex(b => b.name === n), toPitchH = (l) => [l[0] + 50, 34 - l[2]];
const SR = (rec) => rec.S.slice(0, nR), ST = (rec) => rec.S.slice(nR);
const out = { eval: "PVP1A_EVAL", protocol: "PVP-1A-DX (diagnostic; PVP-1A BLOCKED at H2) — would-be values under the frozen PVP-1A criteria", fixture: { tauAct: FIX.tauAct, gates: FIX.tackler.gates.pass, status: FIX.status } };
// ── mechanics per mode / character: integrity + ledgers, first failure step per criterion over the whole horizon ──
function mech(run) { if (!run) return null; const res = {};
  for (const role of ["runner", "tackler"]) { const first = {}, mark = (k, n) => { if (first[k] == null) first[k] = n; }; let linCum = [0, 0, 0], angCum = [0, 0, 0];
    for (const r of run.recs) { const c = r.chars[role]; if (!c) continue; const I = c.integrity, n = r.n;
      if (!I.finite) mark("finite", n); if (I.sepMaxMm > PV.integrity.anchorSepMm) mark("anchor", n); if (I.selfPenMm > PV.integrity.selfPenMm) mark("selfPen", n); if (I.crossPenMm > PV.integrity.crossPenMm) mark("crossPen", n);
      if (I.turfPenMm > PV.integrity.turfPenMm) mark("turfPen", n); if (I.engineAxes > 0) mark("engineStop", n); if (I.overCap > 0) mark("overCap", n);
      if (L(c.linRes) > PV.ledger.linStep) mark("linStep", n); if (L(c.angRes) > PV.ledger.angStep) mark("angStep", n);
      if (n <= NP) { linCum = V.add(linCum, c.linRes); angCum = V.add(angCum, c.angRes); } if (n === NP) { if (L(linCum) > PV.ledger.linPrim) mark("linCumPrimary", n); if (L(angCum) > PV.ledger.angPrim) mark("angCumPrimary", n); } }
    const prim = Object.entries(first).filter(([, n]) => n <= NP).map(([k, n]) => `${k}@${n}`), sec = Object.entries(first).filter(([, n]) => n > NP && n <= NS), after = Object.entries(first).filter(([, n]) => n > NS);
    const maxOf = (f, a, b) => Math.max(...run.recs.filter(r => r.n >= a && r.n <= b && r.chars[role]).map(r => f(r.chars[role])));
    res[role] = { firstFailure: first, primaryPass: prim.length === 0, primaryFails: prim, secondaryFailureAt: sec.length ? Math.min(...sec.map(([, n]) => n)) * h : null, trustedUntilStep: Object.keys(first).length ? Math.min(...Object.values(first)) - 1 : run.recs.length,
      maxPrimary: { linStep: maxOf(c => L(c.linRes), 1, NP), angStep: maxOf(c => L(c.angRes), 1, NP), turfPenMm: maxOf(c => c.integrity.turfPenMm, 1, NP), crossPenMm: maxOf(c => c.integrity.crossPenMm, 1, NP), selfPenMm: maxOf(c => c.integrity.selfPenMm, 1, NP), sepMaxMm: maxOf(c => c.integrity.sepMaxMm, 1, NP) },
      linCumPrimary: L(linCum), angCumPrimary: L(angCum) }; }
  // system ledgers + energy
  { const first = {}; let lc = [0, 0, 0], ac = [0, 0, 0], ePrim = 0, eSec = 0;
    for (const r of run.recs) { const s = r.system, n = r.n; if (L(s.linRes) > PV.ledger.linStep && first.linStep == null) first.linStep = n; if (L(s.angRes) > PV.ledger.angStep && first.angStep == null) first.angStep = n;
      if (n <= NP) { lc = V.add(lc, s.linRes); ac = V.add(ac, s.angRes); ePrim += Math.max(0, s.energyRes); } else if (n <= NS) eSec += Math.max(0, s.energyRes); }
    res.system = { firstFailure: first, linCumPrimary: L(lc), angCumPrimary: L(ac), energyResPlusPrimaryJ: ePrim, energyResPlusSecondaryJ: eSec,
      primaryPass: !(first.linStep <= NP) && !(first.angStep <= NP) && L(lc) <= PV.ledger.linPrim && L(ac) <= PV.ledger.angPrim && ePrim <= PV.ledger.ePrim, secondaryEnergyPass: eSec <= PV.ledger.eSec }; }
  return res; }
out.mechanics = { C0: mech(C0), N2: mech(N2), X2: mech(X2) };
// ── entry ──
out.entry = { N2: N2 && N2.entry ? { pass: N2.entry.pass, readback: N2.entry.readback, momentum: N2.entry.momentumReadbackNs, cacheClean: N2.entry.cacheClean, writes: N2.entry.writes } : null, C0: C0 && C0.entry ? { pass: C0.entry.pass } : null, fixtureRunner: FIX.runner.valid, fixtureStatus: FIX.status };
// ── controls (C0, primary window) ──
const soleLocal = (() => { const fb = sR.bodies[bi(sR, "foot_L")], s = PL.CL ? null : null; const { bootSole, hull2 } = { bootSole: (b) => { const P = b.shapes.filter(x => x.type === "hull").flatMap(x => x.points.map(p => V.add(p, x.pos))), ys = P.map(p => p[1]), y0 = Math.min(...ys); return { y0, pts: P.filter((p, i) => ys[i] < y0 + 0.002) }; }, hull2: null };
  return ["foot_L", "foot_R"].map(n => { const sb = bootSole(sR.bodies[bi(sR, n)]), xs = sb.pts.map(p => p[0]), zs = sb.pts.map(p => p[2]); return [xs.reduce((a, b) => a + b, 0) / xs.length, sb.y0, zs.reduce((a, b) => a + b, 0) / zs.length]; }); })();
const authCap = (n) => { const P = PL.primsAt(OFF, FIX.tauAct + n / 4), g = P.find(p => p.prim === "LEG"), u = V.norm(V.sub(g.b, g.a)); return { cap: V.add(g.b, V.sc(u, PV.fit.legCapR)), u }; };
const bootFwd = (S, n) => { const { u } = authCap(n), fi = bi(sT, "foot_L"); return PL.supportBody(sT.bodies[fi], S[fi], u); };
function controls(run) { if (!run) return null; const e0 = FIX.write.runner.poses, pel0 = V.add(e0[0].pos, Q.rot(e0[0].rot, sR.bodies[0].comLocal))[1];
  const sole0 = ["foot_L", "foot_R"].map((n, k) => { const i = bi(sR, n); return V.add(e0[i].pos, Q.rot(e0[i].rot, soleLocal[k])); }); const r = { runner: { fails: [] }, tackler: { fails: [] } }; let slip = 0, tipMax10 = 0, tipMax30 = 0, minPel = Infinity;
  for (const rec of run.recs.filter(x => x.n <= NP)) { const c = rec.chars.runner, S = SR(rec);
    if (!(c.feet.L > 0 && c.feet.R > 0)) r.runner.fails.push(`unloaded foot @${rec.n} (L ${c.feet.L.toFixed(3)} / R ${c.feet.R.toFixed(3)} N·s)`);
    ["foot_L", "foot_R"].forEach((n, k) => { const i = bi(sR, n), p = V.add(S[i].pos, Q.rot(S[i].rot, soleLocal[k])); slip = Math.max(slip, Math.hypot(p[0] - sole0[k][0], p[2] - sole0[k][2])); });
    const pel = S[0].com[1]; minPel = Math.min(minPel, pel / pel0); if (c.nonFootTurf.length) r.runner.fails.push(`non-foot turf ${c.nonFootTurf.join(",")} @${rec.n}`);
    const T = ST(rec), d = V.dist(bootFwd(T, rec.n), authCap(rec.n).cap); if (FIX.tauAct + rec.n / 4 <= PV.tauSim + 1e-9) tipMax10 = Math.max(tipMax10, d); tipMax30 = Math.max(tipMax30, d);
    if (!(rec.chars.tackler.P[0] > 0)) r.tackler.fails.push(`v_x ≤ 0 @${rec.n}`); }
  if (mm(slip) > PV.c0.slipMm) r.runner.fails.push(`sole slip ${mm(slip).toFixed(2)} mm`); if (minPel < PV.c0.pelvisFrac) r.runner.fails.push(`pelvis ${minPel.toFixed(3)} of entry`);
  if (mm(tipMax10) > PV.c0.tipEarlyMm) r.tackler.fails.push(`LEG-tip tracking ${mm(tipMax10).toFixed(2)} mm to τ_sim`); if (mm(tipMax30) > PV.c0.tipPrimMm) r.tackler.fails.push(`LEG-tip tracking ${mm(tipMax30).toFixed(2)} mm in the primary window`);
  const m = mech(run); if (!m.runner.primaryPass) r.runner.fails.push("mechanics: " + m.runner.primaryFails.join(" ")); if (!m.tackler.primaryPass) r.tackler.fails.push("mechanics: " + m.tackler.primaryFails.join(" "));
  r.runner.slipMm = mm(slip); r.runner.pelvisMinFrac = minPel; r.tackler.tipEarlyMm = mm(tipMax10); r.tackler.tipPrimaryMm = mm(tipMax30);
  r.runner.unloadedSteps = run.recs.filter(x => x.n <= NP && !(x.chars.runner.feet.L > 0 && x.chars.runner.feet.R > 0)).map(x => x.n);
  r.runner.postHocIfm1StyleLoadedSteps = run.recs.filter(x => x.n <= NP && x.chars.runner.feet.L > 0 && x.chars.runner.feet.R > 0).length;   // POST-HOC reading (IFM-1 counted loaded steps); not a frozen PVP-1A criterion
  r.runner.valid = r.runner.fails.length === 0; r.tackler.valid = r.tackler.fails.length === 0; r.status = r.runner.valid && r.tackler.valid ? "CONTROL_VALID_PRIMARY" : "CONTROL_INVALID_PRIMARY"; return r; }
out.controls = controls(C0);
// ── contact + correspondence (N2) ──
const crossOf = (rec) => rec.contacts.filter(c => c.kind === "cross" && L(c.J2) >= PV.contactNs);
function contact(run) { if (!run) return null; const steps = run.recs.filter(r => crossOf(r).length).map(r => r.n), o = { steps, intervals: [] };
  for (const n of steps) { const last = o.intervals[o.intervals.length - 1]; if (last && n === last[1] + 1) last[1] = n; else o.intervals.push([n, n]); }
  o.first = steps.length ? steps[0] : null; o.last = steps.length ? steps[steps.length - 1] : null; o.firstTau = o.first != null ? FIX.tauAct + o.first / 4 : null; o.lastTau = o.last != null ? FIX.tauAct + o.last / 4 : null;
  if (o.first == null || o.firstTau > PV.tauSim + 1 + 1e-9) { o.status = "PHYSICS_MISS"; return o; }
  const rec = run.recs.find(r => r.n === o.first), cand = crossOf(rec), deep = cand.reduce((a, c) => (Math.max(...c.points.map(p => p.depth)) > Math.max(...a.points.map(p => p.depth)) ? c : a));   // REV2 A2 attribution
  const side = (c, role) => (c.a !== "turf" && c.a[0] === role ? c.a[1] : c.b[1]), rb = side(deep, "runner"), tb = side(deep, "tackler"), p = V.sc(deep.points.reduce((a, q) => V.add(a, q.p), [0, 0, 0]), 1 / deep.points.length);
  const S = SR(rec), J = (n) => sR.joints.find(j => j.name === n), jointPos = (jn) => { const j = J(jn), c = j.childIndex; return S[c].pos; };
  const adj = rb === "shank_R" ? 0 : rb === "foot_R" ? V.dist(p, jointPos("ankle_R")) : rb === "thigh_R" ? V.dist(p, jointPos("knee_R")) : Infinity;
  o.firstPair = { runner: rb, tackler: tb, point: p, pitch: toPitchH(p), depth: Math.max(...deep.points.map(q => q.depth)), impulse: L(deep.J2), candidates: cand.map(c => `${side(c, "runner")}↔${side(c, "tackler")} J ${L(c.J2).toFixed(3)}`) };
  const CG = {};
  CG.CG1 = { pass: (rb === "shank_R" || mm(adj) <= PV.cg.adjMm) && ["shank_L", "foot_L"].includes(tb), runner: rb, tackler: tb, adjacencyMm: rb === "shank_R" ? 0 : mm(adj) };
  CG.CG2 = (() => { const lows = ["foot_L", "foot_R"].map(n => { const i = bi(sR, n); return mm(PL.bodyLowest(sR.bodies[i], S[i]).y); }); return { pass: lows.every(x => x <= PV.cg.plantedMm), lowestMm: lows }; })();
  CG.CG3 = { pass: Math.abs(o.firstTau - PV.tauSim) <= 1 + 1e-9, dTicks: o.firstTau - PV.tauSim };
  CG.CG4 = (() => { const ph = toPitchH(p), d = Math.hypot(ph[0] - PV.cg.simPoint[0], ph[1] - PV.cg.simPoint[1]), sh = bi(sR, "shank_R"), a = S[sh].pos, b = S[bi(sR, "foot_R")].pos, s = PL.segParam(p, a, b);
    return { pass: d <= PV.cg.locM && Math.abs(s - 0.911) <= PV.cg.region, horizM: d, regionParam: s, simParam: 0.911 }; })();
  CG.CG5 = (() => { const held = S, sh = bi(sR, "shank_R"), shape = sR.bodies[sh].shapes[0], shapeW = (st) => { const X = { p: V.add(st.pos, Q.rot(st.rot, shape.pos)), q: Q.mul(st.rot, shape.rot) }; return { a: V.add(X.p, Q.rot(X.q, [0, shape.half, 0])), b: V.add(X.p, Q.rot(X.q, [0, -shape.half, 0])), ra: shape.rTop, rb: shape.rBot }; };
    const cap = shapeW(held[sh]); let phys = 0, sim = 0;
    for (let tau = PV.tauSim; tau <= PV.tauSim + 6 + 1e-9; tau += 0.25) { const P = PL.primsAt(OFF, tau), LEG = P.find(x => x.prim === "LEG"), q = segseg(LEG.a, LEG.b, cap.a, cap.b), rr = cap.ra + (cap.rb - cap.ra) * q.t; phys = Math.max(phys, LEG.r + rr - q.d);
      const seg = PL.runnerSegsAt(OFF, tau).find(g => g.name === "shin_R"), q2 = segseg(LEG.a, LEG.b, seg.a, seg.b), r2 = seg.ra != null ? seg.ra + (seg.rb - seg.ra) * q2.t : seg.r; sim = Math.max(sim, LEG.r + r2 - q2.d); }
    const ratio = sim > 0 ? phys / sim : null; return { pass: ratio != null && ratio >= PV.cg.ovlLo && ratio <= PV.cg.ovlHi, physMaxPenMm: mm(phys), simMaxOverlapMm: mm(sim), ratio }; })();
  CG.CG6 = (() => { const pre = run.recs.find(r => r.n === o.first - 1) || { S: null }, n = deep.n, tFirst = deep.a !== "turf" && deep.a[0] === "tackler", nTR = tFirst ? n : V.sc(n, -1), nP = V.norm([nTR[0], -nTR[2]]);
    const angN = Math.acos(Math.max(-1, Math.min(1, nP[0] * PV.cg.simNormal[0] + nP[1] * PV.cg.simNormal[1]))) * R2D;
    let angV = null; if (pre.S) { const St = pre.S.slice(nR), Sr = pre.S.slice(0, nR), ti = bi(sT, tb), ri = bi(sR, rb), vt = IL.velAt(St[ti], St[ti].com, p), vr = IL.velAt(Sr[ri], Sr[ri].com, p), rv = V.sub(vt, vr), rvP = V.norm([rv[0], -rv[2]]);
      angV = Math.acos(Math.max(-1, Math.min(1, rvP[0] * 1 + rvP[1] * 0))) * R2D; }   // simulation relative velocity (4.533, 0)
    return { pass: angN <= PV.cg.angDeg && angV != null && angV <= PV.cg.angDeg, normalDeg: angN, relVelDeg: angV }; })();
  o.CG = CG; o.correspondencePass = Object.values(CG).every(x => x.pass);
  // extra contact (primary window) + equal / opposite
  const primJ = {}; let tot = 0; for (const r of run.recs.filter(x => x.n <= NP)) for (const c of crossOf(r)) { const k = `${side(c, "runner")}↔${side(c, "tackler")}`, j = L(c.J2); primJ[k] = (primJ[k] || 0) + j; tot += j; }
  const ok = (k) => { const [a, b] = k.split("↔"); return ["shank_R", "foot_R"].includes(a) && ["shank_L", "foot_L"].includes(b); };
  o.primaryPairs = Object.fromEntries(Object.entries(primJ).map(([k, v]) => [k, { Ns: v, share: tot ? v / tot : 0 }])); o.extraContact = Object.entries(primJ).filter(([k, v]) => !ok(k) && tot && v / tot > PV.extraFrac).map(([k]) => k);
  o.eqOppMaxNs = Math.max(...run.recs.map(r => r.eqOpp ? r.eqOpp.dJ : 0)); o.eqOppPass = o.eqOppMaxNs <= PV.eqOppNs;
  o.status = !o.correspondencePass ? "NATIVE_CORRESPONDENCE_FAILED" : "CORRESPONDS"; return o; }
function segseg(p1, q1, p2, q2) { const d1 = V.sub(q1, p1), d2 = V.sub(q2, p2), r = V.sub(p1, p2), a = V.dot(d1, d1), e = V.dot(d2, d2), f = V.dot(d2, r); let s, t; const c = V.dot(d1, r), b = V.dot(d1, d2), den = a * e - b * b;
  s = den > 1e-12 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); }
  return { d: V.dist(V.add(p1, V.sc(d1, s)), V.add(p2, V.sc(d2, t))), s, t }; }
out.contact = contact(N2);
// ── outcome consistency (OFFLINE evaluator) ──
function comOf(spec, S) { const M = spec.bodies.reduce((a, b) => a + b.mass, 0); return { c: V.sc(S.reduce((a, s, i) => V.add(a, V.sc(s.com, spec.bodies[i].mass)), [0, 0, 0]), 1 / M), v: V.sc(S.reduce((a, s, i) => V.add(a, V.sc(s.v, spec.bodies[i].mass)), [0, 0, 0]), 1 / M) }; }
const eVecAt = (S) => { const { c, v } = comOf(sR, S), ank = S[bi(sR, "foot_L")].pos, ch = toPitchH(c), vh = [v[0], -v[2]], ah = toPitchH(ank); return [ch[0] + vh[0] / PV.oc.omega0 - ah[0], ch[1] + vh[1] / PV.oc.omega0 - ah[1]]; };
function outcome(run, ct) { if (!run || !ct || ct.first == null) return null; const o = {}, pel0 = FIX.write.runner.poses, pelY0 = V.add(pel0[0].pos, Q.rot(pel0[0].rot, sR.bodies[0].comLocal))[1];
  const win = run.recs.filter(r => r.n <= NS); o.OC1 = { pass: win.every(r => r.chars.runner.nonFootTurf.length === 0), first: (win.find(r => r.chars.runner.nonFootTurf.length) || {}).n ?? null };
  const drop = Math.max(...win.map(r => pelY0 - SR(r)[0].com[1])); o.OC2 = { pass: drop <= PV.oc.dropCap, maxDropM: drop };
  const nStar = ct.first + Math.ceil(PV.oc.tSup / h - 1e-9), rs = run.recs.find(r => r.n === nStar); const e = rs ? eVecAt(SR(rs)) : null, law = e ? PL.balanceLaw(e) : null;
  o.OC3 = { nStar, tStar: nStar * h, e, ...(law || {}), consistent: law ? ["CORRECTION", "STUMBLE"].includes(law.cls) : null, weaker: law ? law.cls === "NEGLIGIBLE" : null, authoritative: { e0: PV.auth.e0, cls: "STUMBLE" } };
  o.OCT = { pass: win.every(r => r.chars.tackler.P[0] > 0), first: (win.find(r => !(r.chars.tackler.P[0] > 0)) || {}).n ?? null };
  o.status = !o.OC1.pass || !o.OC2.pass || (law && law.cls === "FALL") ? "OUTCOME_INCONSISTENT (runner)" : !o.OCT.pass ? "OUTCOME_INCONSISTENT (tackler)" : law && law.cls === "NEGLIGIBLE" ? "RESPONSE_WEAKER_THAN_AUTHORITY" : "OUTCOME_CONSISTENT";
  // diagnostic continuation (descriptive): per step state + the law on the instantaneous state
  o.series = run.recs.map(r => { const S = SR(r), c = r.chars.runner, ev = eVecAt(S), lw = PL.balanceLaw(ev), drop2 = pelY0 - S[0].com[1], st = c.nonFootTurf.length || drop2 > PV.oc.dropCap ? "COLLAPSED" : (c.feet.L > 0 || c.feet.R > 0) ? "SUPPORTED" : "AIRBORNE";
    return { n: r.n, state: st, cls: lw.cls, eH: lw.eH, pelvisDropM: drop2, feet: c.feet, nonFoot: c.nonFootTurf }; });
  o.firstCollapsed = (o.series.find(x => x.state === "COLLAPSED") || {}).n ?? null; o.final = o.series[o.series.length - 1]; return o; }
out.outcome = outcome(N2, out.contact);
// ── response analysis vs C0 ──
function response(A, B) { if (!A || !B) return null; const names = [...sR.bodies.map(b => "R." + b.name), ...sT.bodies.map(b => "T." + b.name)], onset = {}, rows = [];
  for (let k = 0; k < Math.min(A.recs.length, B.recs.length); k++) { const a = A.recs[k], b = B.recs[k], row = { n: a.n, pos: [], rot: [] };
    a.S.forEach((s, i) => { const dp = V.dist(s.pos, b.S[i].pos), dr = IL.qangRad(s.rot, b.S[i].rot) * R2D; row.pos.push(+mm(dp).toFixed(4)); row.rot.push(+dr.toFixed(4)); if (onset[names[i]] == null && (mm(dp) >= PV.response.pointMm || dr >= PV.response.rotDeg)) onset[names[i]] = a.n; }); rows.push(row); }
  return { onset, rows }; }
out.response = (() => { const r = response(N2, C0); if (!r) return null; const fc = out.contact && out.contact.first;
  const order = Object.entries(r.onset).sort((a, b) => a[1] - b[1]); const runnerChain = ["shank_R", "foot_R", "thigh_R", "pelvis", "abdomen", "thorax", "head", "upperArm_L", "upperArm_R", "forearm_L", "forearm_R", "thigh_L", "shank_L", "foot_L"].map(n => [n, r.onset["R." + n] ?? null]);
  const tacklerChain = ["foot_L", "shank_L", "thigh_L", "pelvis", "abdomen", "thorax", "head", "thigh_R", "shank_R", "foot_R", "upperArm_L", "upperArm_R", "forearm_L", "forearm_R"].map(n => [n, r.onset["T." + n] ?? null]);
  const tAffected = tacklerChain.some(([, n]) => n != null && n <= NP);
  const dvT = (n) => { const a = N2.recs.find(x => x.n === n), b = C0.recs.find(x => x.n === n); return a && b ? V.sc(V.sub(a.chars.tackler.P, b.chars.tackler.P), 1 / sT.bodies.reduce((s, x) => s + x.mass, 0)) : null; };
  const dvR = (n) => { const a = N2.recs.find(x => x.n === n), b = C0.recs.find(x => x.n === n); return a && b ? V.sc(V.sub(a.chars.runner.P, b.chars.runner.P), 1 / sR.bodies.reduce((s, x) => s + x.mass, 0)) : null; };
  const Jt = N2.recs.reduce((a, x) => V.add(a, x.chars.tackler.Jcross), [0, 0, 0]), Jr = N2.recs.reduce((a, x) => V.add(a, x.chars.runner.Jcross), [0, 0, 0]);
  const remote = fc != null ? ["R.head", "R.upperArm_L", "R.upperArm_R", "R.forearm_L", "R.forearm_R", "T.thorax", "T.head"].map(n => [n, r.onset[n] ?? null, r.onset[n] != null && r.onset[n] <= fc + 4]) : null;
  return { onsetOrder: order.slice(0, 28), runnerChain, tacklerChain, tacklerAffected: tAffected, tacklerDvVsC0: { n14: dvT(NP), n36: dvT(NS), n260: dvT(PV.steps) }, runnerDvVsC0: { n14: dvR(NP), n36: dvR(NS), nStar: out.outcome ? dvR(out.outcome.OC3.nStar) : null },
    crossImpulseTotal: { onRunner: Jr, onTackler: Jt, runnerMag: L(Jr) }, remoteWithin4StepsOfContact: remote, rows: r.rows }; })();
// ── continued contact: N2 vs X2 over 0–50 ms after the first contact (IFM-1 equivalence) ──
out.continued = (() => { if (!N2 || !X2 || !out.contact || out.contact.first == null) return null; const f = out.contact.first, lm = ["pelvis", "shank_R", "foot_R", "shank_L", "foot_L", "upperArm_L", "upperArm_R", "forearm_L", "forearm_R"];
  let maxLm = 0, maxOr = 0, sameSupport = true;
  for (let n = f; n <= f + 12; n++) { const a = N2.recs.find(x => x.n === n), b = X2.recs.find(x => x.n === n); if (!a || !b) continue; const Sa = SR(a), Sb = SR(b);
    for (const nm of lm) { const i = bi(sR, nm); maxLm = Math.max(maxLm, mm(V.dist(Sa[i].pos, Sb[i].pos))); }
    for (const nm of ["thorax", "shank_R"]) { const i = bi(sR, nm); maxOr = Math.max(maxOr, IL.qangRad(Sa[i].rot, Sb[i].rot) * R2D); }
    const sup = (r) => [r.chars.runner.feet.L > 0, r.chars.runner.feet.R > 0].join(); if (sup(a) !== sup(b)) sameSupport = false; }
  const eq = maxLm <= PV.equivalence.landmarkMm && maxOr <= PV.equivalence.orientDeg && sameSupport;
  return { xFrom: X2.xFrom, noopRestore: X2.noopRestore, maxLandmarkMm: maxLm, maxOrientDeg: maxOr, sameSupport, equivalent: eq, contactSteps: out.contact.steps.length, intervals: out.contact.intervals,
    continuedContactMatters: !eq }; })();
// ── isolation (H6) ──
out.isolation = (() => { if (!C0 || !SOLO_R || !SOLO_T) return null; const cmp = (solo, off) => { let p = 0, r = 0; for (let k = 0; k < Math.min(NS, solo.recs.length); k++) { const a = solo.recs[k], b = C0.recs[k]; a.S.forEach((s, i) => { p = Math.max(p, V.dist(s.pos, b.S[i + off].pos)); r = Math.max(r, IL.qangRad(s.rot, b.S[i + off].rot)); }); } return { maxPosM: p, maxRotRad: r, pass: p <= 1e-6 && r <= 1e-6 }; };
  return { runner: cmp(SOLO_R, 0), tackler: cmp(SOLO_T, nR) }; })();
// ── determinism ──
out.determinism = (() => { const d = {}; for (const m of ["C0", "N2"]) { const base = rd(m + ".json.gz"), rep = rd(m + "_rep.json.gz"), bat = (() => { const f = path.join(DIR, "batch_reverse.json"); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f))[m] : null; })();
  d[m] = { fresh: base && rep ? JSON.stringify(base.recs.map(r => r.hash)) === JSON.stringify(rep.recs.map(r => r.hash)) : null, batch: base && bat ? bat === base.finalHash : null, finalHash: base ? base.finalHash : null }; }
  d.X2noop = X2 ? X2.noopRestore : null; d.all = d.C0.fresh && d.N2.fresh && d.C0.batch && d.N2.batch && X2 && X2.noopRestore && X2.noopRestore.identical; return d; })();
// ── verdict (DX-prefixed; PVP-1A remains BLOCKED) ──
{ const m = out.mechanics.N2, ctl = out.controls, ct = out.contact, oc = out.outcome, entryOk = out.entry.N2 && out.entry.N2.pass && FIX.runner.valid, ctlOk = ctl && ctl.status === "CONTROL_VALID_PRIMARY";
  const mechOk = m && m.runner.primaryPass && m.tackler.primaryPass && m.system.primaryPass, cg = ct && ct.correspondencePass, ocOk = oc && oc.status === "OUTCOME_CONSISTENT";
  const labels = []; if (!FIX.tackler.gates.all) labels.push("TACKLER_FIT_GATES_FAILED (G-T1, G-T3) — the DX entry"); if (!entryOk) labels.push("INITIALIZATION_INVALID"); if (!ctlOk) labels.push("CONTROL_INVALID_PRIMARY");
  if (ct && ct.status === "PHYSICS_MISS") labels.push("PHYSICS_MISS"); if (ct && !cg && ct.status !== "PHYSICS_MISS") labels.push("NATIVE_CORRESPONDENCE_FAILED(" + Object.entries(ct.CG).filter(([, v]) => !v.pass).map(([k]) => k).join(",") + ")");
  if (ct && ct.extraContact && ct.extraContact.length) labels.push("EXTRA_CONTACT(" + ct.extraContact.join(",") + ")"); if (m && (!m.runner.primaryPass || !m.tackler.primaryPass || !m.system.primaryPass)) labels.push("NATIVE_INTEGRITY_FAILED");
  for (const role of ["runner", "tackler"]) if (m && m[role].secondaryFailureAt != null) labels.push(`SECONDARY_FAILURE_AT(${role} ${(m[role].secondaryFailureAt * 1000).toFixed(1)} ms)`);
  if (oc) labels.push(oc.status); labels.push("VISUAL_PENDING");
  const v = !entryOk ? "DX-BLOCKED" : !ctlOk ? "DX-CONTROL_INVALID (N2 reported, not interpreted)" : (ct && ct.status === "PHYSICS_MISS") || (oc && oc.status.startsWith("OUTCOME_INCONSISTENT")) || (m && !(m.runner.primaryPass && m.tackler.primaryPass && m.system.primaryPass)) ? "DX-ARCHITECTURAL-FAILURE" : cg && mechOk && ocOk ? "DX-MECHANICAL-PASS" : "DX-PARTIAL";
  out.verdict = { dx: v, labels, pvp1a: "BLOCKED (H2 TACKLER_FIT_BLOCKED)" }; }
fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));
console.log("PVP-1A:", out.verdict.pvp1a, "| DX verdict:", out.verdict.dx); console.log("labels:", out.verdict.labels.join(" · "));

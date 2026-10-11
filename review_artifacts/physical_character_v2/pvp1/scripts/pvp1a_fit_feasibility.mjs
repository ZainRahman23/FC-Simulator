// PVP-1A tackler-fit FEASIBILITY DIAGNOSTIC (geometry only; no Jolt): does ANY V1-matched pose inside the hard ranges satisfy the frozen fit gates
// G-T1…G-T4 against the authoritative primitives at τ_act? Minimises only the gate violations (hinge on value / limit − 0.95, plus the turf / grounding
// requirement) from the same 36 deterministic starts, then reports the best max-ratio per gate. A best max-ratio > 1 means the gates are infeasible for
// this body and these primitives (not an optimizer artefact of the frozen objective). Also reports the irreducible geometric mismatches directly.
// usage: V2_KNEE_MODEL=v2k node pvp1a_fit_feasibility.mjs <out.json> [tau]
import fs from "fs";
const PL = await import(new URL("./pvp1a_lib.mjs", import.meta.url).href), { PV, V, Q, MC } = PL;
const OUT = process.argv[2], tau = +(process.argv[3] || PV.tauAct), { OFF } = PL.records(), sT = PL.SPEC_T(), P = PL.primsAt(OFF, tau), md = PL.tacklerModel(sT);
const g = (n) => P.find(p => p.prim === n);
function gateVals(S) { const lo = PL.lowest(sT, S), dz = PV.fit.lift - lo.y, Sg = S.map(s => ({ pos: V.add(s.pos, [0, dz, 0]), rot: s.rot })), G = PL.fitGates(sT, Sg, P, dz);
  const items = [["T1.boot", G.T1.bootFwdMm, PV.fit.bootMm], ["T1.centroid", G.T1.centroidMm, PV.fit.centroidMm], ["T2.knee", G.T2.kneeMm, PV.fit.shankMm], ["T2.ankle", G.T2.ankleMm, PV.fit.shankMm],
    ...Object.entries(G.T3).map(([k, v]) => ["T3." + k, v, PV.fit.otherMm]), ["T4.ground", Math.abs(G.T4.groundShiftMm), PV.fit.groundShiftMm]];
  return { items, G }; }
const res = (x) => { const S = md.pose(x), { items } = gateVals(S), r = items.map(([, v, L]) => Math.max(0, v / L - 0.95) * 10); S.forEach((s, i) => r.push(Math.min(0, PL.bodyLowest(sT.bodies[i], s).y) * 100)); return r; };
const clamp = (x) => x.map((v, n) => (n < 6 ? v : Math.min(md.lim[n - 6][1], Math.max(md.lim[n - 6][0], v))));
function lm(x0) { let x = clamp(x0), r = res(x), f = r.reduce((s, v) => s + v * v, 0), lam = 1e-3;
  for (let it = 0; it < 800 && f > 0; it++) { const Jc = []; for (let n = 0; n < md.nx; n++) { const x2 = x.slice(); x2[n] += 1e-6; const r2 = res(x2); Jc.push(r2.map((v, i) => (v - r[i]) / 1e-6)); }
    const JtJ = Jc.map(a => Jc.map(b => a.reduce((s, v, i) => s + v * b[i], 0))), Jtr = Jc.map(a => a.reduce((s, v, i) => s + v * r[i], 0)); let ok = false;
    for (let t = 0; t < 10; t++) { let step; try { step = MC.solveDense(JtJ.map((row, a) => row.map((v, b) => v + (a === b ? lam * (1 + JtJ[a][a]) + 1e-12 : 0))), Jtr.map(v => -v)); } catch (_) { lam *= 8; continue; }
      const x2 = clamp(x.map((v, n) => v + step[n])), r2 = res(x2), f2 = r2.reduce((s, v) => s + v * v, 0); if (f2 < f) { x = x2; r = r2; f = f2; lam = Math.max(1e-12, lam / 4); ok = true; break; } lam *= 8; }
    if (!ok) break; } return { x, f }; }
// starts: the frozen-objective optimum, then the 36 fixed starts of the fit
const F0 = PL.fitTackler(sT, P), starts = [F0.x]; let best = null;
for (const recline of [0, -20, -40]) for (const yawOff of [-15, 0, 15]) for (const hipF of [60, 80]) for (const kneeR of [120, 145]) { const x0 = new Array(md.nx).fill(0), c0 = V.lerp(g("BODY").a, g("BODY").b, 0.5); x0[0] = c0[0]; x0[1] = c0[1] + 0.05; x0[2] = c0[2];
  const q0 = Q.norm(Q.mul(Q.axis([0, 1, 0], (90 + yawOff) * Math.PI / 180), Q.axis([1, 0, 0], recline * Math.PI / 180))), hw = q0[3] < 0 ? q0.map(v => -v) : q0, ang = 2 * Math.atan2(V.len(hw.slice(0, 3)), hw[3]), ax = V.len(hw.slice(0, 3)) > 1e-12 ? V.norm(hw.slice(0, 3)) : [0, 1, 0]; [x0[3], x0[4], x0[5]] = V.sc(ax, ang);
  md.idx.forEach(([k, key], n) => { const jn = md.joints[k].name; if ((jn === "hip_L" || jn === "hip_R") && key === "flex") x0[6 + n] = hipF; if (jn === "knee_R" && key === "flex") x0[6 + n] = kneeR; }); starts.push(x0); }
for (const x0 of starts) { const r = lm(x0), { items } = gateVals(md.pose(r.x)), maxRatio = Math.max(...items.map(([, v, L]) => v / L)); if (!best || maxRatio < best.maxRatio) best = { maxRatio, x: r.x, items }; }
// irreducible mismatches, measured directly on the primitives vs the body
const sep = (p1, p2) => { const a = g(p1), b = g(p2), u = V.norm(V.sub(a.b, a.a)); return V.len(PL.perpToLine(b.a, a.a, a.b)); };
const B = sT.bodies, J = (n) => sT.joints.find(j => j.name === n), hipSep = V.dist(J("hip_L").at, J("hip_R").at);
const reachV2 = (() => { const S = md.pose(best.x), bi = (n) => B.findIndex(b => b.name === n), u = V.norm(V.sub(S[bi("foot_L")].pos, S[bi("shank_L")].pos)); return V.dot(V.sub(PL.supportBody(B[bi("foot_L")], S[bi("foot_L")], u), S[bi("shank_L")].pos), u); })();
const out = { tool: "pvp1a_fit_feasibility.mjs", tau, frozenObjectiveOptimum: { gates: PL.fitGates(sT, F0.S.map(s => ({ pos: V.add(s.pos, [0, PV.fit.lift - PL.lowest(sT, F0.S).y, 0]), rot: s.rot })), P, PV.fit.lift - PL.lowest(sT, F0.S).y).pass },
  gateFeasibility: { bestMaxRatio: best.maxRatio, feasible: best.maxRatio <= 1, worstItems: best.items.map(([k, v, L]) => ({ item: k, mm: +v.toFixed(2), limitMm: L, ratio: +(v / L).toFixed(3) })).sort((a, b) => b.ratio - a.ratio).slice(0, 8) },
  geometry: { primitiveHipSeparation_THIGHa_to_TUCKline_m: sep("TUCK", "THIGH"), v1matchedHipCentreSeparation_m: hipSep, simLegReach_kneeToCap_m: V.dist(g("LEG").a, V.add(g("LEG").b, V.sc(V.norm(V.sub(g("LEG").b, g("LEG").a)), PV.fit.legCapR))),
    v1matchedKneeToBootForward_atBestPose_m: reachV2, THIGHprimLength_m: V.dist(g("THIGH").a, g("THIGH").b), v1matchedThigh_m: V.dist(J("hip_L").at, J("knee_L").at) } };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.gateFeasibility, null, 1)); console.log(JSON.stringify(out.geometry, null, 1));

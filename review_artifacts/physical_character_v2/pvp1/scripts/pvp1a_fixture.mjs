// PVP-1A GEOMETRY-ONLY FIXTURE (prereg §4, §13): no Jolt object is created. Runner entry (MC-1 on the static LOCO pose), tackler primitive fit
// + gates G-T1…G-T4, entry geometry checks, cross-character clearance at the activation instant (with the frozen fallback rule) and the kinematically
// predicted first-contact pair (runner static, tackler carried rigidly by the authoritative BODY-primitive displacement).
// usage: LV2_ARCHIVE=<tag archive> V2_KNEE_MODEL=v2k node pvp1a_fixture.mjs <out.json>
import fs from "fs";
const PL = await import(new URL("./pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V, Q } = PL;
const OUT = process.argv[2], { OFF, LOCO, SC } = PL.records(), sR = PL.SPEC_R(), sT = PL.SPEC_T(), comb = PL.combine(sR, sT);
const LV = IL.loadLV2(), RG = IL.rigOf(LV);
const out = { fixture: "PVP1A_FIXTURE", prereg: PV.prereg, specR: IL.specHash ? IL.specHash(sR) : null, specT: IL.specHash ? IL.specHash(sT) : null, gameplayHashRecomputed: { OFF: PL.gameplayHashOf(OFF), LOCO: PL.gameplayHashOf(LOCO) } };
// ── runner ──
const R = PL.runnerEntry(sR, LOCO, RG.RIG, 50);
const anchors = (spec, S) => Math.max(...spec.joints.map(j => V.dist(V.add(S[j.parentIndex].pos, Q.rot(S[j.parentIndex].rot, V.sub(j.at, spec.bodies[j.parentIndex].origin))), V.add(S[j.childIndex].pos, Q.rot(S[j.childIndex].rot, V.sub(j.at, spec.bodies[j.childIndex].origin))))));
const rangeExc = (spec, S) => { let m = 0, who = null; for (const j of spec.joints) { const a = PL.anatomicalAngles(j, S[j.parentIndex].rot, S[j.childIndex].rot); for (const [k, v] of Object.entries(a)) { const h = j.def.rom[k] && j.def.rom[k].hard; if (!h) continue; const e = Math.max(h[0] - v, v - h[1], 0); if (e > m) { m = e; who = j.name + "." + k; } } } return { maxDeg: m, who }; };
const selfPen = (spec, S) => { let worst = 0, pair = null; const dis = new Set(spec.disabledPairs.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b)));
  for (let i = 0; i < spec.bodies.length; i++) for (let j = i + 1; j < spec.bodies.length; j++) { if (dis.has(i + "-" + j)) continue; const s = IL.bodySepGeneric(spec, S, i, j); if (s.d <= 0) { worst = Math.max(worst, 1e-9); pair = spec.bodies[i].name + "↔" + spec.bodies[j].name; } } return { overlap: worst > 0, pair }; };
out.runner = { groundShiftMm: R.groundShiftM * 1000, lowestBefore: R.lowestBefore, maxVelocity: R.maxVel, mapper: R.mapper, bindDiffVsRig: R.bindDiffVsRig, anchorsM: anchors(sR, R.S), range: rangeExc(sR, R.S), turfPenMm: Math.max(0, -PL.lowest(sR, R.S).y) * 1000, self: selfPen(sR, R.S),
  feetLowestMm: ["foot_L", "foot_R"].map(n => { const i = sR.bodies.findIndex(b => b.name === n); return PL.bodyLowest(sR.bodies[i], R.S[i]).y * 1000; }) };
out.runner.valid = out.runner.groundShiftMm <= PV.entry.runnerGroundMaxMm && out.runner.anchorsM <= PV.entry.anchorM && out.runner.range.maxDeg <= 1e-9 && out.runner.turfPenMm <= PV.entry.turfPenMm && !out.runner.self.overlap && R.maxVel < 1e-12;
// ── tackler at an activation candidate ──
function tacklerAt(tau) { const P = PL.primsAt(OFF, tau), F = PL.fitTackler(sT, P), lo = PL.lowest(sT, F.S), dz = PV.fit.lift - lo.y, S = F.S.map(s => ({ pos: V.add(s.pos, [0, dz, 0]), rot: s.rot })), gates = PL.fitGates(sT, S, P, dz);
  const atLimit = []; F.md.idx.forEach(([k, key], n) => { const v = F.x[6 + n], [a, b] = F.md.lim[n]; if (v <= a + 1e-9 || v >= b - 1e-9) atLimit.push(F.md.joints[k].name + "." + key); });
  const ang = Object.fromEntries(F.md.idx.map(([k, key], n) => [F.md.joints[k].name + "." + key, +F.x[6 + n].toFixed(3)]));
  const pre = PL.fitGates(sT, F.S, P, 0); console.log(`   pre-grounding: boot ${pre.T1.bootFwdMm.toFixed(2)} / centroid ${pre.T1.centroidMm.toFixed(2)} mm, shank ${pre.T2.kneeMm.toFixed(1)}/${pre.T2.ankleMm.toFixed(1)}, T3 max ${Math.max(...Object.values(pre.T3)).toFixed(1)} mm (${Object.entries(pre.T3).sort((a, b) => b[1] - a[1])[0][0]}), lowest ${(lo.y * 1000).toFixed(1)} mm (${sT.bodies[lo.body].name})`);
  return { tau, P, S, gates, preGates: pre, fitF: F.f, iterations: F.iterations, atLimit, anglesDeg: ang, groundShiftM: dz, v: P.find(p => p.prim === "BODY").v }; }
const cand = []; for (let tau = PV.tauAct; tau >= PV.tauActMin - 1e-9; tau -= 0.25) cand.push(Math.round(tau * 4) / 4);
let chosen = null; out.candidates = [];
for (const tau of cand) { const T = tacklerAt(tau), cl = PL.crossClearance(sR, R.S, sT, T.S);
  const row = { tau, clearanceMm: cl.d * 1000, closest: [cl.rb, cl.tb], gates: T.gates, fitF: T.fitF, iterations: T.iterations, atLimit: T.atLimit };
  out.candidates.push(row); console.log(`τ ${tau}: clearance ${(cl.d * 1000).toFixed(2)} mm (${cl.rb} ↔ ${cl.tb}); fit gates ${JSON.stringify(T.gates.pass)} boot ${T.gates.T1.bootFwdMm.toFixed(2)} / centroid ${T.gates.T1.centroidMm.toFixed(2)} mm; ground shift ${(T.groundShiftM * 1000).toFixed(2)} mm; F ${T.fitF.toExponential(3)} it ${T.iterations}; at limit ${T.atLimit.join(",") || "—"}`);
  if (cl.d * 1000 >= PV.entry.clearMm) { chosen = { T, cl }; break; } }
if (!chosen) { out.status = "INITIALIZATION_INVALID (no activation instant with ≥ 1 mm clearance in [50.0, 51.0])"; fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(out.status); process.exit(0); }
const T = chosen.T; out.tauAct = T.tau;
out.tackler = { gates: T.gates, anglesDeg: T.anglesDeg, atLimit: T.atLimit, fitF: T.fitF, iterations: T.iterations, groundShiftMm: T.groundShiftM * 1000, anchorsM: anchors(sT, T.S), range: rangeExc(sT, T.S), turfPenMm: Math.max(0, -PL.lowest(sT, T.S).y) * 1000, self: selfPen(sT, T.S), velocity: T.v,
  primsLocal: T.P };
out.status = !out.runner.valid ? "INITIALIZATION_INVALID (runner)" : !T.gates.all ? "TACKLER_FIT_BLOCKED" : out.tackler.anchorsM > PV.entry.anchorM || out.tackler.range.maxDeg > 1e-9 || out.tackler.turfPenMm > PV.entry.turfPenMm || out.tackler.self.overlap ? "INITIALIZATION_INVALID (tackler)" : "ENTRY_GEOMETRY_OK";
out.clearanceAtActMm = chosen.cl.d * 1000; out.closestAtAct = [chosen.cl.rb, chosen.cl.tb];
// ── kinematic first-contact prediction: runner static, tackler carried by the authoritative BODY-primitive displacement ──
{ const bodyMid = (tau) => { const P = PL.primsAt(OFF, tau), b = P.find(p => p.prim === "BODY"); return V.lerp(b.a, b.b, 0.5); }, m0 = bodyMid(T.tau); out.prediction = null;
  for (let k = 1; k <= 12; k++) { const tau = T.tau + k * 0.25, d = V.sub(bodyMid(tau), m0), ST = T.S.map(s => ({ pos: V.add(s.pos, d), rot: s.rot })), cl = PL.crossClearance(sR, R.S, sT, ST);
    if (cl.d <= 0) { out.prediction = { tau, pair: [cl.rb, cl.tb], note: "first sub-step at which the rigidly carried tackler touches the static runner (geometry only)" }; break; } } }
// ── the entry write (local frame) ──
out.write = { runner: { poses: R.S, vel: R.S.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })) }, tackler: { poses: T.S, vel: T.S.map(() => ({ v: T.v.slice(), w: [0, 0, 0] })) } };
out.flags = { runner: { L: true, R: true }, tackler: { L: false, R: false } };
const Mof = (s) => s.bodies.reduce((a, b) => a + b.mass, 0), com = (s, S) => V.sc(S.reduce((a, p, i) => V.add(a, V.sc(V.add(p.pos, Q.rot(p.rot, s.bodies[i].comLocal)), s.bodies[i].mass)), [0, 0, 0]), 1 / Mof(s));
out.O = V.sc(V.add(V.sc(com(sR, R.S), Mof(sR)), V.sc(com(sT, T.S), Mof(sT))), 1 / (Mof(sR) + Mof(sT)));
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`runner: shift ${out.runner.groundShiftMm.toFixed(2)} mm, feet lowest ${out.runner.feetLowestMm.map(x => x.toFixed(2)).join(" / ")} mm, range exc ${out.runner.range.maxDeg}, self ${out.runner.self.overlap}, valid ${out.runner.valid}`);
console.log(`tackler: angles ${JSON.stringify(out.tackler.anglesDeg)}`); console.log(`status ${out.status} · τ_act ${out.tauAct} · clearance ${out.clearanceAtActMm.toFixed(2)} mm · prediction ${JSON.stringify(out.prediction)}`);

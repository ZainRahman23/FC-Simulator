// PVP-1A-DX POST-HOC DIAGNOSTICS (labelled; none changes the PVP-1A or DX result). Uses diag/pvp1a_sim_diag.mjs (the frozen plant + options).
//  ISO   — is the tackler's isolation difference (solo vs combined world: 0.09 mm / 0.044°) solver ordering by body ID? (a) runner moved 20 m away,
//          default order, C0 → tackler vs DX C0 (same IDs); (b) tackler created FIRST (its solo IDs), runner 20 m away, C0 → tackler vs DX SOLO_T.
//  SOLVER — velocity iterations 75 / 300 (frozen 150): C0 + N2 each; fixed observables vs each run's own C0.
//  CF1   — tackler entry counterfactual: the same fit, arms moved out of the body (shoulders abducted 50°, elbows flexed 15°; the frozen design held
//          them at canonical, which put forearm_L 39.5 mm inside thigh_L); C0 + N2; the same observables.
// usage: V2_KNEE_MODEL=v2k node pvp1a_diagnostics.mjs <dx run-1 records dir> <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const PL = await import(new URL("../scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V, Q, MC } = PL;
const { PvpPlant } = await import(new URL("./pvp1a_sim_diag.mjs", import.meta.url).href), { Jolt } = await import(new URL("../scripts/pvp1a_run.mjs", import.meta.url).href);
const [RUNS, OUT] = process.argv.slice(2), FIX = JSON.parse(fs.readFileSync(path.join(PL.RA, "pvp1/fixture/PVP1A_FIXTURE.json"))), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RUNS, f))));
const sR = PL.SPEC_R(), sT = PL.SPEC_T(), nB = 14, L = (v) => Math.hypot(...v);
function run(fix, mode, opts = {}, steps = PV.steps) { const sim = new PvpPlant(Jolt, { runner: fix.write.runner, tackler: fix.write.tackler }, fix.flags, mode, { O: fix.O, instrument: true, ...opts });
  let stop = null; while (sim.n < steps) { sim.tick(); const r = sim.recs[sim.recs.length - 1]; for (const c of Object.values(r.chars)) if (!c.integrity.finite || c.integrity.maxSpeed > 25) { stop = sim.n; break; } if (stop) break; }
  const order = sim.chars.map(c => c.role), recs = sim.recs; sim.destroy();
  return { order, recs, stop, S: (r, role) => { const off = order[0] === role ? 0 : nB; return r.S.slice(off, off + nB); } }; }
const shift = (fix, dx) => ({ ...fix, write: { ...fix.write, runner: { ...fix.write.runner, poses: fix.write.runner.poses.map(p => ({ pos: V.add(p.pos, [dx, 0, 0]), rot: p.rot })) } } });
const maxDiff = (A, Ar, B, Br, n = PV.secondary) => { let p = 0, r = 0; for (let k = 0; k < n; k++) { const a = A(k), b = B(k); a.forEach((s, i) => { p = Math.max(p, V.dist(s.pos, b[i].pos)); r = Math.max(r, IL.qangRad(s.rot, b[i].rot)); }); } return { maxPosM: p, maxRotRad: r, identical: p === 0 && r === 0 }; };
const out = { tool: "pvp1a_diagnostics.mjs", label: "POST-HOC DIAGNOSTICS — not PVP-1A, not the DX result" };
// ── ISO ──
{ const C0 = rd("C0.json.gz"), SOLO_T = rd("SOLO_T.json.gz");
  const a = run(shift(FIX, 20), "C0", {}, PV.secondary), b = run(shift(FIX, 20), "C0", { order: "TR" }, PV.secondary);
  out.ISO = { runnerFarDefaultOrder_vs_DXC0_tackler: maxDiff((k) => a.S(a.recs[k], "tackler"), null, (k) => C0.recs[k].S.slice(nB)),
    tacklerFirst_runnerFar_vs_DXSOLO_T: maxDiff((k) => b.S(b.recs[k], "tackler"), null, (k) => SOLO_T.recs[k].S),
    note: "(a) identical → the runner's presence (pairs rejected) does not affect the tackler; (b) identical → the solo / combined difference is the tackler's body-ID order (solver ordering), not a composition defect" };
  console.log("ISO", JSON.stringify(out.ISO)); }
// fixed observables of an N2 run vs its own C0
const fR = sR.bodies.findIndex(b => b.name === "foot_R");
function obs(N, C) { const first = N.recs.find(r => r.contacts.some(c => c.kind === "cross" && L(c.J2) >= PV.contactNs)); const fc = first ? first.n : null;
  const com = (spec, S) => { const M = spec.bodies.reduce((a, b) => a + b.mass, 0); return { c: V.sc(S.reduce((a, s, i) => V.add(a, V.sc(s.com, spec.bodies[i].mass)), [0, 0, 0]), 1 / M), v: V.sc(S.reduce((a, s, i) => V.add(a, V.sc(s.v, spec.bodies[i].mass)), [0, 0, 0]), 1 / M) }; };
  const at = (n, f) => { const a = N.recs[n - 1], b = C.recs[n - 1]; return a && b ? f(a, b) : null; };
  const runnerDisp = (n) => at(n, (a, b) => V.sc(V.sub(com(sR, N.S(a, "runner")).c, com(sR, C.S(b, "runner")).c), 1000).map(x => +x.toFixed(1)));
  const tacklerDv = (n) => at(n, (a, b) => +(com(sT, N.S(a, "tackler")).v[0] - com(sT, C.S(b, "tackler")).v[0]).toFixed(3));
  const foot = (n) => at(n, (a, b) => V.sc(V.sub(N.S(a, "runner")[fR].pos, C.S(b, "runner")[fR].pos), 1000).map(x => +x.toFixed(0)));
  const primJ = N.recs.filter(r => r.n <= PV.primary).reduce((s, r) => s + r.contacts.filter(c => c.kind === "cross").reduce((t, c) => t + L(c.J2), 0), 0);
  const nonFoot = N.recs.find(r => r.chars.runner.nonFootTurf.length), firstFail = (role) => { const x = N.recs.find(r => { const I = r.chars[role].integrity; return !I.finite || I.sepMaxMm > 1 || I.selfPenMm > 10 || I.crossPenMm > 10 || I.turfPenMm > 10 || I.engineAxes > 0 || L(r.chars[role].angRes) > 0.01 || L(r.chars[role].linRes) > 0.01; }); return x ? x.n : null; };
  const contactSteps = N.recs.filter(r => r.contacts.some(c => c.kind === "cross" && L(c.J2) >= PV.contactNs)).length;
  return { firstContactStep: fc, primaryCrossImpulseNs: +primJ.toFixed(2), contactSteps, runnerComDispMm: { n18: runnerDisp(18), n36: runnerDisp(36), n95: runnerDisp(95) }, tacklerDvX: { n14: tacklerDv(14), n36: tacklerDv(36) },
    sweptFootMm: { n36: foot(36), n95: foot(95) }, runnerFirstNonFootTurf: nonFoot ? nonFoot.n : null, firstIntegrityOrLedgerFailure: { runner: firstFail("runner"), tackler: firstFail("tackler") },
    tacklerStep1SelfPenMm: +N.recs[0].chars.tackler.integrity.selfPenMm.toFixed(2), tacklerStep1AnchorMm: +N.recs[0].chars.tackler.integrity.sepMaxMm.toFixed(3), stop: N.stop }; }
// DX reference observables (run 1)
{ const N = rd("N2.json.gz"), C = rd("C0.json.gz"), wrap = (o) => ({ recs: o.recs, stop: o.stop, S: (r, role) => (role === "runner" ? r.S.slice(0, nB) : r.S.slice(nB)) }); out.DX_reference = obs(wrap(N), wrap(C)); console.log("DX ref", JSON.stringify(out.DX_reference)); }
// ── SOLVER ──
out.SOLVER = {}; for (const vs of [75, 300]) { const C = run(FIX, "C0", { velSteps: vs }), N = run(FIX, "N2", { velSteps: vs }); out.SOLVER["velSteps" + vs] = obs(N, C); console.log("SOLVER", vs, JSON.stringify(out.SOLVER["velSteps" + vs])); }
// ── CF1: arms out of the body ──
{ const md = PL.tacklerModel(sT), B = sT.bodies, bi = (n) => B.findIndex(b => b.name === n), S0 = FIX.write.tackler.poses, S = S0.map(s => ({ pos: s.pos.slice(), rot: s.rot.slice() }));
  const setArm = (side) => { for (const jn of ["shoulder_" + side, "elbow_" + side]) { const j = sT.joints.find(x => x.name === jn), keys = Object.keys(PL.anatomicalAngles(j, [0, 0, 0, 1], [0, 0, 0, 1])), a = {};
      for (const k of keys) a[k] = jn.startsWith("shoulder") && k === "abd" ? 50 : jn.startsWith("elbow") && k === "flex" ? 15 : 0;
      const p = j.parentIndex, c = j.childIndex; S[c] = { pos: V.add(S[p].pos, Q.rot(S[p].rot, V.sub(B[c].origin, B[p].origin))), rot: PL.childRotation(j, S[p].rot, a) }; } };
  setArm("L"); setArm("R");
  const selfOv = (() => { const dis = new Set(sT.disabledPairs.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b))); for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { if (dis.has(i + "-" + j)) continue; if (IL.bodySepGeneric(sT, S, i, j).d <= 0) return B[i].name + "↔" + B[j].name; } return null; })();
  const lo = PL.lowest(sT, S), cl = PL.crossClearance(sR, FIX.write.runner.poses, sT, S);
  const fix = { ...FIX, write: { ...FIX.write, tackler: { poses: S, vel: FIX.write.tackler.vel } } };
  out.CF1 = { arms: "shoulders abd 50°, elbows flex 15° (other arm angles 0); trunk / legs / pelvis = the frozen-objective fit", selfOverlap: selfOv, lowestMm: +(lo.y * 1000).toFixed(2), lowestBody: B[lo.body].name, crossClearanceMm: +(cl.d * 1000).toFixed(2) };
  if (lo.y < -0.001) out.CF1.note = "arms penetrate the turf: CF1 not run"; else { const C = run(fix, "C0"), N = run(fix, "N2"); out.CF1.observables = obs(N, C); }
  console.log("CF1", JSON.stringify(out.CF1)); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

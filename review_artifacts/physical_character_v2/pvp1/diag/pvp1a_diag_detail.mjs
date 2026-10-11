// POST-HOC DIAGNOSTIC DETAIL (labelled; changes no result): (1) ISO exact bit-equality of the tackler's states (pos/rot/v/w) for the two isolation probes;
// (2) CF1 (arms cleared) per-criterion first failure for both characters in C0 / N2 and the failing value at that step; also CF1 runner foot loads / support.
// usage: V2_KNEE_MODEL=v2k node pvp1a_diag_detail.mjs <dx run-1 records dir> <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const PL = await import(new URL("../scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V, Q } = PL;
const { PvpPlant } = await import(new URL("./pvp1a_sim_diag.mjs", import.meta.url).href), { Jolt } = await import(new URL("../scripts/pvp1a_run.mjs", import.meta.url).href);
const [RUNS, OUT] = process.argv.slice(2), FIX = JSON.parse(fs.readFileSync(path.join(PL.RA, "pvp1/fixture/PVP1A_FIXTURE.json"))), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RUNS, f))));
const sT = PL.SPEC_T(), nB = 14, L = (v) => Math.hypot(...v);
function run(fix, mode, opts = {}, steps = PV.steps) { const sim = new PvpPlant(Jolt, { runner: fix.write.runner, tackler: fix.write.tackler }, fix.flags, mode, { O: fix.O, instrument: true, ...opts });
  while (sim.n < steps) sim.tick(); const order = sim.chars.map(c => c.role), recs = sim.recs; sim.destroy(); return { order, recs, S: (r, role) => { const off = order[0] === role ? 0 : nB; return r.S.slice(off, off + nB); } }; }
const shift = (fix, dx) => ({ ...fix, write: { ...fix.write, runner: { ...fix.write.runner, poses: fix.write.runner.poses.map(p => ({ pos: V.add(p.pos, [dx, 0, 0]), rot: p.rot })) } } });
const bitEq = (A, B, n) => { let firstDiff = null, nDiffComp = 0; for (let k = 0; k < n; k++) A(k).forEach((s, i) => { const b = B(k)[i]; for (const f of ["pos", "rot", "v", "w"]) s[f].forEach((x, j) => { if (x !== b[f][j]) { nDiffComp++; if (!firstDiff) firstDiff = { step: k + 1, body: sT.bodies[i].name, field: f, a: x, b: b[f][j] }; } }); }); return { bitIdentical: nDiffComp === 0, nDiffComponents: nDiffComp, firstDiff }; };
const out = { tool: "pvp1a_diag_detail.mjs", label: "POST-HOC DIAGNOSTIC DETAIL — not PVP-1A, not the DX result" };
{ const C0 = rd("C0.json.gz"), SOLO_T = rd("SOLO_T.json.gz"), a = run(shift(FIX, 20), "C0", {}, PV.secondary), b = run(shift(FIX, 20), "C0", { order: "TR" }, PV.secondary);
  out.ISO = { runnerFar_defaultOrder_vs_DXC0: bitEq((k) => a.S(a.recs[k], "tackler"), (k) => C0.recs[k].S.slice(nB), PV.secondary), tacklerFirst_runnerFar_vs_DXSOLO_T: bitEq((k) => b.S(b.recs[k], "tackler"), (k) => SOLO_T.recs[k].S, PV.secondary),
    DXC0_vs_DXSOLO_T: bitEq((k) => C0.recs[k].S.slice(nB), (k) => SOLO_T.recs[k].S, PV.secondary) }; console.log("ISO", JSON.stringify(out.ISO)); }
// CF1 arms (identical construction to pvp1a_diagnostics.mjs)
const B = sT.bodies, S = FIX.write.tackler.poses.map(s => ({ pos: s.pos.slice(), rot: s.rot.slice() }));
for (const side of ["L", "R"]) for (const jn of ["shoulder_" + side, "elbow_" + side]) { const j = sT.joints.find(x => x.name === jn), keys = Object.keys(PL.anatomicalAngles(j, [0, 0, 0, 1], [0, 0, 0, 1])), a = {};
  for (const k of keys) a[k] = jn.startsWith("shoulder") && k === "abd" ? 50 : jn.startsWith("elbow") && k === "flex" ? 15 : 0; const p = j.parentIndex, c = j.childIndex; S[c] = { pos: V.add(S[p].pos, Q.rot(S[p].rot, V.sub(B[c].origin, B[p].origin))), rot: PL.childRotation(j, S[p].rot, a) }; }
const fix = { ...FIX, write: { ...FIX.write, tackler: { poses: S, vel: FIX.write.tackler.vel } } };
const crit = { sep: (r, I) => I.sepMaxMm > 1, selfPen: (r, I) => I.selfPenMm > 10, crossPen: (r, I) => I.crossPenMm > 10, turfPen: (r, I) => I.turfPenMm > 10, engine: (r, I) => I.engineAxes > 0, overCap: (r, I) => I.overCap > 0, angLedger: (r) => L(r.angRes) > 0.01, linLedger: (r) => L(r.linRes) > 0.01, nonFinite: (r, I) => !I.finite };
const val = { sep: (r, I) => I.sepMaxMm, selfPen: (r, I) => I.selfPenMm, crossPen: (r, I) => I.crossPenMm, turfPen: (r, I) => I.turfPenMm, engine: (r, I) => I.engineAxes, overCap: (r, I) => I.overCap, angLedger: (r) => L(r.angRes), linLedger: (r) => L(r.linRes), nonFinite: () => 1 };
out.CF1 = {}; for (const mode of ["C0", "N2"]) { const R = run(fix, mode); out.CF1[mode] = {};
  for (const role of ["runner", "tackler"]) { const f = {}; for (const [k, fn] of Object.entries(crit)) { const r = R.recs.find(r => fn(r.chars[role], r.chars[role].integrity)); if (r) f[k] = { step: r.n, value: +val[k](r.chars[role], r.chars[role].integrity).toFixed(4) }; }
    const r1 = R.recs[0].chars[role], mx = (g) => Math.max(...R.recs.slice(0, PV.primary).map(r => g(r.chars[role])));
    out.CF1[mode][role] = { firstFailureByCriterion: f, primaryMax: { sepMm: +mx(c => c.integrity.sepMaxMm).toFixed(3), selfPenMm: +mx(c => c.integrity.selfPenMm).toFixed(2), turfPenMm: +mx(c => c.integrity.turfPenMm).toFixed(2), angLedger: +mx(c => L(c.angRes)).toFixed(4), linLedger: +mx(c => L(c.linRes)).toFixed(4), engineAxes: mx(c => c.integrity.engineAxes) },
      secondaryMax: { sepMm: +Math.max(...R.recs.slice(0, PV.secondary).map(r => r.chars[role].integrity.sepMaxMm)).toFixed(3), angLedger: +Math.max(...R.recs.slice(0, PV.secondary).map(r => L(r.chars[role].angRes))).toFixed(4) },
      nonFootTurfFirst: (R.recs.find(r => r.chars[role].nonFootTurf.length) || {}).n ?? null, nonFootBodies: [...new Set(R.recs.flatMap(r => r.chars[role].nonFootTurf.map(x => x.body ?? x)))] }; }
  console.log("CF1", mode, JSON.stringify(out.CF1[mode])); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

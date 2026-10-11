// POST-HOC DIAGNOSTIC PROBES on the CF1 fixture variant (labelled; not PVP-1A, not the DX result):
//  (1) ISO: tackler created first + runner 20 m away, C0 → vs CF1 SOLO_T (bit equality) — is CF1's larger isolation gap (3.7 mm / 1.5°) body-ID order again?
//  (2) SOLVER: CF1 N2 tackler integrity under more solver iterations (vel 300 / 600; pos ×2 / ×4) — is the step-19 anchor failure an iteration artifact?
// usage: V2_KNEE_MODEL=v2k node pvp1a_cf1_probe.mjs <cf1 runs dir> <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const PL = await import(new URL("../scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, V } = PL, { G1_WORLD } = await import(PL.P2 + "gates/v2_g1.js");
const { PvpPlant } = await import(new URL("./pvp1a_sim_diag.mjs", import.meta.url).href), { Jolt } = await import(new URL("../scripts/pvp1a_run.mjs", import.meta.url).href);
const [RUNS, OUT] = process.argv.slice(2), FIX = JSON.parse(fs.readFileSync(path.join(RUNS, "PVP1A_DX_CF1_FIXTURE.json"))), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RUNS, f)))), nB = 14, L = (v) => Math.hypot(...v);
function run(fix, mode, opts = {}, steps = PV.steps) { const sim = new PvpPlant(Jolt, { runner: fix.write.runner, tackler: fix.write.tackler }, fix.flags, mode, { O: fix.O, instrument: true, ...opts });
  while (sim.n < steps) sim.tick(); const order = sim.chars.map(c => c.role), recs = sim.recs; sim.destroy(); return { order, recs, S: (r, role) => { const off = order[0] === role ? 0 : nB; return r.S.slice(off, off + nB); } }; }
const far = { ...FIX, write: { ...FIX.write, runner: { ...FIX.write.runner, poses: FIX.write.runner.poses.map(p => ({ pos: V.add(p.pos, [20, 0, 0]), rot: p.rot })) } } };
const out = { tool: "pvp1a_cf1_probe.mjs", label: "POST-HOC DIAGNOSTIC — CF1 variant; not PVP-1A, not the DX result" };
{ const S = rd("SOLO_T.json.gz"), b = run(far, "C0", { order: "TR" }, PV.secondary); let n = 0, first = null;
  for (let k = 0; k < PV.secondary; k++) b.S(b.recs[k], "tackler").forEach((s, i) => ["pos", "rot", "v", "w"].forEach(f => s[f].forEach((x, j) => { if (x !== S.recs[k].S[i][f][j]) { n++; first ??= { step: k + 1, i, f }; } })));
  out.ISO = { tacklerFirst_runnerFar_vs_CF1_SOLO_T: { bitIdentical: n === 0, nDiffComponents: n, firstDiff: first } }; console.log("ISO", JSON.stringify(out.ISO)); }
out.SOLVER = { G1_WORLD: { velSteps: G1_WORLD.velSteps, posSteps: G1_WORLD.posSteps } }; const base = rd("N2.json.gz");
const summ = (recs) => { const f = (k, fn) => (recs.find(r => fn(r.chars.tackler)) || {}).n ?? null; return { anchorFirst: f("a", c => c.integrity.sepMaxMm > PV.integrity.anchorSepMm), angStepFirst: f("g", c => L(c.angRes) > PV.ledger.angStep),
  maxSepMm_1_36: +Math.max(...recs.slice(0, PV.secondary).map(r => r.chars.tackler.integrity.sepMaxMm)).toFixed(3), runnerAnchorFirst: (recs.find(r => r.chars.runner.integrity.sepMaxMm > PV.integrity.anchorSepMm) || {}).n ?? null,
  maxCrossJ_1_36: +Math.max(...recs.slice(0, PV.secondary).map(r => r.contacts.filter(c => c.kind === "cross").reduce((s, c) => s + L(c.J2), 0))).toFixed(2) }; };
out.SOLVER.frozen = summ(base.recs); console.log("frozen", JSON.stringify(out.SOLVER.frozen));
for (const [k, o] of [["vel300", { velSteps: 300 }], ["vel600", { velSteps: 600 }], ["pos2x", { posSteps: 2 * G1_WORLD.posSteps }], ["pos4x", { posSteps: 4 * G1_WORLD.posSteps }]]) {
  out.SOLVER[k] = { opts: o, ...summ(run(FIX, "N2", o).recs) }; console.log(k, JSON.stringify(out.SOLVER[k])); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
// (3) which tackler joint separates first in CF1 N2 (frozen solver) — per-joint anchor separation from the recorded states (the plant's own anchor definition)
{ const sT = PL.SPEC_T(), anc = sT.joints.map(j => ({ p: V.sub(j.at, sT.bodies[j.parentIndex].origin), c: V.sub(j.at, sT.bodies[j.childIndex].origin) })), rows = [];
  for (const r of base.recs.slice(14, 40)) { const st = r.S.slice(nB), per = sT.joints.map((j, k) => [j.name, 1000 * V.dist(V.add(st[j.parentIndex].pos, PL.Q.rot(st[j.parentIndex].rot, anc[k].p)), V.add(st[j.childIndex].pos, PL.Q.rot(st[j.childIndex].rot, anc[k].c)))]).sort((a, b) => b[1] - a[1]);
    rows.push({ n: r.n, top: per.slice(0, 3).map(([n, d]) => n + " " + d.toFixed(2)), crossPairs: r.contacts.filter(c => c.kind === "cross").map(c => c.a + "↔" + c.b + " " + L(c.J2).toFixed(2)).join(", ") }); }
  out.jointDrift = rows; for (const x of rows) console.log(x.n, x.top.join(" | "), "·", x.crossPairs); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); }

// PPR-1 audit, part 1 (read-only): what the runner's actuator law IS at the PVP-1A-DX entry, per motorised axis, from the constructed plant itself
// (no simulation step): stiffness K, damping D, statics bias, isometric capacities, tonic activations and the torque window [lo, hi] the actuator
// allows at entry; joint-family summaries in physical units and as multiples of the gravitational load stiffness; the ankle's summed sagittal stiffness
// as a multiple of mgh; the damping as a time constant and against intrinsic human values. Works for law A (SnapshotTone) and, after the freeze, B.
// usage: V2_KNEE_MODEL=v2k node ppr1_audit_law.mjs --fixture <PVP1A_FIXTURE.json> --law A --out <json>
import fs from "fs";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL;
const { PprPlant } = await import(new URL("./ppr1_plant.mjs", import.meta.url).href), { Jolt, lawFor } = await import(new URL("./ppr1_run.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const FIX = JSON.parse(fs.readFileSync(arg("fixture"))), lawId = arg("law", "A"), G = 9.81;
const sim = new PprPlant(Jolt, { runner: FIX.write.runner, tackler: FIX.write.tackler }, FIX.flags, "N2", { O: FIX.O, solo: "runner", law: await lawFor(lawId) });
const c = sim.runner, spec = c.spec, B = spec.bodies, M = c.M, st = c.st, plan = c.aplan;
const com = V.sc(st.reduce((s, b, i) => V.add(s, V.sc(b.com, B[i].mass)), [0, 0, 0]), 1 / M), jointAt = (name) => { const k = spec.joints.findIndex(j => j.name === name), j = spec.joints[k]; return V.add(st[j.parentIndex].pos, Q.rot(st[j.parentIndex].rot, V.sub(j.at, B[j.parentIndex].origin))); };
const ankY = (jointAt("ankle_L")[1] + jointAt("ankle_R")[1]) / 2, h = com[1] - ankY, mgh = M * G * h;
const gains = c.ctrl.gain, rows = [];
for (const p of plan.joints) { const j = spec.joints[p.k]; p.rows.forEach((r, i) => { if (!r || r.off) return; const x = c.act.ax[p.k][i], g = gains[p.k];
  rows.push({ joint: j.name, axis: x.key, k: p.k, i, K: r.K, D: r.D, bias: r.tau0, capPlus: c.act.capFull(x, 1, r.anat, 0, null), capMinus: c.act.capFull(x, -1, r.anat, 0, null),
    aPlus: c.act.a[p.k][i][0], aMinus: c.act.a[p.k][i][1], hi: r.hi, lo: r.lo, headroomUp: r.hi - r.tau0, headroomDown: r.tau0 - r.lo, loadM: g.m, loadL: g.L, loadStiff: g.m * G * g.L, KoverLoad: r.K / (g.m * G * g.L), DoverK_ms: 1000 * r.D / Math.max(1e-9, r.K),
    dirPlus: x.plus.dir, dirMinus: x.minus.dir }); }); }
const fam = (n) => n.replace(/_[LR]$/, ""), byFam = {};
for (const r of rows) { const f = fam(r.joint) + "." + r.axis, e = byFam[f] || (byFam[f] = { n: 0, K: [], D: [], KoverLoad: [], DoverK_ms: [] }); e.n++; e.K.push(r.K); e.D.push(r.D); e.KoverLoad.push(r.KoverLoad); e.DoverK_ms.push(r.DoverK_ms); }
const ankleSag = rows.filter(r => /^ankle_/.test(r.joint) && r.axis === "df").reduce((s, r) => s + r.K, 0), ankleSagD = rows.filter(r => /^ankle_/.test(r.joint) && r.axis === "df").reduce((s, r) => s + r.D, 0);
const isotropy = Object.fromEntries(spec.joints.map((j, k) => { const rr = rows.filter(r => r.k === k); return [j.name, rr.length ? { Ks: rr.map(r => +r.K.toFixed(1)), same: rr.every(r => Math.abs(r.K - rr[0].K) < 1e-9) } : null]; }).filter(([, v]) => v));
const out = { tool: "ppr1_audit_law.mjs", law: lawId, fixture: arg("fixture"), body: { M, comHeightAboveAnklesM: h, mgh }, ankleSagittal: { K: ankleSag, KoverMgh: ankleSag / mgh, D: ankleSagD, DoverMghS: ankleSagD / mgh },
  activation: { tauActMs: 15, tauDeactMs: 50, source: "spec/v2_actuators.js ACTIVATION (Thelen 2003)" }, excitationRule: lawId === "A" ? "u = min(1, |τ_req|·1.25/τ_cap + 0.02) from the SAME tick's request (sim/v2_actuation.js): zero neural latency" : "law B (ppr1_law.mjs)",
  rows, families: Object.fromEntries(Object.entries(byFam).map(([f, e]) => [f, { n: e.n, K: [Math.min(...e.K), Math.max(...e.K)], D: [Math.min(...e.D), Math.max(...e.D)], KoverLoad: [Math.min(...e.KoverLoad), Math.max(...e.KoverLoad)], DoverK_ms: [Math.min(...e.DoverK_ms), Math.max(...e.DoverK_ms)] }])), isotropy };
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); sim.destroy();
console.log(`law ${lawId}: M ${M.toFixed(1)} kg, COM ${h.toFixed(3)} m above ankles, mgh ${mgh.toFixed(0)} N·m/rad | summed sagittal ankle K ${ankleSag.toFixed(0)} N·m/rad = ${(ankleSag / mgh).toFixed(2)} mgh, D ${ankleSagD.toFixed(0)} N·m·s/rad = ${(ankleSagD / mgh).toFixed(3)} mgh·s`);
for (const [f, e] of Object.entries(out.families)) console.log(`  ${f.padEnd(16)} K ${e.K.map(x => x.toFixed(0)).join("–")} N·m/rad · D ${e.D.map(x => x.toFixed(1)).join("–")} N·m·s/rad · K/load ${e.KoverLoad.map(x => x.toFixed(2)).join("–")} · D/K ${e.DoverK_ms.map(x => x.toFixed(0)).join("–")} ms`);
for (const r of rows.filter(r => /_R$|lumbar|thoracic|neck/.test(r.joint))) console.log(`  ${(r.joint + "." + r.axis).padEnd(20)} bias ${r.bias.toFixed(1).padStart(7)} · window [${r.lo.toFixed(1)}, ${r.hi.toFixed(1)}] N·m · a+ ${r.aPlus.toFixed(3)} a− ${r.aMinus.toFixed(3)} · cap +${r.capPlus.toFixed(0)} / −${r.capMinus.toFixed(0)} N·m`);
console.log("isotropic (same K on every axis of a joint):", Object.values(isotropy).every(v => v.same));

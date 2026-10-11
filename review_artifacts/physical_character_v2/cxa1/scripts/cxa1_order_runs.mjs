// CXA-1 labelled diagnostic: the SAME N2 runs with the character creation order swapped (tackler bodies created first → Jolt body IDs / solver
// ordering swapped), through the existing post-hoc diagnostic copy of the frozen plant (pvp1/diag/pvp1a_sim_diag.mjs, option order "TR"; nothing else
// differs from the frozen plant). Also the default order "RT" through the same copy, which must reproduce the committed record (sanity). Neither result
// is adopted. Records: same layout as the frozen runner (rec.S in WORLD order — tackler first for "TR").
// usage: V2_KNEE_MODEL=v2k node cxa1_order_runs.mjs --fixture <fixture.json> --order TR|RT --out <file.json.gz>
import fs from "fs"; import zlib from "zlib";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL } = PL;
const { PvpPlant } = await import(new URL("../../pvp1/diag/pvp1a_sim_diag.mjs", import.meta.url).href), { loadJolt } = await import(PL.P2 + "core/v2_jolt.js");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const J = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js"), FIX = JSON.parse(fs.readFileSync(arg("fixture"))), order = arg("order", "TR");
const sim = new PvpPlant(J, { runner: FIX.write.runner, tackler: FIX.write.tackler }, FIX.flags, "N2", { O: FIX.O, instrument: true, order });
while (sim.n < PV.steps) sim.tick();
const out = { job: { mode: "N2", order, diagnostic: "creation-order swap (CXA-1); not adopted" }, recs: sim.recs, finalHash: IL.sha256(JSON.stringify(sim.recs.map(r => r.hash))).slice(0, 16) };
sim.destroy(); fs.writeFileSync(arg("out"), zlib.gzipSync(JSON.stringify(out))); console.log(`order ${order}: ${out.recs.length} steps, final hash ${out.finalHash}`);

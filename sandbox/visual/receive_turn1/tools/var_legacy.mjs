// receive_turn1/tools/var_legacy.mjs — the phase-1 audit: with RECEIVE-KILL-1.2's keys and unbounded draws (setDraws({ keys: "rk12", bounded: false }))
// the RECEIVE-TURN-1 kill engine reproduces RECEIVE-KILL-1.2 B episode for episode (every contact's launch and tick, the final ball, the stable
// time), and with the v2 keys every episode differs (re-keyed).   node var_legacy.mjs <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), base = path.resolve(HERE, "../..");
const N = await import(base + "/receive_turn1/rk_sim.js"), NM = await import(base + "/receive_turn1/rk_model.js"), O = await import(base + "/receive_kill12/rk_sim.js"), OM = await import(base + "/receive_kill12/rk_model.js");
const { THREE_BENCH } = await import(base + "/receive_turn1/rk_conditions.js");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b), R = { runs: 0, identical: 0, v2differ: 0, v2runs: 0 };
NM.setScale("B"); OM.setScale("B");
for (const B of THREE_BENCH) { const Pn = N.prepare(B.cond), Po = O.prepare(B.cond);
  for (const bc of [10, 30, 50, 70, 75, 90, 99]) for (let s = 1; s <= 8; s++) {
    NM.setDraws({ keys: "rk12", bounded: false }); const en = N.runEpisode(Pn, bc, { seed: s }, { every: 8 }), eo = O.runEpisode(Po, bc, { seed: s }, { every: 8 }); R.runs++;
    if (same(en.contacts.map((k) => [k.sf.key, k.i, k.ex.v]), eo.contacts.map((k) => [k.sf.key, k.i, k.ex.v])) && same(en.m.finalBall, eo.m.finalBall) && en.m.tStable === eo.m.tStable) R.identical++;
    NM.setDraws({ keys: "v2", bounded: true }); const e2 = N.runEpisode(Pn, bc, { seed: s }, { every: 8 }); R.v2runs++; if (!same(e2.contacts.map((k) => k.ex.v), en.contacts.map((k) => k.ex.v))) R.v2differ++; } }
fs.writeFileSync(process.argv[2] || "var_legacy.json", JSON.stringify(R, null, 1)); console.log(JSON.stringify(R));

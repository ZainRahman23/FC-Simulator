// lib_repro.mjs — DRIBBLING VOCABULARY INTEGRATION: does the integrated library reproduce an approved review build exactly? For each case
// (the identical entry and input), both builds are simulated and posed, and every joint of the body and the ball are compared on every tick of
// the whole case; plus the contacts (time, foot, surface) and the played techniques. Each build runs with its own modules and meta table.
//   node lib_repro.mjs [--a ../../croqlw/] [--b ../] [--set croqueta | bodyfeint | all] [--json f]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const SETS = {
  croqueta: [["CROQUETA", "REF · JOG R → L", false], ["CROQUETA", "REF · JOG L → R", false], ["CROQUETA", "REF · JOG R → L", true]],
  bodyfeint: [["BODY_FEINT_V2", "FAKE LEFT → RIGHT", false], ["BODY_FEINT_V2", "FAKE RIGHT → LEFT", false], ["BODY_FEINT_V2", "LOW-SPEED L → R", false], ["BODY_FEINT_V2", "LOW-SPEED R → L", false], ["BODY_FEINT_V2", "RUNNING L → R", false], ["BODY_FEINT_V2", "RUNNING R → L", false], ["BODY_FEINT_V2", "FAKE LEFT → RIGHT", true]] };
async function build(rel) { const base = new URL(rel, import.meta.url);
  const { makeSim, ENV, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base));
  const { PlayBody } = await import(new URL("u_body.js", base)); const { CASES } = await import(new URL("v_cases.js", base)); const meta = await import(new URL("v_meta.js", base));
  const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
  return { DT, run(tech, variant, mirror) { const c = CASES.find((x) => x.tech === tech && x.variant === variant); if (!c) return null;
    const sim = makeSim("TL", Object.assign(caseOpts(c, mirror), { layers: presetLayers("FULL") })); sim.intentOf = meta.intentOf; const r = runCaseOn(sim, c, mirror); return { sim, body: new PlayBody(env, sim), t0: r.t0 }; } }; }
const A = await build(arg("a", "../../croqlw/")), B = await build(arg("b", "../")), set = arg("set", "all"), list = set === "all" ? SETS.croqueta.concat(SETS.bodyfeint) : SETS[set], out = [];
for (const [tech, variant, mirror] of list) { const a = A.run(tech, variant, mirror), b = B.run(tech, variant, mirror); if (!a || !b) { console.log(`${variant}: missing`); continue; }
  let mx = 0, tmx = null, first = null, n = 0; const T1 = Math.min(a.sim.t, b.sim.t);
  for (let t = Math.max(0, a.t0 - 0.5); t <= T1 + 1e-9; t += A.DT) { const pa = a.body.pose(t), pb = b.body.pose(t); let d = Math.hypot(pa.ball[0] - pb.ball[0], pa.ball[1] - pb.ball[1], pa.ball[2] - pb.ball[2]); n++;
    for (const k of Object.keys(pa.J)) { const x = pa.J[k].j, y = pb.J[k].j; d = Math.max(d, Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])); }
    if (d > 1e-6 && first == null) first = t - a.t0; if (d > mx) { mx = d; tmx = t - a.t0; } }
  const cs = (s, t0) => s.contacts.filter((x) => x.t > t0 - 1e-9 && !x.missed).map((x) => `${(x.t - t0).toFixed(3)} ${x.F} ${x.surface}`), ca = cs(a.sim, a.t0), cb = cs(b.sim, b.t0);
  const played = (s) => (s.log.skill || []).map((x) => `${x.result}${x.played ? " " + x.played : ""}`).join(" · ");
  const o = { variant: (mirror ? "MIRROR · " : "") + variant, ticks: n, maxDiffMm: +(mx * 1000).toFixed(3), at: tmx, firstDiff: first, contactsIdentical: JSON.stringify(ca) === JSON.stringify(cb), contacts: cb.length, playedA: played(a.sim), playedB: played(b.sim) }; out.push(o);
  console.log(`${o.variant.padEnd(32)} ${String(n).padStart(4)} ticks · every joint + the ball: max ${o.maxDiffMm.toFixed(3)} mm${tmx != null && mx > 0 ? " @" + tmx.toFixed(3) : ""} · ${first == null ? "IDENTICAL" : "first difference @" + first.toFixed(3)} · contacts ${o.contactsIdentical ? "identical" : "DIFFER"} (${o.contacts}) · A: ${o.playedA} · B: ${o.playedB}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

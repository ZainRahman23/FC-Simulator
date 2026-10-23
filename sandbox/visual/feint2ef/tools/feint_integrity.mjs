// feint2ef/tools/feint_integrity.mjs (from feint2vg) — BODY FEINT V2 (EXIT FOOT): the owner's integrity list for the six curated cases, this build
// against PREVIOUS VIDEO-GUIDED V2 (../../feint2vg, run with its own modules): plant slides (SLIDE), foot jumps (JUMP), leg crossings (CROSS), knee pops (KNEE), floats
// (FLOAT), foot swaps (SWAP) — normal-visible / slow-motion — plus pelvis discontinuities (the largest per-tick pelvis step), torso and shoulder
// spikes (> 900 °/s yaw / roll), possession (exits, missed contacts), from 0.3 s before the request to 2 s after
//   node feint_integrity.mjs [--json f]
import fs from "node:fs";
const BUILDS = [["EXIT-FOOT V2", "../"], ["PREVIOUS VIDEO-GUIDED V2", "../../feint2vg/"]];
const { footTool } = await import("./feint_foot.mjs");
const VAR = ["FAKE LEFT → RIGHT", "FAKE RIGHT → LEFT", "LOW-SPEED L → R", "LOW-SPEED R → L", "RUNNING L → R", "RUNNING R → L"];
const out = {};
for (const [name, dir] of BUILDS) { const base = new URL(dir, import.meta.url);
  const { CASES } = await import(new URL("v_cases.js", base)); const { feintCase } = await import(new URL("tools/feint_measure.mjs", base)); const X = await import(new URL("tools/v_extreme.mjs", base));
  const { makeSim, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base));
  out[name] = []; const FT = await footTool(dir);
  for (const v of VAR) { const c = CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === v); const fm = feintCase(c, false);
    const sim = makeSim("TL", Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, false), m = X.measure(sim, Math.round(Math.max(0, r.t0 - 0.3) / DT), 0);
    const K = (k) => `${m.kinds[k + "·normal"] || 0}/${m.kinds[k + "·slow"] || 0}`;
    const miss = sim.contacts.filter((x) => x.missed).length, ex = sim.log && sim.log.exits ? sim.log.exits.length : 0;
    const ft = FT.footRun(c, false), ph = ft.phases, mx = (k) => Math.max(...Object.values(ph).map((x) => x[k]));
    out[name].push({ v, freeAcross: ph.lie.side, freeToe: ph.lie.toe, footStep: mx("stepCm"), toeRate: mx("toeRate"), contactFace: ft.contact.face, contactSurface: ft.surface, contactGapCm: ft.contact.gap != null ? +(ft.contact.gap * 100).toFixed(1) : null, touch: fm.tDec, useful: fm.total, vMin: fm.vMin, N: m.N, SLIDE: K("SLIDE"), JUMP: K("JUMP"), CROSS: K("CROSS"), KNEE: K("KNEE"), FLOAT: K("FLOAT"), SWAP: K("SWAP"), pelJump: fm.pelJump, spikes: fm.nSpikes, spk: fm.spikes, missed: miss, exits: fm.exits != null ? fm.exits : ex }); } }
const f = (x, d = 2) => (x == null ? "—" : (+x).toFixed(d));
for (const [name] of BUILDS) { console.log(`\n■ ${name} — the free foot: across in the lie (+ = exit side) · its toe (+ = toward the exit) · the largest per-tick foot step · the fastest toe turn (an ankle snap > 900 °/s) · the decisive contact's surface, the boot face nearest the ball and its gap`);
  for (const o of out[name]) console.log(`${o.v.padEnd(21)} across ${f(o.freeAcross)} m · toe ${o.freeToe}° · step ${f(o.footStep, 1)} cm/tick · toe turn ${o.toeRate}°/s · contact ${o.contactSurface} (face ${o.contactFace}, gap ${f(o.contactGapCm, 1)} cm)`);
  console.log(`  (normal-visible / slow-motion)`); console.log("case                  touch useful  SLIDE  JUMP  CROSS  KNEE  FLOAT  SWAP | pelvis step | spikes >900°/s | missed exits");
  for (const o of out[name]) console.log(`${o.v.padEnd(21)} ${f(o.touch)}  ${f(o.useful)}   ${o.SLIDE.padEnd(5)}  ${o.JUMP.padEnd(4)}  ${o.CROSS.padEnd(5)}  ${o.KNEE.padEnd(4)}  ${o.FLOAT.padEnd(5)}  ${o.SWAP.padEnd(4)} | ${f(o.pelJump * 100, 1)} cm      | ${o.spikes}${o.spikes ? " (" + o.spk.slice(0, 2).join(", ") + ")" : ""} | ${o.missed} ${o.exits}`); }
const j = process.argv.indexOf("--json"); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1));

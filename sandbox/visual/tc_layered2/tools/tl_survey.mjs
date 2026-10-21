// tc_layered2/tools/tl_survey.mjs — WHICH ACTION WINS (simulation only, no pose — fast): for each test family and configuration, the first action
// chosen after the stick change (named, generic or carry) and how often, with the relevant contact / new line medians and LOST
//   node tl_survey.mjs [--configs A,B4,B45] [--only substr] [--json f]
import { makeSim, DT } from "./tl_env.mjs";
import { presetLayers, LAYERS_OFF } from "../tl_sim.js";
import { TESTS, MODES, reqOf } from "../tl_tests.js";
import fs from "node:fs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; };
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; }, DEG = Math.PI / 180, hyp = Math.hypot;
export const layersOf = (cfg) => (cfg.startsWith("+") ? Object.assign({}, LAYERS_OFF, Object.fromEntries(cfg.slice(1).split("+").map((k) => [k, true]))) : presetLayers(cfg));
export function survey(cfg, sp) { const M = MODES[sp.mode], sim = makeSim("TL", { layers: layersOf(cfg) }), n = Math.round(sp.dur / DT), tIn = sp.changes[0], vm = sp.mode === "SPRINT" ? 8 : sp.mode === "RUN" ? 5.3 : 3.2; let line = null, lineS = null;
  const hI = reqOf(sp.f, tIn + 1e-6, M).h;
  for (let k = 0; k < n; k++) { sim.step(reqOf(sp.f, k * DT, M)); if (sim.t < tIn) continue; const st = sim.stateAt(sim.t); if (line == null && hI != null) { if (st.s >= 0.4 * vm && Math.abs(wrap(st.h - hI)) < 15 * DEG) { if (lineS == null) lineS = sim.t; if (sim.t - lineS >= 0.1) line = lineS - tIn; } else lineS = null; } }
  const tNext = sp.changes[1] ?? sp.dur, acts = sim.log.actions.filter((a) => a.t >= tIn - 1e-9 && a.t < tNext && !/^(CARRY|STANDING|STOP)$/.test(a.label)), first = acts[0];
  const c = hI == null ? null : sim.contacts.find((x) => !x.missed && x.t >= tIn && x.t <= tNext && hyp(x.vOut[0], x.vOut[1]) > 0.3 && Math.abs(wrap(Math.atan2(x.vOut[1], x.vOut[0]) - hI)) < 30 * DEG);
  return { first: first ? first.label + (first.m ? (first.m > 0 ? " R" : " L") : first.F ? " " + first.F : "") : "CARRY", contact: c ? c.t - tIn : null, line, sim }; }
if ((process.argv[1] || "").endsWith("tl_survey.mjs")) { const cfgs = opt("configs", "A,B4,B45").split(","), only = opt("only", null), out = {}; const med = (A) => { const s = A.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; }, f2 = (x) => (x == null ? " — " : x.toFixed(2));
  const groups = {}; for (const sp of TESTS) { if (only && !sp.name.includes(only)) continue; (groups[sp.fam] = groups[sp.fam] || []).push(sp); }
  for (const [g, L] of Object.entries(groups)) { const row = [];
    for (const cfg of cfgs) { const R = L.map((sp) => survey(cfg, sp)), H = {}; for (const r of R) H[r.first.replace(/ [RL]$/, "")] = (H[r.first.replace(/ [RL]$/, "")] || 0) + 1;
      (out[g] = out[g] || {})[cfg] = { hist: H, contact: med(R.map((r) => r.contact)), line: med(R.map((r) => r.line)) }; row.push(`${cfg}: ${f2(out[g][cfg].contact)}/${f2(out[g][cfg].line)} ${Object.entries(H).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(", ")}`); }
    console.log(`■ ${g}\n   ` + row.join("\n   ")); }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

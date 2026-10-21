// tc_layered2/tools/tl_b5.mjs — B5 MEASURED DIRECTLY (owner §"MEASURE B5 DIRECTLY"): for the first technical action after each stick change in the
// owner's tests, per action and configuration (simulation only):
//   request → preparation begins   the earliest of the technique's braking start, its set touch, its first own stance (generic: its plant;
//                                  without one, its swing 0.12 s before the touch)
//   request → authoritative contact  the decisive contact as executed
//   contact → control returned     when a new intent can steer again: the release — and, without B5's exits, the exit lock until the exit touch
//                                  (+ 0.02 s) while the request stays on the exit line (as in these held tests); a generic action: at its contact
//   ownership                      preparation begins → control returned
//   node tl_b5.mjs [--configs A,B5,B4,B45] [--json f]
import { makeSim, DT } from "./tl_env.mjs";
import { TESTS, MODES, reqOf } from "../tl_tests.js";
import { layersOf } from "./tl_survey.mjs";
import fs from "node:fs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; };
export function b5Times(cfg, sp) { const M = MODES[sp.mode], L = layersOf(cfg), sim = makeSim("TL", { layers: L }), n = Math.round(sp.dur / DT), tIn = sp.changes[0];
  for (let k = 0; k < n; k++) sim.step(reqOf(sp.f, k * DT, M));
  const acts = Object.values(sim.log.acts).filter((a) => a.tSel >= tIn - 1e-9).sort((a, b) => a.tSel - b.tSel), a = acts[0]; if (!a) return null;
  const dec = sim.contacts.find((c) => c.actionId === a.id && !c.missed && (c.decisive || c.src === "generic")); if (!dec) return { label: a.label, done: false };
  let prep, ctrl; if (a.kind === "GENERIC") { prep = a.tPrep != null ? a.tPrep : dec.t - 0.12; ctrl = dec.t; }
  else { prep = Math.min(a.tA, a.setT != null ? a.setT : 9, a.tb != null && a.tb < a.tA - 1e-6 ? a.tb : 9); ctrl = L.exits ? a.tRelease : Math.max(a.tRelease, a.exitT != null ? a.exitT + 0.02 : 0); }
  return { label: a.label, done: true, sel: a.tSel - tIn, prep: prep - tIn, contact: dec.t - tIn, ctrl: ctrl - dec.t, own: ctrl - prep, trim: !!a.trim }; }
if ((process.argv[1] || "").endsWith("tl_b5.mjs")) { const cfgs = opt("configs", "A,B5,B4,B45").split(","), out = {}, med = (A) => { const s = A.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; }, f2 = (x) => (x == null ? "  — " : x.toFixed(2).padStart(5));
  const specs = TESTS.filter((x) => /snap|rapid|small/.test(x.fam));
  for (const cfg of cfgs) { const by = {}; for (const sp of specs) { const r = b5Times(cfg, sp); if (r && r.done) (by[r.label] = by[r.label] || []).push(r); } out[cfg] = {};
    console.log(`\n■ ${cfg}   ${"action".padEnd(26)} n    request→prep  request→contact  contact→control  ownership   (medians, s)`);
    for (const [lab, R] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) { const m = { n: R.length, prep: med(R.map((r) => r.prep)), contact: med(R.map((r) => r.contact)), ctrl: med(R.map((r) => r.ctrl)), own: med(R.map((r) => r.own)), trimmed: R.filter((r) => r.trim).length }; out[cfg][lab] = m;
      console.log(`  ${"".padEnd(cfg.length)}   ${lab.padEnd(26)} ${String(m.n).padStart(3)}   ${f2(m.prep)}         ${f2(m.contact)}            ${f2(m.ctrl)}          ${f2(m.own)}${m.trimmed ? `   (${m.trimmed} entered at the plant)` : ""}`); } }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

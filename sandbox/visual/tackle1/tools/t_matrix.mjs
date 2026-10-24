// tackle1/tools/t_matrix.mjs — THE ENCOUNTER MATRIX (deterministic, seeded): random honest set-ups — the carrier (walk / jog, straight, a cut, the
// Body Feint, the Croqueta), the defender set or walking in, beside the path (0.6 – 1.4 m) at a range of facings, the request at a random moment —
// every request's fate, every action's contact and outcome; also the input of the torture checks (t_torture.mjs reads the same generator)
//   node t_matrix.mjs [--n 300] [--seed 1] [--contact POKE|PHASE_C] [--json f]
import { ENV } from "../../vocab2/tools/u_env.mjs";
import { CASES } from "../../vocab2/v_cases.js";
import { runCase, caseReport } from "../t_run.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const ATT = () => [
  { tech: "CARRY", variant: "JOG", mode: "JOG", ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] },
  { tech: "CARRY", variant: "WALK", mode: "WALK", ang: 0, runup: 2.2, dur: 3.4, pre: 1.0, intents: [] },
  { tech: "CARRY", variant: "JOG CUT R", mode: "JOG", ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [], stick: [[0, 0, "JOG"], [0.55, 60, "JOG"]] },
  { tech: "CARRY", variant: "JOG CUT L", mode: "JOG", ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [], stick: [[0, 0, "JOG"], [0.55, -60, "JOG"]] },
  { tech: "CARRY", variant: "JOG LEFT-FOOTED", mode: "JOG", ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [], pref: "L" },
  CASES.find((x) => x.tech === "BODY_FEINT_V2" && x.variant === "FAKE LEFT → RIGHT"),
  CASES.find((x) => x.tech === "CROQUETA" && x.variant === "REF · JOG R → L")];
export function trialCase(i, seed = 1) { const R = rng(seed * 100003 + i), A = ATT(), c = A[Math.floor(R() * A.length)], side = R() < 0.5 ? -1 : 1, lat = side * (0.6 + 0.8 * R()), ahead = 2.6 + 2.6 * R(), face = 180 - side * 60 * R(), moving = R() < 0.3;
  const def = { at: [ahead + (moving ? 1.6 : 0), lat], face, stick: moving ? [[-0.6, 0, "WALK"], [0.4 + 0.6 * R(), null, "WALK"]] : [] }, tq = +(0.05 + 1.1 * R()).toFixed(3);
  return { id: `m${seed}-${i}`, group: "MATRIX", name: `${c.tech}·${c.variant} · def [${def.at.map((x) => x.toFixed(2))}] face ${face.toFixed(0)}${moving ? " walking" : ""} · req ${tq}`, c, def, tackle: [tq] }; }
if (process.argv[1] && process.argv[1].endsWith("t_matrix.mjs")) {
  const N = +arg("n", 300), seed = +arg("seed", 1), tally = {}, fam = {}, out = [];
  for (let i = 0; i < N; i++) { const tc = trialCase(i, seed), r = runCase(ENV, tc, { contact: arg("contact") }), R = caseReport(r.W, r.t0), S = R.action, q = R.requests[0];
    const k = S ? S.outcome.kind : `DECLINED · ${(q.reason || "").split(":")[0]}`; tally[k] = (tally[k] || 0) + 1; if (S) fam[S.family] = (fam[S.family] || 0) + 1;
    out.push({ i, name: tc.name, state: q.state, reason: q.reason, action: S, world: R.world }); if (i % 25 === 0) process.stderr.write(`${i} `); }
  console.log(`\nMATRIX ${N} trials (seed ${seed}, contact ${arg("contact", "POKE")})`); console.log("OUTCOMES", JSON.stringify(tally, null, 1)); console.log("FAMILIES", JSON.stringify(fam));
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ N, seed, tally, fam, out }, null, 0)); }

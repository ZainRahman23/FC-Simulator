// tackle1/tools/t_identity.mjs — THE ATTACKER IS THE CANONICAL PLAYER, EXACTLY: every curated case of the Dribbling Lab (vocab2/v_cases.js CASES,
// each also mirrored when it has a MIRROR twin) run (a) alone, exactly as the Lab and v_cases_run.mjs run it (makeSim + runCaseOn), and (b) inside the
// tackling world with a defender standing 3 m beside its path and the tackle module live — with no request, and with a request the envelope
// declines (out of reach). Compared: the authoritative hash, every tick's ball (position + velocity), every contact, the possession log, the skills.
//   node t_identity.mjs [--json f]
import { ENV, makeSim } from "../../vocab2/tools/u_env.mjs";
import { CASES } from "../../vocab2/v_cases.js";
import { caseOpts, runCaseOn } from "../../vocab2/v_run.js";
import { presetLayers, DT } from "../../vocab2/c_sim.js";
import { TackleWorld, runEncounter, encounterOpts } from "../t_world.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const sig = (S) => JSON.stringify({ h: S.hash, k: S.k, c: S.contacts.map((c) => [c.k, c.F, c.surface, c.role, c.missed ? 1 : 0, c.vOut.map((x) => +x.toFixed(9))]), p: (S.poss && S.poss.log || []).map((e) => [e.t, e.to, e.why]), sk: (S.log.skill || []).map((x) => [x.intent, x.result, x.played]) });
let n = 0, same = 0; const rows = [];
for (const c of CASES) for (const mirror of [false, true]) { if (mirror && c.variant !== "MIRROR" && !c.mirrorable) continue;
  const solo = makeSim("TL", Object.assign(caseOpts(c, mirror), { layers: presetLayers("FULL") })); runCaseOn(solo, c, mirror);
  for (const mode of ["no request", "declined request"]) { n++;
    const enc = { c, mirror, def: { P: [40, 31], h: Math.PI / 2 }, defStick: [], tackle: mode === "no request" ? [] : [0.2], after: null };
    const W = new TackleWorld(ENV, encounterOpts(enc)); runEncounter(W, enc);
    // (the world may run on after a committed tackle — none commits here; compare over the solo run's ticks)
    let dball = 0; for (let k = 0; k <= solo.k; k++) { const a = solo.ballTrack(k * DT), b = W.att.ballTrack(k * DT); dball = Math.max(dball, Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]), Math.hypot(a.v[0] - b.v[0], a.v[1] - b.v[1])); }
    const ok = sig(solo) === sig(W.att) && dball === 0 && !W.tk.act; if (ok) same++;
    rows.push({ tech: c.tech, variant: c.variant, mirror, mode, ok, hashSolo: solo.hash, hashWorld: W.att.hash, dball, request: W.tk.log[0] ? W.tk.log[0].state + " " + (W.tk.log[0].reason || "") : null });
    if (!ok) console.log("DIFFERENT", c.tech, c.variant, mirror, mode, solo.hash, W.att.hash, dball); } }
console.log(`IDENTITY: ${same} / ${n} runs identical (the attacker alone vs in the tackling world: hash, ball every tick, contacts, possession, skills)`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ n, same, rows }, null, 1)); process.exit(same === n ? 0 : 1);

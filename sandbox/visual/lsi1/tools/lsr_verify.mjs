// lsi1/tools/lsr_verify.mjs — an exported LEFT-STICK dataset (TOUCHLINE_LEFT_STICK_RECORDING_V1) against the canonical simulation, in node:
//   1 DETERMINISM — each attempt's session re-simulated from its record (o0 + the run-length request record + the events) on the canonical vocab2
//     ControlledSim (the same engine the sandbox runs): the hash must equal the browser's
//   2 THE STATE TRACK — sampled again from the node simulation with the same reader (lsr_state.js): every stored cell identical; the timeline too
//   3 THE DERIVED SIGNALS — recomputed from the stored frames (lsr_signals.js): identical to the stored ones; the diagnostic events too
//   4 THE PIPELINE — for every frame driven by the stick, the request the lab delivered (heading, mode) = the canonical pt_input.js pipeline
//     applied to the recorded raw stick, its deadzone and its latched frame (headingFrom · stickVector · stickMode; SPRINT / WALK buttons);
//     for WASD frames the heading (headingFrom on the keys' direction and their latched frame)
//   node lsr_verify.mjs <dataset.json> [--json out.json]
import { makeSim } from "../../vocab2/tools/u_env.mjs";
import { MODES } from "../../vocab2/u_tc.js";
import { stickVector, stickMode, headingFrom } from "../../tc_baseline_88573ef0/pt_input.js";
import { sampleState, sampleTicks, STATE_FIELDS } from "../lsr_state.js";
import { toCols, unrleInput, validateDataset, rowsOf, round } from "../lsr_schema.js";
import { analyzeSamples, DERIVED_FIELDS } from "../lsr_signals.js";
import fs from "node:fs";
const file = process.argv[2], arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const D = JSON.parse(fs.readFileSync(file)), V = validateDataset(D); if (!V.ok) { console.log("INVALID:", V.errors.join("; ")); process.exit(1); }
const roundObj = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = typeof v === "number" ? round(v, 5) : v; return r; };
const diffCells = (A, B) => { let n = 0, first = null; for (const f of A.fields) for (let i = 0; i < A.n; i++) { const a = A.data[f][i], b = B.data[f] ? B.data[f][i] : undefined; if (a !== b && !(a == null && b == null)) { n++; if (!first) first = `${f}[${i}] ${a} vs ${b}`; } } return { n, first }; };
const SRC = ["none", "mouse", "touch", "pen", "gamepad", "keys", "synthetic"];
const out = []; let bad = 0;
console.log(`${file}\n${D.attempts.length} attempt(s) · schema ${D.schema} v${D.version} · milestone ${D.meta.milestone.commit.slice(0, 8)} · created ${D.created}\n`);
for (const a of D.attempts) {
  const t0 = performance.now(), o0 = JSON.parse(JSON.stringify(a.session.o0)), sim = makeSim(a.session.engine === "baseline" ? "BASE" : "TL", o0), I = unrleInput(a.session.inputRLE), E = a.session.events || []; let ei = 0;
  for (let k = 0; k < I.length / 3; k++) { while (ei < E.length && E[ei].k === k) { const e = E[ei++]; if (e.kind === "attrs") sim.setAttrs(e.v); else if (e.kind === "foot") sim.setFoot(e.v); else if (sim.applyEvent) sim.applyEvent(e); } const h = I[3 * k]; sim.step({ h: h === -99 ? null : h, mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] }); }
  const ms = performance.now() - t0, C = a.capture, hashOk = sim.hash === a.session.hash && sim.k === a.session.k;
  const st = sampleState(sim, C.k0, C.k1, a.input.stateHz ? Math.round(240 / a.input.stateHz) : 2), sc = toCols(st.rows, STATE_FIELDS), sd = diffCells(a.state, sc);
  const tlOk = JSON.stringify(st.timeline.map(roundObj)) === JSON.stringify(a.timeline) && JSON.stringify(st.dict) === JSON.stringify(a.dict);
  const tk = sampleTicks(sim, C.k0, C.k1), tkOk = JSON.stringify(tk.reqH.map((v) => round(v, 4))) === JSON.stringify(a.ticks.reqH) && JSON.stringify(tk.mode) === JSON.stringify(a.ticks.mode);
  const F = rowsOf(a.frames), { rows, events } = analyzeSamples(F.map((f) => ({ t: f.tHost, x: f.rx, y: f.ry })), { deadzone: a.input.deadzone }), dd = diffCells(a.derived, toCols(rows, DERIVED_FIELDS));
  const evOk = JSON.stringify(events.map((e) => e.kind + "@" + e.i)) === JSON.stringify(a.stickEvents.map((e) => e.kind + "@" + e.i));
  // the pipeline: frames that stepped ticks with the stick as the source (mouse / touch / pen / gamepad / synthetic) and no sandbox override
  let pN = 0, pBad = 0, pFirst = null; const Z = { deadzone: a.input.deadzone, walkTo: a.input.zones.walkTo, jogTo: a.input.zones.jogTo };
  for (const f of F) { const src = SRC[f.src]; if (!f.n || src === "none" || a.sandbox && a.sandbox.cruise) continue;
    if (src === "keys") { if (!f.rx && !f.ry) continue; pN++; const hK = headingFrom(f.latch * Math.PI / 180, f.rx, f.ry), dK = Math.abs(((hK * 180 / Math.PI - f.reqH + 540) % 360) - 180);   // (WASD: the direction only — the base mode is the page's)
      if (!(dK <= 0.01)) { pBad++; if (!pFirst) pFirst = `k ${f.k}: keys delivered ${f.reqH}° vs ${(hK * 180 / Math.PI).toFixed(3)}°`; } continue; }
    const v = stickVector(f.rx, f.ry, Z.deadzone); if (v.m === 0) continue; pN++;
    const hExp = headingFrom(f.latch * Math.PI / 180, v.x, v.y), mExp = f.btn & 5 ? "SPRINT" : f.btn & 2 ? "WALK" : stickMode(v.r, Z), dh = Math.abs(((hExp * 180 / Math.PI - f.reqH + 540) % 360) - 180);
    if (dh > 0.01 || MODES[f.mode] !== mExp) { pBad++; if (!pFirst) pFirst = `k ${f.k}: delivered ${f.reqH}° ${MODES[f.mode]} vs pipeline ${(hExp * 180 / Math.PI).toFixed(3)}° ${mExp}`; } }
  const ok = hashOk && sd.n === 0 && tlOk && tkOk && dd.n === 0 && evOk && pBad === 0; if (!ok) bad++;
  const r = { id: a.id, label: a.label, source: a.input.source, mode: C.mode, ticks: a.session.k, ms: +ms.toFixed(0), hash: sim.hash.toString(16), hashOk, stateCells: a.state.n * a.state.fields.length, stateDiff: sd.n, stateFirst: sd.first, timelineOk: tlOk, ticksOk: tkOk, derivedDiff: dd.n, derivedFirst: dd.first, eventsOk: evOk, pipelineFrames: pN, pipelineBad: pBad, pipelineFirst: pFirst, ok };
  out.push(r);
  console.log(`${ok ? "OK  " : "FAIL"} ${a.label.padEnd(44)} ${String(a.input.source).padEnd(9)} ${C.mode.padEnd(10)} ${String(a.session.k).padStart(5)} ticks ${String(r.ms).padStart(4)} ms · hash ${hashOk ? "IDENTICAL" : "DIFFERENT"} · state ${sd.n}/${r.stateCells} cells differ · timeline ${tlOk ? "=" : "≠"} · ticks ${tkOk ? "=" : "≠"} · derived ${dd.n} differ · events ${evOk ? "=" : "≠"} · pipeline ${pN - pBad}/${pN} frames = pt_input.js`);
  if (!ok) console.log("     ", JSON.stringify({ stateFirst: sd.first, derivedFirst: dd.first, pipelineFirst: pFirst }));
}
console.log(`\n${bad ? `FAIL: ${bad} of ${out.length}` : `ALL ${out.length} ATTEMPTS: node ≡ browser (hash, state track, timeline, request ticks), derived signals reproduced, delivered requests = the canonical pipeline`}`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));
process.exit(bad ? 1 : 0);

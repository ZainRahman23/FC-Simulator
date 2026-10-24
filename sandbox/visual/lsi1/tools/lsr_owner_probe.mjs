// lsi1/tools/lsr_owner_probe.mjs — OWNER INPUT ANALYSIS V1: WHEN COULD THE BODY HAVE DONE IT? The canonical technique gates asked, offline,
// at every frame around each owner gesture. Each probe re-simulates the owner's recorded session (o0 + the run-length request record — exactly
// the recording, lsr_verify.mjs) on the canonical vocab2 ControlledSim up to a request tick kq, then issues the SAME explicit request the
// Joystick Sandbox's temporary keys make (7 / 8 BODY FEINT, 9 / 0 CROQUETA — u_viewer.js viRequest: intentOf(id) → sim.requestSkill; while it
// is pending and through the move the stick is overridden toward the exit h0 + side × the sandbox's angle — 50° walk / 45° jog / 38° run, the
// croqueta 42° — in the mode the owner was in; declined: back to the line it was asked from) and reads the outcome the resolver logs: PLAYED
// (entered when, its first stance, its decisive touch) or REJECTED with the resolver's own reasons. NOTHING IS CHANGED: the canonical code is
// imported untouched, the owner's recording is never modified, no gameplay runs this; the gates answer exactly as they do in the sandbox.
//   Variants (per gesture, per technique):
//     CANONICAL  the owner's input up to kq, then the sandbox's explicit request (its exit angle)                    — the body's opportunity
//     OWNER      the owner's input up to kq, the request at kq, the owner's own stick after it (his exit angle)       — would his own exit pass?
//     HELD       COUNTERFACTUAL: from the gesture's onset the movement input held on the approach line (the stick's first
//                phase not steered), then the CANONICAL request at kq                                                — a recognizer that waits
//   node lsr_owner_probe.mjs <dataset.json> --out <probe.json> [--step 4] [--from -0.2] [--to 1.0] [--only 1,2,…]
import { makeSim } from "../../vocab2/tools/u_env.mjs";
import { MODES } from "../../vocab2/u_tc.js";
import { intentOf, headlineReason } from "../../vocab2/v_meta.js";
import { unrleInput, validateDataset } from "../lsr_schema.js";
import { gestureOf } from "../lsr_gesture.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const D = JSON.parse(fs.readFileSync(process.argv[2])), V = validateDataset(D); if (!V.ok) { console.log("INVALID:", V.errors.join("; ")); process.exit(1); }
const DT = 1 / 240, DEG = Math.PI / 180, STEP = +arg("step", 4), FROM = +arg("from", -0.2), TO = +arg("to", 1.0), ONLY = arg("only") ? arg("only").split(",").map(Number) : null;
// the side each label asks for (+1 = exit to the player's right) and the techniques probed for it
function plan(a, g) { const L = a.label;
  if (/^FEINT LEFT/.test(L)) return { side: 1, techs: ["BODY_FEINT"], variants: ["CANONICAL", "OWNER", "HELD"] };
  if (/^FEINT RIGHT/.test(L)) return { side: -1, techs: ["BODY_FEINT"], variants: ["CANONICAL", "OWNER", "HELD"] };
  if (/^CROQUETA LEFT/.test(L)) return { side: -1, techs: ["CROQUETA", "BODY_FEINT"], variants: ["CANONICAL", "OWNER", "HELD"] };
  if (/^CROQUETA RIGHT/.test(L)) return { side: 1, techs: ["CROQUETA", "BODY_FEINT"], variants: ["CANONICAL", "OWNER", "HELD"] };
  if (g && g.kind !== "none" && g.exit) return { side: Math.sign(g.exit.rel) || 1, techs: ["CROQUETA", "BODY_FEINT"], variants: ["CANONICAL"] };   // (ordinary steering: what the gates would say if a request were made there)
  return null; }
function probe(a, g, tech, side, variant, kq) {
  const sim = makeSim(a.session.engine === "baseline" ? "BASE" : "TL", JSON.parse(JSON.stringify(a.session.o0))), I = unrleInput(a.session.inputRLE), E = a.session.events || [], nRec = I.length / 3;
  const kOn = Math.round(g.onset / DT), H0 = g.H0 * DEG; let ei = 0, S = null, R = null, entered = null;
  const kEnd = Math.min(kq + Math.round(2.6 / DT), nRec + Math.round(2.6 / DT));
  for (let k = 0; k < kEnd; k++) {
    while (ei < E.length && E[ei].k === k) { const e = E[ei++]; if (e.kind === "attrs") sim.setAttrs(e.v); else if (e.kind === "foot") sim.setFoot(e.v); else if (sim.applyEvent) sim.applyEvent(e); }
    const rec = k < nRec ? { h: I[3 * k] === -99 ? null : I[3 * k], mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] } : { h: null, mode: MODES[I[3 * (nRec - 1) + 1]], keys: I[3 * (nRec - 1) + 2] };
    let inp = rec;
    if (variant === "HELD" && k >= kOn && k < kq) inp = { h: H0, mode: rec.mode, keys: rec.keys };
    if (k === kq) { const st = sim.stateAt(sim.t), h0 = st.s > 1.0 ? st.h : st.psi, v = st.s, ang = tech === "CROQUETA" ? 42 : v < 2.65 ? 50 : v < 4.3 ? 45 : 38, it = intentOf(tech);
      const mode = variant === "HELD" ? rec.mode : (rec.h != null ? rec.mode : MODES[I[3 * Math.max(0, k - 1) + 1]]);
      R = { h0, h: h0 + side * ang * DEG, mode, ang, v, t: sim.t }; S = sim.requestSkill(Object.assign({}, it, { sprint: false })) || sim.skill; }
    if (R && variant !== "OWNER") { const live = S && !S.done; if (S && S.done && S.result !== "PLAYED") R.h = R.h0; if (live || sim.t - (S && S.tEnd != null ? S.tEnd : R.t) < 1.2) inp = { h: R.h, mode: R.mode, keys: rec.keys }; }
    sim.step(inp);
    if (S && !entered && S.state === "ENTERED") { const A = sim.plan.action; entered = { tEntered: S.tEntered, tech: A.tech || null, tA: A.tA ?? null, tC: A.tC ?? null, tCommit: A.tCommit ?? null }; }
    if (S && S.done && sim.t > (S.tEnd ?? sim.t) + 0.05 && k > kq + 4) break; }
  const tq = kq * DT, rel = (x) => (x == null ? null : +(x - tq).toFixed(4));
  return { tq: +(tq - g.onset).toFixed(4), result: S ? (S.done ? S.result : "PENDING") : "NONE", played: S && S.played ? S.played : null, why: S && S.result !== "PLAYED" ? headlineReason(S.rej) : null, rej: S ? S.rej : null,
    entered: entered ? rel(entered.tEntered) : null, start: entered && entered.tA != null ? rel(entered.tA) : null, contact: S && S.tPlayed != null ? rel(S.tPlayed) : entered && entered.tC != null ? rel(entered.tC) : null,
    vReq: R ? +R.v.toFixed(2) : null, exitAng: R ? R.ang : null }; }
const out = { dataset: process.argv[2], created: new Date().toISOString(), step: STEP, from: FROM, to: TO, attempts: [] }, t0 = performance.now();
D.attempts.forEach((a, ai) => { if (ONLY && !ONLY.includes(ai + 1)) return; const g = gestureOf(a), P = g.kind !== "none" ? plan(a, g) : null; if (!P) { out.attempts.push({ id: a.id, label: a.label, probes: null, note: "no direction gesture (neutral / none)" }); return; }
  const rec = { id: a.id, label: a.label, n: ai + 1, side: P.side, onset: g.onset, sets: [] }, nRec = a.session.k;
  for (const tech of P.techs) for (const variant of P.variants) { const rows = [];
    for (let kq = Math.round((g.onset + FROM) / DT); kq <= Math.round((g.onset + TO) / DT) && kq < nRec; kq += STEP) rows.push(probe(a, g, tech, P.side, variant, kq));
    const first = rows.find((r) => r.tq >= -1e-9 && r.result === "PLAYED"), atOnset = rows.find((r) => Math.abs(r.tq) < STEP * DT / 2 + 1e-9) || rows.find((r) => r.tq >= 0);
    rec.sets.push({ tech, variant, rows, firstPlayed: first ? { tq: first.tq, entered: first.entered, start: first.start, contact: first.contact, played: first.played } : null, atOnset });
    const why = {}; for (const r of rows) if (r.result !== "PLAYED" && r.why) why[r.why] = (why[r.why] || 0) + 1;
    console.log(`#${String(ai + 1).padStart(2)} ${a.label.padEnd(24)} ${tech.padEnd(10)} ${variant.padEnd(9)} played ${String(rows.filter((r) => r.result === "PLAYED").length).padStart(2)}/${rows.length}  first ≥ onset: ${first ? `+${(first.tq * 1000).toFixed(0)} ms (contact +${first.contact != null ? ((first.tq + first.contact) * 1000).toFixed(0) : "—"} ms from onset, ${first.played})` : "never"}  · ${Object.entries(why).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, n]) => `${k} ×${n}`).join(" | ")}`); }
  out.attempts.push(rec); });
console.log(`\n${((performance.now() - t0) / 1000).toFixed(0)} s`); fs.writeFileSync(arg("out"), JSON.stringify(out));

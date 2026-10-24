// lsi1/tools/lsr_owner_analysis.mjs — OWNER INPUT ANALYSIS V1: the owner's recorded attempts described (lsr_gesture.js — the page uses the
// same code), their provenance checked, the canonical gates' answers (lsr_owner_probe.mjs) summarised, the label groups compared — as text
// (evidence) and as the analysis page's JSON. DESCRIPTION, NOT A RECOGNIZER: no threshold is fitted, nothing classifies an attempt; the owner's
// own label is the only class. Small n: every group is reported as its values, median [min – max] — no confidence is claimed.
//   node lsr_owner_analysis.mjs <owner dataset.json> --probe <probe.json> --tests <the recorder's synthetic test dataset.json> --json <out.json>
import { gestureOf, arcOf, edgeClip, datasetEdges, stickTrack, SEG, GESTURE_VERSION } from "../lsr_gesture.js";
import { validateDataset } from "../lsr_schema.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const D = JSON.parse(fs.readFileSync(process.argv[2])), V = validateDataset(D); if (!V.ok) { console.log("INVALID:", V.errors.join("; ")); process.exit(1); }
const P = arg("probe") ? JSON.parse(fs.readFileSync(arg("probe"))) : null, TESTS = arg("tests") ? JSON.parse(fs.readFileSync(arg("tests"))) : null;
const f = (v, n = 0) => (v == null || !Number.isFinite(+v) ? "—" : (+v).toFixed(n)), ms = (v) => (v == null ? "—" : (v * 1000).toFixed(0)), sgn = (s) => (s === "R" ? 1 : s === "L" ? -1 : 0);
const stats = (A) => { const B = A.filter((v) => v != null && Number.isFinite(v)).sort((a, b) => a - b); if (!B.length) return null; const q = (p) => B[Math.min(B.length - 1, Math.floor(p * (B.length - 1) + 0.5))]; return { n: B.length, min: B[0], median: B.length % 2 ? B[B.length >> 1] : (B[B.length / 2 - 1] + B[B.length / 2]) / 2, max: B[B.length - 1], values: B }; };
const FAMILY = (L) => (/^FEINT/.test(L) ? "BODY FEINT" : /^CROQUETA/.test(L) ? "CROQUETA" : /^GENTLE/.test(L) ? "GENTLE TURN" : /^SHARP/.test(L) ? "SHARP TURN / CUT" : /REVERSAL/.test(L) ? "REVERSAL" : /CARRY|STRAIGHT/.test(L) ? "NORMAL CARRY" : L);
// ── 1 PROVENANCE: a real owner attempt = a live pointer / pad / key source (never the recorder's synthetic traces), a real browser (not headless
// automation), not one of the recorder's committed test attempts
const testIds = new Set((TESTS ? TESTS.attempts : []).map((a) => a.id));
const prov = (a) => { const R = a.raw.data, kinds = new Set(R.kind), why = [];
  if (a.input.synthetic) why.push("synthetic trace"); if (/HeadlessChrome/.test(a.input.userAgent || "")) why.push("headless automation"); if (testIds.has(a.id)) why.push("a recorder test attempt"); if (kinds.has(7)) why.push("synthetic raw events");
  if (!["mouse", "touch", "pen", "gamepad", "keys"].includes(a.input.source)) why.push(`source ${a.input.source}`); return { real: why.length === 0, why, source: a.input.source, ua: a.input.userAgent, created: a.created, rawKinds: [...kinds].sort() }; };
// ── 2 EACH ATTEMPT ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const E = datasetEdges(D.attempts), atts = [];
D.attempts.forEach((a, i) => { const p = prov(a), g = gestureOf(a), arc = arcOf(a, g), clip = edgeClip(a, E), fam = FAMILY(a.label);
  const o = { n: i + 1, id: a.id, label: a.label, family: fam, created: a.created, duration: a.capture.duration, mode: a.capture.mode, mark: a.owner ? a.owner.mark : null, provenance: p,
    counts: { raw: a.raw.n, frames: a.frames.n, state: a.state.n, ticks: a.session.k, rawKinds: p.rawKinds }, gesture: g, arc };
  if (g.kind !== "none") { const sExit = g.exit ? Math.sign(g.exit.rel) : 0, t0 = g.onset, tEnd = t0 + (g.settle ?? 0);
    // the features, MIRRORED so the exit side is + (player-relative right): the first phase against it is the "counter"
    o.f = { kind: g.kind, exitSide: sExit > 0 ? "R" : "L", exit: g.exit ? Math.abs(g.exit.rel) : null, counter: g.kind === "contradiction" ? g.peak1.abs : 0, tPeak1: g.peak1.t, dwell1: g.dwell1,
      tSide2: g.tSide2 ?? null, transitVia: g.transit ? g.transit.via : null, transitMs: g.transit ? g.transit.dur : null, chordMin: g.transit ? g.transit.chordMin : null, settle: g.settle, travel: g.angularTravel,
      omegaPeak: g.omegaPeak, alphaPeak: g.alphaPeak, rMin: g.rMin, rOnset: g.rOnset, exitHold: g.exitHold, exitReleased: g.exitReleased, arcExtent: arc ? Math.abs(arc.extent) : null, arcMs: arc ? arc.duration : null, arcRate: arc ? arc.meanRate : null };
    // the screen edge: pinned samples in the first phase (onset → side 2) and in the exit (side 2 → +0.5 s)
    o.clip = { first: clip.within(t0, t0 + (g.tSide2 ?? g.settle ?? 0)), exit: clip.within(t0 + (g.tSide2 ?? g.settle ?? 0), tEnd + 0.5), times: clip.edges.flatMap((e) => e.times.filter((t) => t >= t0 - 0.5 && t <= t0 + 2.0).map((t) => +(t - t0).toFixed(4))) };
    // the detail track (onset − 0.5 … + 2.0 s): the stick against H0 and its radius, for the per-attempt timeline
    { const T = stickTrack(a).filter((q) => q.t >= t0 - 0.5 - 1e-9 && q.t <= t0 + 2.0); o.track = { t: T.map((q) => +(q.t - t0).toFixed(4)), rel: T.map((q) => (q.H == null ? null : +(((q.H - g.H0 + 540) % 360) - 180).toFixed(2))), r: T.map((q) => +q.r.toFixed(3)) }; }
    o.timeline = (a.timeline || []).filter((e) => e.t >= t0 - SEG.pre - 1e-9 && e.t <= t0 + 1.4 && /touchdown|contact|action|select|control|poss|request/.test(e.kind)).map((e) => Object.assign({}, e, { t: e.t - t0 })); }
  // the canonical gates' answers: at the onset, at the instant the contradiction is visible (the exit side ≥ 10°: tSide2) or a one-sided change
  // settles, and the earliest first stance any request at or after the onset reaches (all times from the ONSET)
  const pr = P ? P.attempts.find((x) => x.id === a.id) : null;
  if (pr && pr.sets) { const tRec = g.tSide2 != null ? g.tSide2 : g.settle, at = (rows, t) => rows.find((r) => r.tq >= t - 1e-6) || null, abs = (r) => (r && r.result === "PLAYED" ? { tq: r.tq, stance: r.tq + (r.start ?? 0), touch: r.tq + (r.contact ?? 0), played: r.played } : r ? { tq: r.tq, result: r.result, why: r.why } : null);
    o.probes = pr.sets.map((s) => { const R = s.rows.filter((r) => r.tq >= -1e-9), P1 = R.filter((r) => r.result === "PLAYED"), best = P1.length ? P1.reduce((m, r) => (r.tq + r.start < m.tq + m.start ? r : m)) : null;
      return { tech: s.tech, variant: s.variant, tRecog: tRec, onset: abs(at(s.rows, 0)), recog: abs(at(s.rows, tRec)), earliest: abs(best), playedFrames: P1.length, frames: R.length,
        rows: s.rows.map((r) => ({ tq: r.tq, result: r.result, played: r.played, why: r.why, entered: r.entered, start: r.start, contact: r.contact })) }; }); }
  atts.push(o); });
// ── 3 THE REPORT ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const real = atts.filter((o) => o.provenance.real);
console.log(`OWNER INPUT ANALYSIS V1 — ${D.attempts.length} attempt(s) in ${process.argv[2].split("/").pop()} · real owner ${real.length} · not real ${atts.length - real.length}${atts.filter((o) => !o.provenance.real).map((o) => ` (#${o.n}: ${o.provenance.why.join(", ")})`).join("")}`);
console.log(`gesture conventions (analysis cuts, not thresholds): ${JSON.stringify(SEG)}`);
console.log(`screen edges found in the raw pointer stream: ${E.length ? E.map((e) => `${e.edge} at ${e.at.toFixed(4)} radii (the extreme of ${e.attempts} attempts)`).join("; ") : "none"}\n`);
const byLabel = {}; for (const o of real) (byLabel[o.label] = byLabel[o.label] || []).push(o);
console.log("REAL OWNER ATTEMPTS BY LABEL"); for (const [L, A] of Object.entries(byLabel)) console.log(`  ${String(A.length).padStart(2)}  ${L.padEnd(26)} source ${[...new Set(A.map((o) => o.provenance.source))].join("/")} · ${A.map((o) => o.mode).filter((v, i, s) => s.indexOf(v) === i).join("/")} · ${f(Math.min(...A.map((o) => o.duration)), 1)}–${f(Math.max(...A.map((o) => o.duration)), 1)} s · G marks ${A.filter((o) => o.mark != null).length}`);
console.log("\nEACH ATTEMPT — mirrored so the EXIT is + (player-relative): counter = the first phase AGAINST the exit; times from the inferred onset (ms)");
console.log("  #  label                      kind           counter  t→pk dwell  via     tr side2 exit° settle travel°  ω°/s peak  rMin  arc°/ms        edge(first/exit)  speed mode  ball  sup  nextTD nextC  action at onset");
for (const o of real) { const g = o.gesture, F = o.f; if (!F) { console.log(`  ${String(o.n).padStart(2)} ${o.label.padEnd(26)} ${g.kind}  ${g.note || ""} · neutral gaps ${g.neutral.map((x) => `${ms(x.dur)} ms (${f(x.change)}°)`).join(", ") || "none"}`); continue; }
  const s = g.state.onset, ce = (A) => A.map((x) => x.n).reduce((p, q) => p + q, 0);
  console.log(`  ${String(o.n).padStart(2)} ${o.label.padEnd(26)} ${F.kind.padEnd(13)} ${f(F.counter).padStart(7)} ${ms(F.tPeak1).padStart(5)} ${ms(F.dwell1).padStart(5)}  ${(F.transitVia || "—").padEnd(6)} ${ms(F.transitMs).padStart(3)} ${ms(F.tSide2).padStart(5)} ${f(F.exit).padStart(5)} ${ms(F.settle).padStart(6)} ${f(F.travel).padStart(7)} ${f(F.omegaPeak).padStart(10)} ${f(F.rMin, 2).padStart(5)}  ${F.arcExtent != null ? f(F.arcExtent) + "/" + ms(F.arcMs) : "—".padEnd(7)}`.padEnd(178) +
    ` ${String(ce(o.clip.first)).padStart(5)}/${String(ce(o.clip.exit)).padEnd(10)} ${f(s.speed, 1).padStart(5)} ${String(s.mode).padEnd(5)} ${s.ballSide}${f(Math.abs(s.ballLat), 2)} ${String(s.support).padEnd(4)} ${ms(s.nextTD).padStart(5)} ${ms(s.nextTouch).padStart(5)}  ${s.action}`); }
// per family: the values (small n — the values themselves, median [min – max])
console.log("\nPER FAMILY — the values; median [min – max] (n)");
const FEAT = [["counter", "counter (first phase against the exit) °", 0, 1], ["exit", "exit angle °", 0, 1], ["tPeak1", "onset → first-phase peak ms", 0, 1000], ["dwell1", "dwell at that peak ms", 0, 1000], ["tSide2", "onset → exit side ≥ 10° ms", 0, 1000], ["transitMs", "transit ms", 0, 1000], ["settle", "onset → settled ms", 0, 1000], ["travel", "angular travel °", 0, 1], ["omegaPeak", "peak ω °/s (60 Hz)", 0, 1], ["rMin", "min radius", 2, 1], ["exitHold", "exit held ms", 0, 1000]];
const fams = {}; for (const o of real) if (o.f) (fams[o.family] = fams[o.family] || []).push(o);
const famStats = {}; for (const [F, A] of Object.entries(fams)) { famStats[F] = {}; console.log(`\n${F} — ${A.length} gesture(s): ${A.map((o) => "#" + o.n).join(" ")} · kinds ${Object.entries(A.reduce((m, o) => ((m[o.f.kind] = (m[o.f.kind] || 0) + 1), m), {})).map(([k, n]) => `${k} ${n}`).join(", ")} · transits ${A.filter((o) => o.f.transitVia).map((o) => o.f.transitVia).join("/") || "—"}`);
  for (const [k, nm, d, sc] of FEAT) { const S = stats(A.map((o) => (o.f[k] == null ? null : o.f[k] * sc))); famStats[F][k] = S; if (S) console.log(`  ${nm.padEnd(38)} ${f(S.median, d).padStart(7)} [${f(S.min, d)} – ${f(S.max, d)}] (${S.n})   values ${S.values.map((v) => f(v, d)).join(" ")}`); } }
// the physical state at the onset (every real gesture)
console.log("\nTHE FOOTBALLER AT THE INFERRED ONSET (all real direction gestures)");
const SO = real.filter((o) => o.f).map((o) => o.gesture.state.onset), cnt = (k) => Object.entries(SO.reduce((m, s) => ((m[s[k]] = (m[s[k]] || 0) + 1), m), {})).map(([x, n]) => `${x} ${n}`).join(" · ");
console.log(`  speed ${f(Math.min(...SO.map((s) => s.speed)), 1)}–${f(Math.max(...SO.map((s) => s.speed)), 1)} m/s · mode ${cnt("mode")} · ball side ${cnt("ballSide")} · support ${cnt("support")} · technical foot ${cnt("techFoot")} · last touch ${cnt("lastTouchFoot")} · committed ${cnt("committed")} · action ${cnt("action")}`);
console.log(`  next touchdown in ${f(Math.min(...SO.map((s) => s.nextTD * 1000)))}–${f(Math.max(...SO.map((s) => s.nextTD * 1000)))} ms · next ball touch in ${f(Math.min(...SO.filter((s) => s.nextTouch != null).map((s) => s.nextTouch * 1000)))}–${f(Math.max(...SO.filter((s) => s.nextTouch != null).map((s) => s.nextTouch * 1000)))} ms`);
// what the ordinary vocabulary did with each gesture (no recognizer exists): the plan's actions in the 1.5 s after the onset
console.log("\nWHAT THE ORDINARY VOCABULARY DID (the plan's actions from the onset, ms)");
for (const o of real) if (o.f) console.log(`  ${String(o.n).padStart(2)} ${o.label.padEnd(26)} ${o.gesture.actions.map((x) => `${ms(x.t)} ${x.a}`).join(" → ")}`);
// the canonical gates (lsr_owner_probe.mjs)
if (P) { console.log("\nTHE CANONICAL GATES ASKED AT EVERY FRAME (lsr_owner_probe.mjs) — all times in ms from the inferred ONSET; stance = the move's first stance, touch = its decisive touch");
  console.log("  request AT ONSET · request when the CONTRADICTION is visible (exit side ≥ 10°; a one-sided change: settled) · the EARLIEST first stance any request ≥ onset reaches · frames that play");
  const one = (x) => (!x ? "—" : x.stance != null ? `stance ${ms(x.stance)} touch ${ms(x.touch)}` : `${x.result} (${x.why})`);
  for (const o of real) { if (!o.probes) continue; for (const s of o.probes) console.log(`  ${String(o.n).padStart(2)} ${o.label.padEnd(24)} ${s.tech.padEnd(10)} ${s.variant.padEnd(9)} onset: ${one(s.onset)}`.padEnd(100) + ` | at ${ms(s.tRecog)}: ${one(s.recog)}`.padEnd(70) + ` | earliest: ${s.earliest && s.earliest.stance != null ? `request ${ms(s.earliest.tq)} → stance ${ms(s.earliest.stance)} touch ${ms(s.earliest.touch)}` : "never"} | ${s.playedFrames}/${s.frames}`); } }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ schema: "TOUCHLINE_OWNER_INPUT_ANALYSIS_V1", version: 1, gestureVersion: GESTURE_VERSION, created: new Date().toISOString(), dataset: { file: process.argv[2].split("/").pop(), attempts: D.attempts.length, real: real.length, meta: D.meta },
  conventions: SEG, edges: E, probe: P ? { step: P.step, from: P.from, to: P.to } : null, attempts: atts, families: famStats }));

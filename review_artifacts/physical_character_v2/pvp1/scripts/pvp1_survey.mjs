// PVP-1 DESIGN SURVEY (read-only research evidence for the preregistration; no Jolt world is created, nothing is stepped or written outside
// pvp1/evidence/). Reads: the V1.3 (5042230) authoritative export summaries (pi1/trackB/v13/air*, all 26 fixtures), the frozen IB-1 scenario and
// OFF record of the recommended case, the V2 body specs (R0, V1-matched) and the two characters' rigs at the simulation commit (git show).
// usage: V2_KNEE_MODEL=v2k node pvp1_survey.mjs <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { execFileSync } from "child_process";
const L = await import(new URL("../../ifm1/scripts/ifm1_lib.mjs", import.meta.url).href), { V, RA } = L;
const H = await import(L.P2 + "spec/v2_human.js");
const OUT = process.argv[2], gz = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), git = (...a) => execFileSync("git", a, { cwd: RA, maxBuffer: 1 << 26 }).toString();
const out = { tool: "pvp1_survey.mjs", head: git("rev-parse", "HEAD").trim(), note: "read-only design evidence; no stepping" };
// ── 1. every authoritative V1.3 fixture: outcome and contacts ──
const RANK = { NEGLIGIBLE: 0, CORRECTION: 1, STUMBLE: 2, FALL: 3 };
out.fixtures = [];
for (const f of ["pi1/trackB/v13/air/air_summary.json", "pi1/trackB/v13/air_def/air_summary.json"]) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(path.join(RA, f))).summary)) {
  const o = v.OFF || {}, cs = o.contacts || [], fin = cs.reduce((m, c) => (RANK[c.react] > RANK[m] ? c.react : m), cs.length ? "NEGLIGIBLE" : "NO_CONTACT");
  const p = v.params || {}, runnerV = p.v != null ? p.v : (p.drill ? "drill (dribble, sprint keys)" : null);
  out.fixtures.push({ case: k, source: f, runnerV, outcome: cs.length ? fin : "NO_CONTACT", contacts: cs.map(c => ({ tick: c.tick, sub: c.sub, prim: c.prim, seg: c.seg, planted: c.segPlanted, react: c.react, J: c.J, family: c.family })),
    maxJ: cs.length ? Math.max(...cs.map(c => c.J)) : 0, gameplayHash: o.gameplayHash }); }
out.recoverable = out.fixtures.filter(x => ["CORRECTION", "STUMBLE"].includes(x.outcome)).map(x => ({ case: x.case, runnerV: x.runnerV, outcome: x.outcome, maxJ: x.maxJ, contacts: x.contacts.map(c => `${c.prim}→${c.seg}${c.planted ? " (planted)" : " (swing)"} ${c.react} J ${c.J}`) }));
// ── 2. the recommended case IB1-SR (rx_behind_standing): frozen scenario + OFF record ──
const SC = JSON.parse(fs.readFileSync(path.join(RA, "interaction_benchmark/scenarios/IB1-SR_rx_behind_standing.json"))), REC = gz(path.join(RA, "interaction_benchmark/records/v13/rx_behind_standing_OFF.json.gz"));
const dec = SC.authoritativeOutcome.events.find(e => e.kind === "PLAYER_CONTACT"), rs = SC.authoritativeOutcome.reactionStates[0].state;
const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), len = (a) => Math.sqrt(dot(a, a)), ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, dot(u, v) / len(u) / len(v)))) * 180 / Math.PI;
function segseg(p1, q1, p2, q2) { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r); let s, t; const c = dot(d1, r), b = dot(d1, d2), den = a * e - b * b;
  s = den > 1e-12 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); }
  return { d: len(sub(p1.map((x, i) => x + d1[i] * s), p2.map((x, i) => x + d2[i] * t))), s, t }; }
const surf = (p, g) => { const q = segseg(p.a, p.b, g.a, g.b), rr = g.ra != null ? g.ra + (g.rb - g.ra) * q.t : g.r; return q.d - p.r - rr; };
const clear = []; for (let row = 49; row <= 59; row++) for (let slot = 0; slot < 4; slot++) { const P = REC.prims[row][slot], S = REC.simBody[row][slot].segs, tau = row + (slot + 1) / 4;
  const pair = (pn, sn) => { const p = P.find(x => x.prim === pn), g = S.find(x => x.name === sn); return p && g ? +(surf(p, g) * 1000).toFixed(1) : null; };
  clear.push({ tau, LEG_shin_R_mm: pair("LEG", "shin_R"), LEG_foot_R_mm: pair("LEG", "foot_R"), LEG_toe_R_mm: pair("LEG", "toe_R"), tacklerV: P[0].v.map(x => +x.toFixed(3)), runnerX: +REC.rows[row][8].toFixed(4) }); }
const P51 = REC.prims[50][3], g = (n) => P51.find(p => p.prim === n), ax = (n) => sub(g(n).b, g(n).a);
const LOCO = gz(path.join(RA, "interaction_benchmark/records/v13/rx_behind_standing_LOCO.json.gz")); if (LOCO.gameplayHash !== REC.gameplayHash) throw new Error("LOCO / OFF gameplay hash differ");
const presRows = []; for (let k = 30; k <= 52; k++) if (JSON.stringify(LOCO.pres[k].world) !== JSON.stringify(LOCO.pres[k + 1].world)) presRows.push(`${k}→${k + 1}`);   // runner presentation (LOCO; the OFF record carries none)
const presChanges = presRows.filter(r => +r.split("→")[1] <= 51).length;
const legEnd = (() => { const P = REC.prims[51][1].find(p => p.prim === "LEG"), S = REC.simBody[51][1].segs.find(x => x.name === "shin_R"), q = segseg(P.a, P.b, S.a, S.b); return { legParam_s: +q.s.toFixed(3), shinParam_t: +q.t.toFixed(3), note: "s = 1: the LEG primitive's far end (the tackler's boot); t: 0 knee → 1 ankle" }; })();
// the simulation's own balance law (pt_react.js ptRxResolve, 5042230) at the authoritative values: recoverable iff the error is absorbed within maxSteps
const R = SC.authoritativeInputs.reactionConstants, rc = dec.rc, gS = dec.gStep; const e2 = rc * (1 + 1 / gS), e1 = rc + e2 / gS, e0max = rc + e1 / gS;
out.recommended = { id: "IB1-SR", case: "rx_behind_standing", role: SC.role, params: SC.authoritativeInputs.params, characters: SC.authoritativeInputs.characters, massKg: SC.authoritativeInputs.massKg,
  gameplayHash: SC.authoritativeOutcome.gameplayHash, finalClass: SC.authoritativeOutcome.finalClass, reactionWindowRows: SC.authoritativeOutcome.reactionWindowRows,
  events: SC.authoritativeOutcome.events.map(e => ({ kind: e.kind, tick: e.tick, sub: e.sub, prim: e.prim, seg: e.seg, react: e.react, took: e.took, pen: e.pen, J: e.J, relV: e.relV })),
  decisive: { tick: dec.tick, sub: dec.sub, tau: SC.contacts[0].tau, prim: dec.prim, seg: dec.seg, segPlanted: dec.segPlanted, stride: dec.stride, point: dec.point, normal: dec.normal, pen: dec.pen, vn: dec.vn, vt: dec.vt, vA: dec.vA, vT: dec.vT,
    J: dec.J, Jfric: dec.Jfric, sweep: dec.sweep, supportLost: dec.supportLost, dvCom: dec.dvCom, spin: dec.spin, dvTackler: dec.dvTackler, tSup: dec.tSup, e0: dec.e0, rc, gStep: gS, steps: dec.steps, obstacle: dec.obstacle, errTrace: dec.errTrace, collapse: dec.collapse, drop: dec.drop, dropCap: dec.dropCap, tip: dec.tip },
  stumble: { t0: rs.t0, until: rs.until, steps: rs.steps, Tstep: rs.Tstep, v0: rs.v0, spin: rs.spin },
  balanceLaw: { source: "pt_react.js ptRxResolve @5042230", maxSteps: R.maxSteps, comHxLeg: R.comH * SC.authoritativeInputs.legLenM[0], omega0: Math.sqrt(R.g / (R.comH * SC.authoritativeInputs.legLenM[0])), fallBoundaryE0M: e0max, marginM: e0max - dec.e0, stepLimits: R.step },
  clearanceSeries: clear, posture_tau51: { prims: P51.map(p => ({ prim: p.prim, lengthM: +len(sub(p.b, p.a)).toFixed(3), r: p.r, z: [p.a[2], p.b[2]], v: p.v })),
    kneeL_deg: +ang(ax("THIGH"), ax("LEG")).toFixed(1), kneeR_deg: +ang(ax("TUCK"), ax("TUCKSHIN")).toFixed(1), hipL_flex_deg: +(180 - ang(ax("TRUNK"), ax("THIGH"))).toFixed(1), hipR_flex_deg: +(180 - ang(ax("TRUNK"), ax("TUCK"))).toFixed(1),
    trunkFromVertical_deg: +ang(ax("TRUNK"), [0, 0, 1]).toFixed(1) },
  runnerPresentationChangesRows30to51: presChanges, runnerPresentationChangeRows: presRows, contactLocationAtTauSim: legEnd, tacklerPresentationInRecord: false, existingEvidence: SC.existingEvidence,
  rev2: "pi1/rev2/PI1_REV2_RESULTS.md §3: k_p 50 (lead 0.5 tick), physical first contact 51.5 shank_R / LEG, CG-1 pass, CG-3 Δt 0, CG-4 0.037 m, first-contact / total impulse 7.47 / 19.94 N·s against the articulated two-segment stand-in AST-1 (TORSO 59.55 + LEG 18.45 kg) driven along the authoritative slide; post-contact response not evaluated (PI-1 not run)" };
// ── 3. the only running recoverable alternative (IB1-FL) ──
const FL = JSON.parse(fs.readFileSync(path.join(RA, "interaction_benchmark/scenarios/IB1-FL_rx_free_leg.json")));
out.alternativeFL = { id: "IB1-FL", case: "rx_free_leg", params: FL.authoritativeInputs.params, finalClass: FL.authoritativeOutcome.finalClass,
  contacts: FL.authoritativeOutcome.events.filter(e => e.kind === "PLAYER_CONTACT").map(e => ({ tick: e.tick, sub: e.sub, prim: e.prim, seg: e.seg, segPlanted: e.segPlanted, react: e.react, J: e.J, stride: e.stride })),
  existingEvidence: { CG4: FL.existingEvidence && FL.existingEvidence.compatGateV13 ? FL.existingEvidence.compatGateV13.criteria["CG-4 location"] : null },
  simVsLV2Legs: "interaction_time/run1_handoff/RUN1_TO_V2_HANDOFF_CONTRACT_DRAFT_R2.md (6a0cf340) line ~250: gameplay legs vs mapped LV2 legs at 3.0 m/s, phase-locked p50 / p90 = 0.197 / 0.251 m; 0 % of instants within CG-4's 0.10 m" };
// ── 4. bodies and rigs ──
const body = (id, s) => { const B = s.bodies, J = (n) => s.joints.find(j => j.name === n), bi = (n) => B.findIndex(b => b.name === n), sh = B[bi("shank_L")].shapes[0];
  return { id, massKg: +B.reduce((x, b) => x + b.mass, 0).toFixed(2), thighM: +V.dist(J("hip_L").at, J("knee_L").at).toFixed(4), shankM: +V.dist(J("knee_L").at, J("ankle_L").at).toFixed(4), hipHalfWidthM: +Math.abs(J("hip_L").at[0]).toFixed(4),
    shankRadii: [+sh.rTop.toFixed(4), +sh.rBot.toFixed(4)], kneeFlexHard: J("knee_L").def.rom.flex.hard, hipFlexHard: J("hip_L").def.rom.flex.hard }; };
out.bodies = { runner_R0: body("R0 (PI1-runner-vinicius)", L.SPECS.R0()), tackler_V1matched: body("V1-matched (H 1.90, M 78)", L.generateSpec(H.V1_MATCHED)), V2REF: body("V2-REF (H 1.82, M 78)", L.generateSpec(H.V2_REF)) };
const rig = (c) => { const r = JSON.parse(git("show", `5042230:assets/characters/outfield/${c}/rig.json`)); return { H: r.H, legLenM: r.legLenM, thighM: r.segments.R.hipToKneeM, shankM: r.segments.R.kneeToAnkleM, blob: git("rev-parse", `5042230:assets/characters/outfield/${c}/rig.json`).trim() }; };
out.rigs = { vinicius: rig("vinicius"), gabriel: rig("gabriel"), frozenRun1TagHasGabriel: (() => { try { git("cat-file", "-e", "locomotion-v2-straight-baseline-1:assets/characters/outfield/gabriel/rig.json"); return true; } catch (_) { return false; } })() };
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`${out.fixtures.length} fixtures; recoverable: ${out.recoverable.map(x => `${x.case} (v ${x.runnerV}, ${x.outcome}, max J ${x.maxJ})`).join("; ")}`);
console.log(`SR: ${dec.prim}→${dec.seg} ${dec.react} J ${dec.J} at τ ${SC.contacts[0].tau}; e0 ${dec.e0} vs FALL boundary ${e0max.toFixed(4)} (margin ${(e0max - dec.e0).toFixed(4)} m); runner presentation changes rows 30–51: ${presChanges}`);
console.log(`posture τ51: knee L ${out.recommended.posture_tau51.kneeL_deg}°, knee R ${out.recommended.posture_tau51.kneeR_deg}°, hip flex L/R ${out.recommended.posture_tau51.hipL_flex_deg}/${out.recommended.posture_tau51.hipR_flex_deg}°, trunk ${out.recommended.posture_tau51.trunkFromVertical_deg}° from vertical`);
console.log("bodies:", JSON.stringify(out.bodies)); console.log("rigs:", JSON.stringify(out.rigs));

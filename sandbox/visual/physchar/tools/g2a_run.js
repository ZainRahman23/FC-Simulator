// ═══ physchar/tools/g2a_run.js — GATE G2a (human in-place gait + yaw regulation): the evidence run, sequential, deterministic ═════════
// Runs every TESTS_G2A scenario (the gait, the intended turn, the yaw-attribution diagnostics, the G1-style reference) — the gait and the
// turn ×repeat for determinism — analyses each (pc_gateg2 analyzeG2a: yaw, the vertical angular-momentum budget by body group, gait
// kinematics, contact sequence, style against the reference) and evaluates the declared criteria. PHYSICAL criteria pass / fail;
// HUMAN-LIKENESS is measured and reported as observations (it is judged visually — the review page), never scored here.
// usage: node tools/g2a_run.js [--repeat 3] [--scenarios-only] [--out file.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runG2a, TESTS_G2A, analyzeG2a } from "../pc_gateg2.js";
import { buildPoses } from "../pc_control.js";
import { initOfLoco } from "../pc_ref.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, ".."), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const rep = +arg("--repeat", 3), f = (x, d = 1) => x == null ? "-" : (+x).toFixed(d), t00 = Date.now(), log = (s) => console.log(s);
const REPEAT = new Set(["G2a_walkInPlace", "G2a_turn30"]);

// ── 1. every scenario (the gait and the turn ×repeat), analysed ──
const scen = {};
for (const key of Object.keys(TESTS_G2A)) { const n = REPEAT.has(key) ? rep : 1, hashes = []; let r0 = null, an = null;
  for (let q = 0; q < n; q++) { const r = runG2a(J, spec, key, { poses, keepStates: q === 0 }); hashes.push(r.hash); if (q === 0) { an = analyzeG2a(spec, r); r0 = r; delete r0.recs; } }
  const s = { ...r0, analysis: an, repeatHashes: hashes, deterministic: hashes.every(h => h === hashes[0]) }; scen[key] = s;
  log(`${key.padEnd(18)} ${s.outcome.padEnd(9)} hash ${s.hash} ${n > 1 ? (s.deterministic ? "det ✓ ×" + n : "det ✗") : ""} · pelvis yaw p-t-p ${an ? an.yaw.pelvisPtpDeg : "-"}° · L_z ${an ? an.angularMomentum.ptp.all : "-"} · ctrl ${f(s.cpu.controller, 3)} ms / 60 Hz frame`); }
if (arg("--scenarios-only", false)) { const p = arg("--out", null); if (p) fs.writeFileSync(p, JSON.stringify({ generated: "tools/g2a_run.js --scenarios-only", calib: WORKING_CALIB, repeat: rep, results: Object.entries(scen).map(([k, s]) => ({ test: k, hash: s.hash, outcome: s.outcome, deterministic: s.deterministic, repeatHashes: s.repeatHashes })) })); log(`scenarios only: ${Object.keys(scen).length} written`); process.exit(0); }

// ── 2. criteria ──
const C = [], add = (id, scenario, criterion, pass, measured, note) => C.push({ id, scenario: scenario || null, criterion, pass, measured, note: note || null });
const M = scen.G2a_walkInPlace, TR = scen.G2a_turn30, A = M.analysis, AT = TR.analysis;
const landed = (s) => s.steps.filter(x => x.status === "LANDED").length, maxOf = (s, k) => Math.max(...s.steps.map(x => x[k]).filter(v => v != null)), failed = (s) => s.steps.filter(x => /FAIL/.test(x.status)).length;
for (const [s, k] of [[M, "G2a_walkInPlace"], [TR, "G2a_turn30"]]) {
  add("P1", k, "16 / 16 steps land, UPRIGHT, no failed step", s.outcome === "UPRIGHT" && landed(s) === 16 && failed(s) === 0, `${s.outcome} · landed ${landed(s)} / ${s.steps.length} · failed ${failed(s)}`);
  add("P2", k, "every foothold within 5 cm of its plan; stance-foot slip ≤ 1 cm per step", maxOf(s, "footholdErrCm") <= 5 && maxOf(s, "stanceSlipCm") <= 1, `foothold ≤ ${maxOf(s, "footholdErrCm")} cm · stance slip ≤ ${maxOf(s, "stanceSlipCm")} cm`);
  add("P4", k, `deterministic ×${rep} (state hash)`, s.deterministic, s.repeatHashes.join(" · ")); }
const allS = Object.entries(scen), led = allS.map(([k, s]) => [k, s.ledger.residualMaxNs, s.ledger.noRootForce, s.audit.teleports, s.audit.velocityWrites]);
add("P3", null, "every scenario: external-impulse ledger residual ≤ 0.1 N·s, no root force, no teleports, no velocity writes", led.every(([, r, n, t, v]) => r <= 0.1 && n && !t && !v), `residual ≤ ${Math.max(...led.map(x => x[1]))} N·s · root force none: ${led.every(x => x[2])} · teleports ${led.reduce((a, x) => a + x[3], 0)} · velocity writes ${led.reduce((a, x) => a + x[4], 0)}`);
add("P5", "G2a_walkInPlace", "YAW REGULATED: pelvis within 8° of the intended heading throughout, no drift (≤ 0.25°/cycle), the upper body counter-rotates against the legs (L_z correlation ≤ −0.5)",
  A.yaw.pelvisMaxAbsDeg <= 8 && Math.abs(A.yaw.driftDegPerCycle) <= 0.25 && A.angularMomentum.upperVsLegs <= -0.5,
  `pelvis max |${A.yaw.pelvisMaxAbsDeg}°| (p-t-p ${A.yaw.pelvisPtpDeg}°) · drift ${A.yaw.driftDegPerCycle}°/cycle · upper body vs legs r ${A.angularMomentum.upperVsLegs} · whole-body L_z p-t-p ${A.angularMomentum.ptp.all} vs legs ${A.angularMomentum.ptp.legs} kg·m²/s`,
  `G1's robotic stepping: pelvis p-t-p ${scen.G2a_G1style.analysis.yaw.pelvisPtpDeg}° (max ${scen.G2a_G1style.analysis.yaw.pelvisMaxAbsDeg}°); G1b recorded ±12° and growing`);
add("P6", "G2a_turn30", "TURNING PRESERVED: an intended 30° turn is followed — pelvis and feet within 3° of the intended heading at the end, upright",
  TR.outcome === "UPRIGHT" && Math.abs(AT.yaw.turn.pelvisDeg - AT.yaw.turn.intendedDeg) <= 3 && Math.abs(AT.yaw.turn.feetDeg - AT.yaw.turn.intendedDeg) <= 3,
  `intended ${AT.yaw.turn.intendedDeg}° → pelvis ${AT.yaw.turn.pelvisDeg}° · feet ${AT.yaw.turn.feetDeg}° · chest ${AT.yaw.turn.chestDeg}° · pelvis within ${AT.yaw.pelvisMaxAbsDeg}° of the (moving) intended heading`);
const p0y = Object.entries(M.arbiter).filter(([, a]) => a.cls === "P0").reduce((t, [, a]) => t + a.yieldedNms, 0), p3 = Object.entries(M.arbiter).filter(([, a]) => a.cls === "P3");
add("P7", "G2a_walkInPlace", "ARBITRATION: support (P0) never yields; style (P3) yields first — its yields are logged", p0y === 0, `P0 yielded ${p0y} N·m·s · ${p3.map(([m, a]) => `${m}: requested ${a.requestedNms}, yielded ${a.yieldedNms} N·m·s (${JSON.stringify(a.why)})`).join("; ")}`);
const dts = M.steps.filter(s => s.tdT != null && s.plannedTdT != null).map(s => (s.tdT - s.plannedTdT) * 1000);
add("P8", "G2a_walkInPlace", "the swing clears the turf (lowest sole point ≥ 0.5 cm through mid-swing) and every contact is the planned touchdown (within 80 ms of plan)", A.gait.minClearCm >= 0.5 && dts.every(d => Math.abs(d) <= 80),
  `min toe clearance ${A.gait.minClearCm} cm · touchdown ${f(Math.min(...dts), 0)} … ${f(Math.max(...dts), 0)} ms vs plan`, "touchdowns ≈ 40 ms early by design: the landing target presses 1.5 cm through the turf so contact is made with a small downward velocity");
// human-likeness: measured observations (judged visually)
const g = A.gait, st = A.style, rf = st.reference;
add("H1", "G2a_walkInPlace", "swing leg: knee flexion ≥ 50°, a real knee lift", null, `knee ${g.kneeFlexSwingDeg}° · hip ${g.hipFlexDeg}° · ankle lift ${g.ankleLiftCm} cm`);
add("H2", "G2a_walkInPlace", "stance: the knee stays bent (not locked straight)", null, `stance knee mean ${g.stanceKneeDeg.mean}° (min ${g.stanceKneeDeg.min}°)`);
add("H3", "G2a_walkInPlace", "contact: forefoot first, then the heel lowers", null, `first contact ${JSON.stringify(g.firstContact)} · heel down after ${g.heelDownMs} ms`, "\"TOUCHDOWN\" = the first contact points lay in the middle third of the sole (neither heel nor toe zone)");
add("H4", "G2a_walkInPlace", "toe-off: the heel rises before the toe leaves", null, `heel height before liftoff ${g.heelRiseCm} cm`, "NOT ACHIEVED: the foot leaves nearly flat and pitches toes-down in the air (see the report, §visual limitations)");
add("H5", "G2a_walkInPlace", "arm counter-swing (the contralateral arm forward as the knee rises) at the reference's amplitude", null, `shoulder swing ${st.shoulderSwingDeg.L}° / ${st.shoulderSwingDeg.R}° (reference ${rf.shoulderSwingDeg}°) · elbow ${st.elbowDeg}° (ref ${rf.elbowDeg}°) · arm/leg phase r ${st.armPhase}`);
add("H6", "G2a_walkInPlace", "trunk: thorax counter-rotation against the pelvis, chest steadier than the pelvis", null, `thorax twist ${st.trunkTwistDeg}° p-t-p · chest yaw ${A.yaw.chestPtpDeg}° vs pelvis ${A.yaw.pelvisPtpDeg}°`);
add("H7", "G2a_walkInPlace", "weight transfer: pelvis bob, roll and a lateral COM shift over each stance foot", null, `bob ${g.pelvisBobCm} cm · pelvis roll ${g.pelvisRollDeg}° (reference ${rf.pelvisRollDeg}°) · lateral COM sway ${g.comSwayCm} cm`);
add("H8", "G2a_walkInPlace", "rhythm: cadence and stance / swing proportion", null, `${g.cadenceSpm} steps/min · airborne ${g.swingS} s of each 0.6 s step`, "long double support (≈ 45 % of the time both feet down): a 0.5 s swing / 0.1 s double-support timing fell — the lateral transfer still stops the COM over each foot");
// attribution
const attribution = Object.fromEntries(allS.filter(([k]) => !["G2a_turn30"].includes(k)).map(([k, s]) => [k, { outcome: s.outcome, fell: s.fell, pelvisPtpDeg: s.analysis ? s.analysis.yaw.pelvisPtpDeg : null, pelvisMaxAbsDeg: s.analysis ? s.analysis.yaw.pelvisMaxAbsDeg : null, chestPtpDeg: s.analysis ? s.analysis.yaw.chestPtpDeg : null, lzAll: s.analysis ? s.analysis.angularMomentum.ptp.all : null, armsVsLegs: s.analysis ? s.analysis.angularMomentum.armsVsLegs : null, title: TESTS_G2A[k].title }]));
for (const c of C) log(`${c.id.padEnd(3)} ${c.scenario ? c.scenario.padEnd(16) : "".padEnd(16)} ${c.pass === null ? "obs " : c.pass ? "PASS" : "FAIL"}  ${c.measured}`);
const out = { generated: "tools/g2a_run.js", calib: WORKING_CALIB, repeat: rep, seconds: +((Date.now() - t00) / 1000).toFixed(1), scenarios: Object.fromEntries(allS.map(([k, s]) => { const o = { ...s }; if (o.analysis) { o.analysis = { ...o.analysis }; } return [k, o]; })), criteria: C, attribution };
const p = arg("--out", null); if (p) fs.writeFileSync(p, JSON.stringify(out));
log(`done in ${out.seconds} s`);

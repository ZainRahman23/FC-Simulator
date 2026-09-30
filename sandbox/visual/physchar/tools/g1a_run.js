// ═══ physchar/tools/g1a_run.js — GATE G1a (locomotion architecture parity): the evidence run, sequential, deterministic ═══════════════
// LOCOMOTION_ARCHITECTURE_FINAL.md §G1a. Runs every TESTS_G1A scenario ×repeat (hash), then the cross-checks the gate declared:
//   S6  the D6 transient with the NEW stack as B (runD opts.Bloco) — zero delay (parity) and the default 50 / 120 ms — vs the approved baseline
//   S10 the 480 Hz convergence check (physics sub-stepped under the same 240 Hz control) — S4, S5_F80, D6_slide (+ F80 at 720 / 960 Hz)
//   the latency sweep 0/0 · 50/120 · 100/170 · 150/220 · 250/320 ms on S4, S5_F80, S7a, S11a, S11b
//   plate-as-turf vs static turf (the same scenarios, the plate replaced by the ordinary static turf)
// and evaluates each declared pass criterion against the approved references (C1 / C2 / C3 / D evidence files — never re-run here).
// usage: node tools/g1a_run.js [--repeat 3] [--quick] [--scenarios-only] [--out file.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runG1a, TESTS_G1A } from "../pc_gateg1a.js";
import { runD } from "../pc_gated.js";
import { D6Diag } from "../pc_d6diag.js";
import { buildPoses } from "../pc_control.js";
import { initOfLoco } from "../pc_ref.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, ".."), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec), nb = spec.bodies.length;
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const rep = +arg("--repeat", 3), quick = !!arg("--quick", false), f = (x, d = 1) => x == null ? "-" : (+x).toFixed(d), r2 = (x, d = 2) => x == null || !Number.isFinite(+x) ? null : +(+x).toFixed(d);
const readJ = (p) => { try { return JSON.parse(fs.readFileSync(path.join(PC, p), "utf8")); } catch (e) { return null; } };
const byTest = (d) => Object.fromEntries(((d && d.results) || []).map(r => [r.test, r]));
const REF = { C1: byTest(readJ("results/v1_1/gatec1_V1.1.json")), C2: byTest(readJ("results/v1_1/gatec2_V1.1_working.json")), C3: byTest(readJ("results/v1_1/gatec3_V1.1.json")), D: byTest(readJ("results/v1_1/gated_V1.1_post_mu_fix.json")),
  D6X: byTest(readJ("../../../review_artifacts/physical_character_v1/d6_diagnostic/json/d6x_matrix.json")) };
const strip = (r) => { const o = { ...r }; delete o.recs; return o; };
const t00 = Date.now(), log = (s) => console.log(s);

// ── 1. every scenario ×repeat ──
const scen = {};
for (const key of Object.keys(TESTS_G1A)) { const runs = []; for (let q = 0; q < (quick ? 1 : rep); q++) runs.push(runG1a(J, spec, key, { poses }));
  const s = strip(runs[0]); s.repeatHashes = runs.map(x => x.hash); s.deterministic = runs.every(x => x.hash === runs[0].hash); scen[key] = s;
  log(`${key.padEnd(18)} ${s.outcome.padEnd(20)} hash ${s.hash} ${s.deterministic ? "det ✓" : "det ✗"} · ctrl ${f(s.cpu.controller, 3)} ms / 60 Hz frame`); }

// (--scenarios-only: the regression baseline — every scenario's hash ×repeat, nothing else)
if (arg("--scenarios-only", false)) { const p = arg("--out", null); if (p) fs.writeFileSync(p, JSON.stringify({ generated: "tools/g1a_run.js --scenarios-only", calib: WORKING_CALIB, repeat: rep, results: Object.entries(scen).map(([k, s]) => ({ test: k, hash: s.hash, outcome: s.outcome, deterministic: s.deterministic, repeatHashes: s.repeatHashes })) })); log(`scenarios only: ${Object.keys(scen).length} written`); process.exit(0); }
// ── 2. S6: the D6 transient with the new stack as B ──
const S6K = ["D6_slide", "D6X_v60", "D6X_load80", "D6X_load20"], s6 = {};
const baseOf = (k) => { const d = REF.D[k] || null, x = REF.D6X[k] || null; return d ? { source: "gated_V1.1_post_mu_fix", fell: d.Bres.fell, tFalling: d.Bres.tFalling, finalCls: d.Bres.finalCls } : x ? { source: "d6x_matrix", outcome: x.outcome, fell: /fall/.test(x.outcome) } : null; };
for (const k of S6K) { s6[k] = { baseline: baseOf(k) };
  for (const [name, lo] of [["zeroDelay", { delayFb: 0, delayPlan: 0 }], ["defaultDelay", {}]]) {
    let relDuringReplant = 0, releases = 0, prev = null, refusedEver = false; const onStep = (x) => { const u = x.U.B; if (!u || !u.monitor) return; const st = u.monitor.state;
      if (st === "FALLING" && prev !== "FALLING") { releases++; if (u.parts && u.parts.replant && u.parts.replant.length) relDuringReplant++; } prev = st; if (x.B.stepper && x.B.stepper.refused) refusedEver = true; };
    const r = runD(J, spec, k, { poses, Bloco: lo, onStep }), r2_ = runD(J, spec, k, { poses, Bloco: lo }), B = r.Bres;
    s6[k][name] = { hash: r.hash, deterministic: r.hash === r2_.hash, fell: B.fell, tFalling: B.tFalling, finalCls: B.finalCls, trunkMaxDeg: B.trunkMaxDeg, step: B.step, maxRootResN: B.maxRootResN, releases, releasesWhileReplanting: relDuringReplant, latchedRefusal: refusedEver,
      events: (B.events || []).slice(0, 12) }; }
  log(`S6 ${k.padEnd(12)} baseline ${JSON.stringify(s6[k].baseline)} | new 0/0 ${s6[k].zeroDelay.fell ? "FELL " + s6[k].zeroDelay.tFalling : "recovered"} | new 50/120 ${s6[k].defaultDelay.fell ? "FELL " + s6[k].defaultDelay.tFalling : "recovered"}`); }

// ── 3. S10: 240 vs 480 Hz physics (control at 240 Hz) ──
const win = (R, t0, t1) => R.filter(q => q.t > t0 && q.t <= t1).reduce((a, q) => a.map((v, i) => v + q.ledger.turf[i]), [0, 0, 0]);
const rel = (a, b) => a === 0 && b === 0 ? 0 : Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) * 100;
const s10 = {};
for (const key of ["S4_steps10", "S5_F80"]) { const o = {};
  for (const sub of [1, 2, ...(key === "S5_F80" ? [3, 4] : [])]) { const r = runG1a(J, spec, key, { poses, sub }), R = r.recs, tds = r.steps.filter(s => s.tdT != null);
    o[sub] = { outcome: r.outcome, hash: r.hash, turfNs: r.ledger.turfImpulseNs, shearNs: r2(R.reduce((a, q) => a + Math.hypot(q.ledger.turf[0], q.ledger.turf[2]), 0), 2), landingNs: tds.map(s => r2(win(R, s.tdT - 0.005, s.tdT + 0.05)[1], 1)), touchdowns: tds.map(s => s.tdT),
      pushResponseNs: key === "S5_F80" ? win(R, 1.0, 1.5).map(v => r2(v, 1)) : null, ledgerResidualNs: r.ledger.residualMaxNs, cpuMsPerFrame: r.cpu.msPerFrame }; }
  if (key === "S5_F80") { const r = runG1a(J, spec, key, { poses, sub: 2, staticTurf: true }); o["2static"] = { outcome: r.outcome, hash: r.hash }; }
  const a = o[1], b = o[2]; o.compare = { turfYPct: r2(rel(a.turfNs[1], b.turfNs[1]), 3), shearPct: r2(rel(a.shearNs, b.shearNs), 2), landingPct: a.landingNs.map((v, i) => r2(rel(v, b.landingNs[i]), 1)), touchdownDiffMs: a.touchdowns.map((v, i) => r2((b.touchdowns[i] - v) * 1000, 1)),
    pushZPct: a.pushResponseNs ? r2(rel(a.pushResponseNs[2], b.pushResponseNs[2]), 1) : null, sameOutcome: a.outcome === b.outcome };
  s10[key] = o; log(`S10 ${key}: ${Object.entries(o).filter(([k]) => k !== "compare").map(([k, v]) => `${k}× ${v.outcome}`).join(" · ")} | ${JSON.stringify(o.compare)}`); }
{ const o = {}; for (const sub of [1, 2]) { const dp = new D6Diag(spec, { plate: true }), tw = runD(J, spec, "D6_slide", { poses, sub, Bloco: {}, world: { plateFrom: nb, plateLate: true }, onStep: (x) => dp.onStep(x) }), P = dp.summary(tw);
    o[sub] = { outcome: P.outcome, struckSlideCm: P.feet.struckSlideCm, windows: Object.fromEntries(Object.entries(P.momentum.windows).map(([k, v]) => [k, v.AtoB.map(x => r2(x, 1))])), totalAtoBx: r2(Object.values(P.momentum.windows).reduce((s, v) => s + v.AtoB[0], 0), 1) }; }
  o.compare = { sameOutcome: o[1].outcome === o[2].outcome, totalAtoBxPct: r2(rel(o[1].totalAtoBx, o[2].totalAtoBx), 1), windowsXPct: Object.fromEntries(Object.keys(o[1].windows).map(k => [k, r2(rel(o[1].windows[k][0], o[2].windows[k][0]), 1)])) };
  s10.D6_slide = o; log(`S10 D6_slide (new stack as B): ${o[1].outcome} / ${o[2].outcome} | ${JSON.stringify(o.compare)}`); }

// ── 4. latency sweep ──
const DL = [[0, 0], [0.05, 0.12], [0.1, 0.17], [0.15, 0.22], [0.25, 0.32]], sweep = {};
for (const key of ["S4_steps10", "S5_F80", "S7a_swingPush", "S11a_earlyTurf", "S11b_obstacle"]) { sweep[key] = [];
  for (const [fb, pl] of DL) { const r = runG1a(J, spec, key, { poses, loco: { delayFb: fb, delayPlan: pl } }), st = r.steps, td = st.filter(s => s.tdT != null), tp = td.filter(s => s.plannedTdT != null);
    const row = { fbMs: fb * 1000, plMs: pl * 1000, outcome: r.outcome, steps: st.length, landed: td.length, corrective: st.filter(s => s.kind === "corrective").length, footholdMaxCm: td.length ? Math.max(...td.map(s => s.footholdErrCm || 0)) : null,
      touchdownVsPlanMs: tp.length ? [r2(Math.min(...tp.map(s => (s.tdT - s.plannedTdT) * 1000)), 0), r2(Math.max(...tp.map(s => (s.tdT - s.plannedTdT) * 1000)), 0)] : null, trunkMaxDeg: r.whole.trunkMaxDeg, comDropCm: r.whole.comDropCm, satSteps: r.satSteps,
      obstructionReactMs: (st.find(s => s.obstructed) || {}).obstructed?.reactMs ?? null, firstLiftT: st[0] ? st[0].liftoffT : null, rhythm: r.rhythm };
    sweep[key].push(row); log(`sweep ${key.padEnd(15)} ${String(row.fbMs).padStart(3)}/${String(row.plMs).padStart(3)} ms ${row.outcome.padEnd(20)} steps ${row.landed}/${row.steps} corr ${row.corrective} foothold ≤ ${f(row.footholdMaxCm)} cm trunk ${row.trunkMaxDeg}°${row.obstructionReactMs != null ? " react " + row.obstructionReactMs + " ms" : ""}`); } }

// ── 5. plate-as-turf vs static turf ──
const plate = {};
for (const key of ["S1_stance", "S4_steps10", "S5_F70", "S5_F80", "S7a_swingPush", "S11b_obstacle"]) { const a = scen[key], b = strip(runG1a(J, spec, key, { poses, staticTurf: true }));
  plate[key] = { plate: { outcome: a.outcome, hash: a.hash, comExcursionCm: a.whole.comExcursionCm, trunkMaxDeg: a.whole.trunkMaxDeg, ledgerResidualNs: a.ledger.residualMaxNs }, static: { outcome: b.outcome, hash: b.hash, comExcursionCm: b.whole.comExcursionCm, trunkMaxDeg: b.whole.trunkMaxDeg }, sameOutcome: a.outcome === b.outcome };
  log(`plate vs static ${key.padEnd(15)} ${a.outcome} / ${b.outcome} · COM ${a.whole.comExcursionCm} / ${b.whole.comExcursionCm} cm · trunk ${a.whole.trunkMaxDeg} / ${b.whole.trunkMaxDeg}°`); }

// ── 6. the declared criteria ──
const C = [], add = (id, criterion, measured, pass, note) => C.push({ id, criterion, measured, pass: pass === null ? null : !!pass, note: note || null });
const S = scen, c1 = REF.C1.QS20, c2L = REF.C2.B_lift_L, c2R = REF.C2.B_lift_R, tr = (k) => (S[k].transfer || []).find(e => e.kind === "gate open");
{ const q = S.S1_stance.whole.quiet, ref = c1 && c1.quiet; add("S1", "quiet stance: upright; COM sway ≤ C1's (QS20) + 20 %; no saturation beyond C1's", `${S.S1_stance.outcome} · sway RMS ${q.swayRmsMm} mm vs C1 ${ref ? ref.swayRmsMm : "?"} mm · drift ${q.comDriftCm} vs ${ref ? ref.comDriftCm : "?"} cm · saturated steps ${S.S1_stance.satSteps} (C1: none)`,
  S.S1_stance.outcome === "UPRIGHT" && ref && q.swayRmsMm <= ref.swayRmsMm * 1.2 && S.S1_stance.satSteps === 0); }
for (const [k, ref] of [["S2_transfer", c2L], ["S2b_transfer", c2R]]) { const e = tr(k), m = e && /after ([\d.]+) s/.exec(e.what), share = e && /to ([\d.]+) % BW/.exec(e.what), t = m ? +m[1] : null, tRef = ref ? ref.requests[0].liftoff.transferS : null;
  add(k.startsWith("S2b") ? "S2b" : "S2", `weight transfer ${k.startsWith("S2b") ? "onto L (unload R)" : "onto R (unload L)"}: the liftoff gate opens (unload ≤ 5 % BW) within C2's transfer time ± 20 %`, e ? `gate open after ${t} s (C2 ${tRef} s) · swing foot ${share ? share[1] : "?"} % BW` : "gate never opened", e && tRef && Math.abs(t - tRef) <= 0.2 * tRef && share && +share[1] <= 5); }
{ const e = (S.S2x_twice.transfer || []).filter(x => x.kind === "gate open").length; add("S2x", "OBSERVATION (not a declared criterion): a second transfer from the stance the first one left", `${e} of 2 gates opened — the unloaded foot is not set back on its anchor (see report)`, null); }
{ const q = S.S3_place.requests || [], ev = S.S3_place.gaitEvents || [], bounces = ev.filter(e => (e.kind === "EARLY_LIFT" || e.kind === "UNPLANNED_LIFT") && ev.some(t => t.kind === "TOUCHDOWN" && t.foot === e.foot && e.t > t.t && e.t - t.t < 0.3)).length;
  add("S3", "4 placements (±20 cm, both feet): C2-equivalent — accepted, foothold ≤ 3 cm, no bounce", `${q.filter(x => x.accepted).length}/4 accepted · foothold ${q.map(x => x.errCm).join(" / ")} cm · re-lifts < 0.3 s after touchdown ${bounces}`, q.length === 4 && q.every(x => x.accepted && x.errCm <= 3) && bounces === 0); }
{ const s = S.S4_steps10, st = s.steps, lifts = (s.gaitEvents || []).filter(e => e.kind === "LIFTOFF").length, dts = st.filter(x => x.tdT != null && x.plannedTdT != null).map(x => (x.tdT - x.plannedTdT) * 1000), slip = Math.max(...st.map(x => x.stanceSlipCm ?? 0));
  add("S4", "10 alternating in-place steps: all liftoffs sensed; timing ± 15 % of the 0.4 s swing; stance slip ≤ 1 cm / step; no non-foot contact", `${st.filter(x => x.status === "LANDED").length}/10 landed · ${lifts} liftoffs sensed · touchdown vs plan ${f(Math.min(...dts), 0)}…${f(Math.max(...dts), 0)} ms · stance slip ≤ ${slip} cm · foothold ≤ ${Math.max(...st.map(x => x.footholdErrCm || 0))} cm · non-foot contact: ${s.fell ? "yes" : "none"}`,
    st.length === 10 && st.every(x => x.status === "LANDED") && lifts >= 10 && dts.every(d => Math.abs(d) <= 60) && slip <= 1 && !s.fell); }
{ const rows = ["F70", "F80", "F100", "B40", "B50", "R40", "R55"].map(k => { const g = S["S5_" + k], ref = REF.C3[k === "R40" ? "A_inplace_R40" : "B_" + k]; const rec = (o) => !/FELL/.test(o);
    return { k, g: g.outcome, c3: ref ? ref.outcome : "?", ok: ref ? (rec(ref.outcome) ? rec(g.outcome) : true) : false, honest: g.ledger.noRootForce }; });
  add("S5", "the C3 push set with the new planner: every case C3 recovered is recovered; failures fall honestly (no hidden support) or improve", rows.map(r => `${r.k}: ${r.g} (C3 ${r.c3})`).join(" · "), rows.every(r => r.ok && r.honest)); }
{ const k6 = Object.entries(s6), ok = k6.every(([k, v]) => { const bF = v.baseline ? (v.baseline.fell ?? /fall/.test(v.baseline.outcome || "")) : null; return ["zeroDelay", "defaultDelay"].every(n => !v[n].latchedRefusal && v[n].releasesWhileReplanting === 0 && (bF ? true : !v[n].fell)); });
  add("S6", "the D6 transient with the new stack as B: no latched refusal; no release while a foot is being re-planted; still recovers where the baseline recovers (D6_slide / v60 / load20; load80 falls in the baseline)", k6.map(([k, v]) => `${k}: baseline ${v.baseline ? (v.baseline.fell ? "fell" : "recovered") : "?"} · 0/0 ${v.zeroDelay.fell ? "fell" : "recovered"} · 50/120 ${v.defaultDelay.fell ? "fell " + v.defaultDelay.tFalling + " s" : "recovered"} · releases while re-planting ${v.zeroDelay.releasesWhileReplanting}/${v.defaultDelay.releasesWhileReplanting}`).join("<br>"), ok); }
for (const k of ["S7a_swingPush", "S7b_stancePush"]) { const s = S[k], pushT = s.push && s.push.t, after = s.steps.filter(x => x.liftoffT != null && pushT != null && x.liftoffT > pushT - 0.4), adj = after.filter(x => (x.adjustCm || 0) > 0.5).length, corr = s.steps.filter(x => x.kind === "corrective").length;
  add(k.slice(0, 3), `15 N·s lateral push at mid-swing (toward the ${k === "S7a_swingPush" ? "swing" : "stance"} side): an interpretable modified step or sequence; no fall`, `${s.outcome} · after the push: ${adj} rhythmic step(s) with a foothold adjustment > 0.5 cm (${after.slice(0, 3).map(x => x.adjustCm ?? 0).join(" / ")} cm), ${corr} corrective`, !s.fell && (adj > 0 || corr > 0)); }
for (const k of ["S7c_swingPush30", "S7d_stancePush30"]) add(k.slice(0, 3), "OBSERVATION: 30 N·s at mid-swing (beyond the declared criterion)", `${S[k].outcome} · ${S[k].steps.length} steps · honest (no hidden support ${S[k].ledger.noRootForce})`, null);
{ const s = S.S8_styleConflict, n = S.S8n_naive, A = s.arbiter, P3 = Object.entries(A).filter(([m, a]) => a.cls === "P3"), hi = Object.entries(A).filter(([m, a]) => a.cls === "P0" || a.cls === "P1");
  add("S8", "saturation: a stance support request + a large style request on the same joints → realised P0 torque ≥ 95 % of its request; P3 dropped first", `support realised ${(s.supportRealization.ratio * 100).toFixed(1)} % (naive diagnostic ${(n.supportRealization.ratio * 100).toFixed(1)} %) · style requested ${P3.map(([m, a]) => a.requestedNms).join("")} N·m·s, allowed ${P3.map(([m, a]) => a.allowedNms).join("")}, yielded ${P3.map(([m, a]) => a.yieldedNms).join("")} · P0/P1 yielded ${hi.reduce((t, [m, a]) => t + a.yieldedNms, 0)} · outcome ${s.outcome} (naive: ${n.outcome}, COM drop ${n.whole.comDropCm} cm)`,
    s.supportRealization.ratio >= 0.95 && P3.every(([m, a]) => a.yieldedNms > 0) && hi.every(([m, a]) => a.yieldedNms === 0)); }
{ const i = S.S9_internal.internal; add("S9", "internal momentum: free-floating (gravity 0, damping 0), all motors cycling through the arbiter → ΔP ≤ 0.5 N·s, ΔL ≤ 0.5 kg·m²/s", `ΔP ${i.dPNs} N·s (peak ${i.peakPNs}) · ΔL ${i.dLkgm2s} kg·m²/s (peak ${i.peakL}) · with Jolt's body damping (info): ΔL ${S.S9d_damped.internal.dLkgm2s}`, i.dPNs <= 0.5 && i.dLkgm2s <= 0.5 && i.peakL <= 0.5); }
{ const a = s10.S4_steps10.compare, b = s10.S5_F80.compare, d = s10.D6_slide.compare;
  add("S10", "480 Hz convergence (S4, S5-F80, D6_slide): integrated impulses within 5 % (boundary cases reported)", `S4: total ${a.turfYPct} % · shear ${a.shearPct} % · touchdowns identical (${a.touchdownDiffMs.every(v => v === 0) ? "all 0 ms" : a.touchdownDiffMs.join(",")}) · 50 ms landing windows ${Math.min(...a.landingPct)}–${Math.max(...a.landingPct)} % · F80: ${Object.entries(s10.S5_F80).filter(([k]) => /^\d/.test(k)).map(([k, v]) => `${k === "2static" ? "480 static" : 240 * +k + " Hz"} ${v.outcome}`).join(", ")} · D6_slide: outcome ${d.sameOutcome ? "same" : "DIFFERENT"}, total A→B ${d.totalAtoBxPct} %`,
    a.turfYPct <= 5 && a.shearPct <= 5 && b.sameOutcome && d.sameOutcome && d.totalAtoBxPct <= 5, "S4 converges on totals and timing; its landing-impact windows, F80 at 480 Hz and D6's later windows do not — reported as boundary cases"); }
{ const a = S.S11a_earlyTurf, td = (a.gaitEvents || []).find(e => e.kind === "TOUCHDOWN"), c = S.S11c_toeCatch, b = S.S11b_obstacle, ob = (b.gaitEvents || []).find(e => e.kind === "OBSTRUCTION"), oc = (c.gaitEvents || []).find(e => e.kind === "OBSTRUCTION"), sb = b.steps[0], sc = c.steps[0];
  add("S11a", "unexpected-contact authority (early ground): the swing foot meets raised turf earlier than planned → the actual contact is the touchdown immediately; roles / phase re-synchronised; the plan adapts", td ? `TOUCHDOWN at ${f(td.t, 3)} s, ${td.early ? "EARLY" : "late"} by ${f(Math.abs(td.dT * 1000), 0)} ms, ${f(td.dP * 100, 1)} cm from the planned foothold · phase ${f(td.phaseBefore, 2)} → ${td.foot === "R" ? 0 : 0.5} at the event · outcome ${a.outcome}` : "no touchdown", td && td.early && !a.fell);
  add("S11b", "unexpected-contact authority (obstacle): the swing leg meets a box → OBSTRUCTION at the contact; the executor reacts within its feedback delay + 2 steps; contact force, touchdown on the turf, no pass-through", `OBSTRUCTION at ${ob ? f(ob.t, 3) : "-"} s · executor reaction ${sb && sb.obstructed ? sb.obstructed.reactMs : "-"} ms (delay ${b.delays.fb * 1000} ms) · touched down ${sb ? sb.footholdErrCm + " cm short" : "-"} · deepest box contact ${b.obstacleMaxDepthMm} mm · box impulse ${JSON.stringify(b.ledger.obstacleImpulseNs)} N·s · outcome ${b.outcome}`,
    ob && sb && sb.obstructed && sb.obstructed.reactMs <= b.delays.fb * 1000 + 2 / 0.24 + 1e-6 && sb.status === "LANDED" && b.obstacleMaxDepthMm <= 5 && !b.fell);
  add("S11c", "unexpected-contact authority (turf edge): the toe strikes a 4 cm raised patch's edge mid-swing — a contact outside the friction cone is an obstruction, not a touchdown", `${oc ? "OBSTRUCTION (edge) at " + f(oc.t, 3) + " s" : "no obstruction"} · reaction ${sc && sc.obstructed ? sc.obstructed.reactMs : "-"} ms · landed ${sc ? sc.footholdErrCm + " cm from the plan" : "-"} · outcome ${c.outcome}`, oc && oc.edge && !c.fell); }
{ const all = Object.values(S), res = Math.max(...all.filter(s => !(s.title || "").includes("gravity 0")).map(s => s.ledger.residualMaxNs)), root = all.every(s => s.ledger.noRootForce);
  add("ledger", "no external / root force on the body except turf, push and obstacle mounts (force-plate ledger residual; audit: no support fixture, teleports or velocity writes)", `max per-step residual ${res} N·s over all scenarios (after Jolt's body damping) · no support / teleport / velocity write: ${root}`, res <= 0.2 && root); }
add("det", "determinism ×" + rep + " (Node)", `${Object.values(S).filter(s => s.deterministic).length}/${Object.keys(S).length} scenarios identical; S6 ${Object.values(s6).every(v => v.zeroDelay.deterministic && v.defaultDelay.deterministic) ? "identical" : "DIFFER"}`, Object.values(S).every(s => s.deterministic) && Object.values(s6).every(v => v.zeroDelay.deterministic && v.defaultDelay.deterministic));
{ const c = Object.entries(S).map(([k, s]) => [k, s.cpu.controller]), mx = c.reduce((a, b) => b[1] > a[1] ? b : a); add("perf", "controller ≤ 0.4 ms per character per 60 Hz frame", `controller ${f(Math.min(...c.map(x => x[1])), 2)}–${f(mx[1], 2)} ms (worst ${mx[0]}); Jolt ${f(Math.min(...Object.values(S).map(s => s.cpu.jolt)), 2)}–${f(Math.max(...Object.values(S).map(s => s.cpu.jolt)), 2)} ms`, mx[1] <= 0.4); }

const out = { generated: "tools/g1a_run.js", calib: WORKING_CALIB, repeat: rep, seconds: r2((Date.now() - t00) / 1000, 1), scenarios: S, s6, s10, sweep, plate, criteria: C };
const p = arg("--out", null); if (p) fs.writeFileSync(p, JSON.stringify(out));
log("\nCRITERIA"); for (const c of C) log(`${c.pass === null ? "  obs" : c.pass ? " PASS" : " FAIL"} ${c.id.padEnd(6)} ${c.measured.replace(/<br>/g, " | ")}`);
log(`done in ${out.seconds} s`);

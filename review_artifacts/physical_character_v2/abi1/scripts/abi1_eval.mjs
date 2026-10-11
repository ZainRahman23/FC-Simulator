// ABI-1 evaluator (ABI1_PREREGISTRATION.md §6–§8): validity V1–V8, windows, contact / tackler / timeline, effect measures E1–E5 and the descriptive
// physical response type, computed identically for every condition from the run records. Physical quantities only; no gameplay label is computed.
// usage: V2_KNEE_MODEL=v2k node abi1_eval.mjs <runs dir> <out.json> [--ib-before "59/1/0"] [--ib-after "59/1/0"] [--set primary|dx]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, V, Q } = PL;
const MT = await import(new URL("./abi1_metrics.mjs", import.meta.url).href);
const [RUNS, OUTF] = process.argv.slice(2), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const H = 1 / 240, W1_END = 60, D = +arg("d", "29"), FRAME_KEYS = ["n", "S", "F"], AUTH = { runner: ["shank_R", "foot_R"], tackler: ["foot_L", "shank_L"] };
const gz = (f) => { const p = path.join(RUNS, f); return fs.existsSync(p) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(p))) : null; };
const X = MT.runnerCtx(), nb = X.nb, names = X.spec.bodies.map(b => b.name), jn = X.spec.joints.map(j => j.name), { OFF } = PL.records();
const grp = (k) => { const b = jn[k].replace(/_[LR]$/, ""); return { ankle: "ankles", knee: "knees", hip: "hips", lumbar: "trunk", thoracic: "trunk", neck: "trunk", shoulder: "shoulders", elbow: "elbows" }[b]; };
// ── camera (IFM-1's independent CAMERA_V1 projection, zoom 1, 1280 × 720; rail x = mean authoritative x of both players, as the PVP-1A capture) ──
function camProj(simX, p) { const W = 1280, Hh = 720, th = 22 * Math.PI / 180, C = [simX, 30, -(68 + 43)], r = [1, 0, 0], u = [0, Math.cos(th), Math.sin(th)], f = [0, -Math.sin(th), Math.cos(th)];
  const rows = [r, u, f.map(x => -x)], d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], v = rows.map(R => d(R, p) - d(R, C)), fpx = 360 / Math.tan(14 * Math.PI / 180), fy = 2 * fpx / 720, w = -v[2];
  return [((fy / (W / Hh)) * v[0] / w * 0.5 + 0.5) * W, (0.5 - fy * v[1] / w * 0.5) * Hh]; }
const toW = (p) => [p[0] + 50, p[1], p[2] - 34];
const simXAt = (n) => { const tau = PV.tauAct + n / 4, [r, s] = PL.rowSlot(tau), body = OFF.prims[r][s].find(p => p.prim === "BODY"); return (OFF.rows[r][8] + (body.a[0] + body.b[0]) / 2) / 2; };
// landmark groups (reporting only): body COMs by body; joint centres by their child body
const groupOfBody = (nm) => /^(head|thorax|abdomen|upperArm|forearm)/.test(nm) ? "upperBody" : nm === "pelvis" ? "pelvis" : /_L$/.test(nm) ? "legL" : "legR";
const LM_GROUP = [...X.spec.bodies.map(b => groupOfBody(b.name)), ...X.spec.joints.map(j => groupOfBody(X.spec.bodies[j.childIndex].name))];
const landmarks = (S) => [...S.map(s => s.com), ...X.spec.joints.map((j, k) => X.ctrl.jointAt(S, k))];
const qang = (a, b) => { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.atan2(Math.sqrt(Math.max(0, 1 - Math.min(1, d) ** 2)), Math.min(1, d)); };
const tiltDeg = (u, u0) => Math.acos(Math.max(-1, Math.min(1, V.dot(V.norm(u), V.norm(u0))))) * 180 / Math.PI;
// ── per-run analysis ──
function crossPairs(rec) { return rec.contacts.filter(c => c.kind === "cross" && Math.hypot(...c.J2) >= PV.contactNs).map(c => { const rr = c.a[0] === "runner" ? c.a[1] : c.b[1], tt = c.a[0] === "tackler" ? c.a[1] : c.b[1]; return { r: rr, t: tt, J: Math.hypot(...c.J2), auth: AUTH.runner.includes(rr) && AUTH.tackler.includes(tt) }; }); }
function runnerIntegrityOk(c) { const I = c.integrity; return I.finite && I.sepMaxMm <= PV.integrity.anchorSepMm && I.selfPenMm <= PV.integrity.selfPenMm && I.turfPenMm <= PV.integrity.turfPenMm && I.maxSpeed <= PV.integrity.speedMax && V.len(c.linRes) <= PV.ledger.linStep && V.len(c.angRes) <= PV.ledger.angStep; }
function windowOf(run, cap) { let end = Math.min(cap, run.recs.length), reason = cap === W1_END ? "W1 nominal end (step 60)" : "horizon";
  for (const r of run.recs) { if (r.n > end) break; const non = crossPairs(r).filter(p => !p.auth); if (non.length) { end = r.n - 1; reason = `non-authoritative cross contact at step ${r.n}: ${non.map(p => "runner." + p.r + "↔tackler." + p.t).join(", ")}`; break; }
    if (!runnerIntegrityOk(r.chars.runner)) { end = r.n - 1; reason = `runner integrity / ledger at step ${r.n}`; break; } }
  return { end, reason }; }
function analyzeRun(run) { const rows = MT.analyze(run), r0 = rows[0], S0 = run.recs[0].S.slice(0, nb), M = X.M;
  const ent = { c: MT.comOf(S0, X.B).c, pelUp: r0.pelUp, thoUp: r0.thoUp };
  const per = rows.map((r, k) => { const rec = run.recs[k], S = rec.S.slice(0, nb), cpairs = crossPairs(rec);
    return { n: r.n, sup: r.sup, F: r.F, dOut: r.dOut, xi: r.xi, c: r.c, v: r.v, comDrop: ent.c[1] - r.c[1], vh: Math.hypot(r.v[0], r.v[2]), pelTilt: tiltDeg(r.pelUp, ent.pelUp), thoTilt: tiltDeg(r.thoUp, ent.thoUp), L: V.len(r.L),
      crossJ: cpairs.reduce((s, p) => s + p.J, 0), nonFoot: rec.chars.runner.nonFootTurf, overCap: rec.chars.runner.integrity.overCap, sat: (rec.act || []).reduce((s, a) => s + a[5], 0), Wact: rec.chars.runner.Wact, footR: r.footR, footL: r.footL }; });
  const trans = []; let prev = [true, true]; per.forEach(p => { [0, 1].forEach(f => { if (p.sup[f] !== prev[f]) trans.push({ foot: f ? "R" : "L", to: p.sup[f] ? "SUPPORT" : "OFF", n: p.n }); }); prev = p.sup; });
  return { per, trans, firstOut: (per.find(p => p.dOut > 0) || {}).n ?? null, ent }; }
function responseType(run, A, w, cond) { const P = A.per.slice(0, w.end), steps = (run.recs.slice(0, w.end).map(r => r.ctl && r.ctl.step).filter(Boolean)), td = steps.find(s => s.phase === "HOLD");
  const loss = P.find(p => p.nonFoot.length || p.comDrop > 0.25 || p.thoTilt > 45); if (loss) return { type: "LOSS_OF_BALANCE", step: loss.n, why: loss.nonFoot.length ? "non-foot turf " + loss.nonFoot.join("|") : loss.comDrop > 0.25 ? "COM drop" : "thorax tilt" };
  if (cond === "A" || cond === "A0") { const off = A.trans.filter(t => t.n <= w.end && t.to === "OFF"); if (!off.length && !P.some(p => p.dOut > 0)) return { type: "NO_ACTIVE_RESPONSE (ABSORBED mechanically)" };
    return { type: "NO_ACTIVE_RESPONSE", support: A.trans.filter(t => t.n <= w.end) }; }
  if (td) { const last = P[P.length - 1]; return { type: last.dOut <= 0 ? "RECOVERY_STEP" : "STEP_TOUCHDOWN_XCOM_OUTSIDE", touchdownStep: td.since ?? null, dOutEnd: last.dOut }; }
  const out = P.filter(p => p.dOut > 0), offs = A.trans.filter(t => t.n <= w.end && t.to === "OFF"), reload = A.trans.filter(t => t.n <= w.end && t.to === "SUPPORT");
  if (!out.length && !offs.length) return { type: "ABSORBED" };
  if (offs.length && reload.length) return { type: "SUPPORT_LOST_PASSIVE_RELOAD", support: A.trans.filter(t => t.n <= w.end), xiInsideAtEnd: P[P.length - 1].dOut <= 0 };
  if (out.length && P[P.length - 1].dOut <= 0) return { type: "BALANCE_CORRECTION" };
  return { type: "UNRESOLVED_AT_WINDOW_END", dOutEnd: P[P.length - 1].dOut, support: A.trans.filter(t => t.n <= w.end) }; }
// ── pairwise effects (E1 / E3 / E4) between two runs over [1, end] ──
function effects(ra, rb, Aa, Ab, end) { const frames = []; for (let n = 4; n <= end; n += 4) { const Sa = ra.recs[n - 1].S.slice(0, nb), Sb = rb.recs[n - 1].S.slice(0, nb), la = landmarks(Sa), lb = landmarks(Sb), sx = simXAt(n);
    let px = 0, mm = 0, pxAt = null, deg = 0; const byG = {}; la.forEach((p, i) => { const d = Math.hypot(...camProj(sx, toW(p)).map((v, k) => v - camProj(sx, toW(lb[i]))[k])), g = LM_GROUP[i]; if (d > px) { px = d; pxAt = i < nb ? names[i] : "joint " + jn[i - nb]; } mm = Math.max(mm, V.dist(p, lb[i]) * 1000);
      byG[g] = Math.max(byG[g] || 0, d); });
    Sa.forEach((s, i) => { deg = Math.max(deg, qang(s.rot, Sb[i].rot) * 180 / Math.PI); }); frames.push({ n, px, pxAt, mm, deg, pxByGroup: byG }); }
  const run = (pred) => { let best = 0, cur = 0, first = null; frames.forEach(f => { if (pred(f)) { cur++; if (cur >= 4 && first == null) first = f.n - 12; } else cur = 0; best = Math.max(best, cur); }); return { longest: best, firstOf4: first }; };
  const g = run(f => f.px >= 2), c = run(f => f.mm >= 30 || f.deg >= 5);
  const jmax = {}; for (let n = 1; n <= end; n++) { const ta = ra.recs[n - 1].chars.runner.th, tb = rb.recs[n - 1].chars.runner.th; ta.forEach((row, k) => row.forEach((v, i) => { const d = Math.abs(v - tb[k][i]) * 180 / Math.PI, gname = grp(k); if (gname && d > (jmax[gname] || 0)) jmax[gname] = d; })); }
  const e = (p) => Ab.per[end - 1][p] - Aa.per[end - 1][p];
  return { E1: { frames, maxPx: Math.max(...frames.map(f => f.px)), maxPxByGroup: Object.fromEntries(["upperBody", "pelvis", "legL", "legR"].map(g => [g, Math.max(...frames.map(f => f.pxByGroup[g] || 0))])), maxMm: Math.max(...frames.map(f => f.mm)), maxDeg: Math.max(...frames.map(f => f.deg)), materialAtGameplayCamera: g.longest >= 4, gameplayRun: g, visibleClose: c.longest >= 4, closeRun: c,
      class: g.longest >= 4 ? "MATERIAL_AT_GAMEPLAY_CAMERA" : c.longest >= 4 ? "VISIBLE_CLOSE" : "SUBTLE_OR_NONE" },
    E3atEnd: { dOut: e("dOut"), comDrop: e("comDrop"), vh: e("vh"), pelTilt: e("pelTilt"), thoTilt: e("thoTilt"), L: e("L") }, E4maxJointDeg: jmax }; }
// ── load the set ──
// a set = a file prefix (primary "", S-DX "DX_", S-TONE "T_", S-DELAY "D24_" / "D36_", S-ABL "B0_" / "B1_", S-IMPACT "V0.25_" …); A missing from a set → --aref <prefix> (the same dir)
const set = arg("set", "primary"), pre = arg("prefix", set === "dx" ? "DX_" : ""), aref = arg("aref", null), conds = ["A", "B", "C"], R = {}, AN = {};
for (const c of conds) for (const m of ["N2", "C0"]) for (const cs of ["ALL", "LEGS"]) { const k = `${c}_${m}_${cs}`; let run = gz(pre + k + ".json.gz"); if (!run && c === "A" && aref != null) run = gz(aref + k + ".json.gz"); if (run) { R[k] = run; AN[k] = analyzeRun(run); } }
const out = { tool: "abi1_eval.mjs", prereg: "abi1/ABI1_PREREGISTRATION.md", set, runs: Object.fromEntries(Object.entries(R).map(([k, r]) => [k, { finalHash: r.finalHash, steps: r.recs.length, stop: r.stop, entryPass: r.entry.pass, entryHash: r.entry.stateHash }])), validity: {}, windows: {}, contact: {}, tackler: {}, timeline: {}, metrics: {}, effects: {}, types: {} };
// V1
{ const hs = Object.values(R).map(r => r.entry.stateHash); out.validity.V1 = { pass: Object.values(R).every(r => r.entry.pass) && new Set(hs).size === 1, entryHashes: [...new Set(hs)] }; }
// V2 causal identity through step d + 1 (B / C vs A, both modes, contact set ALL; A from --aref when the set has no A of its own)
out.validity.V2 = {}; for (const c of ["B", "C"]) for (const m of ["N2", "C0"]) { const a = R[`A_${m}_ALL`], b = R[`${c}_${m}_ALL`]; if (!a || !b) continue; let last = 0; for (let i = 0; i < b.recs.length && a.recs[i].hash === b.recs[i].hash; i++) last = i + 1;
  out.validity.V2[`${c}_${m}`] = { lastIdenticalStep: last, pass: last >= D + 1 }; }
// V3 first contact-caused active response
const firstContact = (run) => { const r = run.recs.find(x => crossPairs(x).length); return r ? r.n : null; };
out.validity.V3 = {}; for (const c of ["B", "C"]) { const n2 = R[`${c}_N2_ALL`], c0 = R[`${c}_C0_ALL`]; if (!n2 || !c0) continue; let first = null;
  for (let i = 0; i < n2.recs.length; i++) { if (JSON.stringify(n2.recs[i].ctl.dtau) !== JSON.stringify(c0.recs[i].ctl.dtau)) { first = n2.recs[i].n; break; } }
  const fc = firstContact(n2); out.validity.V3[c] = { firstContactStep: fc, firstResponseCommandStep: first, firstResponseMs: first != null ? first * 1000 / 240 : null, latencyFromContactMs: first != null && fc != null ? (first - fc) * 1000 / 240 : null, pass: first != null && fc != null && first >= fc + D }; }
// windows, V4, V5
for (const [k, run] of Object.entries(R)) { const isExt = k.endsWith("LEGS"), w = windowOf(run, isExt ? run.recs.length : W1_END); out.windows[k] = w;
  const P = AN[k].per.slice(0, w.end); out.validity[`V4_${k}`] = { pass: run.recs.slice(0, Math.min(w.end, run.recs.length)).every(r => runnerIntegrityOk(r.chars.runner)) };
  out.validity[`V5_${k}`] = { pass: AN[k].per.every(p => p.overCap === 0), overCapSteps: AN[k].per.filter(p => p.overCap !== 0).length }; }
// V6 determinism
out.validity.V6 = {}; for (const c of ["B", "C"]) { const a = R[`${c}_N2_ALL`], rep = gz(`${pre}${c}_N2_ALL_rep.json.gz`); if (a && rep) out.validity.V6[c] = { pass: a.finalHash === rep.finalHash, a: a.finalHash, rep: rep.finalHash }; }
// V7 outcome blindness (runtime part: the controller's frame keys)
out.validity.V7 = {}; for (const c of ["B", "C"]) { const r = R[`${c}_N2_ALL`]; if (r && r.ctlMeta) out.validity.V7[c] = { frameKeys: r.ctlMeta.frameKeys, pass: JSON.stringify(r.ctlMeta.frameKeys) === JSON.stringify(FRAME_KEYS), inputs: r.ctlMeta.inputs }; }
out.validity.V8 = { ibBefore: arg("ib-before", null), ibAfter: arg("ib-after", null), pass: arg("ib-before", "") === "59/1/0" && arg("ib-after", "") === "59/1/0" };
// contact / tackler / timeline / metrics / types
const MT_T = PL.SPEC_T().bodies.reduce((s, b) => s + b.mass, 0);
for (const [k, run] of Object.entries(R)) { if (k.includes("_C0_")) { out.types[k] = responseType(run, AN[k], out.windows[k], k[0]); continue; }
  const w = out.windows[k], perJ = run.recs.slice(0, w.end).map(r => +r.contacts.filter(c => c.kind === "cross").reduce((s, c) => s + Math.hypot(...c.J2), 0).toFixed(6)), pairs = {};
  for (const r of run.recs.slice(0, w.end)) for (const p of crossPairs(r)) { const kk = "runner." + p.r + "↔tackler." + p.t; if (!pairs[kk]) pairs[kk] = { first: r.n, last: r.n, J: 0 }; pairs[kk].last = r.n; pairs[kk].J += p.J; }
  out.contact[k] = { firstContactStep: firstContact(run), pairs, perStepCrossJ: perJ, eqOppMax: Math.max(...run.recs.slice(0, w.end).map(r => r.eqOpp ? r.eqOpp.dJ : 0)) };
  const vT = (n) => V.sc(n ? run.recs[n - 1].chars.tackler.P : [0, 0, 0], 1 / MT_T), v0 = R[k].recs[0] ? V.sc(R[k].recs[0].chars.tackler.P, 1 / MT_T) : null;
  out.tackler[k] = { vStep1: v0, vWindowEnd: vT(w.end), dvWindow: V.sub(vT(w.end), v0), integrityBadSteps: run.recs.slice(0, w.end).filter(r => r.chars.tackler.integrity.sepMaxMm > 1 || r.chars.tackler.integrity.selfPenMm > 10).map(r => r.n) };
  const steps = []; let ps = null; run.recs.forEach(r => { const s = r.ctl && r.ctl.step; const ph = s ? s.phase : "IDLE"; if (ph !== ps) steps.push({ n: r.n, phase: ph, leg: s ? s.leg : null, foothold: s ? s.foothold : null, footPos: s && s.leg != null ? r.S[s.leg === 0 ? X.idx.foot_L : X.idx.foot_R].pos : null }); ps = ph; });
  out.timeline[k] = { support: AN[k].trans, firstXcomOutsideBoS: AN[k].firstOut, stepEvents: steps.filter(s => s.phase !== "IDLE" || s.n > 1) };
  const P = AN[k].per, at = (n) => P[Math.min(n, P.length) - 1], series = (f) => P.slice(0, w.end).filter(p => p.n % 4 === 0).map(p => [p.n, +f(p).toFixed(5)]);
  out.metrics[k] = { windowEnd: w.end, atEnd: { dOut: at(w.end).dOut, comDrop: at(w.end).comDrop, vh: at(w.end).vh, pelTilt: at(w.end).pelTilt, thoTilt: at(w.end).thoTilt, L: at(w.end).L, F: at(w.end).F },
    peaks: { pelTilt: Math.max(...P.slice(0, w.end).map(p => p.pelTilt)), thoTilt: Math.max(...P.slice(0, w.end).map(p => p.thoTilt)), comDrop: Math.max(...P.slice(0, w.end).map(p => p.comDrop)), L: Math.max(...P.slice(0, w.end).map(p => p.L)) },
    satAxisSteps: P.slice(0, w.end).reduce((s, p) => s + p.sat, 0), Wact: P.slice(0, w.end).reduce((s, p) => s + p.Wact, 0),
    series: { dOut: series(p => p.dOut), FL: series(p => p.F[0]), FR: series(p => p.F[1]), pelTilt: series(p => p.pelTilt), thoTilt: series(p => p.thoTilt), comDrop: series(p => p.comDrop), vh: series(p => p.vh) } };
  if (run.recs[0].ctl) { const dmax = {}; run.recs.slice(0, w.end).forEach(r => (r.ctl.dtau || []).forEach(([kk, i, v]) => { const g = grp(kk); if (g && Math.abs(v) > (dmax[g] || 0)) dmax[g] = Math.abs(v); })); out.metrics[k].peakDtauNm = dmax; }
  out.types[k] = responseType(run, AN[k], w, k[0]); }
// pairwise effects on the common window (each contact set separately)
for (const cs of ["ALL", "LEGS"]) for (const [x, y] of [["A", "B"], ["A", "C"], ["B", "C"]]) { const a = R[`${x}_N2_${cs}`], b = R[`${y}_N2_${cs}`]; if (!a || !b) continue;
  const end = Math.min(out.windows[`${x}_N2_${cs}`].end, out.windows[`${y}_N2_${cs}`].end); out.effects[`${y}-${x}_${cs}`] = { window: end, ...effects(a, b, AN[`${x}_N2_${cs}`], AN[`${y}_N2_${cs}`], end) }; }
out.summary = { V: Object.fromEntries(Object.entries(out.validity).map(([k, v]) => [k, v.pass !== undefined ? v.pass : Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, vv.pass]))])), windows: Object.fromEntries(Object.entries(out.windows).map(([k, w]) => [k, w.end])),
  types: Object.fromEntries(Object.entries(out.types).map(([k, t]) => [k, t.type])), E1: Object.fromEntries(Object.entries(out.effects).map(([k, e]) => [k, `${e.E1.class} (max ${e.E1.maxPx.toFixed(2)} px, ${e.E1.maxMm.toFixed(0)} mm, ${e.E1.maxDeg.toFixed(1)}°, window ${e.window})`])) };
fs.writeFileSync(OUTF, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.summary, null, 1));

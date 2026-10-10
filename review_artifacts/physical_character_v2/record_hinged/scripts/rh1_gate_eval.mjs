// RH1 GATE EVALUATION (record_hinged/RH1_PREREG.md §6 / §7, frozen 50eae23a; written after the battery was launched, before reading its gate results).
// Per-body rows for RH1 (subject) and R0 = PI1-runner-vinicius (control) from the rh1_battery.sh outputs, with the FROZEN evaluators and rules:
//   G0 g0Body rows · G1 gate rows + per-run criteria (RH1 / R0 in the V2-REF / V1-matched roles) + the perturbed-ensemble rule (≤ 8.1 %, no scenario ≥ 5 / 15)
//   G2 v1 rows (gates/v2_g2_checks.js): 2.1 / 2.2a / 2.2b / 2.3 / 2.4 / E / F(ii) per body from the 10-body run (row formulas per body, as the
//      evaluator's; the 8-body count conditions become per-body counts); S4 / S5 / F(i) / D from the run with RH1 in V2-REF's rows
//   G3 v3.3 + K′ (gates/v2_g3_checks_v33.js, as tools/qual_eval.mjs) on the run with RH1 in V2-REF's rows (RH1 relabelled to the evaluator's
//      "V2-REF"; T9 / T9U of the other bodies dropped from that run); I2 per body from the 10-body run; J2a on RH1's 73 pairs + 8 other U pairs (= 81)
//   twist battery: the frozen tools/twist_policy_eval.mjs (BODIES list with RH1 / R0 for V2-REF / V1-matched, scratch copy) + tools/close_eval.mjs --policy
//   KV6c / boundary / PY4 / yaw: the qualification rules Q2a / Q2b / Q6b–d / Q7 (knee_correction/evidence/qual/scripts/eval_q.mjs), on RH1 and R0
// Regression (stop rule): the 8 qualified bodies' outputs against knee_correction/evidence/qual/ (hashes / byte identity).
// Replaced / not re-run rows are listed, never silently dropped.
// usage: node rh1_gate_eval.mjs <battery dir> [out.json] [rh1_g1_diag.json]
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { execFileSync } from "child_process"; import { fileURLToPath } from "url";
import { evaluate as evalG2, inPlace, boundary } from "../../../../sandbox/visual/physchar2/gates/v2_g2_checks.js";
import { evaluateV33 } from "../../../../sandbox/visual/physchar2/gates/v2_g3_checks_v33.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.."), P2 = path.join(ROOT, "sandbox/visual/physchar2");
const C = process.argv[2], OUTF = process.argv[3], DIAG = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4])) : null, OFF = path.join(ROOT, "review_artifacts/physical_character_v2/knee_correction/evidence/qual");
const rd = (f) => JSON.parse(f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)) : fs.readFileSync(f)), rdo = (f) => (fs.existsSync(f) ? rd(f) : fs.existsSync(f + ".gz") ? rd(f + ".gz") : null);
const RH = "PI1-runner-vinicius-RH1", R0 = "PI1-runner-vinicius", SUBJ = [RH, R0], Q8 = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"];
const short = (h) => (h === RH ? "RH1" : h === R0 ? "R0" : h), mx = (a) => (a.length ? Math.max(...a) : null), num = (x, n = 2) => (x == null || !Number.isFinite(x) ? "—" : (+x).toFixed(n));
const out = { battery: C, rows: [], regression: [], replaced: [] };
const row = (item, id, body, pass, value, extra = {}) => { out.rows.push({ item, id, body: short(body), pass, value: String(value), ...extra }); console.log(`${pass === null ? "rep " : pass ? "PASS" : "FAIL"} ${item.padEnd(6)} ${String(id).padEnd(7)} [${short(body)}] ${String(value).slice(0, 400)}`); };
const reg = (id, pass, value) => { out.regression.push({ id, pass, value }); console.log(`${pass ? "SAME" : "DIFF"} regression ${id}: ${value}`); };
const repl = (item, id, why) => { out.replaced.push({ item, id, why }); console.log(`—    ${item.padEnd(6)} ${String(id).padEnd(7)} ${why}`); };
// ═══ G0 ═══
{ const g = rd(path.join(C, "q3/g0/g0_results.json")), o = rd(path.join(OFF, "q3/g0/g0_results.json")), by = (R, h) => R.runs.find(r => r.human.id === h);
  const fails = {}; for (const h of SUBJ) { const r = by(g, h); fails[h] = r.checks.filter(c => !c.pass && !c.reportOnly); }
  for (const h of SUBJ) { const r = by(g, h); row("G0", "rows", h, null, `${r.checks.filter(c => c.pass || c.reportOnly).length}/${r.checks.length} rows pass; spec ${r.specHash}; failing: ${fails[h].map(c => `${c.id} (${String(c.value).slice(0, 90)})`).join("; ") || "none"}`, { failing: fails[h].map(c => ({ id: c.id, value: c.value, limit: c.limit })) }); }
  const RECORDED = ["0.6a", "0.6b", "0.10a", "0.4c", "0.6e"], f1 = fails[RH].map(c => c.id), f0 = fails[R0].map(c => c.id);
  const same = (id) => { const a = fails[RH].find(c => c.id === id), b = fails[R0].find(c => c.id === id); return a && b && JSON.stringify(a.value) === JSON.stringify(b.value); };
  row("G0", "class", RH, f1.every(id => RECORDED.includes(id) && same(id)), `RH1 failing rows ${f1.join(", ") || "none"}; recorded R0 exceptions ${RECORDED.join(", ")}; R0 failing ${f0.join(", ") || "none"}; ` +
    f1.map(id => `${id}: ${RECORDED.includes(id) ? "recorded" : "NEW"}, ${same(id) ? "identical value to R0" : "differs from R0"}`).join("; "), { rule: "every RH1 failing row is a recorded R0 exception failing identically" });
  const glob = g.global.map(c => `${c.id} ${c.pass ? "pass" : "FAIL"}`).join(", "); row("G0", "global", RH, null, glob + " (0.V1 needs the git checkout; scratch-tree artefact as in the qualification, worktree guard_v1 run separately in Q0)");
  for (const h of Q8) { const a = by(g, h), b = by(o, h); reg(`G0 ${h}`, a && b && a.specHash === b.specHash && JSON.stringify(a.checks) === JSON.stringify(b.checks), a && b ? `spec ${a.specHash} / ${b.specHash}; ${a.checks.length} rows ${JSON.stringify(a.checks) === JSON.stringify(b.checks) ? "identical" : "DIFFER"}` : "missing"); } }
// ═══ G1 ═══
{ const g = rd(path.join(C, "q3/g1_results_rh1.json")), g8 = rd(path.join(C, "q3/g1_results_8bodies.json")), o = rd(path.join(OFF, "q3/g1_results_qual.json.gz"));
  const ROLE = { "1.S": RH, "1.S′": R0, "1.6a": RH, "1.6b": RH, "5": RH, "5c": RH, "8": RH, "7.HS": RH, "1.1f": RH };
  for (const c of g.gate) { if (c.reportOnly) { row("G1", c.id, ROLE[c.id] || RH, null, `${c.value}`); continue; }
    if (c.id === "6") { repl("G1", "6", `body variants row: not an RH1 row (VARS = [] in the substituted run; the 4 variants ran in the 8-body regression run): ${c.value}`); continue; }
    if (c.id === "1.V1") { repl("G1", "1.V1", `V1 frozen: needs the git checkout (scratch-tree artefact, as the qualification); worktree guard_v1 OK in Q0: ${c.value}`); continue; }
    row("G1", c.id, ROLE[c.id] || RH, c.pass, `${c.name.slice(0, 70)} — ${c.value}`); }
  for (const h of SUBJ) { const runs = g.runs.filter(r => r.human === h), bad = runs.flatMap(r => r.checks.filter(c => !c.pass && !c.reportOnly).map(c => ({ key: r.key, id: c.id, value: c.value, limit: c.limit })));
    row("G1", "runs", h, null, `${runs.length} scenario runs (the gate is 1.S / 1.S′); failing criteria: ${bad.map(b => `${b.key} ${b.id} ${String(b.value).slice(0, 120)} (limit ${b.limit})`).join("; ") || "none"}`, { failing: bad });
    const sc = runs.find(r => r.key === "isoSelfCol"); if (sc) { const c = sc.checks.find(c => c.id === "1.4d"); row("G1", "1.4d", h, null, `isoSelfCol 1.4d: ${c ? c.value : "—"} (limit ${c ? c.limit : "—"}); selfCol ${JSON.stringify(sc.selfCol).slice(0, 300)}`); } }
  // recorded R0 exception isoSelfCol 1.4d: RH1 may fail it only "if identical in cause" (boot ↔ boot, high-speed leg-into-leg swing)
  { const pick = (h) => g.runs.find(r => r.human === h && r.key === "isoSelfCol"), a = pick(RH), b = pick(R0), fa = a.checks.find(c => c.id === "1.4d"), fb = b.checks.find(c => c.id === "1.4d");
    const dg = DIAG ? (b) => DIAG.rows.find(x => x.body === b && x.key === "isoSelfCol") : null, d1 = dg && dg("RH1"), d0 = dg && dg("R0");
    const sameCause = !!(d1 && d0 && d1.hash === a.hash && d0.hash === b.hash && d1.pairsOver10mm.length === 1 && d0.pairsOver10mm.length === 1 && d1.pairsOver10mm[0].startsWith("foot_L ↔ foot_R") && d0.pairsOver10mm[0].startsWith("foot_L ↔ foot_R") && d1.pairsOver10mm[0].replace(/ [\d.]+ mm/, "") === d0.pairsOver10mm[0].replace(/ [\d.]+ mm/, ""));
    row("G1", "1.4d-cls", RH, fa.pass || (!fb.pass && sameCause), `RH1 ${fa.pass ? "passes" : "fails"} (${fa.value}); R0 ${fb.pass ? "passes" : "fails"} (${fb.value}); cause (rh1_g1_diag, hashes reproduced): RH1 ${d1 ? d1.pairsOver10mm.join("; ") : "not diagnosed"} / R0 ${d0 ? d0.pairsOver10mm.join("; ") : "not diagnosed"} → ${sameCause ? "identical in cause (boot ↔ boot, same first contact and duration): the recorded R0 exception" : "NOT shown identical in cause"}`); }
  const key = (r) => `${r.human}|${r.key}|${JSON.stringify(r.cfg || "")}`, A = new Map(o.runs.map(r => [key(r), r.hash])), diff = g8.runs.filter(r => A.get(key(r)) !== r.hash).map(key);
  reg("G1 8-body runs", diff.length === 0 && g8.runs.length === o.runs.length, `${g8.runs.length - diff.length}/${g8.runs.length} run hashes identical to the official qualification run (official ${o.runs.length})${diff.length ? ": " + diff.slice(0, 6).join(", ") : ""}`);
  reg("G1 8-body gate", JSON.stringify(g8.gate.map(c => [c.id, c.pass, c.value])) === JSON.stringify(o.gate.map(c => [c.id, c.pass, c.value])), g8.gate.map(c => `${c.id} ${c.pass ? "pass" : "FAIL"}`).join(", "));
  // perturbed ensembles perturb240 × 15
  const sw = rd(path.join(C, "q3/sweep_rh1.json")).runs, base = (k) => k.split("@")[0];
  for (const h of SUBJ) { const R = sw.filter(r => r.human === h), F = R.filter(r => r.g1Fail.length), by = {}; for (const r of R) { const k = base(r.key); (by[k] ||= { n: 0, f: 0, why: [] }).n++; if (r.g1Fail.length) { by[k].f++; by[k].why.push(...r.g1Fail); } }
    const sys = Object.entries(by).filter(([, v]) => v.f >= 5), rate = F.length / R.length;
    row("G1", "pert", h, rate <= 0.081 && sys.length === 0 && R.length === 150, `${F.length}/${R.length} = ${(rate * 100).toFixed(1)} % (≤ 8.1 %); systematic scenarios (≥ 5 / 15): ${sys.map(([k, v]) => `${k} ${v.f}/15 [${[...new Set(v.why)].join(",")}]`).join("; ") || "none"}; per scenario ${Object.entries(by).filter(([, v]) => v.f).map(([k, v]) => `${k} ${v.f}/${v.n} [${[...new Set(v.why)].join(",")}]`).join("; ") || "no failures"}; invalid manifolds ${R.filter(r => r.invalidTicks).length}; >1 J rises ${R.filter(r => r.maxRise > 1).length}`); }
  const s8 = rd(path.join(C, "q3/sweep_8bodies.json")).runs, so = rd(path.join(OFF, "q3/sweep.json")).runs, SM = new Map(so.map(x => [x.human + "|" + x.key, x.hash])), sws = s8.filter(x => SM.get(x.human + "|" + x.key) === x.hash).length;
  reg("G1 perturbed (V2-REF / V1-matched)", sws === s8.length && s8.length === so.length, `${sws}/${s8.length} run hashes identical (official ${so.length})`); }
// ═══ G2 ═══
{ const g = rd(path.join(C, "q3/g2_results_10bodies.json")), gr = rd(path.join(C, "q3/g2_results_rh1rows.json")), o = rd(path.join(OFF, "q3/g2_results_qual.json.gz"));
  const J = g.jobs.filter(j => !j.error), all = J.filter(j => j.res), E = evalG2(g, { browser: null, regression: null }), c = (id) => E.checks.find(x => x.id === id);
  row("G2", "run", RH, g.jobs.filter(j => j.error).length === 0, `${J.length} ok / ${g.jobs.filter(j => j.error).length} errors (10-body run)`);
  const BIG = ["V2-REF", "V1-matched"];
  for (const h of SUBJ) {
    const f21 = c("2.1").detail.find(x => x.human === h); row("G2", "2.1", h, !!f21 && f21.ok, f21 ? `${Object.entries(f21.items).map(([k, v]) => k + (v ? "✓" : "✗")).join(" ")} · ${f21.v}` : "missing", { items: f21 && f21.items });
    const P = J.filter(j => j.group === "push" && j.human === h), req = P.filter(j => j.sc.J === 10 || (BIG.includes(j.human) && (j.sc.J === 5 || j.sc.J === 15)));
    const f22 = req.map(j => ({ dir: j.sc.dir, J: j.sc.J, ok: inPlace(j.res, 10) && mx(j.res.feet.tiltMaxDeg) <= 10, out: j.res.outcome, slip: mx(j.res.feet.slipMaxMm), tilt: mx(j.res.feet.tiltMaxDeg) }));
    row("G2", "2.2a", h, f22.length === 8 && f22.every(x => x.ok), `${f22.filter(x => x.ok).length}/${f22.length} (expected 8: 10 N·s × 8 directions) · ${f22.map(x => `${x.dir}${x.J} ${x.out} slip ${num(x.slip, 1)} tilt ${num(x.tilt, 1)}`).join(", ")}`);
    const B = Object.fromEntries(Object.entries(E.boundaries).filter(([k]) => k.startsWith(h + "|"))), inv = Object.entries(B).filter(([, b]) => b.inversion).map(([k]) => k);
    const sym = c("2.2b").symmetry.filter(s => s.human === h);
    row("G2", "2.2b", h, inv.length === 0 && sym.every(s => s.ok) && Object.keys(B).length === 4, `${Object.keys(B).length} sweeps, ${inv.length} inversions, symmetry ${sym.filter(s => s.ok).length}/${sym.length} · boundaries (N·s recovered / first fail): ${Object.entries(B).map(([k, b]) => `${k.split("|")[1]} ${b.recovered}/${b.fails ?? "—"}`).join(", ")}`, { boundaries: B });
    const mine = all.filter(j => j.human === h), over = mine.reduce((s, j) => s + j.res.actuators.overCapTicks, 0);
    row("G2", "2.3", h, over === 0, `${over} ticks over ${mine.length} runs`);
    const gate = mine.filter(j => ["S0", "push", "S4", "S5"].includes(j.group)), nonrec = gate.filter(j => j.group === "push" && !inPlace(j.res));
    const ledgerOk = gate.every(j => j.res.ledger.authorityWrites === 0 && Math.hypot(...j.res.ledger.Jext.map((x, i) => x - j.res.sched.J[i])) <= 1e-9 * Math.max(1, Math.hypot(...j.res.sched.J)) + 1e-9 && Math.hypot(...j.res.ledger.Hext.map((x, i) => x - j.res.sched.H[i])) <= 1e-9 * Math.max(1, Math.hypot(...j.res.sched.H)) + 1e-9);
    const falls = gate.filter(j => j.res.fell), cpOk = falls.every(j => j.res.stepRequired), relOk = nonrec.every(j => j.res.fell || mx(j.res.feet.slipMaxMm) > 20 || j.res.outcome === "foot relocated");
    row("G2", "2.4", h, ledgerOk && cpOk && relOk, `${nonrec.length} non-recoveries, ${falls.length} falls (${falls.filter(j => j.res.stepRequired).length} step-required), ledger ${ledgerOk ? "exact" : "MISMATCH"}`);
    const res = gate.map(j => j.res.ledger.closure); row("G2", "E", h, gate.every(j => j.res.ledger.authorityWrites === 0) && res.every(x => x <= 0.5), `max residual ${num(mx(res), 3)} J, min ${num(Math.min(...res), 2)} J over ${gate.length} runs (≤ +0.5 J)`);
    const pen = mine.filter(j => j.group === "S0" || (j.group === "push" && req.includes(j))), penOk = pen.every(j => j.res.g1.contacts.turfPenMaxMm <= 10 && j.res.g1.contacts.turfPenRestMm <= 5);
    row("G2", "F(ii)", h, penOk, `turf penetration max ${num(mx(pen.map(j => j.res.g1.contacts.turfPenMaxMm)), 2)} mm (≤ 10), rest max ${num(mx(pen.map(j => j.res.g1.contacts.turfPenRestMm)), 2)} mm (≤ 5) over ${pen.length} runs (2.1 + 2.2a)`);
    const s0 = J.find(j => j.group === "S0" && j.human === h); if (s0) row("G2", "2.1c-cap", h, null, `quiet stance peak isometric fraction ${s0.res.extra.peakIsoFrac.slice(0, 4).map(p => `${p[0]} ${num(p[1] * 100, 1)} %`).join(", ")}; sat ticks after 1 s ${s0.res.extra.satTicksAfter1s}; controller cost in run mean ${num(s0.res.cpuCtrl && s0.res.cpuCtrl.meanMs, 3)} ms (9-worker run; reported)`); }
  // RH1 in V2-REF's rows (S4, S5, F(i), D) — the job list of the substituted runner, every job human = RH1
  const Er = evalG2(gr, { browser: { allPass: true, pass: "not re-run", n: "declared" }, regression: null }), cr = (id) => Er.checks.find(x => x.id === id);
  const bodiesR = [...new Set(gr.jobs.map(j => j.human))]; row("G2", "rows-id", RH, bodiesR.length === 1 && bodiesR[0] === RH && gr.jobs.filter(j => j.error).length === 0, `S4 / S5 / copSweep / determinism / snapshot run on ${bodiesR.join(", ")}; ${gr.jobs.length} jobs, ${gr.jobs.filter(j => j.error).length} errors`);
  for (const id of ["S4", "S5"]) row("G2", id, RH, cr(id).pass, cr(id).value, { detail: cr(id).detail });
  { const RS = gr.jobs.filter(j => j.group === "copSweep" && j.res), fr = RS.map(j => ({ dir: j.sc.dir, ok: !j.res.fell && mx(j.res.feet.slipMaxMm) <= 2 && j.res.extra.ramp.maxNetJumpMm <= 5 && j.res.extra.ramp.maxTrackErrMm <= 5, ...j.res.extra.ramp }));
    const pr = gr.jobs.filter(j => ["S4", "S5"].includes(j.group) && j.res), pOk = pr.every(j => j.res.g1.contacts.turfPenMaxMm <= 10 && j.res.g1.contacts.turfPenRestMm <= 5);
    row("G2", "F(i)", RH, fr.length === 6 && fr.every(x => x.ok) && pOk, `CoP sweeps ${fr.filter(x => x.ok).length}/6, max jump ${num(mx(fr.map(x => x.maxNetJumpMm)), 2)} mm, max track ${num(mx(fr.map(x => x.maxTrackErrMm)), 2)} mm; S4 / S5 penetration ${pOk ? "ok" : "FAIL"} (max ${num(mx(pr.map(j => j.res.g1.contacts.turfPenMaxMm)), 2)} mm)`); }
  { const D = gr.jobs.filter(j => j.group === "determinism"), grp = {}; for (const j of D) { const k = JSON.stringify(j.sc); (grp[k] ||= []).push(j.res.hash); }
    const detOk = Object.keys(grp).length === 6 && Object.values(grp).every(h => h.length === 3 && h.every(x => x === h[0])), snap = gr.jobs.filter(j => j.group === "snapshot"), snapOk = snap.length === 3 && snap.every(j => j.exact);
    row("G2", "D", RH, detOk && snapOk, `×3 ${Object.values(grp).filter(h => h.every(x => x === h[0])).length}/${Object.keys(grp).length}, snapshot ${snap.filter(j => j.exact).length}/${snap.length} (browser = Node: not re-run, body-independent, declared in the prereg)`); }
  { const res = gr.jobs.filter(j => ["S4", "S5"].includes(j.group) && j.res), over = gr.jobs.filter(j => j.res).reduce((s, j) => s + j.res.actuators.overCapTicks, 0);
    row("G2", "2.3/E-r", RH, over === 0 && res.every(j => j.res.ledger.authorityWrites === 0 && j.res.ledger.closure <= 0.5), `V2-REF-role rows: capacity ticks over ${over}; energy residual max ${num(mx(res.map(j => j.res.ledger.closure)), 3)} J`); }
  repl("G2", "2.5", "controller cost: not a body-validity row (RATE_PERFORMANCE.md §2); the isolated RH1 vs R0 step cost is measured separately (CPU item)"); repl("G2", "R", "earlier gates: replaced by this battery's G0 / G1 (as the qualification)");
  // regression: the 8 bodies' jobs of the 10-body run against the official 8-body run
  const k2 = (j) => JSON.stringify({ ...j, res: undefined, exact: undefined, error: undefined }), O = new Map(o.jobs.filter(j => j.res).map(j => [k2(j), j.res.hash !== undefined ? j.res.hash : JSON.stringify(j.res)]));
  const mine8 = g.jobs.filter(j => j.res && O.has(k2(j))), d8 = mine8.filter(j => O.get(k2(j)) !== (j.res.hash !== undefined ? j.res.hash : JSON.stringify(j.res)));
  reg("G2 8-body jobs", d8.length === 0 && mine8.length === o.jobs.filter(j => j.res).length, `${mine8.length - d8.length}/${o.jobs.filter(j => j.res).length} official jobs found with identical result hash${d8.length ? "; differ: " + d8.slice(0, 5).map(j => j.group + " " + j.human).join(", ") : ""}`);
  const sn = (R) => R.jobs.filter(j => j.group === "snapshot").map(j => JSON.stringify(j)), so = sn(o), s10 = sn(g); reg("G2 snapshot jobs", so.length === 3 && so.every(x => s10.includes(x)), `${so.filter(x => s10.includes(x)).length}/${so.length} official snapshot jobs identical (hashA / hashB / exact)`); }
// ═══ G3 ═══
{ const strip = (g) => { for (const j of g.jobs) if (j.xstand && j.stand) { const st = { ...j.stand }; for (const k of Object.keys(j.xstand)) if (JSON.stringify(st[k]) === JSON.stringify(j.xstand[k])) delete st[k]; if (Object.keys(st).length) j.stand = st; else delete j.stand; delete j.xstand; } return g; };
  const RA = path.join(ROOT, "review_artifacts/physical_character_v2"), ra = (f) => rdo(path.join(RA, f));
  const g10 = strip(rd(path.join(C, "q3/g3_results_10bodies.json"))), gr = strip(rd(path.join(C, "q3/g3_results_rh1.json"))), o = rd(path.join(OFF, "q3/g3_results_qual.json.gz"));
  const m10 = rd(path.join(C, "q3/g3_mirror_10bodies.json")), mr = rd(path.join(C, "q3/g3_mirror_rh1.json")), M = rd(path.join(C, "q3/k_margins_rh1.json")), marg = Object.fromEntries(M.filter(r => r.human).map(r => [r.human, r.marginCm]));
  // I2 per body (10-body run)
  const E10 = evaluateV33(g10, { mirrorV3: null }), I2 = E10.checks.find(c => c.id === "I2");
  for (const h of SUBJ) { const r = I2.rows.find(x => x.human === h); row("G3", "I2", h, !!r && r.pass, r ? r.v : "missing"); }
  // RH1 in V2-REF's rows: relabel, drop other bodies' T9 / T9U; mirror = RH1's pairs (relabelled) + the U pairs of the 8 bodies other than RH1 / V2-REF
  const idsR = [...new Set(gr.jobs.filter(j => !["T9", "T9U"].includes(j.group)).map(j => j.human))];
  row("G3", "rows-id", RH, idsR.length === 1 && idsR[0] === RH, `non-T9 jobs run on ${idsR.join(", ")}; ${gr.jobs.length} jobs, ${gr.jobs.filter(j => j.error).length} errors`);
  const jr = { ...gr, jobs: gr.jobs.filter(j => !["T9", "T9U"].includes(j.group) || j.human === RH).map(j => (j.human === RH ? { ...j, human: "V2-REF" } : j)) };
  // the official set = V2-REF's 73 pairs (incl. one U pair) + one U pair per body (V2-REF's again); substituted: RH1's 73 + RH1's own U pair + the U pairs of
  // the 6 other qualified bodies + R0 (V1-matched's role) = 81
  const pr = mr.pairs.filter(p => p.human === RH).map(p => ({ ...p, human: "V2-REF" })).concat(mr.pairs.filter(p => ![RH, "V2-REF", "V1-matched"].includes(p.human)));
  const Er = evaluateV33(jr, { mirrorV3: { ...mr, pairs: pr } });
  const t11 = jr.jobs.filter(j => /^T11:over/.test(j.key) && j.res && j.group !== "determinism").map(j => { const lam = +j.key.split(":")[2], m = marg[RH] ? marg[RH][String(lam)] ?? marg[RH][lam] : null; return { key: j.key, lam, marginCm: m, excessive: m != null && m < 0, outcome: j.res.outcome }; });
  const notStable = (x) => /fell|relocated|not settled/.test(x || ""), kp = t11.some(r => r.excessive) && t11.filter(r => r.excessive).every(r => notStable(r.outcome));
  const REPL = { P2: "earlier gates valid: replaced by this battery's G0 / G1 / G2 rows on RH1 (as the qualification's Q3a–d)", S2: "controller cost: not a body-validity row; isolated RH1 vs R0 step cost measured separately (CPU item)", O: "browser = Node: not re-run (body-independent, declared in the prereg)", I2: "per body from the 10-body run (rows above)" };
  for (const c of Er.checks) { if (REPL[c.id]) { repl("G3", c.id, REPL[c.id]); continue; }
    if (c.id === "K") { row("G3", "K′", RH, kp, `[original K ${c.pass ? "PASS" : "FAIL"}] ` + t11.map(r => `${r.key}: margin ${r.marginCm} cm → ${r.excessive ? "EXCESSIVE" : "feasible"}; ${r.outcome}`).join(" · "), { rows: t11 }); continue; }
    row("G3", c.id, RH, c.reportOnly ? null : c.pass, String(c.value).slice(0, 600)); }
  row("G3", "J2a-n", RH, pr.length === 81 && pr.filter(p => p.human === "V2-REF").length === 74, `mirror pairs evaluated: ${pr.filter(p => p.human === "V2-REF").length} RH1 + ${pr.length - pr.filter(p => p.human === "V2-REF").length} U pairs of ${[...new Set(pr.filter(p => p.human !== "V2-REF").map(p => short(p.human)))].join(", ")}`);
  { const p0 = m10.pairs.filter(p => p.human === R0), E0 = evaluateV33(g10, { mirrorV3: { ...m10, pairs: m10.pairs } }).checks.find(c => c.id === "J2a"), bad0 = (E0.bad || []).filter(b => b.startsWith(`U:R/U:L ${R0}:`));
    row("G3", "J2a", R0, p0.length > 0 && bad0.length === 0, `R0 U:R / U:L pair ${p0.length ? "probed" : "missing"}; ${bad0.length ? bad0.join("; ") : "within every J2a tolerance"}`); }
  // regression
  const k3 = (j) => JSON.stringify({ ...j, res: undefined, xstand: undefined }), rid = (j) => (j.res.hash !== undefined ? j.res.hash : JSON.stringify(j.res));
  const oo = strip(o), GA = new Map(oo.jobs.filter(j => j.res).map(j => [k3(j), rid(j)])), f3 = g10.jobs.filter(j => j.res && GA.has(k3(j))), d3 = f3.filter(j => GA.get(k3(j)) !== rid(j));
  reg("G3 8-body jobs", d3.length === 0 && f3.length === GA.size, `${f3.length - d3.length}/${GA.size} official jobs found with identical result${d3.length ? "; differ: " + d3.slice(0, 6).map(j => j.group + ":" + j.key + " " + j.human).join(", ") : ""}`);
  const om = rd(path.join(OFF, "q3/g3_mirror_v3_qual.json")), pk = (p) => `${p.a}|${p.b}|${p.human}`, OM = new Map(om.pairs.map(p => [pk(p), JSON.stringify({ a: p.j2a, b: p.j2b })]));
  const fm = m10.pairs.filter(p => OM.has(pk(p))), dm = fm.filter(p => OM.get(pk(p)) !== JSON.stringify({ a: p.j2a, b: p.j2b }));
  reg("J2a mirror 8-body pairs", dm.length === 0 && fm.length === om.pairs.length, `${fm.length - dm.length}/${om.pairs.length} official pairs identical (j2a + j2b)${dm.length ? "; differ: " + dm.slice(0, 5).map(pk).join(", ") : ""}`);
  const ko = rd(path.join(OFF, "q3/k_margins.json")), k10 = rd(path.join(C, "q3/k_margins.json")), kd = ko.filter(r => JSON.stringify(r) !== JSON.stringify(k10.find(x => x.human === r.human)));
  reg("K′ margins 8 bodies", kd.length === 0, `${ko.length - kd.length}/${ko.length} identical; RH1 ${JSON.stringify(marg[RH])}, R0 ${JSON.stringify(marg[R0])}`);
  out.g3 = { E10I2: I2.rows, Kprime: t11 }; }
// ═══ KV6c / timestep / boundary / PY4 / yaw (qualification Q2a / Q2b / Q6b–d / Q7 rules) ═══
{ const kv = (h, s = "") => rd(path.join(C, `q2/kv6c_${h}${s}.json`)), ok6 = (j) => j.pass && !j.fell && j.slipMm <= 0.5 && j.knees.every(k => k.devMax <= 2.0);
  for (const h of SUBJ) { const j = kv(h); row("KV6c", "Q2a", h, ok6(j), `${j.outcome} slip ${j.slipMm.toFixed(3)} mm, |θ−θ0| ${Math.max(...j.knees.map(k => k.devMax)).toFixed(2)}° (from 1 s ${Math.max(...j.knees.map(k => k.devMaxAfter1s)).toFixed(2)}°), flexion ${Math.min(...j.knees.map(k => k.flexMin)).toFixed(1)}–${Math.max(...j.knees.map(k => k.flexMax)).toFixed(1)}°; hard margins (°, tw / sy / sz) ${Object.entries(j.hardMarginDeg).map(([n, v]) => `${n} ${v.map(x => (x == null ? "—" : x.toFixed(1))).join("/")}`).join("; ")}`, { hardMarginDeg: j.hardMarginDeg }); }
  { const a = fs.readFileSync(path.join(C, `q2/kv6c_${RH}.json`), "utf8"), b = fs.readFileSync(path.join(C, `q2/kv6c_${RH}_rep2.json`), "utf8"); row("KV6c", "Q2b", RH, a === b, `RH1 run twice: ${a === b ? "byte-identical" : "DIFFERS"} (${a.length} bytes)`); }
  for (const h of SUBJ) { const fb = Math.max(...kv(h).knees.map(k => k.flexMax)); for (const hz of [180, 480]) { const j = rd(path.join(C, `q6/kv6c_${h}_hz${hz}.json`)), f = Math.max(...j.knees.map(k => k.flexMax));
    row("Q6b", `${hz}Hz`, h, ok6(j) && Math.abs(f - fb) <= 1, `${j.outcome} slip ${j.slipMm.toFixed(3)} dev ${Math.max(...j.knees.map(k => k.devMax)).toFixed(2)}° flex max ${f.toFixed(2)}° (240 Hz ${fb.toFixed(2)}°)`); } }
  for (const h of SUBJ) for (const hz of [180, 240, 480]) { const j = rd(path.join(C, `q6/boundary_${h}_hz${hz}.json`)); row("Q6c", `${hz}Hz`, h, !/fell/.test(j.outcome) && j.chatterL === 0 && j.closure.maxPerTickJ <= 0.05, `${j.outcome}, chatter ${j.chatterL}, closure max/tick ${j.closure.maxPerTickJ.toExponential(2)} J, Σ+ ${j.closure.sumPositiveJ.toFixed(3)} J`); }
  for (const h of SUBJ) for (const hz of [180, 480]) { const j = rd(path.join(C, `q6/py4_${h}_hz${hz}.json`)); row("Q6d", `${hz}Hz`, h, ["QUIET", "DECAYING"].includes(j.decay.cls) && j.hipRotWork.net12_20J <= 0.5, `${j.outcome} ${j.decay.cls} (ratio ${j.decay.ratio.toExponential(1)}), hip work 12–20 s ${j.hipRotWork.net12_20J.toExponential(1)} J`); }
  for (const h of SUBJ) { const rows = [], flags = []; let okT = true, okA = true, okRun = true;
    for (const sc of ["A", "B"]) { const v = rd(path.join(C, `q7/yaw_${sc}_${h}_v2k.json`)), o = rd(path.join(C, `q7/yaw_${sc}_${h}_old.json`));
      for (const sd of Object.keys(v.sides)) { const p = v.sides[sd].peak, have = ["ground", "ankle", "knee", "hip", "upper", "pelvis"].every(k => Number.isFinite(p[k])), tel = Math.abs(p.ground + p.ankle + p.knee + p.hip - p.pelvis);
        okRun = okRun && have; okT = okT && tel <= 1e-6; if (sc === "A") okA = okA && v.sides[sd].closureMaxDeg <= 0.3; const V = v.sides[sd], O = o.sides[sd] || { outSoftDeg: {}, outHardDeg: {} };
        for (const e of ["ankle", "hip"]) { if (V.outSoftDeg[e] > 0 && !(O.outSoftDeg[e] > 0)) flags.push(`${sc} ${sd}: ${e} leaves its soft range with v2k only`); if (V.outHardDeg[e] > 0 && !(O.outHardDeg[e] > 0)) flags.push(`${sc} ${sd}: ${e} beyond hard with v2k only`); }
        if (V.outSoftDeg.knee > 0) flags.push(`${sc} ${sd}: knee leaves its v2k zero-torque range`); if (V.slipMaxMm > 0.5) flags.push(`${sc} ${sd}: ground slip ${V.slipMaxMm.toFixed(2)} mm`); if (V.footYawMaxDeg > 0.5) flags.push(`${sc} ${sd}: foot yaw ${V.footYawMaxDeg.toFixed(2)}°`);
        rows.push({ sc, sd, peak: p, closureMaxDeg: V.closureMaxDeg, tel }); } }
    row("Q7", "yaw", h, okRun && okT && okA && flags.length === 0, `${rows.length} stance-leg decompositions; telescoping max ${mx(rows.map(r => r.tel)).toExponential(1)}°; A closure max ${mx(rows.filter(r => r.sc === "A").map(r => r.closureMaxDeg)).toFixed(3)}° (≤ 0.3); flags ${flags.join("; ") || "none"}; A pelvis ${rows.filter(r => r.sc === "A").map(r => r.peak.pelvis.toFixed(2)).join("/")}° = ankle ${rows.filter(r => r.sc === "A").map(r => r.peak.ankle.toFixed(2)).join("/")} + knee ${rows.filter(r => r.sc === "A").map(r => r.peak.knee.toFixed(2)).join("/")} + hip ${rows.filter(r => r.sc === "A").map(r => r.peak.hip.toFixed(2)).join("/")}`); }
  // regression: KV6c 8 bodies byte-identical to the official
  const d = Q8.filter(h => fs.readFileSync(path.join(C, `q2/kv6c_${h}.json`), "utf8") !== fs.readFileSync(path.join(OFF, `q2/kv6c_${h}.json`), "utf8")); reg("KV6c 8 bodies", d.length === 0, `${8 - d.length}/8 byte-identical${d.length ? "; differ: " + d.join(", ") : ""}`); }
// ═══ twist battery (frozen evaluators) ═══
{ const PD = path.join(C, "policy"), tmp = path.join(C, "eval_tmp"); fs.mkdirSync(tmp, { recursive: true });
  const src = fs.readFileSync(path.join(P2, "tools/twist_policy_eval.mjs"), "utf8"), subst = src.replace('"V2-REF"', `"${RH}"`).replace('"V1-matched"', `"${R0}"`);
  if (subst === src || (subst.match(new RegExp(RH, "g")) || []).length !== 1) throw new Error("twist evaluator substitution failed");
  fs.writeFileSync(path.join(tmp, "twist_policy_eval_rh1.mjs"), subst);   // scratch copy (the evaluator imports only fs)
  const t1 = execFileSync("node", [path.join(tmp, "twist_policy_eval_rh1.mjs"), PD, path.join(tmp, "twist_rh1.json")], { encoding: "utf8" });
  const t8 = execFileSync("node", [path.join(P2, "tools/twist_policy_eval.mjs"), PD, path.join(tmp, "twist_8.json")], { encoding: "utf8" });
  const ce = execFileSync("node", [path.join(P2, "tools/close_eval.mjs"), `--policy=${PD}`, `--out=${path.join(tmp, "close_policy.json")}`], { encoding: "utf8" });
  fs.writeFileSync(path.join(tmp, "twist_eval.log"), t1 + "\n── frozen 8-body evaluator (regression) ──\n" + t8 + "\n── close_eval --policy ──\n" + ce);
  const T = rd(path.join(tmp, "twist_rh1.json"))["0.13"], CE = rd(path.join(tmp, "close_policy.json")).C1["0.13/ref"], CEc = rd(path.join(tmp, "close_policy.json")).C1["0.13/current"];
  for (const h of SUBJ) { const c = T.ref.per[h], cl = CE[h], need = { C1p: cl.C1p, C1q: c.C1q, C2: c.C2, C3: c.C3, C4: c.C4, C5: c.C5, C6: c.C6, C7p: cl.C7p };
    row("twist", "ref", h, Object.values(need).every(v => v === true), `reference: ${Object.entries(need).map(([k, v]) => `${k.replace("p", "′")} ${v ? "✓" : "✗"}`).join(" ")} (frozen C1 ${c.C1 ? "✓" : "✗"}, C7 ${c.C7 ? "✓" : "✗"}); HO3 ${cl.HO3}; HO1 slip ${cl.HO1slip.map(x => x.toFixed(1)).join("/")} mm`, { crit: { ...c, ...need } });
    const cc = T.current.per[h]; row("twist", "current", h, null, `current (reported): ${Object.entries(cc).map(([k, v]) => `${k} ${v ? "✓" : v === null ? "—" : "✗"}`).join(" ")}; C1′ ${CEc[h].C1p ? "✓" : "✗"}, C7′ ${CEc[h].C7p ? "✓" : "✗"}`); }
  const offP = path.join(OFF, "policy"), files = fs.readdirSync(PD).filter(f => /^r_/.test(f) && Q8.some(h => f.includes(`_${h}_`))), dd = files.filter(f => !fs.existsSync(path.join(offP, f)) || fs.readFileSync(path.join(PD, f), "utf8") !== fs.readFileSync(path.join(offP, f), "utf8"));
  reg("twist battery 8 bodies", dd.length === 0 && files.length === 192, `${files.length - dd.length}/${files.length} r_ files byte-identical to the official (expected 192)${dd.length ? "; differ: " + dd.slice(0, 5).join(", ") : ""}`); }
// ═══ verdict inputs ═══
const gating = out.rows.filter(r => r.body === "RH1" && r.pass !== null), failing = gating.filter(r => !r.pass), regOk = out.regression.every(r => r.pass);
out.summary = { rh1GatingRows: gating.length, rh1Failing: failing.map(r => `${r.item} ${r.id}: ${r.value.slice(0, 200)}`), r0Failing: out.rows.filter(r => r.body === "R0" && r.pass === false).map(r => `${r.item} ${r.id}`), regressionAllSame: regOk };
console.log(`\nRH1 gating rows: ${gating.length - failing.length}/${gating.length} pass${failing.length ? "; FAILING: " + failing.map(r => `${r.item} ${r.id}`).join(", ") : ""}`);
console.log(`R0 failing rows: ${out.summary.r0Failing.join(", ") || "none"}`); console.log(`8-body regression: ${regOk ? "all identical" : "DIFFERENCES (stop rule)"}`);
if (OUTF) fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));

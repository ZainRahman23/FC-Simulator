// ═══ physchar2/tools/e1bclose_eval.mjs — the E1b CLOSING evaluation (e1b_close/E1B_CLOSE_PREREG.md; written before any PSTAR4 run)
// P15 split into two preregistered PHYSICAL classes by T-A's capture verdict at the END OF THE DISTURBANCE (user decision 2026-10-05), never by a run's outcome:
//   t_cls = max(abort, push end) + one tick (the supervisor reads the previous tick's state); class A "in-place recoverable" if T-A's verdict in force at t_cls
//   (the last verdict-log entry at or before t_cls) is "in place", else class B "STEP_REQUIRED".
//   class A gates: E1b-7 (RATE rule maxJumpSmooth off 240 Hz), E1b-8, E1b-9p15, E1b-10, E1b-18, and the landed foot ≤ 10 mm from its anchor at the end
//   class B gates the integrity criteria only (E1b-7, E1b-8, E1b-9p15, E1b-10); E1b-18 / foothold are NOT applied (neither pass nor fail) — recorded as an E2 obligation
// Four-way report: recovered without changing foothold | step required | recovered by stepping (future E2: 0) | fell (+ class-A runs that failed otherwise).
// Non-P15 runs: the frozen e1b_eval (set E) and e1bfix_eval (set X) outputs, P15 runs excluded from them here.
// usage: node tools/e1bclose_eval.mjs --official=<E dir> --ext=<X dir> --e1beval=<e1b_eval.json> --exteval=<ext_eval.json> --config=PSTAR4 [--out=<json>]
import fs from "fs"; import path from "path"; import zlib from "zlib";
import { judge, nm } from "./e1b_eval.mjs";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const OFF = arg("official", ""), EXT = arg("ext", ""), E1B = JSON.parse(fs.readFileSync(arg("e1beval", ""))), XE = JSON.parse(fs.readFileSync(arg("exteval", ""))), CFG = arg("config", "PSTAR4"), OUT = arg("out", "");
const rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), out = { e: {}, x: {}, p15: [], classes: {}, gating: {} };
// 1. set E without P15 (frozen evaluator output): every applicable criterion of every non-P15 run, and E1b-11
const eFail = []; for (const [k, j] of Object.entries(E1B.runs)) { if (k.endsWith("|P15")) continue; for (const [id, c] of Object.entries(j.C)) if (c && !c.pass) eFail.push(`${k} ${nm(id)}`); }   // judge adds only the criteria applicable to the run
if (!(E1B.criteria["E1b-11"] && E1B.criteria["E1b-11"].pass)) eFail.push("E1b-11 determinism");
out.e = { failing: eFail, pass: eFail.length === 0 };
// 2. set X without P15 (frozen extended evaluator output, rate rule passed through)
const xFail = []; for (const [k, x] of Object.entries(XE.runs)) { if (/\|P15\|/.test(k) && x.set !== "X-DET") continue; if (x.set === "X-SENS") continue; if (x.set === "X-DET") { if (!x.pass) xFail.push(k); continue; } if (x.failsGating && x.failsGating.length) xFail.push(`${k} [${x.failsGating.join(", ")}]`); }
for (const k of XE.missing || []) if (!/\|P15\|/.test(k)) xFail.push(k + " (missing)"); if ((XE.unexpected || []).length) xFail.push("unexpected: " + XE.unexpected.join(", "));
out.x = { failing: xFail, pass: xFail.length === 0 };
// 3. every P15 run (E + X)
const files = [...fs.readdirSync(OFF).filter(f => /_P15\.json\.gz$/.test(f)).map(f => path.join(OFF, f)), ...fs.readdirSync(EXT).filter(f => /_P15.*\.json\.gz$/.test(f)).map(f => path.join(EXT, f))];
const pFail = []; for (const f of files) { const r = rd(f), key = `${path.basename(path.dirname(f))}/${path.basename(f)}`, C = r.putDown && r.putDown[0] && r.putDown[0].cap; if (!C || !C.vlog) { pFail.push(`${key}: no T-A record / verdict log`); continue; }
  const dt = 1 / r.cfg.hz, tEnd = r.events.pertT + 0.1, tCls = Math.max(C.t0, tEnd) + dt, vAt = C.vlog.filter(e => e.t <= tCls + 1e-9).pop(), cls = vAt && vAt.v === "in place" ? "A" : "B";
  const j = judge(r, CFG, { hz: Math.round(r.cfg.hz), yawk: r.cfg.footYaw, rateRule: "maxJumpSmooth" }), ok = (id) => !!(j.C[id] && j.C[id].pass), n = r.lifted, A = r.events.anchor, last = r.rows[r.rows.length - 1];
  const dFoot = A ? Math.hypot(last.foot[n].p[0] - A.pos[0], last.foot[n].p[2] - A.pos[2]) * 1000 : null, fell = /fell/.test(r.summary.outcome || "");
  const m = r.stance, lift = r.lcLog[m].some(e => e.t >= C.t0 && e.to === "AIRBORNE"), f0 = r.foot0[m], slip = Math.max(...r.rows.map(x => Math.hypot(x.foot[m].p[0] - f0.pos[0], x.foot[m].p[2] - f0.pos[2]) * 1000));
  const integ = ["E1a-7", "E1a-8", "E1a-9p15", "E1a-10"], gate = cls === "A" ? [...integ, "E1b-18"] : integ, fails = gate.filter(id => !ok(id)); if (cls === "A" && !(dFoot != null && dFoot <= 10)) fails.push("foothold (landed foot > 10 mm from its anchor)");
  const four = cls === "B" ? "step required" : fell ? "fell" : fails.length ? "class A failure (not recovered in place)" : "recovered without changing foothold";
  (out.classes[four] || (out.classes[four] = [])).push(key); if (fails.length) pFail.push(`${key} (class ${cls}): ${fails.map(id => id.startsWith("E1") ? nm(id) : id).join(", ")}`);
  out.p15.push({ key, human: r.human, side: r.side, hz: r.cfg.hz, cls, verdictAtCls: vAt ? vAt.v : null, tCls: tCls - C.t0, finalVerdict: C.verdict, vlog: C.vlog.map(e => ({ t: e.t - C.t0, v: e.v, stage: e.stage })), Tput: C.Tput, TrFinal: C.TrFinal, outcome: r.summary.outcome, fell, stanceLiftOff: lift, stanceSlipMm: slip, landedFromAnchorMm: dFoot, four, failsGating: fails, C: Object.fromEntries(gate.filter(id => id.startsWith("E1")).map(id => [nm(id), j.C[id] ? j.C[id].v : null])) }); }
out.classes["recovered by stepping"] = out.classes["recovered by stepping"] || [];
out.stepRequired = out.p15.filter(x => x.cls === "B").map(x => ({ run: x.key, human: x.human, side: x.side, hz: x.hz, physicalOutcome: x.outcome, stanceLiftOff: x.stanceLiftOff, stanceSlipMm: +x.stanceSlipMm.toFixed(2) }));
out.gating = { E: out.e.pass, X: out.x.pass, P15: pFail.length === 0, p15Failing: pFail, pass: out.e.pass && out.x.pass && pFail.length === 0 };
console.log(`set E (non-P15): ${out.e.pass ? "PASS" : "FAIL " + eFail.join("; ")}\nset X (non-P15): ${out.x.pass ? "PASS" : "FAIL " + xFail.join("; ")}`);
console.log("\nP15 runs: run | class (verdict at t_cls) | final verdict | Tput / Tr | outcome | stance lift-off / slip | landed-from-anchor | four-way");
for (const x of out.p15) console.log(`  ${x.key} | ${x.cls} (${x.verdictAtCls} @ +${x.tCls.toFixed(3)} s) | ${x.finalVerdict} | ${x.Tput.toFixed(3)} / ${x.TrFinal} | ${x.outcome} | ${x.stanceLiftOff ? "LIFT-OFF" : "down"} / ${x.stanceSlipMm.toFixed(2)} mm | ${x.landedFromAnchorMm == null ? "—" : x.landedFromAnchorMm.toFixed(1) + " mm"} | ${x.four}${x.failsGating.length ? "  FAIL: " + x.failsGating.join(", ") : ""}`);
console.log("\nfour-way:"); for (const c of ["recovered without changing foothold", "step required", "recovered by stepping", "fell", "class A failure (not recovered in place)"]) console.log(`  ${c}: ${(out.classes[c] || []).length}`);
console.log(`\nSTEP_REQUIRED (E2 obligations): ${out.stepRequired.map(s => `${s.human} ${s.side} ${s.hz} Hz`).join("; ") || "none"}`);
console.log(`P15 gating: ${pFail.length ? "FAIL " + pFail.join("; ") : "PASS"}\n\nE1b CLOSING EVALUATION: ${out.gating.pass ? "PASS" : "FAIL"}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

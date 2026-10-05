// ═══ physchar2/tools/e1bta_checks.mjs — T-A mechanism checks + the separated P15 reporting (e1b_ta/E1B_TA_PREREG.md §4; written before any PSTAR3 run)
// Reads every E1b run in the given directories that has an abort with a T-A record (putDown[].cap). Per run:
//   TA-1 authority: the landed foot gets NO support / load before sustained measured contact — s = 0 and its load share = 0 on every tick from the abort until its
//        LOAD_ACCEPT entry, and the sensed contact (touching pieces > 0) holds on every tick of the acceptDebounce window that precedes the entry
//   TA-2 rule: the planned descent Tput ∈ [TputMin, Tbw], the final ramp Tr ∈ [TrMin, TrMax], re-plans only shorten the remaining descent, a verdict is recorded
//   TA-3 P15 class (reported): "recovered without changing foothold" (verdict in place, E1b-18 pass, landed foot ≤ 10 mm from its anchor) | "step required"
//        (verdict step required at the abort or later; physical outcome reported) | "recovered by stepping" (future E2: none exists) | "fell" (verdict in place, E1b-18 fail)
//   TA-4 engagement: every P15 run carries a T-A record
// usage: node tools/e1bta_checks.mjs --dirs=<dir1,dir2,…> [--out=<json>]
import fs from "fs"; import path from "path"; import zlib from "zlib";
import { judge } from "./e1b_eval.mjs"; import { TA } from "../ctrl/v2_capture.js";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const DIRS = arg("dirs", "").split(",").filter(Boolean), OUT = arg("out", ""), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), ACC_DB = 0.05;
const out = { runs: [], classes: {}, gating: {} }, bad = { TA1: [], TA2: [], TA4: [] };
for (const D of DIRS) for (const f of fs.readdirSync(D).filter(f => f.endsWith(".json.gz"))) { const r = rd(path.join(D, f)); if (!r.rows || !r.rows.length) continue;
  const isP15 = r.pert === "P15", logs = r.putDown || [], caps = logs.filter(l => l.cap), key = `${path.basename(D)}/${f}`;
  // non-protocol lifts (e.g. the declared 10 mm smoke) are checked for TA-1/2 only (erratum E1bTA-e1: this comment was mid-line and swallowed the next statement)
  if (isP15 && r.isE1b && !caps.length) { bad.TA4.push(key); continue; } if (!caps.length) continue;
  const C = caps[0].cap, n = C.n, ab = C.t0, R = r.rows, dt = 1 / r.cfg.hz, acc = R.find(x => x.t >= ab - 1e-9 && (x.st[n] === "LOAD_ACCEPT" || x.st[n] === "SUPPORT"));
  // TA-1 (a row's sensed contact is that tick's lifecycle input; the debounce counts the ticks after the TOUCHDOWN entry up to and including the LOAD_ACCEPT entry)
  const pre = R.filter(x => x.t >= ab - 1e-9 && (!acc || x.t < acc.t - 1e-9)), leak = pre.filter(x => x.s[n] > 0 || (x.share && x.share[n] > 1e-9)), win = acc ? R.filter(x => x.t >= acc.t - ACC_DB + dt - 1e-9 && x.t <= acc.t + 1e-9) : [], noContact = win.filter(x => !(x.touch[n] > 0));
  const ta1 = leak.length === 0 && (!acc || noContact.length === 0); if (!ta1) bad.TA1.push(`${key}: ${leak.length} pre-acceptance ticks with s / share > 0; ${noContact.length} debounce-window ticks without measured contact`);
  // TA-2
  const replOk = C.replans.every(p => p.remNew <= p.rem + 1e-9), ta2 = C.Tput >= TA.TputMin - 1e-9 && C.Tput <= C.Tbw + 1e-9 && C.TrFinal != null && C.TrFinal >= TA.TrMin - 1e-9 && C.TrFinal <= TA.TrMax + 1e-9 && replOk && !!C.verdict;
  if (!ta2) bad.TA2.push(`${key}: Tput ${C.Tput}, TrFinal ${C.TrFinal}, replans ok ${replOk}, verdict ${C.verdict}`);
  // TA-3 (P15 only)
  let cls = null; if (isP15 && r.isE1b) { const j = judge(r, r.cfg.config, { hz: Math.round(r.cfg.hz), yawk: r.cfg.footYaw }), pass18 = !!(j.C["E1b-18"] && j.C["E1b-18"].pass), A = r.events.anchor, last = R[R.length - 1], dFoot = A ? Math.hypot(last.foot[n].p[0] - A.pos[0], last.foot[n].p[2] - A.pos[2]) * 1000 : null;
    cls = C.verdict !== "in place" ? "step required" : pass18 && dFoot != null && dFoot <= 10 ? "recovered without changing foothold" : "fell";
    (out.classes[cls] || (out.classes[cls] = [])).push(key); }
  out.runs.push({ key, human: r.human, side: r.side, pert: r.pert, hz: r.cfg.hz, verdict0: C.verdict0, verdict: C.verdict, k: C.k, Tput: C.Tput, TrFinal: C.TrFinal, replans: C.replans.length, contactAfter: C.tContact != null ? C.tContact - ab : null, acceptAfter: C.tAccept != null ? C.tAccept - ab : null, ta1, ta2, p15class: cls, outcome: r.summary.outcome }); }
out.classes["recovered by stepping"] = out.classes["recovered by stepping"] || [];   // future E2: no stepping exists in E1b
out.gating = { TA1: bad.TA1, TA2: bad.TA2, TA4: bad.TA4, pass: !bad.TA1.length && !bad.TA2.length && !bad.TA4.length };
console.log("run | verdict (abort → final) | k | Tput | Tr | replans | contact / accept after abort | P15 class | outcome");
for (const x of out.runs) console.log(`  ${x.key} | ${x.verdict0} → ${x.verdict} | ${x.k.toFixed(2)} | ${x.Tput.toFixed(3)} | ${x.TrFinal == null ? "—" : x.TrFinal.toFixed(3)} | ${x.replans} | ${x.contactAfter == null ? "—" : x.contactAfter.toFixed(3)} / ${x.acceptAfter == null ? "—" : x.acceptAfter.toFixed(3)} | ${x.p15class ?? "—"} | ${x.outcome}`);
console.log("\nP15 classes:"); for (const c of ["recovered without changing foothold", "step required", "recovered by stepping", "fell"]) console.log(`  ${c}: ${(out.classes[c] || []).length}`);
console.log(`\nTA-1 authority: ${bad.TA1.length ? "FAIL " + bad.TA1.join("; ") : "PASS"}\nTA-2 rule bounds: ${bad.TA2.length ? "FAIL " + bad.TA2.join("; ") : "PASS"}\nTA-4 engagement: ${bad.TA4.length ? "FAIL " + bad.TA4.join("; ") : "PASS"}\nT-A CHECKS: ${out.gating.pass ? "PASS" : "FAIL"}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

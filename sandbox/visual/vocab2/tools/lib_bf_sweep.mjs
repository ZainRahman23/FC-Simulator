// lib_bf_sweep.mjs — DRIBBLING VOCABULARY INTEGRATION: the authoritative BODY FEINT requested from ordinary play by the right-footed sandbox
// player (no foot hint): both directions (fake left → exit right, fake right → exit left), the exit angle × the stride phase at the request (the
// run-up), at a walk / jog / run. Judged on the APPROVED feint's own standard (review_artifacts/body_feint_v2_ef/evidence/feint_integrity.txt):
// PLAYED one of BFEINT_L / J / R; v_extreme's classes from 0.3 s before the request (an entry in transition: from the request — the body
// before it is the ordinary carry's, identical without the request; a JOG → WALK braking float at +0.65 s is there with no request at all): 0 normal-visible, 0 slow-motion apart from the feint's two
// accepted slow-motion floats; the free foot (feint_foot.mjs, the approved tool) no toe turn > 900 °/s and ≤ 5 cm per tick; the exit contact on
// the OUTSIDE; 0 missed contacts. The motion is the approved one (lib_repro.mjs) — this measures where the resolver lets it enter.
//   node lib_bf_sweep.mjs [--json f]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const base = new URL(arg("build", "../"), import.meta.url);
const { makeSim, ENV, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base));
const { PlayBody } = await import(new URL("u_body.js", base)); const X = await import(new URL("tools/v_extreme.mjs", base)); const meta = await import(new URL("v_meta.js", base));
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const { footTool } = await import("./feint_foot.mjs"); const FT = await footTool(arg("build", "../"));
// (--twin: the left-footed twin instead (the approved mirror's player); --transitions: the entry speed swept — the run-up in `from`, then `to` from
// t = 0 with the stick straight, the request d s later)
const PREF = process.argv.includes("--twin") ? "L" : "R";
function one(mode, exitRight, ang, runup, from = null, d = 0) { const c = { tech: "BODY_FEINT", variant: "SWEEP", mode: from || mode, pref: PREF, ang: exitRight ? ang : -ang, runup, dur: 2.6 + d, pre: 1.1, def: null, intents: [{ t: d, id: "BODY_FEINT", foot: null }] };
  if (from) c.stick = [[0, 0, mode], [d, c.ang, mode]];
  const sim = makeSim("TL", Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })); sim.intentOf = meta.intentOf; const r = runCaseOn(sim, c, false), t0 = r.t0, body = new PlayBody(env, sim);
  const sk = (sim.log.skill || []).find((x) => x.intent === "BODY_FEINT"), o = { mode, exitRight, ang, runup, from, d, vReq: +sim.stateAt(t0 + d).s.toFixed(2), played: sk ? sk.result + (sk.played ? " " + sk.played : "") : "—", ok: false, why: [] };
  if (!sk || sk.result !== "PLAYED" || !/^BFEINT_[LJR]$/.test(sk.played || "")) { o.why.push(sk ? `${sk.result}${sk.played ? " " + sk.played : ""}${sk.rej && Object.keys(sk.rej).length ? " (" + Object.entries(sk.rej).sort((a, b) => b[1] - a[1])[0][0] + ")" : ""}` : "no outcome"); return o; }
  const m = X.measure(sim, Math.round(Math.max(0, t0 + d - (from ? 0 : 0.3)) / DT), 0), bad = Object.entries(m.kinds).filter(([k, n]) => n > 0 && !k.endsWith("·diag") && !(k === "FLOAT·slow" && n <= 2));
  if (bad.length) o.why.push("integrity " + bad.map(([k, n]) => k + "×" + n).join(" ")); o.floatsSlow = m.kinds["FLOAT·slow"] || 0;
  const ft = FT.footRun(c, false), ph = ft.phases, mx = (k) => Math.max(...Object.values(ph).map((x) => x[k])), toe = mx("toeRate"), step = mx("stepCm");
  if (toe > 900) o.why.push(`toe ${toe.toFixed(0)}°/s`); if (step > 5.0) o.why.push(`step ${step.toFixed(1)} cm/tick`); if (ft.surface !== "OUTSIDE") o.why.push(`exit contact ${ft.surface}`); const missed = sim.contacts.filter((x) => x.t > t0 && x.missed).length; if (missed) o.why.push(`${missed} missed`);
  o.tPlayed = sk.tPlayed != null ? +(sk.tPlayed - t0 - d).toFixed(3) : null; o.toe = Math.round(toe); o.ok = o.why.length === 0; return o; }
const out = [], RUN = (arg("runups") || "2.2,2.3,2.4,2.5,2.6,2.7,2.8,2.9").split(",").map(Number), ANG = (arg("angles") || "15,30,45,60,75,90").split(",").map(Number);
if (arg("modes") !== "none") for (const mode of (arg("modes") || "WALK,JOG,RUN").split(",")) for (const exitRight of [true, false]) for (const ang of ANG) for (const runup of RUN) out.push(one(mode, exitRight, ang, runup));
console.log(`■ BODY FEINT from ordinary play (the ${PREF === "R" ? "right" : "left"}-footed player, no foot hint) — rows: mode · direction · the exit angle; columns: the run-up ${RUN.join(" ")}; ✓ every check passes · = declined · ✗ played but failed`);
for (const mode of [...new Set(out.map((x) => x.mode))]) for (const exitRight of [true, false]) for (const ang of ANG) { const r = out.filter((x) => x.mode === mode && x.exitRight === exitRight && x.ang === ang);
  const fails = [...new Set(r.filter((x) => !x.ok).map((x) => x.why.join("; ")))].slice(0, 2).join(" | ");
  console.log(`  ${mode.padEnd(4)} ${exitRight ? "fake L → exit R" : "fake R → exit L"} ${String(ang).padStart(2)}°  ${r.map((x) => (x.ok ? "✓" : x.played.startsWith("PLAYED") ? "✗" : "·")).join(" ")}   ${fails}`); }
const lat = out.filter((x) => x.ok && x.tPlayed != null).map((x) => x.tPlayed).sort((a, b) => a - b); if (lat.length) console.log(`  request → its exit touch: median ${lat[lat.length >> 1].toFixed(3)} s · max ${lat[lat.length - 1].toFixed(3)} s`);
if (process.argv.includes("--transitions")) { const T = [], DS = (arg("delays") || "0.1,0.2,0.3,0.45,0.6,0.8,1.0").split(",").map(Number), TR = (arg("trans") || "WALK>JOG,JOG>WALK,JOG>RUN,RUN>JOG").split(",").map((x) => x.split(">"));
  const TA = { WALK: [45, 55], JOG: [35, 55], RUN: [30, 40] };
  for (const [from, to] of TR) for (const d of DS) for (const ang of TA[to]) for (const ru of [2.3, 2.6]) T.push(one(to, PREF === "R", ang, ru, from, d));
  console.log(`■ ENTRY IN TRANSITION (from → to; the request d s after the switch; inside the destination's band — walk 45 / 55°, jog 35 / 55°, run 30 / 40°; run-ups 2.3 / 2.6; the carrying foot's direction)`);
  for (const [from, to] of TR) for (const d of DS) { const r = T.filter((x) => x.from === from && x.mode === to && x.d === d); console.log(`  ${from} → ${to} +${d.toFixed(2)} s · ${r.map((x) => x.vReq.toFixed(1)).join("/")} m/s · ${r.map((x) => (x.ok ? "✓" : x.played.startsWith("PLAYED") ? "✗" : "·")).join(" ")}   ${[...new Set(r.filter((x) => !x.ok).map((x) => x.played + " " + x.why.join("; ")))].slice(0, 2).join(" | ").slice(0, 160)}`); }
  out.push(...T); }
console.log(`■ ${out.filter((x) => x.ok).length} / ${out.length} pass · played but failed ${out.filter((x) => !x.ok && x.played.startsWith("PLAYED")).length} · declined ${out.filter((x) => !x.played.startsWith("PLAYED")).length}`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

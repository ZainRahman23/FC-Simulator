// lib_croq_sweep.mjs — DRIBBLING VOCABULARY INTEGRATION: where does LEG-WAVE V4 hold? The CROQUETA request from a jog swept over the request
// angle × the stride phase at the request (the run-up) × the side (the right foot's ball to the left, its mirror), with and without a foot hint
// (ordinary play has none). Each run is judged on the approved motion's own criteria:
//   PLAYED     the request plays CROQ_LW (else: what the resolver said)
//   INTEGRITY  v_extreme's classes from 0.3 s before the request to its end: 0 slides / jumps / crossings / knee pops / floats / swaps (normal
//              or slow-motion); no toe turn > 900 °/s in the croqueta (touch 1 − 0.3 s … receive + 0.4 s); contact gaps ≥ −2.0 cm
//   THE WAVE   (lw_geom) the receiving foot never ahead of the ball before the receive (≤ 0.025 m, the body's frame); its forward velocity ≤ 9 m/s;
//              the two legs through vertical within 20 ms of each other; `/ /` reached (the wave ≤ −8° at L4)
//   THE BALL   across and back from touch 1 to the receive (its forward component < 0)
//   node lib_croq_sweep.mjs [--build ../] [--json f]
import fs from "node:fs";
import { lwGeom } from "../lw_geom.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const base = new URL(arg("build", "../"), import.meta.url);
const { makeSim, ENV, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base));
const { PlayBody } = await import(new URL("u_body.js", base)); const X = await import(new URL("tools/v_extreme.mjs", base)); const meta = await import(new URL("v_meta.js", base));
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const W = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// (--pref R|L: one player for both directions — the right-footed player asked for the croqueta to its right (the ball on its right foot) is the
// cross case; by default each direction is played by the player whose ball-side foot it is)
const PREF = arg("pref", null);
function one(side, ang, runup, hint, from = null, d = 0) { const R = side === "R", c = { tech: "CROQUETA", variant: "SWEEP", mode: from || "JOG", ang: R ? -ang : ang, runup, dur: 2.6 + d, pre: 1.1, def: null, foot: PREF || (R ? "R" : "L"), pref: PREF || (R ? "R" : "L"),
    intents: [{ t: d, id: "CROQUETA", foot: hint ? (R ? "R" : "L") : null }] };
  // (an entry in transition: the run-up in `from`, then JOG from t = 0 with the stick straight, the request at t = d with the stick at its angle)
  if (from) c.stick = [[0, 0, "JOG"], [d, c.ang, "JOG"]];
  const sim = makeSim("TL", Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })); sim.intentOf = meta.intentOf; const r = runCaseOn(sim, c, false), t0 = r.t0, body = new PlayBody(env, sim);
  // (the instance's ball point at touch 1 from its origin, in its entry frame: ahead, out toward the touching foot)
  const csq = sim.contacts.filter((x) => x.t > t0 - 1e-9 && /croq/i.test(x.role || "")), aq = csq.length ? sim.planAt(csq[0].t - 0.01).action : null;
  const bo = aq && aq.B && aq.O ? (() => { const dx = aq.B[0] - aq.O[0], dy = aq.B[1] - aq.O[1], c0 = Math.cos(aq.h0), s0 = Math.sin(aq.h0); return [+(dx * c0 + dy * s0).toFixed(3), +(aq.m * (-dx * s0 + dy * c0) * -1).toFixed(3)]; })() : null;
  const vReq = sim.stateAt(t0 + d).s, sk = (sim.log.skill || []).find((x) => x.intent === "CROQUETA"), played = sk ? sk.result + (sk.played ? " " + sk.played : "") : "—", o = { side, ang, runup, hint, from, d, vReq: +vReq.toFixed(2), bo, played, ok: false, why: [] };
  if (!sk || sk.result !== "PLAYED" || sk.played !== "CROQ_LW") { o.why.push(sk ? `${sk.result}${sk.played ? " " + sk.played : ""}${sk.rej && Object.keys(sk.rej).length ? " (" + Object.entries(sk.rej).sort((a, b) => b[1] - a[1])[0][0] + ")" : ""}` : "no outcome"); return o; }
  // (V4's own hop — the receiving foot off at +0.02, the touching foot down at +0.10: ≈ 0.08 s in the air, the approved unweighting — sits on the
  // classifier's slow-motion float line (0.08 s below 3 m/s): a float of ≤ 0.10 s inside the croqueta is that hop, recorded, not a failure)
  const m = X.measure(sim, Math.round(Math.max(0, t0 + d - (from ? 0 : 0.3)) / DT), 1), k0 = Math.max(0, t0 + d - (from ? 0 : 0.3));   // (in transition: from the request — before it, the ordinary carry, identical without it)
  const evs = (m.F || []).filter((q) => q.lvl !== "diag"), hop = evs.filter((q) => q.kind === "FLOAT" && q.lvl === "slow" && q.air <= 0.10), real = evs.filter((q) => !hop.includes(q));
  o.hop = hop.length ? +Math.max(...hop.map((q) => q.air)).toFixed(3) : 0; if (real.length) o.why.push("integrity " + Object.entries(real.reduce((a, q) => ((a[q.kind + "·" + q.lvl] = (a[q.kind + "·" + q.lvl] || 0) + 1), a), {})).map(([k, n]) => k + "×" + n).join(" "));
  const g = lwGeom(sim, body, t0 + d, c.ang, DT); if (!g) { o.why.push("no wave"); return o; }
  let toe = 0, prev = null; for (let t = g.tF - 0.3; t <= g.tR + 0.4; t += DT) { const J = body.pose(t).J, ty = {}; for (const F of ["R", "L"]) { const dx = J["toe_" + F].j[0] - J["foot_" + F].j[0], dy = J["toe_" + F].j[1] - J["foot_" + F].j[1]; ty[F] = Math.hypot(dx, dy) >= 0.10 ? Math.atan2(dy, dx) : null; }
    if (prev) for (const F of ["R", "L"]) if (ty[F] != null && prev[F] != null) toe = Math.max(toe, Math.abs(W(ty[F] - prev[F])) / DT * 57.2958); prev = ty; }
  if (toe > 900) o.why.push(`toe ${toe.toFixed(0)}°/s`);
  const gaps = sim.contacts.filter((x) => x.t >= g.tF - 1e-9 && x.t <= g.tR + 1e-9 && !x.missed).map((x) => { const p = body.pose(x.t); return p.gap != null ? p.gap : null; }).filter((x) => x != null);
  const cr = (k) => { const q = g.rows.find((r) => r.t > g.landmarks.L1 && r[k].wave <= 0); return q ? q.t : null; }, tRx = cr("F"), tLx = cr("S"), lag = tRx != null && tLx != null ? Math.abs(tRx - tLx) : null;
  // (the ball's path from touch 1 to the receive, along the entry — the same span as the X-shape report)
  const at = (x) => g.rows.reduce((b, q) => (Math.abs(q.t - x) < Math.abs(b.t - x) ? q : b), g.rows[0]), L4 = g.at.L4 ? g.at.L4.wave : null, bf = at(g.tR - g.tF).ball.f - at(0).ball.f;
  if (g.cont.aheadP > 0.025) o.why.push(`ahead of the ball ${g.cont.aheadP.toFixed(2)} m`); if (g.cont.fwdV > 9) o.why.push(`forward ${g.cont.fwdV.toFixed(1)} m/s`);
  if (lag == null || lag > 0.020) o.why.push(`legs ${lag == null ? "never cross" : (lag * 1000).toFixed(0) + " ms apart"}`); if (L4 == null || L4 > -8) o.why.push(`L4 wave ${L4 == null ? "—" : L4.toFixed(0) + "°"}`);
  if (bf == null || bf >= 0) o.why.push("ball not back");
  Object.assign(o, { touch: +(g.tF - t0).toFixed(3), fwdV: +g.cont.fwdV.toFixed(1), ahead: +g.cont.aheadP.toFixed(2), lagMs: lag == null ? null : Math.round(lag * 1000), L4: L4 == null ? null : Math.round(L4), toe: Math.round(toe), ok: o.why.length === 0 }); return o; }
const out = []; const ANG = (arg("angles") || "15,20,25,30,35,40,45,50,55,60,70,80").split(",").map(Number), RUN = arg("runups") ? arg("runups").split(",").map(Number) : [2.2, 2.25, 2.3, 2.35, 2.4, 2.45, 2.5, 2.55, 2.6], SIDES = (arg("sides") || "R,L").split(",");
const HINTS = arg("hints") === "none" ? [false] : [true, false];
for (const hint of HINTS) for (const side of SIDES) for (const ang of ANG) for (const runup of RUN) out.push(one(side, ang, runup, hint));
for (const hint of HINTS) { console.log(`\n■ foot hint: ${hint ? "the case's foot" : "none (ordinary play)"} — rows: the request angle; columns: the run-up (stride phase) ${RUN.join(" ")}; ✓ = every check passes, · = declined, ✗ = played but failed a check`);
  for (const side of SIDES) { console.log(`  ${side === "R" ? "the right foot's ball → LEFT" : "the left foot's ball → RIGHT"}`);
    for (const ang of ANG) { const row = RUN.map((ru) => { const o = out.find((x) => x.hint === hint && x.side === side && x.ang === ang && x.runup === ru); return o.ok ? "✓" : o.played.startsWith("PLAYED CROQ_LW") ? "✗" : "·"; }).join(" ");
      const fails = out.filter((x) => x.hint === hint && x.side === side && x.ang === ang && !x.ok).map((x) => x.why.join("; ")); const top = Object.entries(fails.reduce((m, f) => ((m[f] = (m[f] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([f, n]) => `${f} ×${n}`).join(" | ");
      console.log(`    ${String(ang).padStart(2)}°  ${row}   ${top}`); } } }
const pass = out.filter((x) => x.ok); console.log(`\n■ ${pass.length} / ${out.length} pass · played but failed: ${out.filter((x) => !x.ok && x.played.startsWith("PLAYED CROQ_LW")).length} · declined: ${out.filter((x) => !x.played.startsWith("PLAYED CROQ_LW")).length}`);
// (--transitions: the entry speed swept instead — a walk accelerating into the jog, a run slowing into it — the request d s after the switch, at
// the validated angles)
if (process.argv.includes("--transitions")) { const T = []; const DS = (arg("delays") || "0.1,0.2,0.3,0.45,0.6,0.8,1.0,1.3").split(",").map(Number), FR = (arg("from") || "WALK,RUN").split(",");
  for (const from of FR) for (const d of DS) for (const ang of [40, 44]) for (const side of ["R", "L"]) T.push(one(side, ang, 2.4, false, from, d));
  console.log(`\n■ ENTRY IN TRANSITION (into a jog from a walk / a run; the request d s after the switch; 40° and 44°, both sides)`);
  for (const from of FR) for (const d of DS) { const r = T.filter((x) => x.from === from && x.d === d); console.log(`  ${from} → JOG +${d.toFixed(2)} s · speed at the request ${r[0].vReq.toFixed(2)} m/s · ${r.map((x) => (x.ok ? "✓" : x.played.startsWith("PLAYED CROQ_LW") ? "✗" : "·")).join(" ")}   ${[...new Set(r.filter((x) => !x.ok).map((x) => x.why.join("; ")))].slice(0, 2).join(" | ")}`); }
  out.push(...T); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

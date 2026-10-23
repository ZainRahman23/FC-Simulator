// lib_chain_probe.mjs — DRIBBLING VOCABULARY INTEGRATION: CONTROL RETURN and chain timing. The integrated move is requested from an ordinary
// jog (the right-footed player, no foot hint, no defender); a follow-up is requested t2 s later — an ordinary cut (the stick alone, B4), a
// carry on (the stick held), or a technique request (CROQUETA, CRUYFF, BODY_FEINT, …) — swept over t2. For each run:
//   the first move's outcome and its decisive / last own contact; the follow-up's outcome, when it was ENTERED and its first contact;
//   integrity (v_extreme, from the first request − 0.3 s to the end: normal-visible / slow-motion events); possession (CONTROLLED → FREE exits,
//   missed contacts, the widest ball–body separation).
// CONTROL RETURN = the earliest follow-up whose request is entered (its first contact made), clean, possession kept — measured from the
// first move's last own contact (its exit / receive touch).
//   node lib_chain_probe.mjs --first BODY_FEINT --a1 45 --follow cut --a2 -50 [--t2 0.6,0.7,…] [--mode JOG] [--twin] [--json f]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const base = new URL(arg("build", "../"), import.meta.url);
const { makeSim, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { caseOpts, runCaseOn, summarize } = await import(new URL("v_run.js", base));
const X = await import(new URL("tools/v_extreme.mjs", base)); const meta = await import(new URL("v_meta.js", base));
const FIRST = arg("first", "BODY_FEINT"), A1 = +arg("a1", 45), FOL = arg("follow", "cut"), A2 = +arg("a2", -50), MODE = arg("mode", "JOG"), RU = +arg("runup", 2.4), PREF = process.argv.includes("--twin") ? "L" : "R";
const T2 = (arg("t2") || "0.6,0.7,0.8,0.9,1.0,1.1,1.2,1.3,1.4,1.5,1.6,1.8,2.0").split(",").map(Number);
export function chainCase(first, a1, fol, a2, t2, mode = "JOG", runup = 2.4, pref = "R") { const s = pref === "R" ? 1 : -1, abs2 = a1 + a2;
  const c = { tech: "CHAIN", variant: "PROBE", mode, pref, ang: s * a1, runup, dur: t2 + 2.4, pre: 1.0, def: null, stick: [[0, s * a1, mode], [t2, s * (fol === "carry" ? a1 : abs2), mode]], intents: [{ t: 0, id: first, foot: null }] };
  if (fol !== "cut" && fol !== "carry") c.intents.push({ t: t2, id: fol, foot: null }); return c; }
export function runChain(c) { const sim = makeSim("TL", Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })); sim.intentOf = meta.intentOf; const r = runCaseOn(sim, c, false), t0 = r.t0, S = summarize(sim, t0);
  const sk = sim.log.skill || [], s1 = sk.find((x) => Math.abs(x.t - t0) < 1e-6), t2 = c.stick[1][0], s2 = sk.find((x) => Math.abs(x.t - t0 - t2) < 1e-6);
  const own1 = s1 && s1.result === "PLAYED" ? sim.contacts.filter((x) => !x.missed && x.t > t0 - 1e-9 && sim.planAt(x.t - 1e-4).action && sim.planAt(x.t - 1e-4).action.id === s1.aid) : [];
  const last1 = own1.length ? own1[own1.length - 1].t - t0 : null, dec1 = s1 && s1.tPlayed != null ? s1.tPlayed - t0 : null;
  // (the follow-up's start: a requested technique — its ENTERED time and its first own contact; an ordinary cut — the first contact after t2
  // whose action is not the first move's and turns the ball ≥ 15° toward the new stick)
  let f = null;
  if (s2) { const own2 = s2.result === "PLAYED" ? sim.contacts.filter((x) => !x.missed && x.t > t0 + t2 - 1e-9 && sim.planAt(x.t - 1e-4).action && sim.planAt(x.t - 1e-4).action.id === s2.aid) : [];
    f = { result: s2.result, played: s2.played || null, entered: s2.tEntered != null ? +(s2.tEntered - t0).toFixed(3) : null, first: own2.length ? +(own2[0].t - t0).toFixed(3) : null, rej: s2.rej }; }
  else if (c.intents.length === 1) { const hT = Math.atan2(Math.sin(c.stick[1][1] * Math.PI / 180), Math.cos(c.stick[1][1] * Math.PI / 180));
    const cx = sim.contacts.filter((x) => !x.missed && x.t > t0 + t2 - 1e-9).find((x) => { const a = sim.planAt(x.t - 1e-4).action; if (!a || (s1 && a.id === s1.aid)) return false; const b = sim.ballTrack(x.t + 0.05), v = b.v; return Math.hypot(v[0], v[1]) > 0.5 && Math.abs(Math.atan2(Math.sin(Math.atan2(v[1], v[0]) - hT), Math.cos(Math.atan2(v[1], v[0]) - hT))) < 25 * Math.PI / 180; });
    f = { result: "STICK", played: cx ? (sim.planAt(cx.t - 1e-4).action.label || "") : null, entered: null, first: cx ? +(cx.t - t0).toFixed(3) : null }; }
  const m = X.measure(sim, Math.round(Math.max(0, t0 - 0.3) / DT), 0), bad = Object.entries(m.kinds).filter(([k, n]) => n > 0 && !k.endsWith("·diag"));
  // (the two moves' own accepted slow-motion floats: the feint's ≤ 2, V4's hop ≤ 0.10 s — v_extreme's classes are reported as they are)
  return { sim, t0, s1: s1 ? { result: s1.result, played: s1.played || null, rej: s1.rej } : null, dec1, last1: last1 != null ? +last1.toFixed(3) : null, f, kinds: Object.fromEntries(bad), normal: m.N.normal, slow: m.N.slow, exits: S.exits, missed: S.missed, sepMax: +S.sepMax.toFixed(2) }; }
if (import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) {
  const out = []; console.log(`■ ${FIRST} ${A1}° (${MODE}, the ${PREF === "R" ? "right" : "left"}-footed player) → ${FOL}${FOL === "carry" ? "" : " " + (A2 >= 0 ? "+" : "") + A2 + "° from its exit"} at t2`);
  for (const t2 of T2) { const R = runChain(chainCase(FIRST, A1, FOL, A2, t2, MODE, RU, PREF)); delete R.sim; out.push(Object.assign({ t2 }, R));
    const ok = R.s1 && R.s1.result === "PLAYED" && R.f && R.f.first != null && R.normal === 0 && !R.exits.length && !R.missed;
    console.log(`  t2 ${t2.toFixed(2)} · first ${R.s1 ? R.s1.result + " " + (R.s1.played || "") : "—"} (decisive ${R.dec1 != null ? R.dec1.toFixed(2) : "—"}, last own ${R.last1 != null ? R.last1.toFixed(2) : "—"}) · follow-up ${R.f ? R.f.result + " " + (R.f.played || "") : "—"}${R.f && R.f.entered != null ? " entered " + R.f.entered.toFixed(2) : ""}${R.f && R.f.first != null ? " first contact " + R.f.first.toFixed(2) + (R.last1 != null ? ` (+${(R.f.first - R.last1).toFixed(2)} after the move)` : "") : ""}${R.f && R.f.result === "REJECTED" ? " (" + Object.entries(R.f.rej || {}).sort((a, b) => b[1] - a[1]).map(([k]) => k).filter((k) => !/wrong side/.test(k))[0] + ")" : ""} · body ${R.normal}/${R.slow}${Object.keys(R.kinds).length ? " " + JSON.stringify(R.kinds) : ""} · exits ${R.exits.length} missed ${R.missed} sep ${R.sepMax} ${ok ? "✓" : ""}`); }
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1)); }

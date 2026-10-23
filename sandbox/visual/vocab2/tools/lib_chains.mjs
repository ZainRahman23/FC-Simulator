// lib_chains.mjs — DRIBBLING VOCABULARY INTEGRATION: the curated chains of the two integrated moves (v_cases.js VI_CHAINS), each as written (the
// right-footed player) and mirrored (the left-footed twin): every request's outcome, each technique phase (its decisive contact, the planner's
// control release, the next action's start), the body (v_extreme: normal-visible / slow-motion events over the whole chain), possession
// (CONTROLLED → FREE exits, missed contacts, the widest ball–body separation) and determinism (each chain run twice: every contact and the final
// state identical).
//   node lib_chains.mjs [--json f]
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const base = new URL(arg("build", "../"), import.meta.url);
const { makeSim, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { caseOpts, runCaseOn, summarize } = await import(new URL("v_run.js", base));
const X = await import(new URL("tools/v_extreme.mjs", base)); const meta = await import(new URL("v_meta.js", base)); const { VI_CHAINS } = await import(new URL("v_cases.js", base));
function run(c, mirror) { const sim = makeSim("TL", Object.assign(caseOpts(c, mirror), { layers: presetLayers("FULL") })); sim.intentOf = meta.intentOf; const r = runCaseOn(sim, c, mirror), t0 = r.t0, S = summarize(sim, t0);
  const m = X.measure(sim, Math.round(Math.max(0, t0 - 0.3) / DT), 0), sig = JSON.stringify([sim.contacts.map((x) => [x.t.toFixed(6), x.F, x.surface, !!x.missed]), sim.stateAt(sim.t).P.map((v) => v.toFixed(9)), sim.ball.p.map((v) => v.toFixed(9))]);
  return { S, kinds: Object.fromEntries(Object.entries(m.kinds).filter(([k, n]) => n > 0 && !k.endsWith("·diag"))), normal: m.N.normal, slow: m.N.slow, sig }; }
const out = [];
for (const c of VI_CHAINS) for (const mirror of [false, true]) { const a = run(c, mirror), b = run(c, mirror), S = a.S;
  const o = { name: (mirror ? "MIRROR · " : "") + c.name, skills: S.skills.map((x) => ({ intent: x.intent, result: x.result, played: x.played || null, t: +x.t.toFixed(3), tPlayed: x.tPlayed != null ? +x.tPlayed.toFixed(3) : null })),
    phases: S.phases.filter((p) => p.tDecisive != null).map((p) => ({ label: p.label, decisive: +p.tDecisive.toFixed(3), control: p.tControl != null ? +p.tControl.toFixed(3) : null, next: p.next, tNext: p.tNext != null ? +p.tNext.toFixed(3) : null })),
    normal: a.normal, slow: a.slow, kinds: a.kinds, exits: S.exits, missed: S.missed, sepMax: +S.sepMax.toFixed(2), deterministic: a.sig === b.sig };
  o.ok = o.skills.every((x) => x.result === "PLAYED") && o.normal === 0 && !o.exits.length && !o.missed && o.deterministic; out.push(o);
  console.log(`${o.ok ? "✓" : "✗"} ${o.name.padEnd(56)} ${o.skills.map((x) => `${x.intent} ${x.result}${x.played ? " " + x.played : ""}`).join(" + ")}`);
  console.log(`    ${o.phases.map((p) => `${p.label} @${p.decisive.toFixed(2)} ctl ${p.control != null ? "+" + (p.control - p.decisive).toFixed(2) : "?"}${p.tNext != null ? ` → ${p.next} @${p.tNext.toFixed(2)}` : ""}`).join(" · ").slice(0, 260)}`);
  console.log(`    body ${o.normal} normal / ${o.slow} slow ${Object.keys(o.kinds).length ? JSON.stringify(o.kinds) : ""} · possession exits ${o.exits.length} · missed ${o.missed} · sep ≤ ${o.sepMax} m · deterministic ${o.deterministic ? "yes" : "NO"}`); }
console.log(`■ ${out.filter((x) => x.ok).length} / ${out.length} chains: every request PLAYED, 0 normal-visible, possession kept, deterministic`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

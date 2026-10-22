// adv4/tools/adv_compare.mjs — ADV-4: the Lab's ADVANCED AUTO SOLUTIONS replays run in node with the Lab's own runner and exit metrics — the
// ADV_COMPARES pairs (A the advanced family, B the basic solution, the identical entry; STOP-AND-GO to the relaunch), the six cards' PLAY and
// AUTO replays, the chains: what was played, request → decisive · → useful exit · total, the preparation, the speed at the contact, the lowest
// speed, the exit speed (1 s after the decisive contact / the lowest speed), control back, possession, the posed body (v_extreme's classes)
//   node adv_compare.mjs [--json f]
import fs from "node:fs";
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { ADV_COMPARES, ADVANCED, COMPARES, CHAINS } from "../v_cases.js";
import { caseOpts, runCaseOn, summarize, exitMetrics } from "../v_run.js";
import { measure } from "./v_extreme.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = Math.PI / 180, out = { pairs: [], cards: [], chains: [] };
export const lane = (c, mirror = false) => { const sim = makeSim("TL", Object.assign(caseOpts(c, mirror), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, mirror), S = summarize(sim, r.t0), X = exitMetrics(sim, r.t0, (mirror ? -1 : 1) * (c.ang || 0) * DEG, c.mode, null, { stop: !!c.stopGo }), m = measure(sim, Math.round(r.clip[0] / DT), 0);
  const n = (x, d = 3) => (x == null || !isFinite(x) ? null : +x.toFixed(d));
  return { played: X ? X.label : null, skill: S.skills.map((x) => x.result + (x.result !== "PLAYED" ? "→" + x.alt : "")).join(","), tDec: n(X.tDec), tExit: n(X.tExit), total: n(X.total), prep: n(X.prep), vC: n(X.vC, 2), vMin: n(X.vMin, 2), v1: n(X.v1, 2), ctl: n(X.ctl), p25: n(X.p25, 2), sepMax: n(S.sepMax, 2),
    exits: S.exits.length, missed: S.missed, body: m.N, bodyEv: m.F.filter((f) => f.lvl === "normal").map((f) => `${f.kind} ${f.depth || f.deg || f.cm || f.air || ""} @${f.t}`) }; };
const f2 = (x) => (x == null ? " — " : x.toFixed(2)), f1 = (x) => (x == null ? "—" : x.toFixed(1));
const L = (k, x) => `   ${k} ${String(x.played || "—").slice(0, 30).padEnd(30)} ${x.skill.slice(0, 22).padEnd(22)} dec ${f2(x.tDec)} · exit +${f2(x.tExit)} · total ${f2(x.total)} · prep ${f2(x.prep)} · vC ${f1(x.vC)} · vMin ${f1(x.vMin)} · v+1s ${f1(x.v1)} · ctl +${f2(x.ctl)} · p25 ${f2(x.p25)} · ball ≤ ${f2(x.sepMax)} m · exits ${x.exits} · missed ${x.missed} · body ${x.body.normal}/${x.body.slow}${x.bodyEv.length ? " [" + x.bodyEv.join("; ") + "]" : ""}`;
if ((process.argv[1] || "").endsWith("adv_compare.mjs")) {
  console.log("══ ADV_COMPARES (A the advanced family | B the basic solution, the identical entry)");
  for (const p of ADV_COMPARES.concat([COMPARES[1], COMPARES[3]])) { const a = lane(p.a), b = lane(p.b); out.pairs.push({ name: p.name, mode: p.mode, stop: !!p.stop, a, b });
    console.log(`■ ${p.name}${a.total != null && b.total != null ? ` — A ${a.total <= b.total ? (b.total - a.total).toFixed(2) + " s sooner" : (a.total - b.total).toFixed(2) + " s later"}` : ""}`); console.log(L("A", a)); console.log(L("B", b)); }
  console.log("══ THE CARDS: PLAY · MIRROR · AUTO (the same state, no request)");
  for (const c of ADVANCED) { const P = c.play, a = lane(P), mi = lane(P, true), au = lane(Object.assign({}, P, { intents: [] })); out.cards.push({ id: c.id, play: a, mirror: mi, auto: au });
    console.log(`■ ${c.name} · ${P.title}`); console.log(L("PLAY  ", a)); console.log(L("MIRROR", mi)); console.log(L("AUTO  ", au)); }
  console.log("══ CHAINS");
  for (const k of CHAINS) { const a = lane(k); out.chains.push({ name: k.name, r: a }); console.log(`■ ${k.name}`); console.log(L("", a)); }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

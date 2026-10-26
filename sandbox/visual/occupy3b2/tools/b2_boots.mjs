// occupy3b2/tools/b2_boots.mjs — §5 BOOT ↔ BOOT, measured on the bodies as drawn (the same instrument for every stage): each tick, the four boot pairs
// (the boot's sole — heel → toe tip, 9.5 cm across: b2_geom.js legCapsJ BOOT), a pair deeper than 2 cm classed by what the two feet are doing — SWING (at
// least one boot swinging, away from the ball), LANDING (a boot within 60 ms of its touchdown — 3B.1's landing priority), PLANTED ↔ PLANTED, BALL CONTEST
// (within 0.30 m of the ball while a touch or the tackle's window is on) — ticks, episodes, the deepest; and planted LEGS inside each other (thigh / shin of
// two planted legs > 5 cm: the anchored conflict).   node b2_boots.mjs --set review [--modes S3B,S3B2]
import { ENV, setOf, arg, cm } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
import { legCapsJ, anyPen } from "../b2_geom.js";
import { volumesOf, detect } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
globalThis.__b2opts = JSON.parse(arg("cfg", "null")) || undefined;
const DT = 1 / 240, SET = arg("set", "review"), MODES = arg("modes", "S3B,S3B2").split(","), L = setOf(SET), KINDS = ["SWING", "LANDING", "PLANTED ↔ PLANTED", "BALL CONTEST"];
const out = Object.fromEntries(MODES.map((m) => [m, { ticks: Object.fromEntries(KINDS.map((k) => [k, 0])), deep: Object.fromEntries(KINDS.map((k) => [k, 0])), eps: Object.fromEntries(KINDS.map((k) => [k, 0])), pp: 0, ppDeep: 0, ppList: [], list: [] }]));
const stOf = (p, X, t) => { const S = p.plan.stances[X], now = S.find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), nx = S.find((q) => q.t0 > t + 1e-9); return now ? "P" : nx && nx.t0 - t < 0.06 ? "L" : "S"; };
for (const tc of L) { if (tc.onlyCommitted) { const p = runB2(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  for (const mode of MODES) { const live = new Map();
    const R = runB2(ENV, tc, mode, { record: true, onTick: (W) => { const t = W.att.t; live.set(W.k, { a: { R: stOf(W.att, "R", t), L: stOf(W.att, "L", t) }, d: { R: stOf(W.def, "R", t), L: stOf(W.def, "L", t) }, ball: W.ball.p.slice(), touch: [W.att, W.def].map((p) => ["R", "L"].filter((X) => p.plan.contacts.some((c) => c.F === X && Math.abs(c.t - t) < 0.12) || p.contacts.some((c) => c.F === X && Math.abs(c.t - t) < 0.12))), tk: !!(W.tk && W.tk.act && t >= W.tk.act.tW0 - 0.05 && t <= W.tk.act.tW1 + 0.05) }); } });
    const W = R.W, k0 = Math.round(R.clip[0] / DT), k1 = Math.round(R.clip[1] / DT), O = out[mode], open = new Map(); let ppOpen = false;
    for (let k = k0; k <= k1; k++) { const F = W.frames.get(k), q = live.get(k); if (!F || !q) continue; const seen = new Set();
      for (const XA of ["R", "L"]) for (const XB of ["R", "L"]) { const a = legCapsJ(F.a.J, XA).find((c) => c.boot), b = legCapsJ(F.d.J, XB).find((c) => c.boot), pn = anyPen([a], [b]); if (!(pn.pen > 0.02)) continue;
        const dB = Math.hypot(pn.at[0] - q.ball[0], pn.at[1] - q.ball[1]), sa = q.a[XA], sd = q.d[XB], contest = dB < 0.30 && (q.touch[0].includes(XA) || q.touch[1].includes(XB) || q.tk), kind = contest ? "BALL CONTEST" : sa === "P" && sd === "P" ? "PLANTED ↔ PLANTED" : sa === "L" || sd === "L" ? "LANDING" : "SWING", key = kind + XA + XB;
        O.ticks[kind]++; O.deep[kind] = Math.max(O.deep[kind], pn.pen); if (!open.has(key)) { O.eps[kind]++; O.list.push({ id: tc.id, t: +(k * DT - R.t0).toFixed(3), kind, pair: `ATT ${XA} · DEF ${XB}`, pen: pn.pen }); } else { const e = O.list[O.list.length - 1]; if (e && e.kind === kind) e.pen = Math.max(e.pen, pn.pen); } seen.add(key); }
      for (const k2 of [...open.keys()]) if (!seen.has(k2)) open.delete(k2); for (const k2 of seen) open.set(k2, k);
      // (the anchored conflict: a planted leg of each inside the other beyond the hard limit)
      let pp = -Infinity; for (const x of detect(volumesOf(F.a.J), volumesOf(F.d.J), { within: 0 })) { const ma = /^(THIGH|SHIN)_([RL])$/.exec(x.A), md = /^(THIGH|SHIN)_([RL])$/.exec(x.B); if (!ma || !md || q.a[ma[2]] !== "P" || q.d[md[2]] !== "P") continue; pp = Math.max(pp, x.pen); }
      if (pp > 0.05) { O.pp++; O.ppDeep = Math.max(O.ppDeep, pp); if (!ppOpen) O.ppList.push({ id: tc.id, t: +(k * DT - R.t0).toFixed(3), pen: pp }); else O.ppList[O.ppList.length - 1].pen = Math.max(O.ppList[O.ppList.length - 1].pen, pp); ppOpen = true; } else ppOpen = false; } }
  process.stderr.write("."); }
console.log(`\n§5 BOOT ↔ BOOT AND PLANTED ↔ PLANTED — set ${SET} (${L.length} cases), the bodies as drawn: boot pairs deeper than 2 cm — ticks (episodes), deepest`);
console.log(`${"".padEnd(24)}${MODES.map((m) => m.padStart(26)).join("")}`);
for (const k of KINDS) console.log(`${k.padEnd(24)}${MODES.map((m) => `${out[m].ticks[k]} (${out[m].eps[k]}) · ${cm(out[m].deep[k])} cm`.padStart(26)).join("")}`);
console.log(`${"PLANTED LEGS > 5 cm".padEnd(24)}${MODES.map((m) => `${out[m].pp} ticks (${out[m].ppList.length}) · ${cm(out[m].ppDeep)} cm`.padStart(26)).join("")}`);
for (const m of MODES) { console.log(`\n${m}: the deepest boot episodes`); for (const e of out[m].list.sort((a, b) => b.pen - a.pen).slice(0, 8)) console.log(`  ${cm(e.pen).padStart(5)} cm  ${e.kind.padEnd(18)} ${e.id.padEnd(22)} t ${e.t.toFixed(3)} ${e.pair}`);
  console.log(`  planted-against-planted episodes: ${out[m].ppList.sort((a, b) => b.pen - a.pen).slice(0, 6).map((e) => `${e.id} ${e.t.toFixed(2)} (${cm(e.pen)} cm)`).join(" · ") || "none"}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out));

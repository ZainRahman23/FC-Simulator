// occupy3b2/tools/b2_cross.mjs — §6 CROSSED LEGS, CLASSIFIED (not a cosmetic rule: why each crossed tick happens). A crossed tick: a player's feet
// across each other's line by > 5 cm in his pelvis frame (Stage 3's instrument). Each crossed EVENT (consecutive crossed ticks of one player) is:
//   IMPOSSIBLE SELF-INTERSECTION — the player's own legs inside each other (thigh / shin / boot, > 2 cm; the thighs' upper halves excluded: the hips)
//   RECOVERY ON THE WRONG SIDE — both feet DOWN and crossed, one of them on a recovery step's stance (placed by 3B.2 / Stage 3): the recovery placed
//     across, or the gait's next foot landed across the recovery foot (a swing passing a planted recovery foot is a passage, below)
//   LIMB PUSHED ACROSS — the 3B.1 yield displaced one of its feet (> 2 cm) during the event
//   TRANSIENT PASSAGE — one foot swinging past the other, ≤ 50 ms, no self-intersection
//   AUTHORED CROSSOVER — the canonical plan's own stances (the gait's, a technique's) crossed: the motion as authored
// the event's class is the first that applies, in that order. A tick count and an event count per class, per mode.
//   node b2_cross.mjs --set review [--modes S3B,S3B2] [--top 10]
import { ENV, setOf, arg, cm } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
import { segClosest } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
globalThis.__b2opts = JSON.parse(arg("cfg", "null")) || undefined;
const DT = 1 / 240, SET = arg("set", "review"), MODES = arg("modes", "S2D,S3,S3B,S3B2").split(","), TOP = +arg("top", 10), L = setOf(SET).filter((x) => !arg("ids") || arg("ids").split(",").includes(x.id));
const CLS = ["IMPOSSIBLE SELF-INTERSECTION", "RECOVERY ON THE WRONG SIDE", "LIMB PUSHED ACROSS", "TRANSIENT PASSAGE", "AUTHORED CROSSOVER"], ERR = new Set(["IMPOSSIBLE SELF-INTERSECTION", "RECOVERY ON THE WRONG SIDE", "LIMB PUSHED ACROSS"]);
function selfPen(J) { const seg = (a, b, r) => ({ a, b, r }), mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], S = (X) => [seg(mid(J["thigh_" + X].j, J["thigh_" + X].t), J["thigh_" + X].t, 0.115), seg(J["shin_" + X].j, J["shin_" + X].t, 0.07), seg(J["foot_" + X].j, J["foot_" + X].t, 0.07)];
  let m = -Infinity; for (const a of S("R")) for (const b of S("L")) { const c = segClosest(a.a, a.b, b.a, b.b); m = Math.max(m, a.r + b.r - c.d); } return m; }
const out = Object.fromEntries(MODES.map((m) => [m, { ticks: Object.fromEntries(CLS.map((c) => [c, 0])), events: Object.fromEntries(CLS.map((c) => [c, 0])), list: [] }]));
for (const tc of L) { if (tc.onlyCommitted) { const p = runB2(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  for (const mode of MODES) { const live = new Map();
    const R = runB2(ENV, tc, mode, { record: true, onTick: (W) => { const t = W.att.t, row = {};
      for (const [key, p] of [["a", W.att], ["d", W.def]]) { const st = p.stateAt(t), legs = {};
        for (const X of ["R", "L"]) { const Ls = p.plan.stances[X], now = Ls.find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), nx = Ls.find((q) => q.t0 > t + 1e-9); legs[X] = { planted: !!now, rec: !!(now && /recovery step/.test(now.kind || "")), d: W.legs ? W.legs.get(p)[X].dAnk : 0 }; }
        row[key] = { psi: st.psi, legs, s3: !!(W.ps && W.ps.get(p).active) }; }
      live.set(W.k, row); } });
    const W = R.W, k0 = Math.round(R.clip[0] / DT), k1 = Math.round(R.clip[1] / DT), O = out[mode];
    for (const ck of ["a", "d"]) { let ev = null; const close = () => { if (!ev) return; const c = ev.self > 0.02 ? CLS[0] : ev.rec ? CLS[1] : ev.push ? CLS[2] : ev.n <= 12 && ev.swing ? CLS[3] : CLS[4]; O.ticks[c] += ev.n; O.events[c]++; O.list.push({ id: tc.id, who: ck === "a" ? "ATT" : "DEF", t: +(ev.t0 - R.t0).toFixed(3), n: ev.n, cls: c, self: ev.self, lat: ev.lat }); ev = null; };
      for (let k = k0; k <= k1; k++) { const F = W.frames.get(k), q = live.get(k); if (!F || !q) { close(); continue; } const J = F[ck].J, s = q[ck], r = [-Math.sin(s.psi), Math.cos(s.psi)], lat = (J.foot_R.j[0] - J.foot_L.j[0]) * r[0] + (J.foot_R.j[1] - J.foot_L.j[1]) * r[1];
        if (!(lat < -0.05)) { close(); continue; } if (!ev) ev = { t0: k * DT, n: 0, self: -Infinity, rec: false, push: false, swing: false, lat: 0 };
        ev.n++; ev.self = Math.max(ev.self, selfPen(J)); ev.lat = Math.min(ev.lat, lat); ev.rec = ev.rec || ((s.legs.R.rec || s.legs.L.rec) && s.legs.R.planted && s.legs.L.planted); ev.push = ev.push || s.legs.R.d > 0.02 || s.legs.L.d > 0.02; ev.swing = ev.swing || !s.legs.R.planted || !s.legs.L.planted; }
      close(); } }
  process.stderr.write("."); }
console.log(`\n§6 CROSSED LEGS, CLASSIFIED — set ${SET} (${L.length} cases): ticks (events) per class`);
console.log(`${"".padEnd(32)}${MODES.map((m) => m.padStart(16)).join("")}`);
for (const c of CLS) console.log(`${(ERR.has(c) ? "✗ " : "  ") + c}`.padEnd(32) + MODES.map((m) => `${out[m].ticks[c]} (${out[m].events[c]})`.padStart(16)).join(""));
console.log(`${"  ALL".padEnd(32)}${MODES.map((m) => `${Object.values(out[m].ticks).reduce((a, b) => a + b, 0)} (${Object.values(out[m].events).reduce((a, b) => a + b, 0)})`.padStart(16)).join("")}`);
console.log(`${"  ERRONEOUS (✗)".padEnd(32)}${MODES.map((m) => `${CLS.filter((c) => ERR.has(c)).reduce((a, c) => a + out[m].ticks[c], 0)} (${CLS.filter((c) => ERR.has(c)).reduce((a, c) => a + out[m].events[c], 0)})`.padStart(16)).join("")}`);
for (const m of MODES) { console.log(`\n${m}: the longest erroneous events`); for (const e of out[m].list.filter((x) => ERR.has(x.cls)).sort((a, b) => b.n - a.n).slice(0, TOP)) console.log(`  ${e.id.padEnd(24)} ${e.who} t ${e.t.toFixed(3)} ${String(e.n).padStart(4)} ticks  ${e.cls}  (self ${cm(Math.max(0, e.self))} cm, across ${cm(-e.lat)} cm)`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out));

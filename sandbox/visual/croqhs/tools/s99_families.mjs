// speed99/tools/s99_families.mjs — THE EXPANDED VOCABULARY'S VALIDATION (S99 MISSION, Phase 3): per family (LATERAL TRANSFER · KNOCK-ON · SOLE
// ROLL), the states that invite it, run at the 99 pace (D38) under CONTROLLED_BALL with CORE vs EXPANDED vocabulary (and EXPANDED with the family
// forced — the review-only access): which action B4 chooses, the time until body AND ball run on the new line, the separation, every
// possession exit — and the MIRROR (right-footed + angle against left-footed − angle: the same choice with the feet swapped, the same timing)
// and THE BODY (posed every tick: a toe / ankle jump > 12 cm in one tick, a knee > 20° in one tick, leg capsules crossing < −2 cm)
//   node s99_families.mjs [--only <substr>] [--json f]
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { presetLayers } from "../c_sim.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, only = opt("only", null);
const hyp = Math.hypot, DEG = Math.PI / 180, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
export const CASES = {
  "jog → 30°": [[[0, "JOG", 2.5]], [30, "JOG", 2]], "run → 40°": [[[0, "RUN", 2.5]], [40, "RUN", 2]], "run → 25°": [[[0, "RUN", 2.5]], [25, "RUN", 2]],
  "run → sprint 35°": [[[0, "RUN", 2.0]], [35, "SPRINT", 2.5]], "run → sprint 55°": [[[0, "RUN", 2.0]], [55, "SPRINT", 2.5]], "sprint → 45°": [[[0, "SPRINT", 3.0]], [45, "SPRINT", 2.5]],
  "walk → 90°": [[[0, "WALK", 2.5]], [90, "WALK", 2]], "walk → 120°": [[[0, "WALK", 2.5]], [120, "WALK", 2]], "walk → 60°": [[[0, "WALK", 2.5]], [60, "WALK", 2]],
};
const knee = (J, X) => { const a = J["thigh_" + X].j, b = J["shin_" + X].j, c = J["foot_" + X].j, u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]; return Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (hyp(...u) * hyp(...v))))); };
export function famRun(name, foot, sign, vocab, forceFam, phase, pose = true) { const [pre, [ang, mode, dur]] = CASES[name], h1 = sign * ang * DEG;
  const sim = makeSim("TL", Object.assign({ layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot, style: "NEUTRAL", seed: 1, start: { P: [30, 34], h: 0 }, control: "CONTROLLED", pace: "D38" }, vocab ? { vocab } : {}, forceFam ? { forceFam } : {}));
  const body = pose ? new PlayBody(env, sim) : null; let prev = null; const bodyF = { jump: 0, knee: 0, cross: 0, ev: [] }; let tBase = 0; const step = (q, check) => { sim.step(q); if (!body) return; const p = body.pose(sim.t);
    if (check && prev) { for (const X of ["R", "L"]) { const a = p.feet[X].ank, a0 = prev.ank[X], t1 = p.J["toe_" + X].j, t0 = prev.toe[X]; const ev = (k) => { if (bodyF.ev.length < 40) bodyF.ev.push({ k, X, t: +(sim.t - tBase).toFixed(3), act: sim.plan.action.label, planted: p.feet[X].planted, kind: p.feet[X].stance ? p.feet[X].stance.kind : p.feet[X].swing && p.feet[X].swing.to ? 'swing→' + p.feet[X].swing.to.kind : '' }); }; if (Math.max(hyp(a[0] - a0[0], a[1] - a0[1], a[2] - a0[2]), hyp(t1[0] - t0[0], t1[1] - t0[1], t1[2] - t0[2])) > 0.12) { bodyF.jump++; ev('JUMP'); } if (Math.abs(knee(p.J, X) - prev.knee[X]) > 20 * DEG) { bodyF.knee++; ev('KNEE'); } }
      const c = Math.min(...Object.values(p.clr)); if (c < -0.02 && !prev.cross) { bodyF.cross++; if (bodyF.ev.length < 40) bodyF.ev.push({ k: 'CROSS', t: +(sim.t - tBase).toFixed(3), act: sim.plan.action.label, depth: +(c * 100).toFixed(1), part: Object.entries(p.clr).sort((x, y) => x[1] - y[1])[0][0] }); } }
    prev = { ank: { R: p.feet.R.ank.slice(), L: p.feet.L.ank.slice() }, toe: { R: p.J.toe_R.j.slice(), L: p.J.toe_L.j.slice() }, knee: { R: knee(p.J, "R"), L: knee(p.J, "L") }, cross: Math.min(...Object.values(p.clr)) < -0.02 }; };
  for (let k = 0; k < 120; k++) step({ h: null, mode: "JOG", keys: 0 }, false);
  for (const [h, m, d] of pre) for (let k = 0; k < Math.round((d + phase) / DT); k++) step({ h, mode: m, keys: 0 }, false);
  const n0 = sim.contacts.length, l0 = sim.poss.log.length, t0 = sim.t; tBase = t0; let sepMax = 0, onLine = null;
  for (let k = 0; k < Math.round(dur / DT); k++) { step({ h: h1, mode, keys: 0 }, true); const st = sim.stateAt(sim.t), b = sim.ball.p, bv = sim.ball.v; sepMax = Math.max(sepMax, hyp(b[0] - st.P[0], b[1] - st.P[1]));
    if (onLine == null && st.s > 1 && Math.abs(wrap(st.h - h1)) < 10 * DEG && hyp(...bv) > 0.5 && Math.abs(wrap(Math.atan2(bv[1], bv[0]) - h1)) < 15 * DEG) onLine = sim.t - t0; }
  const C = sim.contacts.slice(n0).filter((c) => !c.missed), seq = C.slice(0, 4).map((c) => `${c.fam || (c.tech === "CARRY" ? "carry" : c.tech)}/${c.F}`);
  return { seq, fams: C.filter((c) => c.fam).map((c) => c.fam), onLine, sepMax, exits: sim.poss.log.slice(l0).filter((e) => e.from === "CONTROLLED").map((e) => e.why), body: bodyF }; }
if ((process.argv[1] || "").endsWith("s99_families.mjs")) { const out = {}, tot = { EXP: {}, CORE: {} }; let mirrorSame = 0, mirrorN = 0, exits = 0, bodyT = { jump: 0, knee: 0, cross: 0 }, bodyC = { jump: 0, knee: 0, cross: 0 };
  const swap = (s) => s.map((x) => x.replace(/\/R$/, "/x").replace(/\/L$/, "/R").replace(/\/x$/, "/L"));
  for (const name of Object.keys(CASES)) { if (only && !name.includes(only)) continue; const row = (out[name] = {});
    for (const [lab, vocab, ff] of [["CORE", null, null], ["EXP", "EXPANDED", null], ["EXP+LAT", "EXPANDED", "LAT"], ["EXP+KNK", "EXPANDED", "KNK"], ["EXP+SOL", "EXPANDED", "SOL"]]) { const R = [];
      for (const sign of [1, -1]) for (const ph of [0, 0.1, 0.2]) { const a = famRun(name, "R", sign, vocab, ff, ph), b = famRun(name, "L", -sign, vocab, ff, ph); R.push({ sign, ph, R: a, L: b });
        mirrorN++; const same = JSON.stringify(a.seq) === JSON.stringify(swap(b.seq)) && Math.abs((a.onLine ?? 9) - (b.onLine ?? 9)) < 0.03; if (same) mirrorSame++; exits += a.exits.length + b.exits.length;
        for (const k of Object.keys(bodyT)) { (lab === "CORE" ? bodyC : bodyT)[k] += a.body[k] + b.body[k]; }
        if (lab === "CORE" || lab === "EXP") for (const f of a.fams.concat(b.fams)) tot[lab][f] = (tot[lab][f] || 0) + 1; }
      row[lab] = R.map((r) => ({ sign: r.sign, ph: r.ph, R: { seq: r.R.seq, onLine: r.R.onLine, sep: +r.R.sepMax.toFixed(2), exits: r.R.exits, body: r.R.body }, L: { seq: r.L.seq, onLine: r.L.onLine, exits: r.L.exits, body: r.L.body } }));
      const m = (f) => { const v = R.flatMap((r) => [r.R[f], r.L[f]]).map((x) => x ?? 9); return (v.reduce((s, x) => s + x, 0) / v.length).toFixed(2); };
      console.log(`${name.padEnd(18)} ${lab.padEnd(8)} first actions ${[...new Set(R.flatMap((r) => [r.R.seq[0], r.L.seq[0]]).map((x) => (x || "-").split("/")[0]))].join(",").padEnd(28)} on line ${m("onLine")} s · sep max ${m("sepMax")} m · exits ${R.reduce((s, r) => s + r.R.exits.length + r.L.exits.length, 0)} · body jumps/knee/cross ${R.reduce((s, r) => s + r.R.body.jump + r.L.body.jump, 0)}/${R.reduce((s, r) => s + r.R.body.knee + r.L.body.knee, 0)}/${R.reduce((s, r) => s + r.R.body.cross + r.L.body.cross, 0)}`); } }
  console.log(`■ mirror: ${mirrorSame}/${mirrorN} identical (right-footed +a ≡ left-footed −a, feet swapped, on-line within 0.03 s) · possession exits ${exits} · body (EXPANDED runs) jumps ${bodyT.jump} · knee pops ${bodyT.knee} · crosses ${bodyT.cross} — (CORE runs) ${bodyC.jump} / ${bodyC.knee} / ${bodyC.cross}`);
  console.log(`■ family use (unforced): CORE ${JSON.stringify(tot.CORE)} · EXPANDED ${JSON.stringify(tot.EXP)}`);
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

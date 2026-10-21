// tc_layered/tools/tl_ab.mjs — THE LAYERED REPORT CARD (owner §21–23): the owner's required tests (tl_tests.mjs, §22) run through the layer
// configurations on IDENTICAL analog-stick traces, every tick simulated and POSED (tl_body.js), each against a counterfactual run of the same
// configuration with the stick left where it was. Metrics inform; the owner's hands-on review decides (§23: "metrics do not select the winner").
//   CONFIGURATIONS: A (all off = 88573ef0, checked identical by tl_equiv.mjs), the cumulative chain B1 … B5, ALL (+ B6), and each layer ALONE
//   over A ("+early", "+narrow", …)
//   CLOCKS (per stick change; deadline 2.0 s for a held one — not reached = FAILED, reported, never dropped):
//     visible response   the posed shoulder line ≥ 5° toward the intent, or the centre of mass ≥ 5 cm, off the counterfactual (first change)
//     relevant contact   the first contact sending the ball within 30° of the intent
//     heading change     the travel turned toward the intent by ≥ min(15°, half the turn)
//     new line           travel within 15° of the intent at ≥ 40 % of the requested speed, held 0.1 s
//     action lock        how long the resolver could only run the technique already committed (its exit) after the change
//   CONTROL: touches, REDUNDANT touches (a touch that changed the ball < 0.5 m/s, or within 0.20 s of the one before), double (< 0.10 s),
//     the ball's separation, LOST (the torture suite's definition), missed
//   BODY WARNINGS (§17): root ↔ display offset (the rendered pelvis's ground point against the authoritative centre of mass), the contact
//     foot ↔ the ball at each contact (the boot hull's gap: > 0 = the boot short of the ball), support-foot slides (> 4 mm / tick, pivots
//     excluded), foot jumps (> 0.12 m / tick), unsupported travel (no foot down > 0.15 s), the body pulled after a planted foot (the pose's reach
//     correction > 3 cm), leg intersections (> 20 mm)
//   node tl_ab.mjs [--configs A,B1,…] [--only <substr>] [--json f]      ·      node tl_ab.mjs --merge a.json,b.json [--txt f] [--json f]
import { ENV, makeSim } from "./tl_env.mjs";
import { PlayBody } from "../tl_body.js";
import { presetLayers, LAYERS_OFF } from "../tl_sim.js";
import { TESTS, MODES, reqOf } from "./tl_tests.mjs";
import fs from "node:fs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; };
const DT = 1 / 240, DEG = Math.PI / 180, hyp = Math.hypot, abs = Math.abs, min = Math.min, max = Math.max;
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const colliders = JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))), env = Object.assign({}, ENV, { colliders });
export function layersOf(cfg) { if (cfg.startsWith("+")) return Object.assign({}, LAYERS_OFF, Object.fromEntries(cfg.slice(1).split("+").map((k) => [k, true]))); return presetLayers(cfg); }
const shoulderYaw = (J) => { const r = J.upperArm_R.j, l = J.upperArm_L.j; return Math.atan2(-(r[0] - l[0]), r[1] - l[1]); };
function run(cfg, spec, o = {}) {
  const M = MODES[spec.mode], sim = makeSim("TL", { layers: layersOf(cfg) }), body = new PlayBody(env, sim), n = Math.round(spec.dur / DT), ticks = [];
  for (let k = 0; k < n; k++) { const t = k * DT; sim.step(reqOf(spec.f, t, M)); const T = sim.t; if (T < o.from - 1e-9) continue;
    const st = sim.stateAt(T), b = sim.ball.p, bv = sim.ball.v, p = body.pose(T), rec = { t: T, P: st.P, V: st.V, h: st.h, s: st.s, psi: st.psi, b: [b[0], b[1]], bv: [bv[0], bv[1]], plan: sim.plan, act: sim.plan.action, tor: shoulderYaw(p.J) };
    if (!o.light) { rec.feet = {}; for (const X of ["R", "L"]) { const f = p.feet[X]; rec.feet[X] = { ank: f.ank.slice(), planted: f.planted, stance: f.stance && f.stance.id, pivot: !!(f.stance && f.stance.pivot), ballPt: f.ballPt && f.ballPt.slice() }; }
      rec.clr = min(...Object.values(p.clr)); rec.off = hyp(p.P[0] - st.P[0], p.P[1] - st.P[1]); rec.reach = p.reach; rec.gap = { R: p.gap.R ? p.gap.R.gap : null, L: p.gap.L ? p.gap.L.gap : null }; }
    ticks.push(rec); }
  return { ticks, sim };
}
export function measure(cfg, spec) {
  const tIn = spec.changes[0], M = MODES[spec.mode], vm = spec.mode === "SPRINT" ? 8.0 : spec.mode === "JOG" ? 3.2 : spec.mode === "RUN" ? 5.3 : 1.5;
  const main = run(cfg, spec, { from: tIn - 0.6 }), cf = run(cfg, { mode: spec.mode, f: (t) => (t < tIn ? spec.f(t) : spec.f(tIn - 1e-6)), dur: min(spec.dur, tIn + 1.0) }, { from: tIn - 0.05, light: true });
  const sim = main.sim, T = main.ticks, Tc = new Map(cf.ticks.map((x) => [Math.round(x.t / DT), x])), intentAt = (t) => reqOf(spec.f, t - DT, M).h, tick = (t) => T.find((k) => abs(k.t - t) < DT / 2);
  const made = sim.contacts.filter((c) => !c.missed), out = { per: [] }, LK = sim.log.lock, lockAt = (x) => { let s = false; for (const e of LK) if (e.t <= x + 1e-9) s = e.locked; return s; };
  for (let ci = 0; ci < spec.changes.length; ci++) { const tc = spec.changes[ci], tNext = spec.changes[ci + 1] ?? spec.dur, hI = reqOf(spec.f, tc + 1e-6, M).h, held = spec.held.includes(tc); if (hI == null) continue;
    const k0 = tick(tc) || T.find((k) => k.t >= tc), h0 = k0 ? (k0.s > 1.0 ? k0.h : k0.psi) : 0, need = wrap(hI - h0), want = min(15 * DEG, 0.5 * abs(need)), x = { t: tc, held, vis: null, contact: null, heading: null, line: null, exit: null, lock: 0 }; let lineS = null;
    for (const k of T) { if (k.t < tc - 1e-9 || k.t > tNext + 1e-9) continue; const dt = k.t - tc;
      if (ci === 0) { const c = Tc.get(Math.round(k.t / DT)); if (c && x.vis == null) { const sg = Math.sign(wrap(hI - c.tor)) || 1; if (wrap(k.tor - c.tor) * sg >= 5 * DEG || hyp(k.P[0] - c.P[0], k.P[1] - c.P[1]) >= 0.05) x.vis = dt; } }
      if (x.heading == null && want > 2 * DEG) { const hh = k.s > 1.0 ? k.h : k.psi; if (Math.sign(need) * wrap(hh - h0) >= want) x.heading = dt; }
      if (x.line == null) { if (k.s >= 0.4 * vm && abs(wrap(k.h - hI)) < 15 * DEG) { if (lineS == null) lineS = k.t; if (k.t - lineS >= 0.1 - 1e-9) x.line = lineS - tc; } else lineS = null; }
      if (x.exit == null && k.s >= 0.7 * vm && abs(wrap(k.h - hI)) < 15 * DEG) x.exit = dt; }
    const dc = made.find((c) => c.t >= tc - 1e-9 && c.t <= tNext + 1e-9 && hyp(c.vOut[0], c.vOut[1]) > 0.3 && abs(wrap(Math.atan2(c.vOut[1], c.vOut[0]) - hI)) < 30 * DEG); if (dc) x.contact = dc.t - tc;
    if (lockAt(tc + DT)) { const e = LK.find((q) => q.t > tc && !q.locked); x.lock = e ? e.t - tc : tNext - tc; }
    if (held) { x.lineFail = x.line == null || x.line > 2.0; x.contactFail = x.contact == null || x.contact > 2.0; }
    out.per.push(x); }
  // control after the first change
  let noC = 0, lastMade = 0, lost = 0, lostOn = false, sepMax = 0; const seps = [];
  for (const k of T) { if (k.t < tIn) continue; const plan = k.plan, act = k.act, future = plan.contacts.some((c) => !c.done && c.t > k.t - 1e-9) || (act.chase && act.closing), sep = hyp(k.b[0] - k.P[0], k.b[1] - k.P[1]), atFeet = hyp(k.bv[0], k.bv[1]) < 0.3 && sep < 0.8, on = intentAt(k.t) != null;
    for (const c of made) if (c.t <= k.t + 1e-9 && c.t > lastMade) lastMade = c.t; if (on && !future && !atFeet) noC += DT; else noC = 0; const ln = on && !atFeet && (noC > 0.5 || k.t - lastMade > 1.8); if (ln && !lostOn) lost++; lostOn = ln; sepMax = max(sepMax, sep); seps.push(sep); }
  out.lost = lost; out.sepMax = sepMax; seps.sort((a, b) => a - b); out.sepMed = seps.length ? seps[Math.floor(seps.length / 2)] : 0; out.missed = sim.contacts.filter((c) => c.missed && c.t >= tIn).length;
  const after = made.filter((c) => c.t >= tIn); out.touches = after.length; out.redundant = 0; out.double = 0;
  for (const c of after) { const i = made.indexOf(c), prev = i > 0 ? made[i - 1] : null, dv = hyp(c.vOut[0] - c.vIn[0], c.vOut[1] - c.vIn[1]); if (dv < 0.5 || (prev && c.t - prev.t < 0.20 - 1e-9)) out.redundant++; if (prev && c.t - prev.t < 0.10 - 1e-9) out.double++; }
  out.techs = sim.log.actions.filter((a) => a.t >= tIn - 1e-9 && !/^(CARRY|STANDING|STOP)$/.test(a.label)).map((a) => a.label + (a.m ? (a.m > 0 ? " R" : " L") : ""));
  // body warnings
  let legs = 0, legOn = false, jumps = 0, slides = 0, unsup = 0, air = 0, pulled = 0, pullOn = false, prev = null; const offs = [], gaps = [];
  for (const k of T) { if (k.t < tIn) { prev = k; continue; } const bad = k.clr < -0.02; if (bad && !legOn) legs++; legOn = bad; offs.push(k.off);
    const pl = k.reach > 0.03; if (pl && !pullOn) pulled++; pullOn = pl;
    if (!k.feet.R.planted && !k.feet.L.planted) { air += DT; if (air > 0.15 && air - DT <= 0.15) unsup++; } else air = 0;
    if (prev && prev.feet) for (const X of ["R", "L"]) { const f = k.feet[X], q = prev.feet[X], d = hyp(f.ank[0] - q.ank[0], f.ank[1] - q.ank[1], f.ank[2] - q.ank[2]); if (d > 0.12) jumps++; if (f.planted && q.planted && f.stance === q.stance && f.ballPt && q.ballPt && !f.pivot && hyp(f.ballPt[0] - q.ballPt[0], f.ballPt[1] - q.ballPt[1]) > 0.004) slides++; } prev = k; }
  for (const c of after) { const k = tick(c.t); if (k && k.gap && k.gap[c.F] != null) gaps.push(max(0, k.gap[c.F])); }
  offs.sort((a, b) => a - b); gaps.sort((a, b) => a - b);
  Object.assign(out, { legs, jumps, slides, unsup, pulled, offP95: offs.length ? offs[Math.floor(0.95 * (offs.length - 1))] : 0, offMax: offs.length ? offs[offs.length - 1] : 0, gapP95: gaps.length ? gaps[Math.floor(0.95 * (gaps.length - 1))] : 0, gapMax: gaps.length ? gaps[gaps.length - 1] : 0, gapWarn: gaps.filter((g) => g > 0.04).length });
  if (spec.continuous) { const H = T.filter((k) => k.t >= tIn + 0.5 && k.s > 0.8).map((k) => ({ h: k.h, i: intentAt(k.t) })).filter((x) => x.i != null); out.meanErr = H.reduce((s, x) => s + abs(wrap(x.i - x.h)), 0) / max(1, H.length) / DEG; }
  return out;
}
const qt = (A, p) => { const s = A.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; };
export function suite(cfgs, only) {
  const groups = {}; for (const sp of TESTS) { if (only && !sp.name.includes(only)) continue; (groups[sp.fam] = groups[sp.fam] || []).push(sp); }
  const res = {};
  for (const [g, L] of Object.entries(groups)) { res[g] = {};
    for (const cfg of cfgs) { const runs = L.map((sp) => ({ sp, r: measure(cfg, sp) })), first = runs.map((x) => x.r.per[0]).filter(Boolean), held = runs.flatMap((x) => x.r.per.filter((p) => p.held)), all = runs.flatMap((x) => x.r.per), sum = (k) => runs.reduce((s, x) => s + (x.r[k] || 0), 0), mx = (k) => max(...runs.map((x) => x.r[k] || 0));
      const techs = {}; for (const x of runs) for (const tq of x.r.techs) techs[tq] = (techs[tq] || 0) + 1;
      res[g][cfg] = { n: runs.length, vis: [qt(first.map((x) => x.vis), 0.5), qt(first.map((x) => x.vis), 0.95)],
        contact: [qt(held.map((x) => x.contact), 0.5), qt(held.map((x) => x.contact), 0.95)], contactFail: held.filter((x) => x.contactFail).length, held: held.length,
        heading: [qt(all.map((x) => x.heading), 0.5), qt(all.map((x) => x.heading), 0.95)], line: [qt(held.map((x) => x.line), 0.5), qt(held.map((x) => x.line), 0.95)], lineFail: held.filter((x) => x.lineFail).length,
        exit: [qt(held.map((x) => x.exit), 0.5), qt(held.map((x) => x.exit), 0.95)], lock: [qt(all.map((x) => x.lock), 0.5), qt(all.map((x) => x.lock), 0.95), max(...all.map((x) => x.lock))],
        touches: sum("touches"), redundant: sum("redundant"), double: sum("double"), lost: sum("lost"), missed: sum("missed"), sepMed: +(qt(runs.map((x) => x.r.sepMed), 0.5) || 0).toFixed(2), sepMax: +mx("sepMax").toFixed(2),
        offP95: +(qt(runs.map((x) => x.r.offP95), 0.95) || 0).toFixed(3), offMax: +mx("offMax").toFixed(3), gapP95: +(qt(runs.map((x) => x.r.gapP95), 0.95) || 0).toFixed(3), gapMax: +mx("gapMax").toFixed(3), gapWarn: sum("gapWarn"),
        legs: sum("legs"), slides: sum("slides"), jumps: sum("jumps"), unsup: sum("unsup"), pulled: sum("pulled"), techs, meanErr: L[0].continuous ? +(qt(runs.map((x) => x.r.meanErr), 0.5) || 0).toFixed(1) : null,
        traces: runs.map((x) => ({ name: x.sp.name, per: x.r.per.map((p) => ({ t: +p.t.toFixed(3), vis: p.vis, contact: p.contact, heading: p.heading, line: p.line, lock: p.lock })), techs: x.r.techs, lost: x.r.lost, touches: x.r.touches, redundant: x.r.redundant })) }; } }
  return res;
}
const f2 = (x) => (x == null ? "  — " : x.toFixed(2).padStart(4)), pr = (a) => `${f2(a[0])} (${f2(a[1])})`;
export function print(res, cfgs) {
  const L = ["(medians, p95 in brackets; s after the stick change · FAILED = not within 2.0 s · body: warnings for visual review, nothing is gated on them)"];
  for (const [g, R] of Object.entries(res)) { L.push(`\n■ ${g}`); L.push(`  ${"config".padEnd(16)} visible      contact      heading      line         lock         touches/redundant  sep med/max  LOST | root↔display p95/max  contact gap p95/max (>4 cm)  legs slides jumps unsupported pulled`);
    for (const c of cfgs) { const r = R[c]; if (!r) continue;
      L.push(`  ${c.padEnd(16)} ${pr(r.vis)}  ${pr(r.contact)}${r.contactFail ? "!" + r.contactFail : "  "} ${pr(r.heading)}  ${pr(r.line)}${r.lineFail ? "!" + r.lineFail : "  "} ${pr(r.lock)}  ${String(r.touches).padStart(4)} / ${String(r.redundant).padEnd(4)}       ${r.sepMed.toFixed(2)} / ${r.sepMax.toFixed(2)}  ${String(r.lost).padStart(3)}  | ${r.offP95.toFixed(3)} / ${r.offMax.toFixed(3)}        ${r.gapP95.toFixed(3)} / ${r.gapMax.toFixed(3)} (${r.gapWarn})          ${String(r.legs).padStart(3)} ${String(r.slides).padStart(5)} ${String(r.jumps).padStart(5)} ${String(r.unsup).padStart(6)} ${String(r.pulled).padStart(7)}${r.meanErr != null ? `  · heading error ${r.meanErr}°` : ""}`);
      const tq = Object.entries(r.techs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ×${v}`).join(", "); if (tq) L.push(`  ${"".padEnd(16)} actions: ${tq}`); } }
  return L.join("\n");
}
if ((process.argv[1] || "").endsWith("tl_ab.mjs")) {
  if (opt("merge")) { const parts = opt("merge").split(",").map((f) => JSON.parse(fs.readFileSync(f))), res = {}, cfgs = [];
    for (const p of parts) { for (const c of p.cfgs) if (!cfgs.includes(c)) cfgs.push(c); for (const [g, R] of Object.entries(p.res)) res[g] = Object.assign(res[g] || {}, R); }
    const txt = print(res, cfgs); console.log(txt); if (opt("txt")) fs.writeFileSync(opt("txt"), txt); if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify({ cfgs, res }, null, 1)); }
  else { const cfgs = opt("configs", "A,B1").split(","), t0 = performance.now(), res = suite(cfgs, opt("only", null)), txt = print(res, cfgs) + `\n\n(${cfgs.join(", ")}: ${((performance.now() - t0) / 1000).toFixed(1)} s)`;
    console.log(txt); if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify({ cfgs, res }, null, 1)); if (opt("txt")) fs.writeFileSync(opt("txt"), txt); } }

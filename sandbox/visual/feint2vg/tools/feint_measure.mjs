// feint2vg/tools/feint_measure.mjs (from feint2) — BODY FEINT V2: what the whole body says, measured on the POSED body (PlayBody, the page's own) of a curated
// case, every tick. The fake side is the opposite of the exit. Per case:
//   timing      request · false load begins (the pelvis past 15 % of its maximum offset toward the fake) · max false displacement (the pelvis,
//               toward the fake, from the entry line) · reversal begins (that maximum: its lateral velocity turns back toward the exit) · the decisive (exit) touch ·
//               the true exit plant (the exit foot's first landing after it) · first useful movement (v_run exitMetrics) · control returned
//   the lie     max shoulder-line drop toward the fake (deg) · max upper-trunk yaw toward the fake relative to the hips (deg) · max pelvis yaw
//               toward the fake (deg) · the false step: the fake-side foot's lateral offset from the pelvis at its landing (m) and its toe-out
//               (deg) · the support knee's flexion at the load (deg) · the arms' asymmetry (the hands' fore-aft difference, m) · the head's yaw
//               (the channel, deg)
//   speeds      before · lowest · 1 s after the decisive touch
//   integrity   v_extreme's classes (foot jumps, crossings, knee pops, floats, slides) + angular spikes: pelvis yaw, shoulder-line yaw and roll
//               rates > 900 °/s (the owner's "whip torso 1000 °/s"), the pelvis's position jumps (> 4 cm in a tick)
//   node feint_measure.mjs [--only <title substring>] [--json f]
import fs from "node:fs";
import { makeSim, DT, ENV } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { CASES } from "../v_cases.js";
import { caseOpts, runCaseOn, summarize, exitMetrics } from "../v_run.js";
import { PlayBody } from "../u_body.js";
import { measure } from "./v_extreme.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = 180 / Math.PI, hyp = Math.hypot;
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function kneeDeg(J, X) { const a = J["thigh_" + X].j, b = J["shin_" + X].j, c = J["foot_" + X].j, u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]; return 180 - Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (hyp(...u) * hyp(...v))))) * DEG; }
export function feintCase(c, mirror = false) { const sim = makeSim("TL", Object.assign(caseOpts(c, mirror), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, mirror), t0 = r.t0, S = summarize(sim, t0), body = new PlayBody(env, sim);
  const st0 = sim.stateAt(t0), h0 = st0.h, ang = (mirror ? -1 : 1) * c.ang, exitSide = Math.sign(ang) || 1, fake = -exitSide, hq = h0 + ang / DEG;
  // (this world is left-handed: the lateral axis + = RIGHT of the entry line, a heading increasing = turning RIGHT; fake = −1 the left)
  const lat = (p) => (-(p[0] - st0.P[0]) * Math.sin(h0) + (p[1] - st0.P[1]) * Math.cos(h0));
  const sgnL = (s) => s;
  const X = exitMetrics(sim, t0, hq, c.mode), dec = X && X.dec && X.dec.t > t0 ? X.dec.t : null;
  const out = { title: c.title, mode: c.mode, ang, played: X ? X.label : null, skill: S.skills.map((x) => x.result).join(","), tDec: dec ? dec - t0 : null, total: X ? X.total : null, ctl: X ? X.ctl : null, vBefore: st0.s, vMin: Infinity, v1: dec ? sim.stateAt(Math.min(sim.t, dec + 1.0)).s : null };
  let prev = null, ser = [], maxDisp = 0, tLoad = null, tRev = null, tMaxDisp = null, shDrop = 0, trunkYaw = 0, pelYaw = 0, kneeLoad = 0, armAsym = 0, head = 0, spikes = [], pelJump = 0, falseStep = null;
  const tEnd = Math.min(sim.t, t0 + 2.0); for (let t = Math.max(0, t0 - 0.3); t <= tEnd; t += DT) { const p = body.pose(t), J = p.J, s = sim.stateAt(t), P = sim.planAt(t);
    const pel = J.pelvis.j, pl = lat(pel), towardFake = pl * sgnL(fake), hipV = [J.thigh_L.j[0] - J.thigh_R.j[0], J.thigh_L.j[1] - J.thigh_R.j[1]], shV = [J.upperArm_L.j[0] - J.upperArm_R.j[0], J.upperArm_L.j[1] - J.upperArm_R.j[1]];
    const hipYaw = Math.atan2(hipV[1], hipV[0]) + Math.PI / 2, shYaw = Math.atan2(shV[1], shV[0]) + Math.PI / 2, shRoll = Math.atan2(J.upperArm_L.j[2] - J.upperArm_R.j[2], hyp(...shV));   // (facing = the hip / shoulder line's normal; roll + = the left shoulder higher)
    if (t >= t0) { out.vMin = Math.min(out.vMin, s.s); ser.push([t - t0, towardFake]);
      if (!dec || t <= dec + 0.05) { if (towardFake > maxDisp) { maxDisp = towardFake; tMaxDisp = t - t0; }
        // (toward the fake: the fake side's shoulder lower (fake left: the left one lower = roll negative), the shoulders' / hips' yaw toward it)
        shDrop = Math.max(shDrop, shRoll * fake * DEG); trunkYaw = Math.max(trunkYaw, wrap(shYaw - hipYaw) * fake * DEG); pelYaw = Math.max(pelYaw, wrap(hipYaw - h0) * fake * DEG);
        const hands = [J.hand_R.j, J.hand_L.j].map((h) => (h[0] - pel[0]) * Math.cos(s.psi) + (h[1] - pel[1]) * Math.sin(s.psi)); armAsym = Math.max(armAsym, Math.abs(hands[0] - hands[1]));
        head = Math.max(head, (P.ch && P.ch.headYaw ? P.ch.headYaw.at(t) : 0) * fake); } }
    if (prev) { const dtt = DT, vl = (towardFake - prev.towardFake) / dtt; 
      const wP = Math.abs(wrap(hipYaw - prev.hipYaw)) / dtt * DEG, wS = Math.abs(wrap(shYaw - prev.shYaw)) / dtt * DEG, wR = Math.abs(shRoll - prev.shRoll) / dtt * DEG, jump = hyp(pel[0] - prev.pel[0], pel[1] - prev.pel[1]) - s.s * dtt;
      if (t >= t0 - 0.2) { for (const [k, w] of [["pelvis yaw", wP], ["shoulder yaw", wS], ["shoulder roll", wR]]) if (w > 900) spikes.push(`${k} ${w.toFixed(0)}°/s @${(t - t0).toFixed(2)}`); pelJump = Math.max(pelJump, jump); } }
    // (the false step: the fake-side foot's first landing after the request, its lateral offset from the pelvis and its toe-out)
    const fX = fake > 0 ? "R" : "L";   // (the fake side's foot)
    // (the false step: the technique's own stance — found in the plan by its kind — measured on the posed foot over its first 0.05 s)
    if (falseStep == null && P.stances && P.stances[fX]) { const FS = P.stances[fX].find((x) => /FALSE STEP/.test(x.kind || "")); if (FS && t >= FS.t0 + 0.02 && t <= FS.t0 + 0.06 && p.feet[fX].planted) { const a = p.feet[fX].ank; falseStep = { t: t - t0, t1: FS.t1 - t0, off: (lat(a) - pl) * fake, toe: wrap(p.feet[fX].yaw - h0) * fake * DEG }; } }
    if (falseStep && t - t0 <= falseStep.t1 && p.feet[fX].planted) kneeLoad = Math.max(kneeLoad, kneeDeg(J, fX));
    prev = { towardFake, hipYaw, shYaw, shRoll, pel, planted: { R: p.feet.R.planted, L: p.feet.L.planted } }; }
  // (false load begins: the pelvis's last crossing of 15 % of its maximum offset toward the fake (≥ 1.5 cm: above the gait's sway) before it; reversal begins: that maximum — the
  // lateral velocity turns toward the exit there.)
  if (tMaxDisp != null) { let i = ser.findIndex((x) => x[0] >= tMaxDisp - 1e-9); tRev = ser[i][0]; const lo = Math.max(0.015, 0.15 * maxDisp); while (i > 0 && ser[i - 1][1] > lo) i--; tLoad = ser[i][0]; }
  const exitPlant = dec ? (() => { const eX = exitSide > 0 ? "R" : "L", c2 = sim.plan; for (let t = dec; t < dec + 0.5; t += DT) { const f = body.pose(t).feet[eX]; if (f.planted) return t - t0; } return null; })() : null;
  const m = measure(sim, Math.round(Math.max(0, t0 - 0.3) / DT), 0);
  Object.assign(out, { tLoad, tMaxDisp, maxDisp, tRev, exitPlant, shDrop, trunkYaw, pelYaw, falseStep, kneeLoad, armAsym, head, spikes: spikes.slice(0, 6), nSpikes: spikes.length, pelJump, body: m.N, bodyEv: m.F.filter((f) => f.lvl === "normal").map((f) => `${f.kind} ${f.depth || f.deg || f.cm || f.air || ""} @${(f.t - 0.3).toFixed(2)}`), exits: S.exits.length, missed: S.missed });
  out.vMin = isFinite(out.vMin) ? out.vMin : null; return out; }
const f = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d));
export const line = (o) => `${o.played ? o.played.slice(0, 22).padEnd(22) : "—".padEnd(22)} ${o.skill.padEnd(7)} load ${f(o.tLoad)} · max fake ${f(o.maxDisp)} m @${f(o.tMaxDisp)} · reversal ${f(o.tRev)} · touch ${f(o.tDec)} · exit plant ${f(o.exitPlant)} · useful ${f(o.total)} · ctl +${f(o.ctl)} | shoulder drop ${f(o.shDrop, 0)}° · trunk ${f(o.trunkYaw, 0)}° · pelvis ${f(o.pelYaw, 0)}° · false step ${o.falseStep ? f(o.falseStep.off) + " m toe " + f(o.falseStep.toe, 0) + "°" : "—"} · knee ${f(o.kneeLoad, 0)}° · arms ${f(o.armAsym)} m · head ${f(o.head, 0)}° | v ${f(o.vBefore, 1)} → ${f(o.vMin, 1)} → ${f(o.v1, 1)} | body ${o.body.normal}/${o.body.slow}${o.bodyEv.length ? " [" + o.bodyEv.join("; ") + "]" : ""} · spikes ${o.nSpikes}${o.nSpikes ? " (" + o.spikes.slice(0, 2).join(", ") + ")" : ""} · pelvis jump ${f(o.pelJump * 100, 1)} cm · exits ${o.exits}`;
if ((process.argv[1] || "").endsWith("feint_measure.mjs")) { const only = opt("only", null), out = [];
  for (const c of CASES.filter((c) => c.tech === "BODY_FEINT_V2" && (!only || c.title.includes(only) || c.variant.includes(only)))) { const o = feintCase(c); out.push(Object.assign({ variant: c.variant }, o)); console.log(`■ ${c.variant.padEnd(18)} ${line(o)}`); }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

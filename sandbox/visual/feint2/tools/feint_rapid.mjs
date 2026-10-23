// feint2/tools/feint_rapid.mjs — BODY FEINT V2 under RAPID INPUT (v_cases BF_RAPID): each case as written and mirrored, measured on the posed
// body (PlayBody) from 0.3 s before the first request to the end. The owner's list: "the body must not snap pelvis, cross legs, teleport
// support, reverse planted foot, whip torso 1000 °/s, pop knees, reset arms"
//   v_extreme's classes   CROSS (legs) · JUMP (a foot / support teleporting) · KNEE (pops) · FLOAT · SWAP (a planted foot exchanged in place)
//   spikes                pelvis yaw / shoulder-line yaw / shoulder roll rates > 900 °/s
//   pelvis jump           the pelvis's position step beyond the body's speed (cm per tick); vertical: its height step in one tick
//   planted foot turned   a planted foot's yaw changing > 20° within one stance (pivot stances excepted) — the "reversed planted foot"
//   arms                  the largest hand step relative to the pelvis in one tick (cm; a reset arm is a step of several cm at 240 Hz)
//   requests              each intent's result (PLAYED / REJECTED / CANCELLED), CONTROLLED exits, missed contacts
//   node feint_rapid.mjs [--only <name substring>] [--json f]
import fs from "node:fs";
import { makeSim, DT, ENV } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { BF_RAPID } from "../v_cases.js";
import { caseOpts, runCaseOn, summarize } from "../v_run.js";
import { PlayBody } from "../u_body.js";
import { measure } from "./v_extreme.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = 180 / Math.PI, hyp = Math.hypot;
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export function rapidCase(c, mirror = false) { const sim = makeSim("TL", Object.assign(caseOpts(c, mirror), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, mirror), t0 = r.t0, S = summarize(sim, t0), body = new PlayBody(env, sim);
  let prev = null, spikes = [], pelJump = 0, pelJAt = "", pelZ = 0, pelZAt = "", handStep = 0, handAt = "", turned = [], wMax = { pel: 0, sh: 0, roll: 0 };
  for (let t = Math.max(0, t0 - 0.3); t <= sim.t; t += DT) { const p = body.pose(t), J = p.J, s = sim.stateAt(t), pel = J.pelvis.j;
    const hipV = [J.thigh_L.j[0] - J.thigh_R.j[0], J.thigh_L.j[1] - J.thigh_R.j[1]], shV = [J.upperArm_L.j[0] - J.upperArm_R.j[0], J.upperArm_L.j[1] - J.upperArm_R.j[1]];
    const hipYaw = Math.atan2(hipV[1], hipV[0]), shYaw = Math.atan2(shV[1], shV[0]), shRoll = Math.atan2(J.upperArm_L.j[2] - J.upperArm_R.j[2], hyp(...shV));
    const hands = ["R", "L"].map((X) => [J["hand_" + X].j[0] - pel[0], J["hand_" + X].j[1] - pel[1], J["hand_" + X].j[2] - pel[2]]);
    const feet = { R: { ...p.feet.R }, L: { ...p.feet.L } };
    if (prev) { const wP = Math.abs(wrap(hipYaw - prev.hipYaw)) / DT * DEG, wS = Math.abs(wrap(shYaw - prev.shYaw)) / DT * DEG, wR = Math.abs(shRoll - prev.shRoll) / DT * DEG;
      wMax.pel = Math.max(wMax.pel, wP); wMax.sh = Math.max(wMax.sh, wS); wMax.roll = Math.max(wMax.roll, wR);
      for (const [k, w] of [["pelvis yaw", wP], ["shoulder yaw", wS], ["shoulder roll", wR]]) if (w > 900) spikes.push(`${k} ${w.toFixed(0)}°/s @${(t - t0).toFixed(2)}`);
      { const pj = hyp(pel[0] - prev.pel[0], pel[1] - prev.pel[1]) - s.s * DT; if (pj > pelJump) { pelJump = pj; pelJAt = `@${(t - t0).toFixed(3)} ${sim.planAt(t).action.label}`; } } const dz = Math.abs(pel[2] - prev.pel[2]); if (dz > pelZ) { pelZ = dz; pelZAt = `@${(t - t0).toFixed(3)} ${sim.planAt(t).action.label}`; }
      for (let i = 0; i < 2; i++) { const hs = hyp(hands[i][0] - prev.hands[i][0], hands[i][1] - prev.hands[i][1], hands[i][2] - prev.hands[i][2]); if (hs > handStep) { handStep = hs; handAt = `${i ? "L" : "R"} @${(t - t0).toFixed(3)} ${sim.planAt(t).action.label}`; } }
      for (const X of ["R", "L"]) { const f = feet[X], q = prev.feet[X]; if (f.planted && q.planted && f.stance && q.stance && f.stance.id === q.stance.id && !f.stance.pivot) { const y0 = prev.yaw0[X] ?? q.yaw; prev.yaw0[X] = y0; const dy = Math.abs(wrap(f.yaw - y0)) * DEG; if (dy > 20 && !turned.some((x) => x.id === f.stance.id)) turned.push({ id: f.stance.id, X, deg: +dy.toFixed(0), t: +(t - t0).toFixed(2), kind: f.stance.kind }); } else prev.yaw0[X] = null; } }
    prev = { hipYaw, shYaw, shRoll, pel: pel.slice(), hands, feet, yaw0: prev ? prev.yaw0 : { R: null, L: null } }; }
  const m = measure(sim, Math.round(Math.max(0, t0 - 0.3) / DT), 0);
  return { name: c.name, mirror, requests: S.skills.map((x) => `${x.result}${x.played ? " " + x.played : ""}${x.result !== "PLAYED" && x.alt ? " → " + x.alt : ""} @${x.t.toFixed(2)}`), acts: S.phases.map((p) => `${p.label} @${p.tSel.toFixed(2)}${p.tDecisive != null ? "/" + p.tDecisive.toFixed(2) : ""}`),
    body: m.N, bodyEv: m.F.filter((f) => f.lvl !== "diag").map((f) => `${f.lvl === "normal" ? "‼" : ""}${f.kind} ${f.depth ?? f.deg ?? f.cm ?? f.air ?? ""} @${(f.t - 0.3).toFixed(2)} ${f.act || ""}`),
    spikes, wMax, pelJump, pelJAt, pelZ, pelZAt, handStep, handAt, turned, exits: S.exits.length, missed: S.missed }; }
const f = (x, d = 1) => (x == null || !isFinite(x) ? "—" : x.toFixed(d));
export const rline = (o) => `body ${o.body.normal}/${o.body.slow} · spikes ${o.spikes.length} (max °/s pelvis ${f(o.wMax.pel, 0)} · shoulders ${f(o.wMax.sh, 0)} · roll ${f(o.wMax.roll, 0)}) · pelvis jump ${f(o.pelJump * 100)} cm${o.pelJump > 0.008 ? " (" + o.pelJAt + ")" : ""} · vertical ${f(o.pelZ * 100)} cm${o.pelZ > 0.008 ? " (" + o.pelZAt + ")" : ""} · hand step ${f(o.handStep * 100)} cm${o.handStep > 0.05 ? " (" + o.handAt + ")" : ""} · planted foot turned ${o.turned.length} · exits ${o.exits} · missed ${o.missed}`;
if ((process.argv[1] || "").endsWith("feint_rapid.mjs")) { const only = opt("only", null), out = [], tot = { runs: 0, normal: 0, slow: 0, spikes: 0, turned: 0, exits: 0, missed: 0, pelJump: 0, handStep: 0 };
  for (const c of BF_RAPID.filter((c) => !only || c.name.includes(only))) for (const mir of [false, true]) { const o = rapidCase(c, mir); out.push(o); tot.runs++; tot.normal += o.body.normal; tot.slow += o.body.slow; tot.spikes += o.spikes.length; tot.turned += o.turned.length; tot.exits += o.exits; tot.missed += o.missed; tot.pelJump = Math.max(tot.pelJump, o.pelJump); tot.handStep = Math.max(tot.handStep, o.handStep);
    console.log(`■ ${(c.name + (mir ? " · MIRROR" : "")).padEnd(58)} ${rline(o)}\n     requests: ${o.requests.join(" | ")}\n     actions:  ${o.acts.join(" → ")}${o.bodyEv.length ? "\n     events:   " + o.bodyEv.slice(0, 6).join("; ") : ""}${o.spikes.length ? "\n     spikes:   " + o.spikes.slice(0, 4).join("; ") : ""}${o.turned.length ? "\n     turned:   " + JSON.stringify(o.turned.slice(0, 3)) : ""}`); }
  console.log(`■ TOTAL ${tot.runs} runs · body normal ${tot.normal} · slow ${tot.slow} · spikes ${tot.spikes} · planted foot turned ${tot.turned} · exits ${tot.exits} · missed ${tot.missed} · worst pelvis jump ${f(tot.pelJump * 100)} cm · worst hand step ${f(tot.handStep * 100)} cm`);
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify({ tot, out }, null, 1)); }

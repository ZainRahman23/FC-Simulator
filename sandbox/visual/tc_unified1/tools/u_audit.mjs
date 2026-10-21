// tc_unified1/tools/u_audit.mjs — THE BODY / CONTACT AUDIT on Astra's own scenarios and metric definitions (review/review-tools/audit.mjs),
// run through the unified stack: per configuration (presets of u_tc.js) and BALL ON / OFF — foot jumps (toe > 12 cm in one 1/240 s tick),
// intersection frames (leg capsule clearance < −2 cm), rendered root ↔ authoritative root, pelvis height range, airborne share, planted slides,
// support switches, and at every authoritative contact the contacting boot's gap to the ball (> 3 cm, > 10 cm, worst)
//   node u_audit.mjs [--configs A,AC,ACS,ACS4,FULL] [--ball] [--quick] [--json f]
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { presetLayers } from "../u_sim.js";
import { scenario, request } from "../../agility99/cases.js";
const A = process.argv, opt = (k, d) => { const i = A.indexOf("--" + k); return i > 0 ? A[i + 1] : d; }, has = (k) => A.includes("--" + k);
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) }, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i])), DEG = Math.PI / 180;
const ballOn = has("ball"), quick = has("quick"), specs = [];
// (Astra's scenario set: BALL ON — sprint × 30 / 90 / 180° snaps, rapid, repeat30, fast circle × phases 0 / .24 × both signs; BALL OFF — all speeds)
for (const mode of ballOn ? ["SPRINT"] : ["JOG", "RUN", "SPRINT"]) for (const phase of mode === "SPRINT" && !ballOn && !quick ? [0, 0.12, 0.24, 0.36] : [0, 0.24]) for (const sign of [1, -1]) {
  for (const a of ballOn ? [30, 90, 180] : quick ? [0, 45, 90, 180] : [0, 15, 30, 45, 60, 90, 120, 150, 180]) specs.push(scenario("snap", mode, a, phase, sign));
  for (const k of ballOn ? ["rapid", "repeat30", "circle-fast"] : quick ? ["rapid", "circle-fast", "stop"] : ["gradual", "ramp-fast", "repeat30", "rapid", "sequence", "circle", "circle-fast", "stop"]) specs.push(scenario(k, mode, 90, phase, sign)); }
export function auditOne(cfg, spec) { const sim = makeSim("TL", { layers: presetLayers(cfg), ballOn }), body = new PlayBody(env, sim), n = Math.round(spec.end / DT);
  for (let k = 0; k < n; k++) { const t = k * DT; sim.step(request(t < 0.2 ? null : spec.fn(t), spec.mode)); }
  const o = { id: spec.id, cfg, frames: 0, rootMax: 0, pelvisMinZ: 99, pelvisMaxZ: 0, footJumps: 0, maxFootStep: 0, intersectionFrames: 0, clearanceMin: 99, airFrames: 0, plantToeSlide: 0, supportSwitches: 0, contactCount: 0, contactOver3cm: 0, contactOver10cm: 0, contactGapMax: 0, gaps: [] }; let prev = null;
  for (let k = Math.round(spec.t0 / DT); k <= sim.k; k++) { const t = k * DT, s = sim.stateAt(t), p = body.pose(t), air = !p.feet.R.planted && !p.feet.L.planted; o.frames++;
    o.rootMax = Math.max(o.rootMax, dist(p.P, s.P)); o.pelvisMinZ = Math.min(o.pelvisMinZ, p.J.pelvis.j[2]); o.pelvisMaxZ = Math.max(o.pelvisMaxZ, p.J.pelvis.j[2]); const c = Math.min(...Object.values(p.clr)); o.clearanceMin = Math.min(o.clearanceMin, c); if (c < -0.02) o.intersectionFrames++; if (air) o.airFrames++;
    for (const F of ["R", "L"]) { if (prev) { const d = dist(p.J["toe_" + F].j, prev.J["toe_" + F].j); o.maxFootStep = Math.max(o.maxFootStep, d); if (d > 0.12) o.footJumps++; if (p.feet[F].planted !== prev.feet[F].planted) o.supportSwitches++;
        if (p.feet[F].planted && prev.feet[F].planted && p.feet[F].stance?.id === prev.feet[F].stance?.id) o.plantToeSlide += dist(p.J["toe_" + F].j.slice(0, 2), prev.J["toe_" + F].j.slice(0, 2)); } }
    prev = { J: p.J, feet: { R: { planted: p.feet.R.planted, stance: p.feet.R.stance }, L: { planted: p.feet.L.planted, stance: p.feet.L.stance } } }; }
  if (ballOn) for (const c of sim.contacts.filter((c) => c.t >= spec.t0 && !c.missed)) { const p = body.pose(c.t), g = p.gap?.[c.F]; const v = g == null ? null : typeof g === "number" ? g : g.gap; if (Number.isFinite(v)) { o.contactCount++; o.contactGapMax = Math.max(o.contactGapMax, v); if (v > 0.03) o.contactOver3cm++; if (v > 0.10) o.contactOver10cm++; o.gaps.push({ t: +c.t.toFixed(3), F: c.F, role: c.role, gap: +v.toFixed(3) }); } }
  o.airPct = (100 * o.airFrames) / o.frames; o.losses = 0; return o; }
if ((process.argv[1] || "").endsWith("u_audit.mjs")) { const cfgs = opt("configs", "A,AC,ACS").split(","), rows = [], t0 = performance.now();
  for (const cfg of cfgs) for (const sp of specs) rows.push(auditOne(cfg, sp));
  const sum = (R, k) => R.reduce((s, r) => s + r[k], 0), mx = (R, k) => Math.max(...R.map((r) => r[k]));
  console.log(`${ballOn ? "BALL ON" : "BALL OFF"} · ${specs.length} scenarios per configuration (Astra's set${quick ? ", quick" : ""}) · ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  for (const cfg of cfgs) { const R = rows.filter((r) => r.cfg === cfg);
    console.log(`  ${cfg.padEnd(5)} foot jumps ${String(sum(R, "footJumps")).padStart(4)} (max step ${(mx(R, "maxFootStep") * 100).toFixed(1)} cm) · intersection frames ${String(sum(R, "intersectionFrames")).padStart(4)} · root↔render max ${(mx(R, "rootMax") * 100).toFixed(1)} cm · pelvis ${Math.min(...R.map((r) => r.pelvisMinZ)).toFixed(3)}–${mx(R, "pelvisMaxZ").toFixed(3)} m · air ${(sum(R, "airFrames") / sum(R, "frames") * 100).toFixed(1)} %` +
      (ballOn ? ` · contacts ${sum(R, "contactCount")}: >3 cm ${sum(R, "contactOver3cm")}, >10 cm ${sum(R, "contactOver10cm")}, worst ${(mx(R, "contactGapMax") * 100).toFixed(1)} cm` : "")); }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(rows, null, 1)); }

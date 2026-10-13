// SUPPORT-1 disturbance sweep on one recipient candidate (default: the current V2 recipient = C3 on canonical M1b, frozen contact model).
// Families (all physically explicit, recorded): GRID — floating capsule impactors (direction × contact height × mass × speed); SLIDE — ground-sliding
// bodies (a sliding tackler's leg / hip: contact height = radius, decelerated by their own turf friction); PULSE — prescribed lateral force pulses on
// the left shank (impulse × duration × height); LOAD — the GRID's lateral cases with a constant pelvis preload that shifts weight onto one foot;
// REPLAY — the PVP-0 recorded tackler contact forces on each recipient body at the recorded points (FULL, HORIZONTAL-only, STRIKE-window-only).
// usage (worktree root): node .../s1_sweep.mjs --cand <candidate id> --families GRID,SLIDE,PULSE,LOAD,REPLAY --out <json> [--pvp0 <records dir>]
import fs from "fs"; import zlib from "zlib"; import path from "path";
const LAB = await import(new URL("./s1_lab.mjs", import.meta.url).href), MET = await import(new URL("./s1_metrics.mjs", import.meta.url).href), CAND = await import(new URL("./s1_candidates.mjs", import.meta.url).href);
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, cand = CAND.get(arg("cand", "V2")), fams = arg("families", "GRID,SLIDE,PULSE,LOAD,REPLAY").split(",");
const ONSET = 240, STEPS = 840, H = 1 / 240;
export const DIRS = { L: [0, 0, -1], PVP: [-0.26, 0, -0.966], R: [0, 0, 1], B: [1, 0, 0], F: [-1, 0, 0], BL: [0.707, 0, -0.707] };
const TGT = { L: [0.03, 0, 0.18], PVP: [0.03, 0, 0.18], BL: [0.03, 0, 0.18], R: [0.03, 0, -0.18], B: [0.03, 0, 0], F: [0.03, 0, 0] };
export function gridJobs() { const J = [];
  for (const dk of ["L", "PVP", "R", "B", "F", "BL"]) for (const h of [0.05, 0.15, 0.30, 0.45]) for (const m of [8, 20, 40, 75]) for (const v of [2, 4, 6]) {
    if (dk === "PVP" && h !== 0.30) continue;                                          // the PVP-0 direction at the PVP-0 contact height only
    J.push({ fam: "GRID", label: `G_${dk}_h${Math.round(h * 100)}_m${m}_v${v}`, dir: DIRS[dk], impactor: { shape: "capsule", r: 0.05, half: dk === "B" || dk === "F" ? 0.35 : 0.2, mode: "float", dir: DIRS[dk], target: TGT[dk], startDist: 0.5, m, speed: v, height: h } }); }
  return J; }
export function slideJobs() { const J = []; for (const dk of ["L", "B", "R"]) for (const r of [0.06, 0.12]) for (const m of [40, 75]) for (const v of [3, 5])
  J.push({ fam: "SLIDE", label: `S_${dk}_r${Math.round(r * 100)}_m${m}_v${v}`, dir: DIRS[dk], impactor: { shape: "capsule", r, half: dk === "B" ? 0.35 : 0.25, mode: "slide", dir: DIRS[dk], target: TGT[dk], startDist: 0.55, m, speed: v } }); return J; }
export function pulseJobs() { const J = [], sh = LAB.SPEC.bodies[LAB.BI("shank_L")]; for (const hp of [0.15, 0.30]) for (const Jn of [10, 25, 50, 75, 100]) for (const ms of [25, 50, 100, 200]) {
  const steps = Math.round(ms / 1000 * 240), F = [0, 0, -Jn / (steps * H)], pLocal = [-0.04, hp - sh.origin[1], -0.01];   // body-local (canonical axes, left = −x): lateral surface of the left shank, hp above the sole
  J.push({ fam: "PULSE", label: `P_h${Math.round(hp * 100)}_J${Jn}_d${ms}`, dir: [0, 0, -1], pulses: [{ from: ONSET, to: ONSET + steps, body: "shank_L", F, pLocal }] }); } return J; }
// preload ±40 N on the pelvis (the largest tested that the twin stands under: ±60 N twins fall in ≈ 2 s — a C3 lateral-lean limit; ±40 N gives ≈ 26 / 74 % load shares)
export function loadJobs() { const J = []; for (const pre of [-40, 40]) for (const h of [0.05, 0.15]) for (const m of [20, 40]) for (const v of [2, 4])
  J.push({ fam: "LOAD", label: `L_pre${pre > 0 ? "L" : "R"}_h${Math.round(h * 100)}_m${m}_v${v}`, dir: DIRS.L, preload: [0, 0, pre], impactor: { shape: "capsule", r: 0.05, half: 0.2, mode: "float", dir: DIRS.L, target: TGT.L, startDist: 0.5, m, speed: v, height: h } }); return J; }
// PVP-0 recorded cross forces on the recipient → per-step pulses at the recorded (impulse-weighted) point, body-local at the recorded body pose
export function replayJobs(dir) { if (!dir) return []; const J = [], SR = LAB.SPEC;
  for (const cse of ["LIGHT", "NOMINAL", "HEAVY"]) { const o = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, cse + ".json.gz")))), R = o.recs; let first = null;
    for (const r of R) if (r.contacts.some(c => c.kind === "cross" && c.Jn > 0)) { first = r.n; break; }
    const mk = (variant, maxSteps) => { const pulses = [];
      for (const r of R) { if (r.n < first || r.n >= first + maxSteps) continue; const by = {};
        for (const c of r.contacts.filter(c => c.kind === "cross")) { const rb = c.a[0] === "runner" ? c.a[1] : c.b[1], Jv = c.a[0] === "runner" ? V.sc(c.J2, -1) : c.J2, w = c.points.reduce((s, p) => s + Math.max(0, p.lam), 0);
          const pt = w > 0 ? V.sc(c.points.reduce((s, p) => V.add(s, V.sc(p.p, Math.max(0, p.lam))), [0, 0, 0]), 1 / w) : c.points[0].p; const b = by[rb] = by[rb] || { J: [0, 0, 0], pw: [0, 0, 0], w: 0 };
          b.J = V.add(b.J, Jv); b.pw = V.add(b.pw, V.sc(pt, V.len(Jv) + 1e-12)); b.w += V.len(Jv) + 1e-12; }
        for (const [rb, b] of Object.entries(by)) { let Jv = b.J; if (variant === "HORIZ") Jv = [Jv[0], 0, Jv[2]]; if (V.len(Jv) < 1e-6) continue;
          const bi = SR.bodies.findIndex(x => x.name === rb), st = r.S[bi], pw = V.sc(b.pw, 1 / b.w), pLocal = Q.rot(Q.conj(st.rot), V.sub(pw, st.pos)), s = r.n - 1 - first + ONSET;
          pulses.push({ from: s, to: s + 1, body: rb, F: V.sc(Jv, 1 / H), pLocal }); } }
      return pulses; };
    for (const [variant, maxSteps] of [["FULL", 480], ["HORIZ", 480], ["STRIKE", 24]]) J.push({ fam: "REPLAY", label: `R_${cse}_${variant}`, dir: DIRS.PVP, pulses: mk(variant, maxSteps), replayOf: cse, variant }); }
  return J; }
export async function runJob(cand, job, keep = false) { const o = await LAB.runLab({ label: job.label, steps: STEPS, impOnset: ONSET, impactor: job.impactor || null, pulses: job.pulses || [], preload: job.preload || null, ctrl: cand.ctrl, body: cand.body, contactRule: cand.contactRule });
  return o; }
export async function twinOf(cand, preload = null) { return LAB.runLab({ label: "TWIN", steps: STEPS, impOnset: 1e9, impactor: { shape: "capsule", r: 0.05, half: 0.2, mode: "float", dir: DIRS.L, target: TGT.L, startDist: 0.5, m: 20, speed: 4, height: 0.15 }, preload, ctrl: cand.ctrl, body: cand.body, contactRule: cand.contactRule }); }
if (process.argv[1] && process.argv[1].endsWith("s1_sweep.mjs")) {
  const t0 = Date.now(), tw = await twinOf(cand), tw2 = await twinOf(cand), out = { candidate: cand.id, describe: cand.describe, twinHash: tw.finalHash, determinism: { twin: [tw.finalHash, tw2.finalHash] }, twinQuiet: null, runs: [] };
  const twins = { "0": tw }; for (const pre of [-40, 40]) twins[pre] = await twinOf(cand, [0, 0, pre]);
  { const R = tw.recs, y = R.map(r => r.S[0].pos[1]), c = R.map(r => r.com); out.twinQuiet = { pelvisYRangeMm: +((Math.max(...y) - Math.min(...y)) * 1000).toFixed(2), comXZRangeMm: +(Math.max(...c.map(p => Math.hypot(p[0] - c[0][0], p[2] - c[0][2]))) * 1000).toFixed(2), stop: tw.stop }; }
  let jobs = []; if (fams.includes("GRID")) jobs.push(...gridJobs()); if (fams.includes("SLIDE")) jobs.push(...slideJobs()); if (fams.includes("PULSE")) jobs.push(...pulseJobs()); if (fams.includes("LOAD")) jobs.push(...loadJobs()); if (fams.includes("REPLAY")) jobs.push(...replayJobs(arg("pvp0")));
  const only = arg("only"); if (only) jobs = jobs.filter(j => new RegExp(only).test(j.label));
  let cpuStep = 0, nStep = 0;
  for (const job of jobs) { const o = await runJob(cand, job), tref = job.preload ? twins[job.preload[2]] : tw, m = MET.metrics(o, tref, job.dir); cpuStep += o.wallMs; nStep += o.recs.length;
    out.runs.push({ label: job.label, fam: job.fam, hash: o.finalHash, impactor: job.impactor ? { m: job.impactor.m, speed: job.impactor.speed, height: job.impactor.height ?? job.impactor.r, mode: job.impactor.mode, dir: job.impactor.dir, momentumNs: job.impactor.m * job.impactor.speed } : null, preload: job.preload || null, ...m });
    const x = out.runs.at(-1); console.log(`${x.label.padEnd(24)} ${x.cls.padEnd(20)} J ${String(x.impulseNs).padStart(7)} fall ${String(x.fallS).padStart(6)} dir ${String(x.fallDirAlongSweep).padStart(5)} footL disp ${x.feet?.L.dispM} slip ${x.feet?.L.slipM} footR disp ${x.feet?.R.dispM} slip ${x.feet?.R.slipM} pel ${x.pelvisTrans06M}/${x.pelvisRot06Deg}° drop10 ${JSON.stringify(x.atDrop10cm)}`); }
  // determinism of a disturbed run
  if (jobs.length) { const a = await runJob(cand, jobs[0]), b = await runJob(cand, jobs[0]); out.determinism.disturbed = [jobs[0].label, a.finalHash, b.finalHash]; }
  out.cpuMsPerStep = +(cpuStep / Math.max(1, nStep)).toFixed(3); out.wallS = (Date.now() - t0) / 1000; fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log("wall", out.wallS, "s; ms/step (instrumented)", out.cpuMsPerStep, "determinism", JSON.stringify(out.determinism)); }

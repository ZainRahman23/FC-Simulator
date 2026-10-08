// CF-6 failure timeline — READ-ONLY. Time-resolves actuator saturation and leg hard-limit margins around a CF-6 failure, which the per-step records only aggregate.
// Re-executes the UNMODIFIED harness (sandbox/visual/physchar2/tools/loco_probe.mjs, imported as-is) with the evidence file's own run arguments and only READS
// the simulator after each physics tick (G3Sim.prototype.tick wrapped: original tick first). Nothing is written to the simulation. The timeline is reported ONLY if
// every per-second state hash and the end hash equal the authoritative evidence (same rule as tools/cf5_pose_record.mjs).
// Per 1/60 s it prints: harness phase, lifecycle states, Fz/BW, forward + lateral COM speed, DCM relative to the stance centroid (walking frame),
// saturated axis-ticks in that window (all / ankle inversion), and the lowest leg hard-limit margin (deg, same formula as the harness).
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../scripts/fail_timeline.mjs <evidence.json.gz> <t0> <t1>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import os from "os"; import { pathToFileURL } from "url";
const ROOT = process.cwd(), T = path.join(ROOT, "sandbox/visual/physchar2");
const { G3Sim } = await import(pathToFileURL(path.join(T, "gates/v2_g3.js")).href);
const { decompose } = await import(pathToFileURL(path.join(T, "spec/v2_joints.js")).href);
const { kneeEnvelopeV2K } = await import(pathToFileURL(path.join(T, "spec/v2_knee.js")).href);
const [EVID, T0s, T1s] = process.argv.slice(2), T0 = +T0s, T1 = +T1s;
const ev = JSON.parse(zlib.gunzipSync(fs.readFileSync(EVID)).toString()), R = ev.run;
if (!R.cf6) throw new Error("not a CF-6 evidence file");
const tmp = path.join(os.tmpdir(), `cf6_fail_timeline_${process.pid}.json.gz`);
const args = [`--human=${R.human}`, `--first=${R.first}`, `--steps=${R.steps}`, `--cf=6`, `--Tst=${R.cf6.TstStartup}`, `--S=${R.cf6.S}`, `--Tds6=${R.cf6.TdsEach}`, `--Tss6=${R.cf6.Tss}`, `--vw=${R.cf6.vTarget}`, `--level=${R.cf6.level}`, `--Tsw=${R.Tsw}`, `--hz=${R.hz}`, `--apex=${R.apex}`, `--relMax=${R.relMax}`, `--out=${tmp}`];
const D = 180 / Math.PI, rows = []; let win = null;
const tick0 = G3Sim.prototype.tick;
G3Sim.prototype.tick = function () { const ok = tick0.call(this), t = this.n * this.dt;
  if (t >= T0 - 1e-9 && t <= T1 + 1e-9) {
    const spec = this.spec, P = this.P, st = this.st, JI = (nm) => spec.joints.findIndex((j) => j.name === nm);
    const LEG = ["hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R"].map(JI), qs = P.jd.map((d) => P.qcs(d, st.map((b) => b.rot)));
    let hm = Infinity, hw = null;
    for (const k of LEG) { const d = P.jd[k], v = decompose(qs[k]), th = [v.tw, v.sy, v.sz];   // the harness's hardMargin, verbatim
      d.axes.forEach((a, i) => { if (!a) return; let x; if (a.v2k) { const e = kneeEnvelopeV2K(P.anat(d, qs[k], "flex")), r = P.anat(d, qs[k], "rot"); x = Math.min(r - e.hard[0], e.hard[1] - r); }
        else { const h = P.hardOf(k, i, qs); x = Math.min(th[i] - h[0], h[1] - th[i]) * D; } if (x < hm) { hm = x; hw = spec.joints[k].name; } }); }
    win = win || { sat: 0, inv: 0, hm: Infinity, hw: null };
    for (const r of this.actRes || []) if (r.sat) { win.sat++; const nm = spec.joints[r.k].name; if ((nm === "ankle_L" || nm === "ankle_R") && r.i === 2) win.inv++; }
    if (hm < win.hm) { win.hm = hm; win.hw = hw; }
    if (this.n % 4 === 0) { rows.push({ t: +t.toFixed(4), ...win, hm: +win.hm.toFixed(2) }); win = null; } }
  return ok; };
process.argv = [process.argv[0], path.join(T, "tools/loco_probe.mjs"), ...args];
await import(pathToFileURL(path.join(T, "tools/loco_probe.mjs")).href);
G3Sim.prototype.tick = tick0;
const re = JSON.parse(zlib.gunzipSync(fs.readFileSync(tmp)).toString()); fs.unlinkSync(tmp);
const keys = Object.keys(ev.hashes), match = keys.filter((k) => re.hashes[k] === ev.hashes[k]).length, ok = re.hashEnd === ev.hashEnd && match === keys.length;
console.log(`regeneration vs authoritative evidence: per-second hashes ${match}/${keys.length}, end ${re.hashEnd} vs ${ev.hashEnd} → ${ok ? "IDENTICAL" : "MISMATCH"}`);
if (!ok) process.exit(2);
// join with the evidence trace (same 1/60 s instants) for the kinematics
const C = ev.traceCols, ix = Object.fromEntries(C.map((c, i) => [c, i])), WF = ev.walkingFrame, tr = new Map(ev.trace.map((r) => [r[0].toFixed(4), r]));
console.log("t        phase    states                    FzBW L/R     vFwd   vLat   xiFwd-c  xiLat-c  sat inv  hardMin");
for (const w of rows) { const r = tr.get(w.t.toFixed(4)); if (!r) continue;
  const v = r[ix.comV], xi = r[ix.xi], fz = r[ix.FzBW], stt = r[ix.states], sh = r[ix.cmdShare] || [0.5, 0.5];
  const fL = r[ix.footL], fR = r[ix.footR], c = sh[0] >= sh[1] ? fL : fR, dx = xi[0] - c[0], dz = xi[1] - c[2];
  const fwd = dx * WF.w[0] + dz * WF.w[1], lat = dx * WF.r[0] + dz * WF.r[1];
  console.log(`${w.t.toFixed(3).padEnd(8)} ${String(r[ix.ph]).padEnd(8)} ${stt.join("/").padEnd(25)} ${fz.map((x) => x.toFixed(2)).join("/").padEnd(12)} ${(v[0] * WF.w[0] + v[2] * WF.w[1]).toFixed(3).padStart(6)} ${(v[0] * WF.r[0] + v[2] * WF.r[1]).toFixed(3).padStart(6)} ${(fwd * 1000).toFixed(0).padStart(8)} ${(lat * 1000).toFixed(0).padStart(8)} ${String(w.sat).padStart(4)} ${String(w.inv).padStart(3)}  ${w.hm.toFixed(2)} ${w.hw}`); }

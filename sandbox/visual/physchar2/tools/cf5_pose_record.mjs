// ═══ physchar2/tools/cf5_pose_record.mjs — PRESENTATION ONLY: full-body pose recording of an authoritative CF-5 or CF-6 run, for the replay viewer (viewer/cf5_replay.html) ═══
// The authoritative CF-5 evidence (tools/loco_probe.mjs --cf=5 --out) stores a 60 Hz telemetry trace (COM, pelvis / feet positions, DCM, CoP, contact states, loads) and
// the running state hash every second — not the full-body pose. This tool regenerates the pose of THAT run without changing anything: it re-executes the UNMODIFIED
// harness (tools/loco_probe.mjs, imported as-is) with the arguments read from the evidence file's own run block, and only READS the body states after each physics
// tick (G3Sim.prototype.tick wrapped: original tick first, then a copy of st[i].pos / st[i].rot every 4 ticks = the trace cadence). Nothing is written to the
// simulation. The recording is accepted ONLY if every per-second state hash and the end hash equal the authoritative evidence; otherwise nothing is written.
// The replay file carries the run's own collision triangles (World.bodyTriangles, body-local, as the review viewers draw them), the recorded poses, and — copied
// verbatim from the authoritative evidence — the telemetry trace and per-step records used for overlays.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/cf5_pose_record.mjs <evidence.json.gz> <out.json.gz>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import os from "os"; import { fileURLToPath, pathToFileURL } from "url";
import { G3Sim } from "../gates/v2_g3.js";
const here = path.dirname(fileURLToPath(import.meta.url)), [EVID, OUTF] = process.argv.slice(2);
if (!EVID || !OUTF) throw new Error("usage: cf5_pose_record.mjs <evidence.json.gz> <out.json.gz>");
const ev = JSON.parse(zlib.gunzipSync(fs.readFileSync(EVID)).toString()), R = ev.run;
const isCF6 = !!R.cf6 && /^CF-6/.test(R.cf || ""); if (!isCF6 && !(R.cf5 && /^CF-5/.test(R.cf || ""))) throw new Error("not a CF-5 / CF-6 evidence file");
// the harness arguments exactly as the evidence records them (every other argument is the harness default, as when the evidence was produced)
const tmp = path.join(os.tmpdir(), `cf5_pose_record_${process.pid}.json.gz`);
const args = isCF6 ? [`--human=${R.human}`, `--first=${R.first}`, `--steps=${R.steps}`, `--cf=6`, `--Tst=${R.cf6.TstStartup}`, `--S=${R.cf6.S}`, `--Tds6=${R.cf6.TdsEach}`, `--Tss6=${R.cf6.Tss}`, `--vw=${R.cf6.vTarget}`, `--level=${R.cf6.level}`, `--Tsw=${R.Tsw}`, `--hz=${R.hz}`, `--apex=${R.apex}`, `--relMax=${R.relMax}`, `--out=${tmp}`]
  : [`--human=${R.human}`, `--first=${R.first}`, `--steps=${R.steps}`, `--cf=5`, `--Tst=${R.cf5.Tst}`, `--S=${R.cf5.S}`, `--Tsw=${R.Tsw}`, `--hz=${R.hz}`, `--apex=${R.apex}`, `--relMax=${R.relMax}`, `--out=${tmp}`];
// passive recorder: original tick, then read-only copies of the body states
const r6 = (x) => Math.round(x * 1e6) / 1e6, frames = []; let geo = null;
const tick0 = G3Sim.prototype.tick;
G3Sim.prototype.tick = function () { const ok = tick0.call(this);
  if (!geo) geo = { bodies: this.spec.bodies.map((b, i) => ({ name: b.name, side: b.side || null, tris: Array.from(this.w.bodyTriangles(i), (v) => Math.round(v * 1e5) / 1e5) })), dt: this.dt, feet: this.ctrl.feet.slice() };
  if (ok && this.n % 4 === 0) frames.push([r6(this.n * this.dt), ...this.st.flatMap((b) => [...b.pos.map(r6), ...b.rot.map(r6)])]);
  return ok; };
process.argv = [process.argv[0], path.join(here, "loco_probe.mjs"), ...args];
await import(pathToFileURL(path.join(here, "loco_probe.mjs")).href);   // runs the unmodified harness to its own end (it writes `tmp` and prints its summary line)
G3Sim.prototype.tick = tick0;
const re = JSON.parse(zlib.gunzipSync(fs.readFileSync(tmp)).toString()); fs.unlinkSync(tmp);
const keys = Object.keys(ev.hashes), match = keys.filter((k) => re.hashes[k] === ev.hashes[k]).length, endOk = re.hashEnd === ev.hashEnd;
const verified = endOk && match === keys.length && Object.keys(re.hashes).length === keys.length;
console.log(`pose regeneration vs authoritative evidence: per-second hashes ${match}/${keys.length}, end ${re.hashEnd} vs ${ev.hashEnd} → ${verified ? "IDENTICAL" : "MISMATCH"}`);
if (!verified) { console.error("MISMATCH: no replay file written"); process.exit(2); }
const out = { kind: (isCF6 ? "CF-6" : "CF-5") + " full-body replay (presentation only)", source: path.relative(path.join(here, "../../../.."), path.resolve(EVID)), run: R, verification: { perSecondHashes: `${match}/${keys.length}`, hashEnd: ev.hashEnd, regeneratedHashEnd: re.hashEnd, identical: true },
  physicalSteps: ev.physicalSteps, endT: ev.endT, walkingFrame: ev.walkingFrame, dt: geo.dt, frameEveryTicks: 4, feet: geo.feet, bodies: geo.bodies,
  frameLayout: "[t, then per body (spec order): px, py, pz, qx, qy, qz, qw]", frames,
  telemetry: { cols: ev.traceCols, rows: ev.trace }, steps: ev.steps.map((s) => ({ k: s.k, swing: s.swing, tail: !!s.tail, tCommand: s.cmd ? s.cmd.t : null, tLiftoff: s.seq ? s.seq.tAir : null, tTouchdown: s.seq ? s.seq.tTDm : null, tSupport: s.seq ? s.seq.doneT ?? null : null,
    physical: !!(s.result && s.result.physical), comFwdAtTouchdown: s.result && s.result.cf4 && s.result.cf4.atTouchdown ? s.result.cf4.atTouchdown.comV[0] : null })) };
fs.writeFileSync(OUTF, zlib.gzipSync(JSON.stringify(out)));
console.log(`wrote ${OUTF}: ${frames.length} frames × ${geo.bodies.length} bodies (${(fs.statSync(OUTF).size / 1e6).toFixed(2)} MB gz)`);

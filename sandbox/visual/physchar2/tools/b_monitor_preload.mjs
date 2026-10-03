// ═══ physchar2/tools/b_monitor_preload.mjs — INVESTIGATION B: invalid-turf-manifold monitor for ANY runner (G1 / G2 / G3, incl. forked workers) ═══
// Load with NODE_OPTIONS="--import=<abs path of this file>" and B_MONITOR_OUT=<dir>. Wraps V2JoltWorld.prototype.step (same module instance as
// the runner's: ESM caches by URL) and, after every physics step, checks every turf manifold the contact listener recorded: the normal must
// point up out of the turf top (n_y ≥ 0.5) and the turf-side contact points must lie on the top surface (|y| ≤ 2 mm). Violations are appended
// to <dir>/<pid>.jsonl with the current job (captured from the worker's IPC messages); a per-process tally is written at exit. Observation only:
// it never changes the simulation (the gate results are bit-identical with and without it). DIAGNOSTIC ONLY.
import fs from "fs"; import path from "path";
const dir = process.env.B_MONITOR_OUT; if (dir) fs.mkdirSync(dir, { recursive: true });
const { V2JoltWorld } = await import(new URL("../core/v2_jolt.js", import.meta.url));
let job = null; process.on("message", (m) => { if (m && typeof m === "object" && !m.ready) job = m; });
const tally = { pid: process.pid, steps: 0, turfManifolds: 0, invalid: 0, worlds: 0 }; let seq = 0;
const file = dir ? path.join(dir, process.pid + ".jsonl") : null;
const orig = V2JoltWorld.prototype.step;
V2JoltWorld.prototype.step = function (dt, cs) {
  orig.call(this, dt, cs); if (this._bId == null) { this._bId = ++seq; tally.worlds++; } this._bN = (this._bN || 0) + 1; tally.steps++;
  for (const c of this.contacts) { if ((c.a === -1) === (c.b === -1) || c.a < -1 || c.b < -1) continue; tally.turfManifolds++;
    const tf = c.a === -1, ny = tf ? c.normal[1] : -c.normal[1], pT = tf ? c.pts : c.pts2; let yl = Infinity, yh = -Infinity; for (const p of pT) { yl = Math.min(yl, p[1]); yh = Math.max(yh, p[1]); }
    if (ny < 0.5 || yl < -0.002 || yh > 0.002) { tally.invalid++;
      if (file) fs.appendFileSync(file, JSON.stringify({ pid: process.pid, world: this._bId, step: this._bN, job: job ? { group: job.group, key: job.key ?? job.sc ?? null, human: job.human, id: job.id, eval: job.eval } : null,
        body: this.spec.bodies[tf ? c.b : c.a].name, piece: tf ? c.sb : c.sa, ny: +ny.toFixed(4), turfYmm: [+(yl * 1000).toFixed(1), +(yh * 1000).toFixed(1)], depthMm: +(c.depth * 1000).toFixed(3) }) + "\n"); } }
};
process.on("exit", () => { if (dir) fs.writeFileSync(path.join(dir, process.pid + ".tally.json"), JSON.stringify(tally)); });

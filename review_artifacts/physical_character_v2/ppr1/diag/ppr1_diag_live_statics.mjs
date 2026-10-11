// PPR-1 DIAGNOSTIC (labelled; not a candidate law, not B): is A's quiet-standing fall caused by its FROZEN statics bias? A' = the same PostureDriver
// (same K, D, entry-pose targets, same support flags) evaluated EVERY step on the current state — i.e. statics recomputed continuously, zero latency.
// The runner alone (SOLO), PVP-1A-DX entry, 4 s. Read-only with respect to every record.
// usage: V2_KNEE_MODEL=v2k node ppr1_diag_live_statics.mjs --fixture <PVP1A_FIXTURE.json> --out <run.json.gz>
import fs from "fs"; import zlib from "zlib";
const { runOne } = await import(new URL("../scripts/ppr1_run.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
class LiveStatics { constructor(plant, c) { this.c = c; this.plant = plant; this.params = { id: "DIAG live statics (PostureDriver every step)" }; }
  command(c, st, ev, n) { const cmd0 = c.pd.compute(st, ev, this.plant.dt, c.flags); return { cmd: cmd0.map(r => (r ? r.map(x => ({ K: x.K, D: x.D, tau0: x.tau0 })) : null)) }; }
  after() {} info() { return null; } meta() { return this.params; } entryInfo() { return null; } }
const FIX = JSON.parse(fs.readFileSync(arg("fixture"))), o = await runOne({ fixtureObj: FIX, law: "A", scene: "SOLO", steps: 960, label: "DIAG_liveStatics", lawFactory: (p, c) => new LiveStatics(p, c) });
fs.writeFileSync(arg("out"), zlib.gzipSync(JSON.stringify(o))); console.log("final", o.finalHash, o.recs.length);

// PVP-0 runner: one two-character run (pvp0_plant.mjs). Recipient = the frozen C3 exactly as committed (balance2/c3/c3_ctrl.mjs + params/C3.json, on
// the canonical M1b body balance1/params/B1_BODY.json, from the PPR-3 standing entry). Tackler = the V1-matched V2 body (the PVP-1A tackler spec) on
// the canonical M1b body, driven by the SLIDE-A1 K tracker from K clip time SETUP.t0 at step `activate`, entering with K's own body velocities at t0
// plus (s − 1) × K's horizontal COM velocity (s = the strength's approach-speed factor; the single varied external parameter).
// usage (worktree root): node .../pvp0_run.mjs --case NOMINAL|LIGHT|HEAVY|TWIN|CALIB --out <rec.json.gz> [--steps N]
import fs from "fs"; import zlib from "zlib";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q, IL } = PL;
const { loadJolt } = await import(PL.P2 + "core/v2_jolt.js"), MB = await import(RA + "balance1/scripts/b1_body.mjs"), { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs");
const KM = await import(new URL("./pvp0_k.mjs", import.meta.url).href), { KTracker } = await import(new URL("./pvp0_tracker.mjs", import.meta.url).href), { Pvp0Plant } = await import(new URL("./pvp0_plant.mjs", import.meta.url).href);
const J = (p) => JSON.parse(fs.readFileSync(new URL(p, RA))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const SETUP = JSON.parse(fs.readFileSync(new URL("../PVP0_SETUP.json", import.meta.url)));
const Jolt = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js");
// the tackler's start (local frame): K pose at t0, placed by the setup offset for this strength; velocities as above
export function tacklerStart(s, offset) { const fi = KM.frameAt(SETUP.t0), pose = KM.v2Pose(fi, offset), vel = KM.v2Vel(fi, offset), B = KM.SPEC.bodies, M = B.reduce((a, b) => a + b.mass, 0);
  const vcom = V.sc(vel.reduce((a, x, i) => V.add(a, V.sc(x.v, B[i].mass)), [0, 0, 0]), 1 / M), dv = [(s - 1) * vcom[0], 0, (s - 1) * vcom[2]];
  return { pose, vel: vel.map(x => ({ v: V.add(x.v, dv), w: x.w })), vcom, vcomScaled: V.add(vcom, dv) }; }
export function offsetFor(s) { const P = SETUP.placement; return [P.x, P.yLift, P.zBase + s * P.dzComPerUnitSpeed]; }
export async function run(cse, steps) { const FIX = J("ppr3/fixture/PPR3_STANDING_ENTRY.json"), C3P = J("balance2/c3/params/C3.json"), BODY = J("balance1/params/B1_BODY.json");
  const s = cse === "TWIN" ? 1 : cse === "CALIB" ? 1 : SETUP.speeds[cse], off = cse === "CALIB" ? V.add(offsetFor(1), SETUP.calib.awayOffset) : offsetFor(s), T = tacklerStart(s, off);
  const targets = KM.targets(SETUP.t0, steps - SETUP.activate + 2), activate = cse === "TWIN" ? Infinity : SETUP.activate;
  const entries = { runner: FIX.write.runner, tackler: { poses: T.pose, vel: T.pose.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })) } };
  let cR = null, cT = null; const sim = new Pvp0Plant(Jolt, entries, { runner: FIX.flags.runner, tackler: { L: false, R: false } }, "N2", { O: FIX.O, instrument: true, maxSteps: steps,
    law: (p, c) => new MB.M1bBody(p, c, BODY, (cR = new C3Controller(C3P))), lawT: (p, c) => new MB.M1bBody(p, c, BODY, (cT = new KTracker({ targets, activate: SETUP.activate, t0: SETUP.t0 }))), activate, tacklerVel: T.vel });
  const out = { protocol: "PVP-0", case: cse, speedFactor: s, offset: off, tacklerVcom: T.vcomScaled, setup: SETUP, steps }, t0 = performance.now();
  while (sim.n < steps) { if (!sim.tick()) break; const r = sim.recs[sim.recs.length - 1], bad = Object.entries(r.chars).find(([, c]) => !c.integrity.finite || c.integrity.maxSpeed > 25); if (bad) { out.stop = { step: sim.n, who: bad[0], reason: bad[1].integrity.finite ? "speed" : "non-finite" }; break; } }
  out.wallMs = performance.now() - t0; out.cpu = sim.cpu; out.recs = sim.recs; out.trackerLog = cT ? cT.log : null; out.recipientCtrl = cR ? cR.meta() : null; out.tracker = cT ? cT.meta() : null;
  out.slips = { recipient: sim.runner.act.slips || 0, tackler: sim.tackler.act.slips || 0 }; out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out; }
if (process.argv[1] && process.argv[1].endsWith("pvp0_run.mjs")) { const cse = arg("case", "NOMINAL"), steps = +(arg("steps", SETUP.steps)), o = await run(cse, steps);
  fs.writeFileSync(arg("out"), zlib.gzipSync(JSON.stringify(o))); console.log(cse, "steps", o.recs.length, "hash", o.finalHash, "wall", (o.wallMs / 1000).toFixed(1), "s", o.stop ? "STOP " + JSON.stringify(o.stop) : "", "slips", JSON.stringify(o.slips)); }

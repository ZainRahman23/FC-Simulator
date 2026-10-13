// SUPPORT-1 EXPLORATORY two-body run (clearly labelled; success of the mission does not depend on it). The frozen PVP-0 two-character world
// (pvp0_plant.mjs Pvp0Plant, unchanged): recipient = the current V2 recipient exactly as in PVP-0 (frozen C3 on canonical M1b, PPR-3 standing entry);
// "tackler" = a PASSIVE SLIDING ARTICULATED BODY — the V1-matched V2 tackler body (the PVP-1A/PVP-0 tackler spec) placed in SLIDE-A1 K's authored
// SLIDE-phase pose (K frame 102, t 0.85 s; read-only, K is not modified) LOWERED onto the turf (K's slide pose floats: its lowest point is 85 mm above
// the turf), holding that pose only with the frozen PVP-1A SnapshotTone (PostureDriver K / D / statics at the entry geometry, support flags (0, 0) —
// finite joint impedance, no tracking, no root drive), parked (kinematic, inert) until `activate`, then dynamic with ONE uniform horizontal velocity
// write (rigid translation along K's slide direction, −z) — its initial condition. It then slides on its own body|turf / boot|turf friction into the
// recipient's left foot. This is not Astra's tackle (no authored motion after the entry pose); it is a simplified physical impactor with a
// human-shaped, articulated, finite-stiffness body. Output in the PVP-0 record format (pvp0 render scripts read it unchanged).
// usage (worktree root): node .../s1_slider_run.mjs --speed 5 --gap 0.45 --out <rec.json.gz> [--steps 1128]
import fs from "fs"; import zlib from "zlib";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q, IL } = PL;
const { loadJolt } = await import(PL.P2 + "core/v2_jolt.js"), MB = await import(RA + "balance1/scripts/b1_body.mjs"), { C3Controller } = await import(RA + "balance2/c3/c3_ctrl.mjs");
const KM = await import(RA + "pvp0/scripts/pvp0_k.mjs"), { Pvp0Plant } = await import(RA + "pvp0/scripts/pvp0_plant.mjs");
const J0 = (p) => JSON.parse(fs.readFileSync(new URL(p, RA))), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const Jolt = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js"), FIX = J0("ppr3/fixture/PPR3_STANDING_ENTRY.json"), C3P = J0("balance2/c3/params/C3.json"), BODY = J0("balance1/params/B1_BODY.json");
const speed = +arg("speed", "5"), gap = +arg("gap", "0.45"), steps = +arg("steps", "1128"), ACT = 408, FI = +arg("frame", "102");
const B = KM.SPEC.bodies, bi = (n) => B.findIndex(b => b.name === n);
// entry pose: K frame FI, lowered so its lowest point is 0.5 mm above the turf, its leading (right) boot `gap` m beyond the recipient's left boot along +z,
// laterally aligned with the recipient's feet
const raw = KM.v2Pose(FI), lo = PL.lowest(KM.SPEC, raw), recFootL = FIX.write.runner.poses[PL.SPEC_R().bodies.findIndex(b => b.name === "foot_L")].pos;
const off = [recFootL[0] + 0.06 - raw[bi("foot_R")].pos[0], 0.0005 - lo.y, recFootL[2] + gap - raw[bi("foot_R")].pos[2]], pose = KM.v2Pose(FI, off);
const vel = pose.map(() => ({ v: [0, 0, -speed], w: [0, 0, 0] })), lo2 = PL.lowest(KM.SPEC, pose);
const entries = { runner: FIX.write.runner, tackler: { poses: pose, vel: pose.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })) } };
let cR = null; const sim = new Pvp0Plant(Jolt, entries, { runner: FIX.flags.runner, tackler: { L: false, R: false } }, "N2", { O: FIX.O, instrument: true, maxSteps: steps,
  law: (p, c) => new MB.M1bBody(p, c, BODY, (cR = new C3Controller(C3P))), activate: ACT, tacklerVel: vel });
const out = { protocol: "SUPPORT-1 EXPLORATORY two-body (passive sliding articulated body; NOT Astra's tackle)", case: `SLIDER_v${speed}`, speedFactor: speed, offset: off, tacklerVcom: [0, 0, -speed],
  setup: { activate: ACT, t0: FI / KM.KREC.sampleHz, kFrame: FI, entryLowestM: lo2.y, entryLowestBody: B[lo2.body].name, gapM: gap, note: "K slide-phase pose lowered onto the turf; SnapshotTone (PVP-1A) holds it; one uniform velocity write at activation" }, steps }, t0 = performance.now();
while (sim.n < steps) { if (!sim.tick()) break; const r = sim.recs[sim.recs.length - 1], bad = Object.entries(r.chars).find(([, c]) => !c.integrity.finite || c.integrity.maxSpeed > 25); if (bad) { out.stop = { step: sim.n, who: bad[0] }; break; } }
out.wallMs = performance.now() - t0; out.cpu = sim.cpu; out.recs = sim.recs; out.slips = { recipient: sim.runner.act.slips || 0, tackler: sim.tackler.act.slips || 0 }; out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy();
fs.writeFileSync(arg("out"), zlib.gzipSync(JSON.stringify(out)));
const R = out.recs, first = R.find(r => r.contacts.some(c => c.kind === "cross" && c.Jn > 0)), y0 = R[ACT].S[0].pos[1];
console.log(out.case, "steps", R.length, "hash", out.finalHash, "wall", (out.wallMs / 1000).toFixed(1), "s", out.stop ? "STOP " + JSON.stringify(out.stop) : "", "first contact", first ? first.n + " " + JSON.stringify(first.contacts.filter(c => c.kind === "cross" && c.Jn > 0).map(c => c.a[1] + "×" + c.b[1])) : "none");
for (const q of [ACT, ACT + 24, ACT + 48, ACT + 72, ACT + 96, ACT + 144, ACT + 240, ACT + 480, R.length - 1]) { const r = R[Math.min(q, R.length - 1)], f = r.chars.runner.feet; console.log(` t ${((r.n - ACT) / 240).toFixed(2)} recipient pelvisY ${r.S[0].pos[1].toFixed(3)} com ${r.chars.runner.com.map(x => x.toFixed(2))} NL ${(f.L * 240).toFixed(0)} NR ${(f.R * 240).toFixed(0)} footL ${r.S[10].pos.map(x => x.toFixed(2))} footR ${r.S[13].pos.map(x => x.toFixed(2))} | slider pelvis ${r.S[14].pos.map(x => x.toFixed(2))} v ${(r.chars.tackler.P[2] / KM.SPEC.bodies.reduce((s, b) => s + b.mass, 0)).toFixed(2)}`); }

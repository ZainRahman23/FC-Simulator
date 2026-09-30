// ═══ physchar/tools/d6x_run.js — the D6 DIAGNOSTIC matrix (D6_slide + TESTS_D6X), sequential, deterministic
// Each test: the ordinary world (the D6 physics) ×repeat for the hash, measured with pc_d6diag; then ONE instrumented twin run (B on a force
// plate, pc_jolt cfg.plateFrom) for the exact A→B momentum ledger. The twin is a different — equally valid — world whose last bits differ,
// so its outcome is reported beside the ordinary run's (they can differ where the case sits on a decision boundary).
// usage: node tools/d6x_run.js [--tests all|a,b] [--repeat 3] [--out file.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { runD, TESTS_D6X } from "../pc_gated.js";
import { buildPoses } from "../pc_control.js";
import { D6Diag } from "../pc_d6diag.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB }), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec), nb = spec.bodies.length;
const sel = String(arg("--tests", "all")), list = sel === "all" ? ["D6_slide", ...Object.keys(TESTS_D6X)] : sel.split(","), rep = +arg("--repeat", 3);
const results = []; const f = (x, d = 1) => x == null ? "-" : (+x).toFixed(d);
for (const key of list) {
  const dg = new D6Diag(spec), runs = [runD(J, spec, key, { poses, onStep: (x) => dg.onStep(x) })]; for (let q = 1; q < rep; q++) runs.push(runD(J, spec, key, { poses }));
  const S = dg.summary(runs[0]); S.repeatHashes = runs.map(x => x.hash); S.deterministic = runs.every(x => x.hash === runs[0].hash); S.cpuMsPerFrame = runs[0].cpu.msPerFrame;
  const dp = new D6Diag(spec, { plate: true }), tw = runD(J, spec, key, { poses, world: { plateFrom: nb }, onStep: (x) => dp.onStep(x) }), P = dp.summary(tw);
  S.momentum = P.momentum || null; S.twin = { outcome: P.outcome, struckSlideCm: P.feet.struckSlideCm, comPeakSpeed: P.body.comPeakSpeed, firstTouchT: P.contact.firstTouchT, step: P.step };
  // the twin's exact A→B force series (N, per step) from 10 ms before the first touch to +1.2 s — for the review chart
  const iT = dp.rec.findIndex(q => q.touch); S.forceSeries = iT < 0 ? null : { t0: dp.rec[Math.max(0, iT - 2)].t, dt: 1 / 240, F: dp.rec.slice(Math.max(0, iT - 2), iT + 288).map(q => q.JAB ? [Math.round(q.JAB[0] * 240), Math.round(q.JAB[1] * 240), Math.round(q.JAB[2] * 240)] : null),
    turf: dp.rec.slice(Math.max(0, iT - 2), iT + 288).map(q => q.JturfB ? [Math.round(q.JturfB[0] * 240), Math.round(q.JturfB[1] * 240), Math.round(q.JturfB[2] * 240)] : null) };
  results.push(S);
  const m = S.momentum, c = S.contact;
  console.log(`${key.padEnd(16)} ${S.outcome.padEnd(42)} touch ${c.pair ? `${f(c.firstTouchT, 3)}s ${c.pair.replace(/foot_R → /, "")} @${f(c.heightM, 2)} m, A ${f(c.aSpeed, 2)} m/s` : "none".padEnd(30)} | A→B 35ms ${m ? f(m.windows["−10–35 ms"].AtoB[0]) : "-"} total ${m ? f(Object.values(m.windows).reduce((s, w) => s + w.AtoB[0], 0)) : "-"} N·s peak ${m ? m.peakForceN : "-"} N | foot ${f(S.feet.struckSlideCm)} cm far-air ${S.feet.farAirMs} ms | COM ${f(S.body.comPeakSpeed, 2)} m/s trunk ${f(S.body.trunkMaxDeg, 0)}° ξmin ${f(S.body.xiMinCm)} cm | twin: ${S.twin.outcome} | det ${S.deterministic}`);
}
const out = arg("--out", null); if (out) fs.writeFileSync(out, JSON.stringify({ calib: WORKING_CALIB, generated: "tools/d6x_run.js", results }));

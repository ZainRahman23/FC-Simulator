// ═══ physchar/tools/stepper/rec_review.mjs — collider frames of whole walks for the Physical Stepper review viewer ══════════════════════════
// usage: node tools/stepper/rec_review.mjs <mode ctrl | fixed | stepper> <start R@0.5> <out.js> [--oracle o.json.gz|o.json] [--model m.json --cfg '{…}'] [--n 40]
// fixed: the oracle's committed commands (identFixed — the controller after the search horizon); stepper: the live Physical Stepper.
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../../pc_body.js";
import { loadJolt } from "../../pc_jolt.js";
import { buildPoses } from "../../pc_control.js";
import { initOfLoco } from "../../pc_ref.js";
import { runG2a, TESTS_G2 } from "../../pc_gateg2.js";
import { dumpFrames } from "../fg_frames.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, "../.."), ROOT = path.resolve(here, "../../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), Ly = rig.mesh.layout, TA = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new TA[Ly[k].elementType](ab, Ly[k].byteOffset, Ly[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const JD = path.resolve(ROOT, "review_artifacts/physical_character_v1/g2_walker/json"), MODELS = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(path.join(JD, `mU1_tau${t}.json`), "utf8"))]));
const rd = (f) => JSON.parse(f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)).toString() : fs.readFileSync(f, "utf8"));
const [mode, start, outF] = process.argv.slice(2), [first, atS] = start.split("@"), at = +atS;
const OR = mode === "fixed" ? rd(arg("--oracle")).results.find(r => r.start === start) : null, fixed = OR ? OR.fixed : {};
const n = +arg("--n", OR ? Object.keys(fixed).length + 10 : 40), steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
const base = TESTS_G2.G2W_A8.loco.rhythm.walk, ctrl = { ...base.ctrl, kind: "U", vd: 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false, models: MODELS,
  ...(OR ? { identFixed: true } : {}), ...(mode === "stepper" ? { stepper: { model: JSON.parse(fs.readFileSync(arg("--model"), "utf8")), ...JSON.parse(arg("--cfg", "{}")) } } : {}) };
let LOCO = null;
const r = runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.62, rhythmOver: { steps, at, walk: { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] }, char: { ...(base.char || {}), ...fixed }, ctrl } }, onLoco: (l) => { LOCO = l; } });
const tF = (r.recs.find(q => q.com[1] < 0.75) || { t: Infinity }).t;
const fr = dumpFrames(outF, spec, r.recs, LOCO.planner, { scenario: mode, foot: "F0", test: "G2W_A8", start, hash: r.hash, ...(mode === "stepper" ? { contactEvents: (LOCO.planner.stepperEvents || []).map(e => ({ id: e.id, k: e.stepIndex, state: e.state, why: e.history[e.history.length - 1].why })) } : {}) }, { t1: Math.min(r.recs[r.recs.length - 1].t, tF + 1.0) });
console.log(mode, start, "hash", r.hash, "fall", tF, "upright", LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.td && d.td.t < tF).length);

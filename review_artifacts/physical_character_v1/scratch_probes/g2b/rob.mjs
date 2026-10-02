import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const { Q } = await import(PC + "/pc_math.js"); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d);
// ROBUSTNESS SCORE — each config of the JSON list (argv[3]) is run over start variants: first swing foot R / L × rhythm start 0.50 / 0.56 / 0.62 s;
// per config: rhythmic steps landed per variant, how many completed all N steps upright, mean steps; deterministic, sequential
if (process.env.DIAG_BUDGET) { const B = await import(PC + "/pc_balance.js"); B.BAL.budgetFloor = +process.env.DIAG_BUDGET; console.log("DIAGNOSTIC budgetFloor", B.BAL.budgetFloor); }
const CF = JSON.parse(fs.readFileSync(process.argv[3], "utf8")), N = +(process.env.N || 20);
const stepsFor = (first) => { const out = []; for (let i = 0; i < N; i++) { const sw = (i % 2 === 0) === (first === "R") ? "R" : "L"; out.push(i === 0 ? { sw, fwdK: 0.7 } : i === 1 ? { sw, fwdK: 0.9 } : { sw }); } return out; };
const VAR = (process.env.VARS || "R0.5,L0.5,R0.56,L0.56,R0.62,L0.62").split(",").map(s => ({ first: s[0], at: +s.slice(1) }));
for (const c of CF) { const res = []; let ok = 0; const t0 = Date.now();
  for (const v of VAR) { const ro = { ...(c.r || {}), at: v.at, steps: stepsFor(v.first) }; let r; try { r = G2.runG2a(J, spec, c.key || "G2b_walk08", { poses, seconds: c.sec || (2 + N * 0.7), rhythmOver: ro, humanOver: c.h || undefined, locoOver: c.lo || undefined }); } catch (e) { res.push("E"); continue; }
    // (only steps landed BEFORE the fall count: the rhythm keeps executing steps with the body on the turf — the first version counted them)
    const fallRec = r.recs.find(q => q.com[1] < 0.75), tFall = fallRec ? fallRec.t : Infinity;
    const rh = r.steps.filter(s => s.kind === "rhythmic" && s.status === "LANDED" && s.tdT != null && s.tdT < tFall).length, done = r.rhythm && r.rhythm.stage === "DONE" && tFall === Infinity; if (done && r.outcome !== "FELL") ok++; res.push(rh + (done ? "*" : "")); }
  const nums = res.map(x => parseInt(x) || 0); console.log(`${(c.name || "").padEnd(34)} | ${res.map(x => String(x).padStart(3)).join(" ")} | mean ${(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)} | completed ${ok}/${VAR.length} | ${((Date.now() - t0) / 1000).toFixed(0)} s`); }

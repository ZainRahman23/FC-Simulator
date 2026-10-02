import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const r = G.runG1a(J, spec, process.argv[3], { poses, keepStates: true, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) }); const f = (x, d = 3) => x == null ? "-" : (+x).toFixed(d), v2 = (a) => a ? `(${f(a[0])}, ${f(a[1])})` : "-";
const fI = { L: spec.bodies.findIndex(b => b.name === "foot_L"), R: spec.bodies.findIndex(b => b.name === "foot_R") };
for (const R of r.loco ? [] : []) ;
const steps = r.steps; console.log(JSON.stringify(steps.map(s => [s.sw, s.kind, s.tdT, s.footholdErrCm, s.adjustCm])));
// swing foot path vs target, every 25 ms, for the first 3 steps
for (const q of r.recs) { if (q.t < 0.95 || q.t > 2.7 || q.n % 6) continue; const e = q.exec, sw = e ? e.sw : null;
  const fp = sw ? q.states[fI[sw]].pos : null, tg = q.swingTgt;
  console.log(`${f(q.t)} ${e ? `${e.sw} ${e.stage.padEnd(7)} u${f(e.u, 2)} tgtC ${v2(e.target)}` : "".padEnd(34)} | ankle ${fp ? v2([fp[0], fp[2]]) + " y" + f(fp[1]) : "-".padEnd(22)} swingTgt ${tg ? v2([tg.pos[0], tg.pos[2]]) + " y" + f(tg.pos[1]) : "-"} | ξ ${v2(q.xi)} com ${v2([q.com[0], q.com[2]])} | L ${q.feet.L.state.slice(0,4)} R ${q.feet.R.state.slice(0,4)}`); }

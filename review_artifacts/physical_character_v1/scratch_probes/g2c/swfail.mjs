import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const C = await import(PC + "/pc_g2char.js"); const { Q, V } = await import(PC + "/pc_math.js");
const base = C.CHAR_BASE(0.6); const x = JSON.parse(process.argv[3]); const steps = []; for (let i = 0; i < 5; i++) steps.push({ sw: i % 2 === 0 ? "R" : "L" });
const r = G2.runG2a(J, spec, "G2b_walk08", { poses, keepStates: true, seconds: +(process.env.SEC || 3.4), rhythmOver: { walk: { ...base.walk, char: x.steps }, steps, at: 0.5 }, humanOver: base.human });
const fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") }, ti = { R: spec.bodies.findIndex(b => b.name === "thigh_R") }, pit = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[1], Math.hypot(z[0], z[2])) * 57.3; };
const t0 = +(process.env.T0 || 2.7), t1 = +(process.env.T1 || 3.1), sw = process.env.SW || "R";
for (const q of r.recs) { if (q.t < t0 || q.t > t1 || q.n % 3) continue; const S = q.states, f = S[fi[sw]], hip = S[ti[sw]].pos, d = Math.hypot(hip[0] - f.pos[0], hip[1] - f.pos[1], hip[2] - f.pos[2]), tg = q.swingTgt;
  console.log(`${q.t.toFixed(3)} ${q.exec ? q.exec.sw + " " + q.exec.stage.slice(0, 5) + " u" + (q.exec.u || 0).toFixed(2) : "-        "} | ${sw} ${q.feet[sw].state.slice(0, 5)} ${q.feet[sw].load.toFixed(0)} pitch ${pit(f.rot).toFixed(0)} y ${f.pos[1].toFixed(3)} z ${f.pos[2].toFixed(3)} | hip−ankle ${d.toFixed(3)} | tgt ${tg ? tg.pos.map(v => v.toFixed(3)).join(",") : "-"} | com z ${q.com[2].toFixed(3)} v ${q.vcom[2].toFixed(2)}`); }

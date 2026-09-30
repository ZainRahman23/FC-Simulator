// per-step liftoff-gate trace for one C2 request: which condition blocks liftoff
import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../.."), CAL = process.argv[3], TEST = process.argv[4], RID = +(process.argv[5] || 0), EVERY = +(process.argv[6] || 24);
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const C2 = await import(PC + "/pc_gatec2.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: CAL }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), r = C2.runC2(J, spec, TEST, { keepStates: true, ctrl: process.env.CTRL ? JSON.parse(process.env.CTRL) : undefined });
const recs = r.recs.filter(q => q.reqId === RID && q.reqStage === "TRANSFER"); console.log(TEST, "request", RID, "TRANSFER steps", recs.length, recs.length ? `t ${recs[0].t.toFixed(2)}–${recs[recs.length - 1].t.toFixed(2)}` : "");
for (let i = 0; i < recs.length; i += EVERY) { const q = recs[i], f = q.feet, u = q.ctl && q.ctl.unload;
  console.log(`t ${q.t.toFixed(3)} L ${f.L.load.toFixed(0)}N ${f.L.state}${f.L.slipping ? " SLIP" : ""} ${f.L.loaded ? "ld" : "--"} | R ${f.R.load.toFixed(0)}N ${f.R.state}${f.R.slipping ? " SLIP" : ""} ${f.R.loaded ? "ld" : "--"} | ξmargin ${(q.xiMargin * 100).toFixed(1)} |v| ${Math.hypot(q.vcom[0], q.vcom[2]).toFixed(3)} | unload ${u ? `bound ${u.bound.toFixed(3)} aMin ${u.aMin.toFixed(3)} share ${u.share.toFixed(3)}` : "-"} | cls ${q.cls} | ready ${q.ready ? `${q.ready.n} mSt ${(q.ready.stanceMargin * 100).toFixed(1)} v ${q.ready.vcom.toFixed(3)} slip ${q.feet.L.slipping}/${q.feet.R.slipping}` : "-"}`); }

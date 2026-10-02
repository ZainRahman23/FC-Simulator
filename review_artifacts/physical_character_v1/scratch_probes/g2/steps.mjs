import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); let LOCO = null;
const r = G2.runG2a(J, spec, process.argv[3] || "G2b_walk08", { poses, ...(process.env.OVER ? JSON.parse(process.env.OVER) : {}), seconds: +(process.env.SEC || 4), onLoco: (l) => { LOCO = l; }, ...(process.argv[4] ? JSON.parse(process.argv[4]) : {}) });
for (const e of (r.execLog || []).filter(e => /step|touchdown|liftoff|adjust/.test(e.kind)).slice(0, 30)) console.log(e.t.toFixed(3), e.kind, e.what);
const R = LOCO.planner.exec.done; for (const q of R.slice(0, 8)) console.log(q.sw, q.kind, "pSt", q.pSt && q.pSt.map(v => v.toFixed(3)).join(","), "xiIni", q.xiIni && q.xiIni.map(v => v.toFixed(3)).join(","), "nominal", q.nominalTarget && q.nominalTarget.map(v => v.toFixed(3)).join(","), "final", q.proj && q.proj.target && q.proj.target.map(v => v.toFixed(3)).join(","), "td center", q.td && q.td.center.map(v => v.toFixed(3)).join(","), "adjust", (q.adjustCm || 0).toFixed(1), "xi@td", q.td && q.td.xi.map(v => v.toFixed(3)).join(","));
if (process.env.ADJ) for (const q of R.slice(0, 2)) { console.log("== adjust log", q.sw); for (const a of (q.adjLog || [])) console.log(a.t.toFixed(3), "xi", a.xi.map(v => v.toFixed(3)).join(","), "pred", a.pred.map(v => v.toFixed(3)).join(","), "tc", a.tc ? a.tc.map(v => v.toFixed(3)).join(",") : "-", "Trem", a.Trem.toFixed(3), a.D ? "D " + a.D.map(v => v.toFixed(3)).join(",") + " dl0 " + a.dl0.toFixed(3) + " dl " + a.dl.toFixed(3) : ""); }

import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const G2 = await import(PC + "/pc_gateg2.js"); const C = await import(PC + "/pc_g2char.js");
const rows = JSON.parse(fs.readFileSync(process.argv[3], "utf8")).sweep.rows.filter(r => r.ref === "A");
const MAP = { G2C_nominal: r => r.tag === "df" && r.u.df === 0.34, G2C_df_short: r => r.tag === "df" && r.u.df === 0.22, G2C_df_long: r => r.tag === "df" && r.u.df === 0.46, G2C_dl_narrow: r => r.tag === "dl" && r.u.dl === 0.14, G2C_dl_wide: r => r.tag === "dl" && r.u.dl === 0.38,
  G2C_T_fast: r => r.tag === "T" && Math.abs(r.u.T - 0.37) < 1e-6, G2C_T_slow: r => r.tag === "T" && Math.abs(r.u.T - 0.53) < 1e-6, G2C_push_fwd: r => r.tag === "pushF" && r.push.J[0] === 12, G2C_push_back: r => r.tag === "pushF" && r.push.J[0] === -12,
  G2C_push_in: r => r.tag === "pushL" && r.push.J[1] === 9, G2C_push_out: r => r.tag === "pushL" && r.push.J[1] === -9, G2C_yaw_pos: r => r.tag === "yaw" && r.push.Lz === 4, G2C_yaw_neg: r => r.tag === "yaw" && r.push.Lz === -4 };
const f = (v) => v == null ? "-" : (+v).toFixed(4);
for (const key in MAP) { let LOCO = null; const r = G2.runG2a(J, spec, key, { poses, keepStates: true, onLoco: (l) => { LOCO = l; } }); const a = C.analyseChar(spec, r, LOCO, null), pr = C.stepPair(a, 1), s = rows.find(MAP[key]);
  const same = pr && s && s.post ? Math.abs(pr.post.xi[0] - s.post.xi[0]) < 1e-9 && Math.abs(pr.post.xi[1] - s.post.xi[1]) < 1e-9 : (!s || !s.post) && (!pr || !pr.upright);
  console.log(`${key.padEnd(18)} case post ξ ${pr && pr.upright ? pr.post.xi.map(f).join(",") : "fell"} | sweep (${s ? s.cls : "?"}) ${s && s.post ? s.post.xi.map(f).join(",") : "-"} | ${same ? "IDENTICAL" : "DIFFERENT"}`); }

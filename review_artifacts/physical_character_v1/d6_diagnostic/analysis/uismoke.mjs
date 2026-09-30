import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const D = await import(PC + "/pc_gated.js"); const { buildPoses } = await import(PC + "/pc_control.js");
const { D6Diag } = await import(PC + "/pc_d6diag.js"); const { V } = await import(PC + "/pc_math.js"); const { D6X_COMPARE } = await import(PC + "/pc_d6x.js");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), Ly = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[Ly[k].elementType](ab, Ly[k].byteOffset, Ly[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const code = fs.readFileSync(process.argv[3], "utf8"), d6x = JSON.parse(fs.readFileSync(path.join(ROOT, "review_artifacts/physical_character_v1/d6_diagnostic/json/d6x_matrix.json")));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const els = {}; const $ = (id) => els[id] || (els[id] = { clientWidth: 800, clientHeight: 92, width: 0, height: 0, getContext: () => ctx, innerHTML: "" });
let nL = 0; const stub = { L: () => { nL++; }, cross3: () => {}, ring: () => {}, polyLine: () => {}, G2: (p, y) => [p[0], y ?? 0.004, p[1]] };
const CLS_COL = { INIT: "#999" }, FOOT_COL = { FLAT: [0, 1, 0, 1] };
for (const key of ["D6_slide", "D6X_freeze", "D6X_hKnee", "D6X_freezeNoHit", "D6X_load80"]) {
  const dg = new D6Diag(spec), run = D.runD(J, spec, key, { poses, onStep: (x) => dg.onStep(x) });
  const H = { testD: key, diag: dg, diagSum: dg.summary(run), d6x, ov: { c_region: true, c_com: true, c_xi: true, c_cop: true, c_feet: true, impulse: true }, i: 0 };
  const TD = (k) => D.TESTS_D[k] || D.TESTS_D6X[k];
  const fn = new Function("H", "$", "V", "TD", "D6X_COMPARE", "CLS_COL", "FOOT_COL", "L", "cross3", "ring", "polyLine", "G2", code + "\nreturn { renderSideD6, drawChart2D6, cursorD6, drawD6 };");
  const api = fn(H, $, V, TD, D6X_COMPARE, CLS_COL, FOOT_COL, stub.L, stub.cross3, stub.ring, stub.polyLine, stub.G2);
  const html = api.renderSideD6(); $("d6cur");
  for (const i of [0, 40, 43, 50, 80, 200, dg.rec.length - 1]) { H.i = i; const labels = []; api.drawD6(dg.rec[i], labels); api.cursorD6(); api.drawChart2D6(); }
  console.log(key, "ok · side html", html.length, "chars · cursor", els.d6cur.innerHTML.length, "chars · lines", nL);
}

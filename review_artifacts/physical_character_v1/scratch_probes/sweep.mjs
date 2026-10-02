import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const D = [[0, 0], [0.05, 0.12], [0.1, 0.17], [0.15, 0.22], [0.25, 0.32]], f = (x, d = 1) => x == null ? "-" : (+x).toFixed(d), out = {};
for (const key of ["S4_steps10", "S5_F80", "S7a_swingPush", "S11a_earlyTurf", "S11b_obstacle"]) { out[key] = [];
  for (const [fb, pl] of D) { const r = G.runG1a(J, spec, key, { poses, loco: { delayFb: fb, delayPlan: pl } }); const st = r.steps, td = st.filter(s => s.tdT != null);
    const row = { fb, pl, outcome: r.outcome, steps: st.length, landed: td.length, maxErrCm: td.length ? Math.max(...td.map(s => s.footholdErrCm || 0)) : null, maxLateMs: td.filter(s => s.plannedTdT != null).length ? Math.max(...td.filter(s => s.plannedTdT != null).map(s => (s.tdT - s.plannedTdT) * 1000)) : null,
      trunk: r.whole.trunkMaxDeg, comDrop: r.whole.comDropCm, sat: r.satSteps, corrective: st.filter(s => s.kind === "corrective").length, react: (st.find(s => s.obstructed) || {}).obstructed?.reactMs ?? null, first: st[0] ? st[0].liftoffT : null };
    out[key].push(row); console.log(`${key.padEnd(15)} fb ${String(fb * 1000).padStart(3)} pl ${String(pl * 1000).padStart(3)} | ${r.outcome.padEnd(20)} steps ${row.steps} landed ${row.landed} corrective ${row.corrective} | foothold max ${f(row.maxErrCm)} cm | late max ${f(row.maxLateMs, 0)} ms | trunk ${row.trunk} | COM drop ${row.comDrop} | sat ${row.sat} | first lift ${row.first}${row.react != null ? ` | obstruction reaction ${row.react} ms` : ""}`); } }
fs.writeFileSync(process.argv[3], JSON.stringify(out));

import fs from "fs"; import path from "path";
const PC = process.argv[2], ROOT = path.resolve(PC, "../../..");
const { buildBodySpec } = await import(PC + "/pc_body.js"); const { loadJolt } = await import(PC + "/pc_jolt.js"); const G = await import(PC + "/pc_gateg1a.js"); const { buildPoses } = await import(PC + "/pc_control.js"); const REF = await import(PC + "/pc_ref.js");
REF.initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: "V1.1" }), J = await loadJolt(PC + "/vendor/jolt-physics.wasm-compat.js"), poses = buildPoses(spec);
const extra = process.argv[4] ? JSON.parse(process.argv[4]) : {};
for (const key of process.argv[3].split(",")) { const t0 = Date.now(); const r = G.runG1a(J, spec, key, { poses, ...extra }); delete r.recs;
  console.log(`== ${key} (${Date.now() - t0} ms) ${r.outcome} hash ${r.hash} delays ${JSON.stringify(r.delays)} cpu ${r.cpu.msPerFrame}`);
  console.log("  whole", JSON.stringify(r.whole), "| ledger res", r.ledger.residualMaxNs, "noRoot", r.ledger.noRootForce, "turf", JSON.stringify(r.ledger.turfImpulseNs), "obst", JSON.stringify(r.ledger.obstacleImpulseNs), "sat", r.satSteps);
  if (r.rhythm) console.log("  rhythm", JSON.stringify(r.rhythm));
  for (const s of r.steps) console.log("  step", s.kind, s.sw, s.status, s.fail || "", "lift", s.liftoffT, "td", s.tdT, "plan", s.plannedTdT, "err", s.footholdErrCm, "adj", s.adjustCm, "slip", s.stanceSlipCm, s.obstructed ? "OBST " + JSON.stringify(s.obstructed) : "");
  console.log("  monitor", JSON.stringify(r.monitor.verdicts), "releases", r.monitor.releases.length);
  const ge = {}; for (const e of r.gaitEvents) ge[e.kind] = (ge[e.kind] || 0) + 1; console.log("  gait events", JSON.stringify(ge));
  if (r.requests) console.log("  requests", JSON.stringify(r.requests)); if (r.transfer) console.log("  transfer", JSON.stringify(r.transfer)); if (r.internal) console.log("  internal", JSON.stringify(r.internal)); if (r.supportRealization) console.log("  supportRealization", JSON.stringify(r.supportRealization));
  const ya = Object.entries(r.arbiter).filter(([m, A]) => A.yieldedNms > 0).map(([m, A]) => `${m} ${A.cls} req ${A.requestedNms} alw ${A.allowedNms} yld ${A.yieldedNms} ${JSON.stringify(A.why)}`); if (ya.length) console.log("  yielded:", ya.join(" | "));
  if (process.env.V) { console.log("  exec", JSON.stringify(r.execLog.slice(0, 20))); console.log("  gaitEv", JSON.stringify(r.gaitEvents.slice(0, 20))); console.log("  plan", JSON.stringify(r.plannerLog.slice(0, 20))); console.log("  mon", JSON.stringify(r.monitor.log.slice(0, 20))); } }

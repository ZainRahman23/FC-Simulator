// croq_xgeom.mjs — LA CROQUETA — X-SWEEP V3: the X-shape (../x_geom.js — the same function the Lab's landmarks and table use) measured on
// any build's posed body for one croqueta case: the landmarks, each leg at its max out (and the right leg at touch 1, the left at the receive),
// the bows, the ball path (lateral and forward/back, world and relative to the pelvis)
//   node croq_xgeom.mjs [--build ../ | ../../croqhs/ | ../../croqvg/] [--case "REF · JOG R → L"] [--json f] [--rows 1]
//   node croq_xgeom.mjs --all [--json f]      LEG-WAVE V4 · X-SWEEP V3 · HOP/SWEEP V2, the same case
import fs from "node:fs";
import { xGeom } from "../x_geom.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const BUILDS = [["LEG-WAVE V4", "../"], ["X-SWEEP V3", "../../croqxs/"], ["HOP/SWEEP V2", "../../croqhs/"]];   // (LEG-WAVE V4: V4 · V3 · V2)
export async function xgeomTool(buildRel) { const base = new URL(buildRel, import.meta.url);
  const { makeSim, ENV, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base)); const { PlayBody } = await import(new URL("u_body.js", base));
  const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
  return function run(c) { const sim = makeSim("TL", Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, false), body = new PlayBody(env, sim);
    const o = xGeom(sim, body, r.t0, c.ang, DT); return o && Object.assign(o, { variant: c.variant }); }; }
const f = (x, d = 2) => (x == null ? "—" : (+x).toFixed(d));
function report(name, o) {
  console.log(`■ ${name} · ${o.variant} · touch 1 ${o.tFirst} s (${o.F}) · receive ${o.tReceive} s (${o.S})`);
  console.log("landmarks (s from touch 1): " + Object.entries(o.landmarks).map(([k, v]) => `${k} ${f(v, 3)}`).join(" · "));
  const show = (nm, q, X) => console.log(`${nm} @${f(q.t, 3)}: ${X} foot out ${f(q.footOut)} m, forward ${f(q.footFwd)} m · thigh ${f(q.thigh, 0)}° (abd ${f(q.thighAbd, 0)}°, flex ${f(q.thighFlex, 0)}°) · knee out ${f(q.kneeOut)} fwd ${f(q.kneeFwd)} · other foot forward ${f(q.otherFootFwd)} m (out ${f(q.otherFootOut)}) · pelvis roll ${f(q.pelRoll, 0)}° (+ F hip up) yaw ${f(q.pelYaw, 0)}° · torso bend ${f(q.bend, 0)}° (+ toward F) lean ${f(q.lean, 0)}° · pelvis h ${f(q.pelH)}`);
  show("RIGHT LEG MAX OUT ", o.rightMax, o.F); show("AT TOUCH 1        ", o.atTouch, o.F); show("LEFT LEG MAX OUT  ", o.leftMax, o.S); show("AT THE RECEIVE    ", o.atReceive, o.S);
  console.log(`bows: toward F ${f(o.rBow.bend, 0)}° @${f(o.rBow.t, 3)} · toward S ${f(-o.lBow.bend, 0)}° @${f(o.lBow.t, 3)}`);
  const B = o.ball; console.log(`ball: touch → mid-sweep → receive · lateral ${f(B.lat[0])} + ${f(B.lat[1])} = ${f(B.lat[2])} m · forward ${f(B.fwd[0])} + ${f(B.fwd[1])} = ${f(B.fwd[2])} m (world, along the entry) · path ${f(B.angle, 0)}° from straight across (− = back) · relative to the pelvis: lateral ${f(B.relLat[0])} + ${f(B.relLat[1])}, forward ${f(B.relFwd[0])} + ${f(B.relFwd[1])} m`);
  if (arg("rows")) for (const q of o.rows) if (Math.abs(q.t * 40 - Math.round(q.t * 40)) < 1e-6) console.log(`${q.t >= 0 ? "+" : ""}${q.t.toFixed(3)} F out ${f(q.F.out)} fwd ${f(q.F.fwd)} thigh ${f(q.F.thigh, 0)} | S out ${f(q.S.out)} fwd ${f(q.S.fwd)} thigh ${f(q.S.thigh, 0)} | roll ${f(q.pelRoll, 0)} bend ${f(q.bend, 0)} lean ${f(q.lean, 0)} yaw ${f(q.yaw, 0)} | h ${f(q.pelH)} ${q.Fp ? "F▪" : "  "}${q.Sp ? "S▪" : "  "}`); }
if (import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) {
  const list = process.argv.includes("--all") ? BUILDS : [[arg("build", "../"), arg("build", "../")]], out = {};
  for (const [name, b] of list) { const run = await xgeomTool(b); const { CASES } = await import(new URL("v_cases.js", new URL(b, import.meta.url)));
    const c = CASES.find((x) => x.tech === "CROQUETA" && x.variant === arg("case", "REF · JOG R → L")), o = run(c); report(name, o); out[name] = Object.assign({}, o, { rows: undefined }); }
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1)); }

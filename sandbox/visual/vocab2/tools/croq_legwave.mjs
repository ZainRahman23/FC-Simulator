// croq_legwave.mjs — LA CROQUETA — LEG-WAVE V4: the leg wave (../lw_geom.js — the same function the Lab's landmarks and table use) for any
// build's posed body on one croqueta case: L0 – L6, both legs at each, the wave curve, the left foot's continuity from L1 to L4
//   node croq_legwave.mjs [--build ../ | ../../croqxs/] [--case "REF · JOG R → L"] [--json f] [--rows 1]
//   node croq_legwave.mjs --all [--json f]      LEG-WAVE V4 · X-SWEEP V3, the same case
import fs from "node:fs";
import { lwGeom, LW_LANDMARKS } from "../lw_geom.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const BUILDS = [["LEG-WAVE V4", "../"], ["X-SWEEP V3", "../../croqxs/"]];
export async function legwaveTool(buildRel) { const base = new URL(buildRel, import.meta.url);
  const { makeSim, ENV, DT } = await import(new URL("tools/u_env.mjs", base)); const { presetLayers } = await import(new URL("c_sim.js", base)); const { caseOpts, runCaseOn } = await import(new URL("v_run.js", base)); const { PlayBody } = await import(new URL("u_body.js", base));
  const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
  return function run(c) { const sim = makeSim("TL", Object.assign(caseOpts(c, false), { layers: presetLayers("FULL") })), r = runCaseOn(sim, c, false), body = new PlayBody(env, sim);
    const o = lwGeom(sim, body, r.t0, c.ang, DT); return o && Object.assign(o, { variant: c.variant, DT }); }; }
const f = (x, d = 2) => (x == null ? "—" : (+x).toFixed(d)), g = (x) => f(x, 0) + "°";
function report(name, o) {
  console.log(`■ ${name} · ${o.variant} · touch 1 ${o.tFirst} s (${o.F}) · receive ${o.tReceive} s (${o.S})`);
  console.log("landmarks (s from touch 1): " + LW_LANDMARKS.map(([k, nm]) => `${k} ${nm} ${f(o.landmarks[k], 3)}`).join(" · "));
  const lg = (X, q) => `${X} out ${f(q.out)} fwd ${f(q.fwd)} · leg ${g(q.wave)} (thigh ${g(q.thighW)} shin ${g(q.shinW)}) · hip flex ${g(q.hipFlex)} abd ${g(q.hipAbd)} · knee out ${f(q.kneeOut)} fwd ${f(q.kneeFwd)} · toe ${g(q.footYaw)}${q.planted ? " ▪" : ""}`;
  for (const [k, nm] of LW_LANDMARKS) { const q = o.at[k]; if (!q) { console.log(`${k} ${nm}: —`); continue; }
    console.log(`${k} ${nm.padEnd(20)} @${f(q.t, 3)} · wave ${g(q.wave)} · ${lg(o.F, q.F)} | ${lg(o.S, q.S)} · ball rel fwd ${f(q.ball.relF)} out ${f(q.ball.relOut)} · pelvis h ${f(q.pel.h)}`); }
  for (const [nm, X, c] of [["left", o.S, o.cont], ["right", o.F, o.contF]]) console.log(`${nm} (${X}) foot, L1 → L4: forward velocity max ${f(c.fwdV)} m/s @${f(c.tFwdV, 3)} (pelvis frame; signed) · lateral max ${f(c.latV)} m/s @${f(c.tLatV, 3)} · world speed max ${f(c.wV)} m/s @${f(c.tWV, 3)} · largest step ${f(c.tick * 100, 1)} cm / tick @${f(c.tTick, 3)}, ${f(c.frame * 100, 1)} cm / 60 fps frame @${f(c.tFrame, 3)} · largest acceleration ${f(c.acc, 0)} m/s² @${f(c.tAcc, 3)} · ahead of the ball before the receive: along the entry ${f(c.ahead)} m @${f(c.tAhead, 3)}, in the pelvis frame ${f(c.aheadP)} m @${f(c.tAheadP, 3)}`);
  if (arg("rows")) for (const q of o.rows) if (Math.abs(q.t * 80 - Math.round(q.t * 80)) < 1e-6 && q.t >= -0.25 && q.t <= o.landmarks.L5 + 0.30) console.log(`${q.t >= 0 ? "+" : ""}${q.t.toFixed(4)} wave ${f(q.wave, 0).padStart(4)} | ${o.F} out ${f(q.F.out)} fwd ${f(q.F.fwd).padStart(5)} leg ${f(q.F.wave, 0).padStart(4)} | ${o.S} out ${f(q.S.out)} fwd ${f(q.S.fwd).padStart(5)} leg ${f(q.S.wave, 0).padStart(4)} ${q.S.planted ? "▪" : " "} | ball relF ${f(q.ball.relF).padStart(5)} relOut ${f(q.ball.relOut).padStart(5)} | S ahead of ball (pelvis) ${f(q.S.fwd - q.ball.relF).padStart(5)}`); }
if (import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) {
  const list = process.argv.includes("--all") ? BUILDS : [[arg("build", "../"), arg("build", "../")]], out = {};
  for (const [name, b] of list) { const run = await legwaveTool(b); const { CASES } = await import(new URL("v_cases.js", new URL(b, import.meta.url)));
    const c = CASES.find((x) => x.tech === "CROQUETA" && x.variant === arg("case", "REF · JOG R → L")), o = run(c); report(name, o); out[name] = Object.assign({}, o, { rows: undefined }); }
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1)); }

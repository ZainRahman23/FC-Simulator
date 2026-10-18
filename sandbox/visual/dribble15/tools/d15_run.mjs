// dribble15/tools/d15_run.mjs — run one lab scenario and print the touch log, contacts, control changes and the turn timeline.
// usage: node d15_run.mjs <SCENARIO> [arch B|A|C] [profile HIGH|AVERAGE|POOR|WEAKFOOT] [seed] [ver d12|d11|d1]
import { makeSim, DT, PROFILES } from "./d15_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [id, arch = "B", prof = "HIGH", seed = "1", ver = "d15"] = process.argv.slice(2), scn = get(id);
const t0 = Date.now(), S = makeSim(scn, { ver, arch, player: PROFILES[prof], seed: +seed, opts: { errScale: process.env.ERRK ? +process.env.ERRK : undefined, noError: !!process.env.NOERR } }); S.run(); const wall = Date.now() - t0;
const f = (x, n = 2) => x == null ? "–" : (+x).toFixed(n), D = 180 / Math.PI;
console.log(`${scn.id} · ${scn.label} · arch ${arch} · ${PROFILES[prof].name} · seed ${seed}`);
for (const T of S.touches) console.log(`  TOUCH ${f(T.t)} ${T.F}${T.weak ? "(weak)" : ""} ${T.reg.padEnd(7)} w ${f(T.w)} gap ${f(T.gap * 1000, 1)}mm launch ${f(T.executed.speed)} m/s dir ${f(Math.atan2(-T.executed.v[2], T.executed.v[0]) * D, 0)}° player ${f(T.speedPlayer)} heading ${f(Math.atan2(-0, 1) * 0 + 0, 0)}${T.release ? " RELEASES-CUT" : ""}${T.caft ? ` FT y${f(T.caft.iy)} a${f(T.caft.ia)}` : ""}${T.floorK !== 1 ? ` floor ${f(T.floorK)}` : ""}${T.cancelled ? " CANCELLED " + T.cancelled : ""}`);
console.log("  contacts:", S.contacts.map(c => `${f(c.t)} ${c.own ? "own" : "OPP"}:${c.part} J${f(c.impulse)}`).join("; ") || "none");
console.log("  control:", S.ctrl.changes.map(c => `${f(c.t)} ${c.to}`).join(" → ") || "CONTROLLED throughout");
const rec = S.rec; for (let i = 0; i < rec.length; i += 60) { const r = rec[i], b = r.ball.p, dx = b[0] - r.P[0], dy = b[2] - r.P[1], th = r.psi; console.log(`   t ${f(r.t)} heading ${f(Math.atan2(r.V[1], r.V[0]) * D, 0)}° req ${f(r.dir * D, 0)}°${r.held ? " (HELD)" : ""} speed ${f(Math.hypot(r.V[0], r.V[1]))} ball rel f ${f(dx * Math.cos(th) + dy * Math.sin(th))} l ${f(-dx * Math.sin(th) + dy * Math.cos(th))} ball ${f(Math.hypot(r.ball.v[0], r.ball.v[2]))} ${r.ctrl}`); }
console.log(`  jumps ${(S.jumps || []).length} · wall ${wall} ms for ${scn.dur} s · cpu ${JSON.stringify(Object.fromEntries(Object.entries(S.cpu).map(([k, x]) => [k, +x.toFixed(0)])))}`);

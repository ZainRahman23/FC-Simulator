// ═══ physchar2/tools/touchrest_trace.mjs — DIAGNOSTIC per-tick trace of one touch-rest manifest entry (or an ad-hoc variant) around the release: lifecycle state /
// s / a, sensed load, horizontal contact force, foot-n horizontal displacement from its position at t_rel − 0.1 s, sole clearance, swing / lifecycle target.
// usage: node tools/touchrest_trace.mjs --manifest=<json> --id=<id> [--flags=<json overriding run.flags>] [--from=<s>] [--to=<s>] [--every=<ticks>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { unloadSim, unloadSpec } from "../gates/v2_unload.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const M = JSON.parse(fs.readFileSync(arg("manifest", ""))), run0 = M.runs.find(r => r.id === arg("id", "")), FL = arg("flags", ""), run = { ...run0, ...(FL ? { flags: JSON.parse(FL) } : {}) };
const spec = unloadSpec(run.body), { s, nL, H } = unloadSim(J, spec, run), C = s.ctrl, f = C.feet[nL], B = spec.bodies, EV = +arg("every", 4);
const pts = B[f].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))), clear = (st) => Math.min(...pts.map(p => V.add(st[f].pos, Q.rot(st[f].rot, p))[1])) * 1000;
const rows = []; let prev = null;
while (s.tick()) { const t = s.n * s.dt, st = s.st, lf = C.lc.feet[nL], pr = s.probeRows[nL]; rows.push({ t, st: lf.state, s: lf.s, a: lf.a, Fz: C.sense.Fz[nL], Fxz: pr ? pr.JxzN : 0, x: st[f].pos[0], z: st[f].pos[2], y: st[f].pos[1], clr: clear(st), sw: !!lf.swing, lam: s.last && s.last.lam, ty: C.lc.target(nL) ? C.lc.target(nL).pos[1] : null, rho: lf.rho }); }
const tRel = (rows.find((r, i) => i && rows[i - 1].st === "SUPPORT" && r.st !== "SUPPORT") || {}).t, r0 = rows.find(r => r.t >= tRel - 0.1 - 1e-9), A = +arg("from", tRel - 0.3), Bt = +arg("to", tRel + 0.7);
console.log(`${run.id} flags ${JSON.stringify(run.flags)} t_rel ${tRel?.toFixed(4)}; displacement reference t = ${r0.t.toFixed(4)}`);
rows.forEach((r, i) => { if (r.t >= A && r.t <= Bt && (i % EV === 0 || (i && rows[i - 1].st !== r.st))) console.log(`${r.t.toFixed(4)} ${r.st.padEnd(11)} s ${r.s.toFixed(3)} a ${r.a.toFixed(3)} Fz ${r.Fz.toFixed(2).padStart(7)} Fxz ${r.Fxz.toFixed(2).padStart(6)} dxz ${(Math.hypot(r.x - r0.x, r.z - r0.z) * 1000).toFixed(3)} mm (dx ${((r.x - r0.x) * 1000).toFixed(3)} dz ${((r.z - r0.z) * 1000).toFixed(3)}) clr ${r.clr.toFixed(3)}${r.ty != null ? ` | target−foot ${((r.ty - r.y) * 1000).toFixed(3)} mm` : ""}${r.sw ? " SWING" : ""} ρ ${r.rho?.toFixed(2)}`); });
s.destroy();

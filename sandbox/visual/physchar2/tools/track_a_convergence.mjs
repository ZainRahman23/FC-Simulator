// Track A (DIAGNOSTIC ONLY): is the jump step a non-converged velocity solve? From the full saved state before the jump step, re-run that ONE
// step with (a) the velocity-iteration count varied (warm vs cold contact cache) and (b) the toe↔turf contacts turned into sensors for that
// step only (contact settings in the listener — the toe body, its joint and every other contact unchanged), and (c) per-step diagnostics of the
// MTP joint. Settings are changed only inside this probe for the single re-run step and restored afterwards.
// usage (worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/track_a_convergence.mjs <scenario> <n_jump> <out.json> [F0|F1]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { G1Sim } from "../gates/v2_g1.js"; import { pi1RunnerSpec, pi1RunnerF1Spec } from "../spec/v2_pi1_runner.js";
import { saveState, restoreState, energyOf } from "./track_a_lib.mjs";
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("accepted configuration env required");
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js"));
const key = process.argv[2] || "drop1m", nJump = +(process.argv[3] || 110), outPath = process.argv[4], which = process.argv[5] || "F1";
const spec = which === "F0" ? pi1RunnerSpec() : pi1RunnerF1Spec(), m = new G1Sim(J, spec, key, { passiveOpts: { kneeModel: "v2k" } }), ps = m.w.ps, g = m.g;
const toeIdx = new Set(spec.bodies.map((b, i) => (/^toe_/.test(b.name) ? i : -9))), L = m.w.listener, oA = L.OnContactAdded, oP = L.OnContactPersisted; let toeSensor = false;
const wrap = (o) => (b1p, b2p, mp, sp) => { o(b1p, b2p, mp, sp); if (!toeSensor) return; const b1 = J.wrapPointer(b1p, J.Body), b2 = J.wrapPointer(b2p, J.Body), u1 = b1.GetUserData() - 1, u2 = b2.GetUserData() - 1;
  if (toeIdx.has(u1) || toeIdx.has(u2)) J.wrapPointer(sp, J.ContactSettings).mIsSensor = true; };
L.OnContactAdded = wrap(oA); L.OnContactPersisted = wrap(oP);
while (m.n < nJump - 1) m.tick();
const S_all = saveState(J, ps, J.EStateRecorderState_All), up = m.up, pre = m.st, e0 = energyOf(spec, m.P, pre, g);
const empty = new Uint8Array([J.EStateRecorderState_Contacts, 0, 0, 0, 0, 0, 0, 0, 0]);
const base = ps.GetPhysicsSettings(), vs0 = base.mNumVelocitySteps;
function one(vel, cold, sensor) { restoreState(J, ps, S_all); if (cold) restoreState(J, ps, empty);
  const p = ps.GetPhysicsSettings(); p.mNumVelocitySteps = vel; ps.SetPhysicsSettings(p); toeSensor = sensor;
  up.applied = false; m.P.apply(up); m.w.step(m.dt, m.cfg.coll); toeSensor = false; const p2 = ps.GetPhysicsSettings(); p2.mNumVelocitySteps = vs0; ps.SetPhysicsSettings(p2);
  const st = m.read(), e = energyOf(spec, m.P, st, g); return { st, dE: e.E - e0.E }; }
const ref = one(vs0, false, false).st, out = { key, which, nJump, velSteps0: vs0, rows: [] };
for (const sensor of [false, true]) for (const cold of [false, true]) for (const vel of [150, 300, 600, 1200, 2400, 4800]) {
  const r = one(vel, cold, sensor); let dv = 0; r.st.forEach((s, i) => { for (let k = 0; k < 3; k++) dv = Math.max(dv, Math.abs(s.v[k] - ref[i].v[k])); });
  const row = { toeContactsAsSensor: sensor, coldContactCache: cold, velSteps: vel, dE: +r.dE.toFixed(5), maxDvVsOriginal: +dv.toFixed(5) }; out.rows.push(row);
  console.log(`sensor ${sensor ? "Y" : "n"} cold ${cold ? "Y" : "n"} vel ${String(vel).padStart(4)} dE ${row.dE.toFixed(4).padStart(9)} max|Δv| vs original ${row.maxDvVsOriginal}`); }
if (outPath) fs.writeFileSync(outPath, JSON.stringify(out, null, 1));

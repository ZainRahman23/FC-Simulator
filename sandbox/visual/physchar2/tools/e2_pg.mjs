// ═══ physchar2/tools/e2_pg.mjs — E2 PLANNING GATES (e2/E2_PREREGISTRATION_v2.md §3) with the IMPLEMENTED planner and law: runs a scenario (gates/v2_e2.js, PSTAR5) to its
// decision tick, lets the implemented code make its decision (commanded: the step command → ctrl/v2_footstep.js plan; p15: the supervisor's class rule → the common planner)
// and STOPS on that tick — no physical E2 step is executed. Writes the planner record (verdict, foothold, T, T_r, slack, reach / path certificates, measured state).
//   PG-1: every undisturbed commanded step returns CERTIFIED_ONE_STEP with the nominal foothold. PG-2: each of the 4 obligations (p15 class B) — CERTIFIED or reported
//   NO_CERTIFIED. PG-3: every chosen foothold and swing path passes online certification (the record's path verdicts).
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/e2_pg.mjs --protocol=step|p15 --human=… --side=L|R [--kind=forward|lateral] [--hz=240] [--pert=P15] --out=<json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Sim, e2Spec } from "../gates/v2_e2.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const PROTO = arg("protocol", "step"), HUMAN = arg("human", "V2-REF"), SIDE = arg("side", "L"), KIND = arg("kind", "forward"), HZ = +arg("hz", 240), PERT = arg("pert", PROTO === "p15" ? "P15" : "none"), OUT = arg("out", "");
// --traj=v2|A30: versioned commanded-step trajectory seeds (gates/v2_e2.js E2TRAJ; default v2 = frozen)
const TRAJ = arg("traj", "v2"), CONFIG = arg("config", "PSTAR5"), run = { ...(TRAJ !== "v2" ? { traj: TRAJ } : {}), protocol: PROTO, human: HUMAN, side: SIDE, kind: PROTO === "step" ? KIND : null, hz: HZ, variant: null, pert: PROTO === "p15" ? PERT : null, config: CONFIG };
if (!["PSTAR5", "PSTAR5B", "PSTAR5C", "PSTAR5BS", "PSTAR5CS", "PSTAR5BH", "PSTAR5CH"].includes(CONFIG)) throw new Error("config");
const { s, H, seq } = e2Sim(J, e2Spec(HUMAN), run); let stopT = null;
// a planner that refuses to certify without a validated tracked-clearance allowance (swingAccFF with FS.clearAllow unset or validated for another servo) is RECORDED as that
// refusal (the gate is then not certifiable), not as a crash
let refused = null;
try { while (s.tick()) { const t = s.n * s.dt, g = s.ctrl.g3; if ((PROTO === "step" && seq.calls.length) || (PROTO === "p15" && g && g.e2dec)) { stopT = t; break; } if (H.tEnd != null && t >= H.tEnd - 1e-9) break; if (t > 20) break; } }
catch (e) { if (!/allowance/.test(e.message)) throw e; refused = { t: s.n * s.dt, message: e.message }; }
const g = s.ctrl.g3, rec = { generated: "tools/e2_pg.mjs", run, stopT, ...(refused ? { refused } : {}), events: { tL: H.tL, abortT: H.abortT, pertT: H.pertT }, e2dec: g && g.e2dec ? g.e2dec : null, calls: seq.calls, seqEvents: seq.events,
  taVlog: g && g.cap ? g.cap.vlog : null, hash: (s.h >>> 0).toString(16).padStart(8, "0") };
s.destroy(); if (OUT) fs.writeFileSync(OUT, JSON.stringify(rec, null, 1));
if (refused) console.log(`PG ${PROTO} ${HUMAN} ${SIDE} ${PROTO === "step" ? KIND : PERT} ${HZ} Hz: PLANNER REFUSED at ${refused.t.toFixed(4)} s — ${refused.message}`);
const c = rec.calls[0]; if (!refused) console.log(`PG ${PROTO} ${HUMAN} ${SIDE} ${PROTO === "step" ? KIND : PERT} ${HZ} Hz: ${rec.e2dec ? `class decision at ${rec.e2dec.t.toFixed(4)} s (t_cls ${rec.e2dec.tCls.toFixed(4)}), T-A verdict "${rec.e2dec.verdict}" → ` : ""}${c ? `${c.verdict}${c.dx != null ? ` dx ${c.dx} dy ${c.dy} T ${c.T} Tr ${c.Tr} slack ${(c.slack * 1000).toFixed(1)} ms${c.nominal != null ? " nominal " + c.nominal : ""}; path ${c.path ? c.path.every(v => v === "FEASIBLE") : "—"}` : " " + (c.why || "")}; reach ${c.log ? c.log.reachCertified + "/" + c.log.reachNodes : "—"}; ${c.log ? c.log.ms.toFixed(0) + " ms" : ""}` : "no planner call"}`);

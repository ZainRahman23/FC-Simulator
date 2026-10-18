// receive1/tools/rc1_boundary.mjs — receiveTurnAngle: the definition and the classification boundaries (89 / 90, 270 / 271), on the pure function and
// on the receiver's actual classification in a simulation (the exit requested through the lab's turn convention; facing = the body's heading when the
// pass is played), for several facings
import fs from "fs"; import { receiveTurnAngle, exitTurn, RC1 } from "../rc1_core.js"; import { makeReceive } from "./rc1_env.mjs"; import { makeCase } from "../rc1_cases.js";
const DEG = Math.PI / 180, out = { turnMin: RC1.turnMin, pure: [], sim: [] };
for (const facing of [0, 37, -120, 179]) for (const a of [0, 45, 89, 89.999, 90, 120, 180, 225, 240, 270, 270.001, 271, 315, 359.9]) { const r = receiveTurnAngle(facing * DEG, (facing + a) * DEG); out.pure.push({ facing, a, deg360: r.deg360, signed: r.signed, turning: r.turning }); }
for (const a of [89, 90, 270, 271, 180]) { const cs = makeCase({ dir: "F", angle: a, rs: "JOG", ps: "MED", side: "R" }), S = makeReceive(Object.assign({}, cs.scenario, { dur: 0.05 }), { seed: 1 }); S.run(); out.sim.push({ angle: a, exitTurn: exitTurn(a), deg360: S.rc.cls.deg360, signed: S.rc.cls.signed, kind: S.rc.cls.kind }); }
const bad = out.pure.filter((r) => r.turning !== (r.a >= 90 - 1e-9 && r.a <= 270 + 1e-9 && !(r.a > 270 + 1e-6)));
out.pass = bad.length === 0 && out.sim.find((x) => x.angle === 89).kind === "ordinary" && out.sim.find((x) => x.angle === 90).kind === "turning" && out.sim.find((x) => x.angle === 270).kind === "turning" && out.sim.find((x) => x.angle === 271).kind === "ordinary";
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log("sim", JSON.stringify(out.sim)); console.log("pure mismatches", bad.length, "PASS", out.pass);

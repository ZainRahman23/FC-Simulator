import { J, body, G2, M } from "../fg/lib.mjs"; import fsM from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fsM.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c;
const ctrl = JSON.parse(process.argv[2]), walkX = JSON.parse(process.argv[3] || "{}");
const { spec, poses } = body("F0"), first = "R", at = 0.5, n = 12, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
const r = G2.runG2a(J, spec, "G2W_A8", { poses, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl }) } }, onLoco: l => { LOCO = l; } });
const U = LOCO.planner._uni; console.log("C.adapt", JSON.stringify(U.C.adapt), "C.place", U.C.place, "bias", U.bias);
for (const lg of U.stepLog) console.log(lg.i, "err", lg.err, "lastPred", lg.dec.length ? lg.dec[lg.dec.length - 1].mapPred : null);

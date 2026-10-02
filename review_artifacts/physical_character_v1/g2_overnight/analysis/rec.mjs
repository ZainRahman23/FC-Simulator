// record collider frames of a whole walk for the review viewer: node rec.mjs ctrl|oracle <start e.g. R0.5> <out.js> [oracle.json] [n]
import { J, body, G2 } from "./lib.mjs"; import fs from "fs";
const { dumpFrames } = await import("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/tools/fg_frames.js");
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/";
const models = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(JDM + "mU1_tau" + t + ".json", "utf8"))]));
const [mode, st, outF, orF] = process.argv.slice(2), first = st[0], at = +st.slice(1);
const OR = mode === "oracle" ? JSON.parse(fs.readFileSync(orF, "utf8")) : null, n = +(process.argv[6] || (OR ? Object.keys(OR.fixed).length + 8 : 40));
const CTRL = { kind: "U", vd: 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false, models, ...(OR ? { identFixed: true } : {}) };
const { spec, poses } = body("F0"), base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.62, rhythmOver: { steps, at, walk: { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] }, ...(OR ? { char: { ...(base.char || {}), ...OR.fixed } } : {}), ctrl: { ...base.ctrl, ...CTRL } } }, onLoco: l => { LOCO = l; } });
const tF = (r.recs.find(q => q.com[1] < 0.75) || { t: Infinity }).t;
const fr = dumpFrames(outF, spec, r.recs, LOCO.planner, { scenario: mode, foot: "F0", test: "G2W_A8", start: first + "@" + at, hash: r.hash }, { t1: Math.min(r.recs[r.recs.length - 1].t, tF + 1.0) });
console.log(mode, st, "hash", r.hash, "fall", tF, "frames", JSON.stringify(fr).slice(0, 120));

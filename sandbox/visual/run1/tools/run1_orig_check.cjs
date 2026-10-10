// run1/tools/run1_orig_check.cjs — proves run1_gait_orig.js still holds the original RUN-1 (3caa5d58) byte for byte, and that it evaluates
// identically to that commit's file loaded on its own (pose hash over a stride at 5.5 m/s).
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
const DIR = path.resolve(__dirname, ".."), src = fs.readFileSync(path.join(DIR, "run1_gait_orig.js"), "utf8");
const a = src.indexOf("// ── BEGIN VERBATIM run1_gait.js @ 3caa5d58 ──\n"), b = src.indexOf("// ── END VERBATIM ──");
const body = src.slice(a + "// ── BEGIN VERBATIM run1_gait.js @ 3caa5d58 ──\n".length, b);
const orig = cp.execSync("git show 3caa5d58:sandbox/visual/run1/run1_gait.js", { cwd: DIR, encoding: "utf8" });
console.log(`verbatim block ${body === orig ? "IDENTICAL" : "DIFFERS"} to 3caa5d58:run1_gait.js (${orig.length} bytes)`);
const { loadRun1 } = require("./run1_load.cjs"), X = loadRun1(), skel = X.charSkel("vinicius"), O = X.RUN1_ORIG;
const hash = (E, sk) => { const A = E.r1Make(sk), h = crypto.createHash("sha256"); for (let k = 0; k < 240; k++) { const t = k / 120, rs = E.r1Replay(A, () => 5.5, null, t), ev = E.r1Evaluate(A, { x: 5.5 * t, y: 34, heading: 0, v: 5.5 }); rs(); for (const m of ev.fk.world) h.update(Buffer.from(m.buffer)); } return h.digest("hex").slice(0, 16); };
// reference: the 3caa5d58 file on its own in a fresh context
const vm = require("vm"), ctx = { console, Math, Float32Array, Array, Object, JSON, Number, Set, Map, performance: { now: () => 0 } }; vm.createContext(ctx);
for (const f of ["anim3d/m4.js", "anim3d/skeleton.js", "anim3d/of_rig.js", "anim3d/of_character.js"]) vm.runInContext(fs.readFileSync(path.join(DIR, "..", f), "utf8").replace(/^"use strict";/m, ""), ctx);
vm.runInContext(orig.replace(/^"use strict";/m, ""), ctx); vm.runInContext("this.__E = { r1Make, r1Replay, r1Evaluate, ofCharSkeleton }", ctx);
const rig = JSON.parse(fs.readFileSync(path.join(DIR, "../../../assets/characters/outfield/vinicius/rig.json"), "utf8"));
const hRef = hash(ctx.__E, ctx.__E.ofCharSkeleton({ rig })), hOrig = hash(O, Object.assign({}, skel));
console.log(`pose hash: 3caa5d58 alone ${hRef} · RUN1_ORIG beside the new run1_gait.js ${hOrig} → ${hRef === hOrig ? "IDENTICAL" : "DIFFERENT"}`);

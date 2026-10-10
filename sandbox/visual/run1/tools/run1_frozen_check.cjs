// run1/tools/run1_frozen_check.cjs — proves the frozen copies still hold their commits byte for byte, and evaluate identically to that commit's
// file loaded on its own (pose hash over a stride at 5.5 m/s and at 3.0 m/s): run1_gait_orig.js = RUN-1.0 @ 3caa5d58, run1_gait_v11.js = RUN-1.1 @ 83a457db, run1_gait_v12.js = RUN-1.2 @ cddaf890, run1_gait_v13.js = RUN-1.3 @ bdab1f5f (the Locomotion V2 straight-line baseline).
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto"), vm = require("vm");
const DIR = path.resolve(__dirname, ".."), { loadRun1 } = require("./run1_load.cjs"), X = loadRun1();
const rig = JSON.parse(fs.readFileSync(path.join(DIR, "../../../assets/characters/outfield/vinicius/rig.json"), "utf8"));
const hash = (E, sk, v) => { const A = E.r1Make(sk), h = crypto.createHash("sha256"); for (let k = 0; k < 240; k++) { const t = k / 120, rs = E.r1Replay(A, () => v, null, t), ev = E.r1Evaluate(A, { x: v * t, y: 34, heading: 0, v }); rs(); for (const m of ev.fk.world) h.update(Buffer.from(m.buffer)); } return h.digest("hex").slice(0, 16); };
for (const [file, commit, api] of [["run1_gait_orig.js", "3caa5d58", "RUN1_ORIG"], ["run1_gait_v11.js", "83a457db", "RUN1_V11"], ["run1_gait_v12.js", "cddaf890", "RUN1_V12"], ["run1_gait_v13.js", "bdab1f5f", "RUN1_V13"]]) {
  const src = fs.readFileSync(path.join(DIR, file), "utf8"), tagB = `// ── BEGIN VERBATIM run1_gait.js @ ${commit} ──\n`, a = src.indexOf(tagB), b = src.indexOf("// ── END VERBATIM ──");
  const body = src.slice(a + tagB.length, b), orig = cp.execSync(`git show ${commit}:sandbox/visual/run1/run1_gait.js`, { cwd: DIR, encoding: "utf8" });
  const ctx = { console, Math, Float32Array, Array, Object, JSON, Number, Set, Map, performance: { now: () => 0 } }; vm.createContext(ctx);
  for (const f of ["anim3d/m4.js", "anim3d/skeleton.js", "anim3d/of_rig.js", "anim3d/of_character.js"]) vm.runInContext(fs.readFileSync(path.join(DIR, "..", f), "utf8").replace(/^"use strict";/m, ""), ctx);
  vm.runInContext(orig.replace(/^"use strict";/m, ""), ctx); vm.runInContext("this.__E = { r1Make, r1Replay, r1Evaluate, ofCharSkeleton }", ctx);
  const res = (api === "RUN1_V13" ? [5.5, 3.0, 7.8, 9.5] : [5.5, 3.0, 7.8]).map(v => { const hRef = hash(ctx.__E, ctx.__E.ofCharSkeleton({ rig }), v), sk = Object.assign({}, X.charSkel("vinicius")); delete sk._r1body; const hF = hash(X[api], sk, v); return `${v} m/s ${hRef} / ${hF} ${hRef === hF ? "IDENTICAL" : "DIFFERENT"}`; });
  console.log(`${file}: verbatim block ${body === orig ? "IDENTICAL" : "DIFFERS"} to ${commit}:run1_gait.js (${orig.length} bytes) · pose hash ${commit} alone / ${api} beside the others: ${res.join(" · ")}`);
}

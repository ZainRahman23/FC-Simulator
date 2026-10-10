// run1/tools/run1_load.cjs — load the anim3d math + character bind + RUN-1 into one node vm context (same globals as the page)
const fs = require("fs"), path = require("path"), vm = require("vm");
const VIS = path.resolve(__dirname, "../..");                      // sandbox/visual
const REPO = path.resolve(VIS, "../..");
function loadRun1(opts) {
  const o = opts || {};
  const ctx = { console, Math, Float32Array, Uint16Array, Uint32Array, Uint8Array, Array, Object, JSON, Number, Set, Map, performance: { now: () => 0 } };
  vm.createContext(ctx);
  const files = ["anim3d/m4.js", "anim3d/skeleton.js", "anim3d/ik.js", "anim3d/of_rig.js", "anim3d/of_motion.js", "anim3d/of_loco.js", "anim3d/of_loco_cont.js", "anim3d/of_character.js", "run1/run1_gait.js"].concat(o.extra || []);
  for (const f of files) { const src = fs.readFileSync(path.join(VIS, f), "utf8"); vm.runInContext(src.replace(/^"use strict";/m, ""), ctx, { filename: f }); }
  vm.runInContext("this.__exp = { M4, V3, skelFK, ofCharSkeleton, RUN1, R3, RV, r1Body, r1Gait, r1Pose, r1FK, r1Make, r1Prepare, r1Advance, r1Evaluate, r1StanceLeg, r1Pelvis, r1Herm, R1_LIMITS, R1_CH, r1RootMatrix, ofLocoMake: typeof ofLocoMake === 'function' ? ofLocoMake : null, ofActorMake: typeof ofActorMake === 'function' ? ofActorMake : null, ofActorTick: typeof ofActorTick === 'function' ? ofActorTick : null };", ctx);
  const X = ctx.__exp; X.ctx = ctx; X.setCont = (on) => vm.runInContext(`if (typeof OF_CONT !== 'undefined') OF_CONT.on = ${!!on};`, ctx);
  X.charSkel = (id) => { const rig = JSON.parse(fs.readFileSync(path.join(REPO, "assets/characters/outfield", id, "rig.json"), "utf8")); return X.ofCharSkeleton({ rig }); };
  // ofActorTick needs gkRootMatrix (gk_graph.js): take that one function by regex, as pres_harness.cjs does
  const gk = fs.readFileSync(path.join(VIS, "anim3d/gk_graph.js"), "utf8"), m = gk.match(/function gkRootMatrix[\s\S]*?\n}\n/);
  if (m) vm.runInContext(m[0], ctx);
  return X;
}
module.exports = { loadRun1, VIS, REPO };

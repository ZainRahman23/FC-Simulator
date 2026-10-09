// Loads the slide-contact simulation's runner contact model (pt_react.js + its pure dependencies) into an isolated vm context, read-only.
// V1.3 (CHARCOLLIDE-1) needs the shared pure locomotion law and the skeleton FK; the legacy (e2c98ec) model needs only of_loco.js.
import fs from "fs"; import path from "path"; import vm from "vm";
export function loadSim(wt, { charcollide = true } = {}) {
  const ctx = { Math, console: { warn() {}, log() {} }, PT: { LEG_REF: 0.865, IDLE_V: 0.18 }, PT_DT: 1 / 60, performance: { now: () => 0 }, Float32Array, Uint16Array, Uint32Array, Uint8Array, Object, Array, JSON, Number, Set, Map, Promise };
  vm.createContext(ctx); const run = (f) => vm.runInContext(fs.readFileSync(path.join(wt, "sandbox/visual", f), "utf8"), ctx, { filename: f });
  const files = charcollide ? ["anim3d/m4.js", "anim3d/skeleton.js", "anim3d/of_rig.js", "anim3d/of_motion.js", "anim3d/of_loco.js", "anim3d/of_character.js", "pt_react.js", "pt_charcollide.js"]
    : (fs.existsSync(path.join(wt, "sandbox/visual/anim3d/m4.js")) ? ["anim3d/m4.js", "anim3d/of_loco.js", "pt_react.js"] : ["anim3d/of_loco.js", "pt_react.js"]);
  if (!charcollide) vm.runInContext("const clamp01 = (v) => Math.max(0, Math.min(1, v)); const smooth01 = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };", ctx);
  for (const f of (charcollide ? files : files.filter(f => f !== "anim3d/m4.js"))) { if (charcollide || f !== "anim3d/m4.js") run(f); }
  const g = (n) => vm.runInContext(n, ctx);
  return { ctx, body: g("ptRxBody"), segs: g("ptRxSegments"), segR: charcollide ? g("ptRxSegR") : ((sg) => sg.r), prims: g("ptRxTacklerPrims"), segseg: g("ptRxSegSeg3"), footLenV12: g("PT_REACT.footLenV12"), g };
}

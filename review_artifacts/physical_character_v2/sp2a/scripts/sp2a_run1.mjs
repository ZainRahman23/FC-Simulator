// SP2A — the RUN-1 run-in (READ-ONLY use of the frozen Locomotion V2 baseline). RUN-1 (tag locomotion-v2-straight-baseline-1 = 4a226b1f, from a
// `git archive` of the tag, LV2_ARCHIVE) is queried only through its contract (LV2_STATE.queryAt, replay path) at a constant speed on a straight
// line, mapped to the V2 body by the frozen PI-1 mapper (pcg_rev1 makeMapper, R-K + RF-1) exactly as the R2 handoff probe does, and reduced to
// V2 ANATOMICAL joint angles (slide_phys1 sp_lib.anatOf, body-independent), the pelvis world pose and both feet's stance flags, sampled at 240 Hz.
// Nothing in RUN-1 / LV2 / V2 / the simulation is modified; nothing is stepped. The result is the authored run-in of SP2A: its last left-foot
// touchdown becomes the commitment touchdown (t = 0), and the physical entry state is taken from the same animation (pose AND velocity).
// usage (worktree root): LV2_ARCHIVE=<dir> V13_WT=<v1.3 worktree> node .../sp2a_run1.mjs --speed 5.0 --out run1_runin.json [--from 1.0 --to 3.0]
import fs from "fs"; import vm from "vm"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const ARCH = process.env.LV2_ARCHIVE; if (!ARCH) throw new Error("LV2_ARCHIVE required");
const { loadRun1 } = require(path.join(ARCH, "sandbox/visual/run1/tools/run1_load.cjs"));
const X = loadRun1({ extra: ["run1/lv2_state.js"] }), LV = vm.runInContext("LV2_STATE", X.ctx), E = X.RUN1_V13;
const M = await import(new URL("../../pi1/rev1/scripts/pcg_rev1.mjs", import.meta.url).href), { L, makeMapper } = M, { V, Q, B } = L;
const SL = await import(new URL("../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href);
const v = +arg("speed", "5.0"), HD = 0, t0 = +arg("from", "1.0"), t1 = +arg("to", "3.0"), H = 1 / 240;
const own = () => { const s = Object.assign({}, X.charSkel("vinicius")); delete s._r1body; return s; };
const bindW = X.skelFK(own(), {}, X.M4.ident()).world.map(m => Array.from(m));
const prof = { v, vOf: () => v, simAt: (t) => ({ x: v * t * Math.cos(HD), y: v * t * Math.sin(HD), heading: HD, v }) };
const mat = (j) => { const R = j.world.rotation, P = j.world.position; return [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, P[0], P[1], P[2], 1]; };
const frameOf = (q) => ({ world: q.joints.map(mat), feet: ["L", "R"].map(sd => ({ contact: !!q.legs[sd].stance, mode: q.legs[sd].contact.pivot || "swing" })) });
const recOf = (qs) => ({ bones: qs[0].joints.map(j => ({ name: j.name, parent: j.parent })), bind: bindW, pres: qs.map(frameOf) });
const A = E.r1Make(own()); E.r1Replay(A, prof.vOf, null, Math.max(1.9, t1 + 0.1))();
const T = E.r1GaitAt(A.body, A.prm, v).T, Qat = (t) => LV.queryAt(E, A, prof.simAt, t, prof.vOf, null, { provenance: false });
const out = { tool: "sp2a_run1.mjs", source: "RUN-1 (locomotion-v2-straight-baseline-1) via LV2_STATE.queryAt, PI-1 mapper R-K + RF-1", speed: v, strideTime: T, dt: H, frames: [] };
for (let t = t0; t <= t1 + 1e-9; t += H) { const qs = [Qat(t - H), Qat(t), Qat(t + H)], m = makeMapper(recOf(qs), { knee: "RK", rf1: true }), S = m.poseAt(1).S;
  // the mapper's body set is V2's own (B); anatomical angles are read with the V2 joint definitions (same 14-body / 13-joint topology as SPEC_T)
  const an = SL.anatOf(S.map(s => ({ pos: s.pos, rot: s.rot })));
  out.frames.push({ t: +t.toFixed(5), stance: { L: !!qs[1].legs.L.stance, R: !!qs[1].legs.R.stance }, pelvis: { pos: S[0].pos, rot: S[0].rot }, anat: an }); }
// touchdowns: rising edges of the stance flags
out.touchdowns = []; for (let k = 1; k < out.frames.length; k++) for (const sd of ["L", "R"]) if (out.frames[k].stance[sd] && !out.frames[k - 1].stance[sd]) out.touchdowns.push({ foot: sd, t: out.frames[k].t, k });
fs.writeFileSync(arg("out"), JSON.stringify(out)); console.log("stride T", T.toFixed(4), "s; frames", out.frames.length, "; touchdowns", JSON.stringify(out.touchdowns));

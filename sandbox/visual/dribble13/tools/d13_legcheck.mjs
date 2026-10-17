// dribble13/tools/d13_legcheck.mjs — VERIFICATION of the time-warped swing leg (d13_core warpedSwingRot): for every exact warped pose the planner asks
// for in the given runs, the leg-only path (TURN-1.2's swing branch on the tick's unwarped pose) and TURN-1.2's full t1Pose with the phase override
// must give the same bone frames, bit for bit (every element of every R and p of thigh / shin / foot / toe, both sides).
// With mode "pose": VERIFICATION of the leg-only pose (d13_core legPose): for every predicted tick whose pose the planner evaluates, the pelvis
// (rotation, position), both legs' thigh / shin / foot / toe rotations and hip rotations against TURN-1.2's full t1Pose of the same state, bit for bit.
// usage: node d13_legcheck.mjs "SCN1,SCN2|all" seeds [out.json] [warp|pose]      (runs the incremental planner, plan13 on)
import fs from "fs"; import { makeSim, D1 } from "./d13_env.mjs"; import { get, list } from "../../dribble1/d1_scenarios.js";
const [idsB = "CUT90_RUN,CUT90L_RUN,REV135_RUN,CUT60_RUN", nA = "2", outFile, mode = "warp"] = process.argv.slice(2), idsA = idsB === "all" ? list().map((x) => x.id).join(",") : idsB;
if (mode === "pose") { let n = 0, same = 0, full = 0; const bad = [], J = ["pelvis", "thigh_R", "shin_R", "foot_R", "toe_R", "thigh_L", "shin_L", "foot_L", "toe_L"];
  for (const id of idsA.split(",")) for (let sd = 1; sd <= +nA; sd++) {
    const S = makeSim(get(id), { ver: "d13", seed: sd, opts: { record: false, plan13: true } }); S.run(0.05);
    const TP = Object.getPrototypeOf(S.track); if (!TP.__pchk) { TP.__pchk = true; const po = TP.poseOf;
      TP.poseOf = function (C) { const r = po.call(this, C); if (!D1.plan13.legOnlyPose) return r; if (C.phi == null) { full++; return r; }
        const ref = this.sim.T1.t1Pose(C); n++; let ok = true;
        for (const j of J) { const a = r.pose.rot[j], b = ref.rot[j]; for (let i = 0; i < 9; i++) if (!Object.is(a[i], b[i])) ok = false; }
        for (let i = 0; i < 3; i++) if (!Object.is(r.pose.pelvisPos[i], ref.pelvisPos[i])) ok = false;
        for (const F of ["R", "L"]) if (!Object.is(r.pose.legs[F].psi, ref.legs[F].psi)) ok = false;
        if (ok) same++; else if (bad.length < 10) bad.push({ id, sd, t: C.t }); return r; }; }
    S.run(); }
  const res = { mode, poses: n, bitIdentical: same, fullPoseBeforeFirstStep: full, mismatches: bad }; console.log(JSON.stringify(res)); if (outFile) fs.writeFileSync(outFile, JSON.stringify(res, null, 1)); process.exit(0); }
let n = 0, same = 0, legPath = 0; const bad = [];
for (const id of idsA.split(",")) for (let sd = 1; sd <= +nA; sd++) {
  const S = makeSim(get(id), { ver: "d13", seed: sd, opts: { record: false, plan13: true } }); S.run(0.05);
  const TP = Object.getPrototypeOf(S.track); if (!TP.__chk) { const wb = TP.warpedBones; TP.__chk = true;
    TP.warpedBones = function (kk, F, wq) {
      const r = wb.call(this, kk, F, wq); if (!r || !D1.plan13.legPose) return r;
      const used = this.at(kk) && this.at(kk)._need && this.stateAt(kk).phi != null && kk > this.kb; if (used) legPath++;
      const m = this.wbMemo, key = kk + F + wq.toFixed(9), keep = m.get(key); m.delete(key); D1.plan13.legPose = false; let ref; try { ref = wb.call(this, kk, F, wq); } finally { D1.plan13.legPose = true; m.set(key, keep); }
      n++; let ok = true; for (const bn of Object.keys(ref)) for (const f of ["R", "p"]) { const a = r[bn][f], b = ref[bn][f]; for (let i = 0; i < b.length; i++) if (!Object.is(a[i], b[i])) ok = false; }
      if (ok) same++; else if (bad.length < 10) bad.push({ id, sd, kk, F, wq }); return r; }; }
  S.run();
}
const res = { requests: n, bitIdentical: same, viaLegPath: legPath, mismatches: bad };
console.log(JSON.stringify(res)); if (outFile) fs.writeFileSync(outFile, JSON.stringify(res, null, 1));

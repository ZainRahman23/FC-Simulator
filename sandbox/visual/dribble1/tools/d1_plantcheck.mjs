// dribble1/tools/d1_plantcheck.mjs — PLANTS UNCHANGED: at every tick where a swing adjustment acts (warp / offset / region rotation on the swing leg),
// the stance foot and toe of the adjusted pose are compared with TURN-1.2's plain t1Evaluate of the same state (a clone). Also the touchdown of every
// adjusted swing: the first stance tick's foot vs the plain pose. usage: node d1_plantcheck.mjs "IDs|all" seeds [out.json]
import fs from "fs"; import { makeSim, X } from "./d1_env.mjs"; import { get, list } from "../d1_scenarios.js";
const ids = process.argv[2] === "all" ? list().map((s) => s.id) : (process.argv[2] || "CUT90_RUN").split(","), N = +(process.argv[3] || 2), out = {};
const T1 = X.TURN1, sk = X.skel, bi = (n) => sk.bones.findIndex((b) => b.name === n);
const idx = { R: [bi("foot_R"), bi("toe_R")], L: [bi("foot_L"), bi("toe_L")] }; if (idx.R.includes(-1)) throw new Error("bone names: " + sk.bones.map((b) => b.name).join(","));
const pos = (M) => [M[12], M[13], M[14]], dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
let gMax = 0, gN = 0, gSwingMax = 0;
for (const id of ids) for (let seed = 1; seed <= N; seed++) {
  const S = makeSim(get(id), { seed, opts: { record: false } });
  let maxStance = 0, ticks = 0, maxSwingOther = 0; const orig = S.evalPose.bind(S);
  S.evalPose = (A) => { orig(A); if (!A.d1adj) return; const C = T1.t1Clone(A); T1.t1Evaluate(C); ticks++;
    for (const F of ["R", "L"]) { const adjF = A.d1adj[F] != null; for (const j of idx[F]) { const d = dist(pos(A.fk.world[j]), pos(C.fk.world[j]));
      if (A.legs[F].stance) maxStance = Math.max(maxStance, d); else if (!adjF) maxSwingOther = Math.max(maxSwingOther, d); } } };
  S.run(); gMax = Math.max(gMax, maxStance); gN += ticks; gSwingMax = Math.max(gSwingMax, maxSwingOther);
  out[id + ":" + seed] = { adjustedTicks: ticks, stanceFootMaxDevM: maxStance, unadjustedSwingFootMaxDevM: maxSwingOther };
  console.log((id + ":" + seed).padEnd(20), `adjusted ticks ${ticks} · stance foot/toe max deviation ${(maxStance * 1000).toFixed(4)} mm · other swing ${(maxSwingOther * 1000).toFixed(4)} mm`); }
out.TOTAL = { adjustedTicks: gN, stanceFootMaxDevM: gMax, unadjustedSwingFootMaxDevM: gSwingMax }; console.log("TOTAL", JSON.stringify(out.TOTAL)); if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(out, null, 1));

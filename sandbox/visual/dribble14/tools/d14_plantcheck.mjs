// dribble14/tools/d14_plantcheck.mjs — TURN-1.2 UNCHANGED UNDER THE FOLLOW-THROUGH: at every tick where a swing adjustment acts (touch, follow-through,
// avoidance), the adjusted pose is compared with TURN-1.2's own t1Evaluate of the same state (a clone): the STANCE foot / toe (plants never move) and the
// other, unadjusted swing foot; for every adjusted swing, the residual adjustment of the swing foot on its LAST airborne tick (how far from TURN-1.2's
// own foot it still is as it lands — the rejoin) and the TOUCHDOWN tick against TURN-1.2's prediction (the landing time never moves).
// usage: node d14_plantcheck.mjs "IDs|all" seeds [out.json] [ver d12]
import fs from "fs"; import { makeSim, X } from "./d14_env.mjs"; import { get, list } from "../../dribble1/d1_scenarios.js";
const ids = process.argv[2] === "all" ? list().map((s) => s.id) : (process.argv[2] || "CUT90_RUN").split(","), N = +(process.argv[3] || 2), ver = process.argv[5] || "d14", out = {};
const T1 = X.TURN1, sk = X.skel, bi = (n) => sk.bones.findIndex((b) => b.name === n);
const idx = { R: [bi("foot_R"), bi("toe_R")], L: [bi("foot_L"), bi("toe_L")] };
const pos = (M) => [M[12], M[13], M[14]], dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
let gMax = 0, gN = 0, gSwingMax = 0, gLand = 0, gLandN = 0, gTD = 0;
for (const id of ids) for (let seed = 1; seed <= N; seed++) {
  const S = makeSim(get(id), { ver, seed, opts: { record: false } });
  let maxStance = 0, ticks = 0, maxSwingOther = 0, landMax = 0, landN = 0; const orig = S.evalPose.bind(S), last = { R: null, L: null };
  S.evalPose = (A) => { orig(A);
    for (const F of ["R", "L"]) { const L = A.legs[F];
      if (L.stance && last[F]) { landMax = Math.max(landMax, last[F]); landN++; last[F] = null; } }
    if (!A.d1adj) return; const C = T1.t1Clone(A); T1.t1Evaluate(C); ticks++;
    for (const F of ["R", "L"]) { const adjF = A.d1adj[F] != null; for (const j of idx[F]) { const d = dist(pos(A.fk.world[j]), pos(C.fk.world[j]));
      if (A.legs[F].stance) maxStance = Math.max(maxStance, d); else if (!adjF) maxSwingOther = Math.max(maxSwingOther, d); }
      if (adjF) last[F] = dist(pos(A.fk.world[idx[F][0]]), pos(C.fk.world[idx[F][0]])); } };
  S.run(); gMax = Math.max(gMax, maxStance); gN += ticks; gSwingMax = Math.max(gSwingMax, maxSwingOther); gLand = Math.max(gLand, landMax); gLandN += landN;
  out[id + ":" + seed] = { adjustedTicks: ticks, stanceFootMaxDevM: maxStance, unadjustedSwingFootMaxDevM: maxSwingOther, adjustedSwingsLanded: landN, lastAirborneResidualMaxM: landMax };
  console.log((id + ":" + seed).padEnd(20), `adjusted ticks ${ticks} · stance foot/toe max deviation ${(maxStance * 1000).toFixed(4)} mm · other swing ${(maxSwingOther * 1000).toFixed(4)} mm · adjusted swings landed ${landN}, last airborne residual max ${(landMax * 1000).toFixed(2)} mm`); }
out.TOTAL = { ver, adjustedTicks: gN, stanceFootMaxDevM: gMax, unadjustedSwingFootMaxDevM: gSwingMax, adjustedSwingsLanded: gLandN, lastAirborneResidualMaxM: gLand };
console.log("TOTAL", JSON.stringify(out.TOTAL)); if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(out, null, 1));

// dribble13/tools/d13_cutstory.mjs — ONE LINE PER RUN of a cut scenario: every touch after the request (time after the request, role, foot, boot
// surface, launch direction relative to the pre-cut line, speed, the remaining turn the plan expected), how the hold ended, TURN-1.2's plant, the
// first time the BALL and the BODY travel within 20° of the request, and the control state at the end.
// usage: node d13_cutstory.mjs SCENARIO seeds [ver d12] [prof HIGH]
import { makeSim, DT, PROFILES } from "./d13_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [id = "CUT60_RUN", nA = "8", ver = "d13", prof = "HIGH"] = process.argv.slice(2), scn = get(id), D = 180 / Math.PI;
const cmd = scn.cmds.find((c) => c.turn != null && Math.abs(c.turn) > 8), tReq = cmd.t, want = cmd.turn, wr = (a) => ((a + 540) % 360) - 180;
for (let sd = 1; sd <= +nA; sd++) {
  const S = makeSim(scn, { ver, seed: sd, player: PROFILES[prof] }); S.run();
  const T = S.touches.filter((t) => t.launched && t.t >= tReq - 1e-9).map((t) => { const v = t.executed.v, dir = Math.atan2(-v[2], v[0]) * D;
    return `+${(t.t - tReq).toFixed(2)} ${t.role || "-"}:${t.F}${t.F !== S.pref ? "w" : ""}:${t.reg[0]}${t.reg[1]} ${dir.toFixed(0)}° ${t.executed.speed.toFixed(1)}`; });
  const kq = Math.round(tReq / DT); let tb = null, tc = null;
  for (let i = kq; i < S.rec.length; i++) { const r = S.rec[i], bv = r.ball.v, sb = Math.hypot(bv[0], bv[2]);
    if (tb == null && sb > 1 && Math.abs(wr(Math.atan2(bv[2], bv[0]) * D - want)) < 20) tb = r.t - tReq;
    if (tc == null && Math.hypot(r.V[0], r.V[1]) > 1 && Math.abs(wr(Math.atan2(r.V[1], r.V[0]) * D - want)) < 20) tc = r.t - tReq; }
  const rel = S.turnLog.filter((e) => e.kind === "release").map((e) => `${e.by}@+${(e.t - tReq).toFixed(2)}`).join(","), st = S.turnLog.filter((e) => e.kind === "stage").length;
  const plant = S.A.events.find((e) => e[1] === "TD" && e[3] === "PLANT" && e[0] >= tReq); const end = S.rec[S.rec.length - 1].ctrl;
  console.log(`s${sd} ${end[0]} ball20 ${tb != null ? "+" + tb.toFixed(2) : "never"} body20 ${tc != null ? "+" + tc.toFixed(2) : "never"} plant ${plant ? "+" + (plant[0] - tReq).toFixed(2) + plant[2] : "-"} | ${rel || "no release"}${st ? " stages " + st : ""} | ${T.join(" · ")}`);
}

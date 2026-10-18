// receive11/tools/rx_d1accept.mjs — what the frozen DRIBBLE-V1 can take over: DRIBBLE-V1 (unchanged, its own scenario start) from a ball ahead of
// the runner at [ahead, lateral] m rolling at ratio × his speed along his heading; outcome = first touch ≤ 1.5 s and CONTROLLED at 3 s.
// usage: node rx_d1accept.mjs out.json [shard/n]
import fs from "fs"; import { makeSim } from "../../dribble15/tools/d15_env.mjs";
const [out, shard] = process.argv.slice(2), [si, sn] = shard ? shard.split("/").map(Number) : [0, 1], rows = []; let i = 0;
for (const v of [3.0, 4.0, 5.5, 7.8]) for (const ah of [0.6, 1.0, 1.4, 2.0, 2.6]) for (const lat of [0, 0.2, -0.2]) for (const rt of [0, 0.3, 0.55, 0.8, 1.1]) {
  if (i++ % sn !== si) continue;
  const scn = { id: "ACC", init: { v, heading: 0, pos: [12, 34] }, ball: { ahead: ah, lateral: lat, speed: rt * v }, cmds: [], dur: 3.0 };
  const S = makeSim(scn, { seed: 1, opts: { record: false } }); S.run();
  const T = S.touches.filter((t) => t.launched), ft = T.length ? T[0].t : null;
  rows.push({ v, ah, lat, rt, first: ft, n: T.length, ctrl: S.ctrl.state, ok: ft != null && ft <= 1.5 && S.ctrl.state === "CONTROLLED" });
}
fs.writeFileSync(out, JSON.stringify(rows)); console.log(rows.length, "→", out);

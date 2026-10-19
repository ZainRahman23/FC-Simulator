// receive_control2/tools/rc2_chrome_node.mjs — the Node side of rc2_chrome.cjs: the lab's simulate() and fingerprint, verbatim (no bodies)
import { makeReceive2, DT } from "./rc2_env.mjs"; import { parseCase } from "../rc2_cases.js"; import { seedCase } from "../../receive11/rx_cases.js";
export async function run(cases) { return cases.map(({ id, seed }) => {
  const cs = /^[A-M]2?(_BC\d+)?$/.test(id) ? parseCase(id) : seedCase(parseCase(id), seed), S = makeReceive2(cs, { seed }); S.run(cs.scenario.dur);
  let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k);
  const sm = S.rx.stand ? S.summary2() : null;
  return { hash: h.toString(16), action: sm && sm.cls ? sm.cls.action : null, launches: S.W.events.filter((e) => e.kind === "AUTHORITATIVE_LAUNCH" || e.kind === "LAUNCH_CANCELLED").map((e) => e.id + "@" + e.tick + ":" + e.kind[0]) }; }); }

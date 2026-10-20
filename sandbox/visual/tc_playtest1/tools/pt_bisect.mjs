// tc_playtest1/tools/pt_bisect.mjs — which PLAYTEST-1.2 mechanism changes a normal-play result: the key sequences run with each switch off
import { makeSim, runScript, keysToH } from "./pt_env.mjs";
import { OFF } from "../pt_sim.js";
const T = { "run W→S": [{ t: 0.2, keys: "W" }, { t: 2.4, keys: "S" }], "sprint W→A": [{ t: 0.2, keys: "W", mode: "SPRINT" }, { t: 3.0, keys: "A" }], "sprint W→S": [{ t: 0.2, keys: "W", mode: "SPRINT" }, { t: 3.0, keys: "S" }], "stop": [{ t: 0.2, keys: "W" }, { t: 2.4, keys: "" }], "W→D→W→A": [{ t: 0.2, keys: "W" }, { t: 2.2, keys: "D" }, { t: 3.2, keys: "W" }, { t: 4.2, keys: "A" }] };
const run = () => { const o = []; for (const [n, sc] of Object.entries(T)) { const s = makeSim({}); let sep = 0; runScript(s, sc, sc[sc.length - 1].t + 2.6, (x) => { const st = x.stateAt(x.t), b = x.ball.p; sep = Math.max(sep, Math.hypot(b[0] - st.P[0], b[1] - st.P[1])); });
  o.push(`${n}: ${s.log.actions.filter((a) => a.label !== "CARRY" && a.t > 0.3).map((a) => a.label.split(" ").map((w) => w[0]).join("") + (a.m > 0 ? "R" : "L")).join(">") || "carry"} sep ${sep.toFixed(1)}`); } return o.join(" | "); };
console.log("all on      ", run());
for (const k of ["air", "retime", "gv", "fc", "hold", "vol", "intent", "order", "side"]) { OFF[k] = true; console.log(("off " + k).padEnd(12), run()); delete OFF[k]; }

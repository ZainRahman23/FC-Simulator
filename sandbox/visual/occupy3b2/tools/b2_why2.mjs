// b2_why with a configuration (globalThis.__b2opts) — the debugging view under an ablation
import { ENV, setOf, arg } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
import { volumesOf, detect, GROUP } from "../../occupy1/o_volumes.js";
globalThis.__b2opts = JSON.parse(arg("cfg", "null")) || undefined;
const ID = arg("id"), T0 = +arg("t0", 0), T1 = +arg("t1", 9), tc = setOf("l3").find((x) => x.id === ID) || setOf("review").find((x) => x.id === ID);
const deep = []; const R = runB2(ENV, tc, arg("mode", "S3B2"), { record: false, onTick: (W) => { const LP = W.livePoses(); const P = detect(volumesOf(LP.a.J), volumesOf(LP.d.J), { within: 0 }).filter((x) => x.both && !(GROUP[x.A] === "TRUNK" && GROUP[x.B] === "TRUNK")); const d = P.length ? P.reduce((a, x) => (x.pen > a.pen ? x : a)) : null; if (d && d.pen > 0.05) deep.push([W.att.t, `PEN ${(d.pen * 100).toFixed(1)} ${d.A}×${d.B}`]); } }), W = R.W, inW = (t) => t - R.t0 >= T0 && t - R.t0 <= T1;
const L = deep.filter(([t], i) => inW(t) && i % 6 === 0);
for (const d of (W.b2 ? W.b2.decisions : [])) if (inW(d.t)) L.push([d.t, `DEC ${d.who} ${d.kind} ${d.X || ""} ${d.obstruction ? "[" + d.obstruction.slice(0, 80) + "]" : ""} → ${JSON.stringify(d.result).slice(0, 150)}`]);
for (const e of W.imp.events) if (inW(e.t) && /STEP|FALL|IMPACT/.test(e.kind)) L.push([e.t, `S3  ${e.who} ${e.kind}: ${String(e.why).slice(0, 100)}`]);
for (const [t, s] of L.sort((a, b) => a[0] - b[0])) console.log((t - R.t0).toFixed(3), s);

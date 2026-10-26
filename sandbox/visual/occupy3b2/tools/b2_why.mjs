// occupy3b2/tools/b2_why.mjs — one case in 3B.2: its 3B.2 decisions and events, 3B.1's snaps, Stage 3's steps, in a window (a debugging view)
import { ENV, setOf, arg } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
const ID = arg("id"), T0 = +arg("t0", 0), T1 = +arg("t1", 9), tc = setOf("l3").find((x) => x.id === ID) || setOf("review").find((x) => x.id === ID) || setOf("moves").find((x) => x.id === ID);
const R = runB2(ENV, tc, arg("mode", "S3B2"), { record: false }), W = R.W, rel = (t) => (t - R.t0).toFixed(3), inW = (t) => t - R.t0 >= T0 && t - R.t0 <= T1;
const L = [];
for (const d of (W.b2 ? W.b2.decisions : [])) if (inW(d.t)) L.push([d.t, `DEC ${d.who} ${d.kind} ${d.X || ""} ${d.obstruction ? "[" + d.obstruction.slice(0, 80) + "]" : ""} → ${JSON.stringify(d.result).slice(0, 150)}`]);
for (const e of (W.b2 ? W.b2.events : [])) if (inW(e.t)) L.push([e.t, `B2  ${e.who} ${e.kind}: ${String(e.why).slice(0, 150)}`]);
for (const e of W.l3.events) if (inW(e.t)) L.push([e.t, `3B1 ${e.who} ${e.kind}: ${String(e.why).slice(0, 140)}`]);
for (const z of W.l3.snaps) if (inW(z.k / 240)) L.push([z.k / 240, `SNAP ${z.who} ${z.X} ${(z.d * 100).toFixed(1)} cm`]);
for (const e of W.imp.events) if (inW(e.t) && /STEP|FALL|RELEASE|INTERRUPT|TECHNICAL/.test(e.kind)) L.push([e.t, `S3  ${e.who} ${e.kind}: ${String(e.why).slice(0, 140)}`]);
for (const [t, s] of L.sort((a, b) => a[0] - b[0])) console.log(rel(t), s);

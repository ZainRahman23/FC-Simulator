// occupy3b2/tools/b2_feet.mjs — one player's two feet, tick by tick: each foot's stance / swing (id, kind, place), the feet's lateral relation in
// the pelvis frame (+ = R on its own side), the legs' self-penetration, Stage 3's step — to see a leg twist form.   node b2_feet.mjs --id turn-into --who a --t0 1.2 --t1 1.35
import { ENV, setOf, arg } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
import { segClosest } from "../../occupy1/o_volumes.js";
globalThis.__b2opts = JSON.parse(arg("cfg", "null")) || undefined;
const ID = arg("id"), WHO = arg("who", "a"), T0 = +arg("t0", 0), T1 = +arg("t1", 9), EVERY = +arg("every", 3), tc = setOf("l3").find((x) => x.id === ID) || setOf("review").find((x) => x.id === ID);
const f3 = (v) => v.toFixed(3), rows = [];
for (const mode of arg("modes", "S3B,S3B2").split(",")) { rows.length = 0;
  const R = runB2(ENV, tc, mode, { record: true, onTick: (W) => { const t = W.att.t, p = WHO === "a" ? W.att : W.def, st = p.stateAt(t), LP = W.livePoses(), J = (WHO === "a" ? LP.a : LP.d).J, r = [-Math.sin(st.psi), Math.cos(st.psi)];
    const lat = (J.foot_R.j[0] - J.foot_L.j[0]) * r[0] + (J.foot_R.j[1] - J.foot_L.j[1]) * r[1], s = W.ps.get(p);
    const sp = (() => { let m = -9; const mid = (a, b) => a.map((x, i) => (x + b[i]) / 2); const S = (X) => [[mid(J["thigh_" + X].j, J["thigh_" + X].t), J["thigh_" + X].t, 0.115], [J["shin_" + X].j, J["shin_" + X].t, 0.07], [J["foot_" + X].j, J["foot_" + X].t, 0.07]]; for (const a of S("R")) for (const b of S("L")) { const c = segClosest(a[0], a[1], b[0], b[1]); m = Math.max(m, a[2] + b[2] - c.d); } return m; })();
    const ft = (X) => { const L = p.plan.stances[X], now = L.find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), nx = L.find((q) => q.t0 > t + 1e-9); const q = now || nx; return q ? `${now ? "PL" : "→" + ((nx.t0 - t) * 1000).toFixed(0)}${(q.kind || "").includes("recovery") ? "ʳ" : ""}${(q.kind || "").includes("3B.2") ? "²" : ""} ${q.id}@${q.pos.map((v) => v.toFixed(2)).join(",")}` : "—"; };
    rows.push(`${f3(t - 2.4)} v${p.plan.v}${p.plan.fork ? "f" : ""} psi ${(st.psi * 57.3).toFixed(0).padStart(4)} R[${ft("R")}] L[${ft("L")}] lat ${(lat * 100).toFixed(0).padStart(4)} self ${(sp * 100).toFixed(1).padStart(5)} ${s.active ? s.cls.slice(0, 10) : ""}${s.step && !s.step.landed ? " step " + s.step.X : ""}`); } });
  console.log(`== ${mode}`); let i = 0; for (const r of rows) { const tr = +r.slice(0, 6); if (tr < T0 || tr > T1) continue; if (i++ % EVERY) continue; console.log(r); } }

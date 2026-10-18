// dribble15/tools/d15_cutclock.mjs — TURN-1.2's CUT CLOCK (no ball): straight running at a speed, then the input turns by Δ at time t0 (swept over one
// stride). Prints, per t0: the maneuver TURN-1.2 plans (kind / technique / plant foot / braking steps), every touchdown after the request (time after
// the request, foot, role, lateral / forward position of the plant in the pre-cut heading frame), and when the velocity heading reaches 50 % / 90 %.
// usage: node d15_cutclock.mjs [deg 60] [speed 5.5] [t0 2.2] [span 0.40] [step 0.05]
import { X } from "./d15_env.mjs";
const [deg = "60", spd = "5.5", t0a = "2.2", spanA = "0.40", stepA = "0.05"] = process.argv.slice(2), DT = 1 / 240, D = 180 / Math.PI;
const T1 = X.TURN1;
for (let dt0 = 0; dt0 <= +spanA + 1e-9; dt0 += +stepA) {
  const t0 = +t0a + dt0, A = T1.t1Make(X.skel, { v: +spd, heading: 0, pos: [12, 34], turn12: true }); X.TURN11.attach(A, { mode: "t12" });
  const nReq = Math.round(t0 / DT), out = []; let h50 = null, h90 = null, man = null, ev0 = 0;
  for (let k = 0; k < nReq + 360; k++) {
    const inp = { dir: k >= nReq ? +deg / D : 0, v: +spd }; A.input = inp; T1.t1Step(A, inp); T1.t1Evaluate(A);
    if (k === nReq - 1) ev0 = A.events.length;
    if (k >= nReq) { const h = Math.atan2(A.V[1], A.V[0]) * D; if (h50 == null && Math.abs(h) >= 0.5 * Math.abs(+deg)) h50 = (k - nReq) * DT; if (h90 == null && Math.abs(h) >= 0.9 * Math.abs(+deg)) h90 = (k - nReq) * DT; if (!man && A.man) man = { kind: A.man.kind, tech: A.man.tech, plantFoot: A.man.plantFoot, nBrake: A.man.nBrake, nReorg: A.man.nReorg }; }
  }
  for (const e of A.events.slice(ev0)) { const te = e[0] - t0; if (te > 1.5) break; if (e[1] === "TD") out.push(`${te.toFixed(2)} ${e[2]}:${e[3]}`); else if (e[1] === "maneuver" || e[1] === "plantTO") out.push(`${te.toFixed(2)} ${e[1]}${e[1] === "maneuver" ? "(" + e.slice(2, 6).join(",") + ")" : ""}`); }
  // the swing / stance state at the request
  const B = T1.t1Make(X.skel, { v: +spd, heading: 0, pos: [12, 34], turn12: true }); X.TURN11.attach(B, { mode: "t12" }); for (let k = 0; k < nReq; k++) { const inp = { dir: 0, v: +spd }; B.input = inp; T1.t1Step(B, inp); }
  const st = ["R", "L"].map((F) => F + (B.legs[F].stance ? " stance" : " swing w" + (B.legs[F].w || 0).toFixed(2))).join(", ");
  console.log(`t0 ${t0.toFixed(2)} [${st}] ${man ? man.kind + "/" + man.tech + " plant " + man.plantFoot + " nBrake " + man.nBrake : "no maneuver"} · heading 50% +${h50 != null ? h50.toFixed(2) : "-"} 90% +${h90 != null ? h90.toFixed(2) : "-"}\n    ${out.join(" · ")}`);
}

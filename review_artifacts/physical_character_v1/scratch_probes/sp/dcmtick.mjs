import { J, body, G2 } from "../fg/lib.mjs";
const { spec, poses } = body("F0"); const steps = Array.from({ length: 30 }, (_, i) => ({ sw: i % 2 === 0 ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 6, rhythmOver: { steps, at: 0.6, walk: { dcmRef: { k: 1, vd: 0.45, xL: [-0.114, 0.393] } } }, onLoco: (l) => { LOCO = l; } });
const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], d = P.exec.done.find(d => d.stepIndex === 3), ps = d.pSt, f = (a) => ((a[0] - ps[0]) * hd[0] + (a[1] - ps[1]) * hd[1]) * 100;
console.log("step 3 lift", d.liftoff.t.toFixed(3), "td", d.td.t.toFixed(3), "| fwd rel. stance centre (cm): ξ  ξ_ref(plan)  ξref(balance)  pRaw  pStar  CoP | kXi");
for (const q of r.recs.filter(q => q.t >= d.liftoff.t - 0.02 && q.t <= d.td.t && q.n % 6 === 0)) console.log(`${q.t.toFixed(3)} | ${f(q.xi).toFixed(1)} ${q.xiRefP ? f(q.xiRefP).toFixed(1) : "-"} ${q.ctl.xiRef ? f(q.ctl.xiRef).toFixed(1) : "-"} ${f(q.ctl.pRaw).toFixed(1)} ${f(q.ctl.pStar).toFixed(1)} ${q.copSmooth ? f(q.copSmooth).toFixed(1) : "-"}`);

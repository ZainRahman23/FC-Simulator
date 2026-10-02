import { J, body, G2 } from "./lib.mjs";
const { spec, poses } = body("F2"); const r = G2.runG2a(J, spec, "G2W_A8", { poses, seconds: 8 }); const tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t;
const over = r.recs.filter(q => q.mtp && (q.mtp.R.a > 61 / 57.3 || q.mtp.L.a > 61 / 57.3 || q.mtp.R.a < -31 / 57.3 || q.mtp.L.a < -31 / 57.3));
console.log("fall at", tF.toFixed(3), "| beyond range: n", over.length, "first", over[0] && over[0].t.toFixed(3), "last", over.length && over[over.length - 1].t.toFixed(3), "min COM y during", over.length ? Math.min(...over.map(q => q.com[1])).toFixed(2) : "-");

import fs from "fs"; const files = fs.readdirSync(".").filter(f => /^tf_.*\.json$/.test(f)); const rows = files.flatMap(f => JSON.parse(fs.readFileSync(f)).rows);
const V = ["V7k", "V7ks", "V7a", "V7as", "V8", "V8s"]; const cnt = (rs, v) => rs.filter(r => r[v].verdict === "FEASIBLE").length;
console.log("total", rows.length); console.log("variant  feasible / total"); for (const v of V) console.log(v.padEnd(6), cnt(rows, v), "/", rows.length, (100 * cnt(rows, v) / rows.length).toFixed(1) + "%");
console.log("\nper body (V7k V7ks V7a V7as V8 V8s):"); for (const b of [...new Set(rows.map(r => r.body))]) { const rs = rows.filter(r => r.body === b); console.log(b.padEnd(14), rs.length, V.map(v => cnt(rs, v)).join(" ")); }
console.log("\nper family / yaw class / height (n, V8s feasible, V8 feasible):"); const key = (r) => `${Math.abs(r.yaw) === 45 ? "|yaw|45" : Math.abs(r.yaw) === 30 ? "|yaw|30" : "yaw0"} h${r.hgt}`; const g = {}; for (const r of rows) { const k = key(r); (g[k] ||= []).push(r); }
for (const k of Object.keys(g).sort()) console.log(k.padEnd(14), g[k].length, cnt(g[k], "V8s"), cnt(g[k], "V8"));
const nf = rows.filter(r => r.V8s.verdict !== "FEASIBLE"); console.log("\nV8s NOT-FOUND:", nf.length); const ff = {}; for (const r of nf) { const k = `${r.fam} yaw ${r.yaw} h ${r.hgt}`; ff[k] = (ff[k] || 0) + 1; } console.log(ff);
const nf8 = rows.filter(r => r.V8.verdict !== "FEASIBLE"); console.log("\nV8 NOT-FOUND:", nf8.length, nf8.map(r => `${r.body} ${r.state} ${r.fam} yaw ${r.yaw} h ${r.hgt} d ${r.drop} res ${r.V8.bestResidual.toExponential(1)}`));
// magnitude needed: for V7k feasible — |knee axial − held|; for V7a — |ankle − held|
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const dk = rows.filter(r => r.V7k.verdict === "FEASIBLE").map(r => Math.abs(r.V7k.kneeAxialDeg - r.heldKneeAxialDeg)), da = rows.filter(r => r.V7a.verdict === "FEASIBLE").map(r => Math.abs(r.V7a.ankleAbAddDeg - r.heldAnkleAbAddDeg));
console.log("\n|knee axial change| V7k: p50", q(dk, .5).toFixed(2), "p90", q(dk, .9).toFixed(2), "max", Math.max(...dk).toFixed(2)); console.log("|ankle ab/add change| V7a: p50", q(da, .5).toFixed(2), "p90", q(da, .9).toFixed(2), "max", Math.max(...da).toFixed(2));
const hk = rows.map(r => r.heldKneeAxialDeg), ha = rows.map(r => r.heldAnkleAbAddDeg); console.log("held knee axial range", Math.min(...hk).toFixed(2), Math.max(...hk).toFixed(2), "held ankle ab/add range", Math.min(...ha).toFixed(2), Math.max(...ha).toFixed(2));
const kf = rows.filter(r => r.V8s.verdict === "FEASIBLE").map(r => r.V8s.kneeFlexAnatDeg); console.log("knee flexion (anat) of V8s solutions: min", Math.min(...kf).toFixed(1), "p50", q(kf, .5).toFixed(1), "max", Math.max(...kf).toFixed(1));
const v8beyond = rows.filter(r => r.V8.verdict === "FEASIBLE" && (!r.V8.kneeAxialInCoupledSoft || !r.V8.ankleAbAddInSoft)).length; console.log("V8 feasible solutions outside the passively unloaded range (either DOF):", v8beyond);
const st = {}; for (const r of rows) { (st[r.state] ||= []).push(r); } for (const k in st) console.log(k, st[k].length, "V8s", cnt(st[k], "V8s"));

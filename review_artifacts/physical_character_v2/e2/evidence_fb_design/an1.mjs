import fs from "fs"; import zlib from "zlib";
const L = (a) => Math.hypot(...a), J = ["hip", "knee", "ank"];
for (const f of fs.readdirSync(".").filter(x => x.startsWith("s_V2") && x.endsWith(".json.gz")).sort()) {
  const o = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), R = o.fbr, T = o.tr.T, tC = o.events.tC, dt = 1 / o.hz;
  const bins = [["φ<.2", r => r.u != null && r.u / T < 0.2 && (tC == null || r.t < tC)], ["φ.2-.8", r => r.u != null && r.u / T >= 0.2 && r.u / T < 0.8 && (tC == null || r.t < tC)], ["φ.8-C", r => r.u != null && r.u / T >= 0.8 && (tC == null || r.t < tC)], ["C+", r => tC != null && r.t >= tC]];
  let cons = 0; R.forEach(r => cons = Math.max(cons, r.cons));
  const line = [f.replace("s_", "").replace(".json.gz", "").padEnd(26), "cons", cons.toExponential(1)];
  for (const [nm, sel] of bins) { const S = R.filter(sel); if (!S.length) continue; const mw = Math.max(...S.map(r => L(r.w))), ma = Math.max(...S.map(r => L(r.al)));
    const dT = J.map((_, j) => Math.max(...S.map(r => L(r.dT[j])))), dTw = J.map((_, j) => Math.max(...S.map(r => L(r.dTw[j])))), Tb = J.map((_, j) => Math.max(...S.map(r => L(r.T[j]))));
    let jump = [0, 0, 0]; for (let i = 1; i < S.length; i++) if (Math.abs(S[i].t - S[i - 1].t - dt) < 1e-6) J.forEach((_, j) => { jump[j] = Math.max(jump[j], L(S[i].dT[j].map((v, q) => v - S[i - 1].dT[j][q]))); });
    line.push(`| ${nm} n${S.length} |w|${mw.toFixed(2)} |al|${ma.toFixed(1)} D1 ${Tb.map(v => v.toFixed(1)).join("/")} dT ${dT.map(v => v.toFixed(2)).join("/")} (w-only ${dTw.map(v => v.toFixed(2)).join("/")}) jump ${jump.map(v => v.toFixed(2)).join("/")}`); }
  console.log(line.join(" ")); }

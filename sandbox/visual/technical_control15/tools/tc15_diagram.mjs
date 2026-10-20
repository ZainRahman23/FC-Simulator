// technical_control15/tools/tc15_diagram.mjs — THE TOP-DOWN VECTOR DIAGRAM of a reference, drawn from its own authored data and posed skeleton (owner:
// "a Ronaldo chop action specification with diagrams / top-down vectors showing the incoming player direction, the standing / shielding leg path,
// the striking-foot path, the ball before contact, the ball path through / behind the stance, the body COM path, the exit direction").
// The entry heading points UP; + local right = screen right. Drawn: the centre of mass's path (cyan, ticks every 0.05 s), the ball's path (white,
// ticks every 0.05 s; the contacts as rings), every stance's footprint (right green, left magenta; the boot outline at touchdown), the striking
// foot's ankle path through its swing (green dashed, the contact yellow), the posed legs at the key times (hip → knee → ankle → toe), the
// pressure lines at the decisive contact (green blocked / red direct), the incoming and exit arrows.
//   node tc15_diagram.mjs <id> <out.svg> [--times "-0.06,0,0.05,0.10"] [--win "-0.35,0.45"] [--size 900]
import fs from "fs"; import { makeRef } from "./tc15_env.mjs"; import { DIRS } from "../tc15_ref.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export function diagram(r, o = {}) {
  const T = r.T, tC = T.tC, times = (o.times || [-0.06, 0, 0.05, 0.10]).map((x) => tC + x), win = o.win || [-0.35, 0.45], size = o.size || 900, DT = 1 / 240;
  const L = (p) => r.P2L(p), at = (t) => r.rec[Math.max(0, Math.min(r.rec.length - 1, Math.round(t / DT)))];
  // the view box: everything inside the window (ball, centre of mass, feet), padded
  const pts = []; for (let t = tC + win[0]; t <= tC + win[1]; t += 0.01) { const q = at(t); pts.push(L(q.P), L([q.ball.p[0], q.ball.p[2]])); for (const X of ["R", "L"]) pts.push(L([q.J["foot_" + X].j[0], q.J["foot_" + X].j[1]])); }
  const xs = pts.map((p) => p[1]), ys = pts.map((p) => p[0]), pad = 0.45, x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad, sc = size / Math.max(x1 - x0, y1 - y0);
  const W = (x1 - x0) * sc, H = (y1 - y0) * sc, X = (p) => ((p[1] - x0) * sc).toFixed(1), Y = (p) => ((y1 - p[0]) * sc).toFixed(1), XY = (p) => `${X(p)},${Y(p)}`;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="${W.toFixed(0)}" height="${H.toFixed(0)}" font-family="-apple-system, Helvetica, Arial, sans-serif">`,
    `<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ffd45e"/></marker><marker id="arC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#4de8ff"/></marker><marker id="arB" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ffffff"/></marker></defs>`,
    `<rect width="100%" height="100%" fill="#1d3a22"/>`];
  // grid 0.1 m (0.5 m stronger)
  for (let v = Math.ceil(x0 * 10) / 10; v <= x1; v += 0.1) out.push(`<line x1="${X([0, v])}" y1="0" x2="${X([0, v])}" y2="${H.toFixed(0)}" stroke="rgba(255,255,255,${Math.abs(v * 2 - Math.round(v * 2)) < 1e-6 ? 0.13 : 0.05})"/>`);
  for (let v = Math.ceil(y0 * 10) / 10; v <= y1; v += 0.1) out.push(`<line x1="0" y1="${Y([v, 0])}" x2="${W.toFixed(0)}" y2="${Y([v, 0])}" stroke="rgba(255,255,255,${Math.abs(v * 2 - Math.round(v * 2)) < 1e-6 ? 0.13 : 0.05})"/>`);
  const poly = (P, col, w, dash, op) => out.push(`<polyline points="${P.map(XY).join(" ")}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ""} stroke-linejoin="round" stroke-linecap="round" opacity="${op || 1}"/>`);
  const txt = (p, s, col, sz, anchor) => out.push(`<text x="${X(p)}" y="${Y(p)}" fill="${col}" font-size="${sz || 13}" font-weight="600" text-anchor="${anchor || "start"}" paint-order="stroke" stroke="rgba(0,0,0,0.65)" stroke-width="3">${s}</text>`);
  // the incoming and exit arrows (through the origin)
  const th = (d) => [Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180)], E = th(T.turnDeg);
  out.push(`<line x1="${X([y0 + 0.15, 0])}" y1="${Y([y0 + 0.15, 0])}" x2="${X([-0.45, 0])}" y2="${Y([-0.45, 0])}" stroke="#ffd45e" stroke-width="3" marker-end="url(#ar)" opacity="0.8"/>`); txt([y0 + 0.2, 0.04], "incoming", "#ffd45e", 13);
  const e1 = [E[0] * 1.2, E[1] * 1.2]; out.push(`<line x1="${X([E[0] * 0.35, E[1] * 0.35])}" y1="${Y([E[0] * 0.35, E[1] * 0.35])}" x2="${X(e1)}" y2="${Y(e1)}" stroke="#ffd45e" stroke-width="3" marker-end="url(#ar)" opacity="0.8"/>`); txt([e1[0] + 0.06, e1[1]], `exit (${Math.abs(T.turnDeg)}°)`, "#ffd45e", 13, "middle");
  // the stances' footprints (the boot outline at touchdown) in the window
  for (const Xf of ["R", "L"]) for (const s of r.st[Xf]) { if (s.t1 < tC + win[0] - 0.3 || s.t0 > tC + win[1] + 0.2) continue; const f = r.stanceFoot(s, s.t0), d = [Math.cos(f.yaw), Math.sin(f.yaw)], n = [-d[1], d[0]], a = r.P2L(f.ank), dl = r.P2L([f.ank[0] + d[0], f.ank[1] + d[1]]).map((x, i) => x - a[i]), nl = [-dl[1], dl[0]];
    const shape = [[-0.08, -0.045], [0.10, -0.055], [0.24, -0.035], [0.275, 0], [0.24, 0.035], [0.10, 0.05], [-0.08, 0.04], [-0.08, -0.045]].map(([u, v]) => [a[0] + dl[0] * u + nl[0] * v, a[1] + dl[1] * u + nl[1] * v]);
    const col = Xf === "R" ? "#6eff96" : "#ff6ec8"; out.push(`<polygon points="${shape.map(XY).join(" ")}" fill="${col}" fill-opacity="0.16" stroke="${col}" stroke-width="2"/>`);
    txt([a[0] - 0.12, a[1]], `${Xf} ${(s.t0 - tC >= 0 ? "+" : "") + (s.t0 - tC).toFixed(2)}–${(s.t1 - tC >= 0 ? "+" : "") + (s.t1 - tC).toFixed(2)}`, col, 11, "middle"); }
  // the centre of mass's path and the ball's path over the window (ticks every 0.05 s)
  const path = (f, t0, t1) => { const P = []; for (let t = t0; t <= t1 + 1e-9; t += 0.01) P.push(f(t)); return P; }, tw0 = tC + win[0], tw1 = tC + win[1];
  poly(path((t) => L(at(t).P), tw0, tw1), "#4de8ff", 2.5); poly(path((t) => { const q = at(t); return L([q.ball.p[0], q.ball.p[2]]); }, tw0, tw1), "#ffffff", 2.5);
  for (let t = tw0; t <= tw1 + 1e-9; t += 0.05) { const c = L(at(t).P), b = L([at(t).ball.p[0], at(t).ball.p[2]]); out.push(`<circle cx="${X(c)}" cy="${Y(c)}" r="3" fill="#4de8ff"/><circle cx="${X(b)}" cy="${Y(b)}" r="3" fill="#ffffff"/>`); }
  // the striking foot's ankle path through its swing (the decisive contact's foot)
  const cD = r.contacts.find((c) => Math.abs(c.t - tC) < 0.003) || r.contacts[0], sw = cD ? r.sw[cD.F].find((q) => q.con === cD) : null;
  if (sw) { poly(path((t) => L(r.footAt(cD.F, t).ank), sw.t0, sw.t1), cD.F === "R" ? "#6eff96" : "#ff6ec8", 2, "6 4"); }
  // the posed legs at the key times (hip → knee → ankle → toe), the ball then
  times.forEach((t, j) => { const q = at(t), op = 0.45 + 0.55 * (j === times.findIndex((x) => Math.abs(x - tC) < 1e-6) ? 1 : 0.4); for (const Xf of ["R", "L"]) { const J = q.J; poly([J["thigh_" + Xf].j, J["shin_" + Xf].j, J["foot_" + Xf].j, J["toe_" + Xf].t].map((p) => L(p)), Xf === "R" ? "#6eff96" : "#ff6ec8", 3, null, op); }
    const b = L([q.ball.p[0], q.ball.p[2]]); out.push(`<circle cx="${X(b)}" cy="${Y(b)}" r="${(0.11 * sc).toFixed(1)}" fill="none" stroke="#fff" stroke-width="1.6" opacity="${op}"/>`); txt([b[0] - 0.15, b[1]], `${t - tC >= 0 ? "+" : ""}${(t - tC).toFixed(2)}`, "#fff", 11, "middle"); });
  // the contacts (rings at the ball, labelled)
  for (const c of r.contacts) { const b = L(c.ball); if (c.t < tw0 - 0.02 || c.t > tw1 + 0.02) continue; out.push(`<circle cx="${X(b)}" cy="${Y(b)}" r="${(0.13 * sc).toFixed(1)}" fill="none" stroke="#ffd45e" stroke-width="2.5"/>`); txt([b[0] + 0.17, b[1]], `${c.role} · ${c.F} ${c.surface.toLowerCase()} → ${c.speedOut.toFixed(1)} m/s ${c.outDeg.toFixed(0)}°`, "#ffd45e", 13, "middle"); }
  // the pressure lines at the decisive contact + 0.05 s (the ball moving through the stance)
  const qP = at(tC + (o.pAt != null ? o.pAt : 0.05)); if (qP.exp) { const b = [qP.ball.p[0], qP.ball.p[2]]; for (const [k, d] of Object.entries(DIRS)) { const a = r.th0 + d * Math.PI / 180, e = [b[0] + Math.cos(a) * 0.6, b[1] + Math.sin(a) * 0.6], who = (qP.exp.named[k] || "").replace("B", "body");
      poly([L(e), L(b)], who ? "#78ff8c" : "#ff5046", 2, who ? "5 3" : null, 0.9); txt(L([b[0] + Math.cos(a) * 0.66, b[1] + Math.sin(a) * 0.66]), `${k}${who ? " (" + who + ")" : ""}`, who ? "#9dffae" : "#ff8a80", 11, "middle"); } }
  out.push(`<text x="12" y="22" fill="#ffd45e" font-size="16" font-weight="700">${T.label} — top-down (entry heading up; 0.1 m grid)</text>`,
    `<text x="12" y="42" fill="#e6efe9" font-size="12">cyan: centre of mass · white: ball (dots every 0.05 s) · green / magenta: right / left foot (footprints at touchdown, legs at ${times.map((t) => (t - tC >= 0 ? "+" : "") + (t - tC).toFixed(2)).join(" / ")} s) · dashed: the striking foot's path · pressure lines at +${(o.pAt != null ? o.pAt : 0.05).toFixed(2)} s</text>`, `</svg>`);
  return out.join("\n");
}
if (process.argv[1] && process.argv[1].endsWith("tc15_diagram.mjs")) { const r = makeRef(process.argv[2] || "CHOP90").run(), times = arg("times") ? arg("times").split(",").map(Number) : undefined, win = arg("win") ? arg("win").split(",").map(Number) : undefined;
  fs.writeFileSync(process.argv[3] || "diagram.svg", diagram(r, { times, win, size: +arg("size", 900), pAt: arg("pAt") != null ? +arg("pAt") : undefined })); console.log("ok", process.argv[3]); }

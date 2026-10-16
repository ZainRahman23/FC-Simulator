// dribble1/tools/d1_strip.mjs — diagnostic SIDE-VIEW filmstrip (no 3D renderer): the real boot + toe hulls of both feet (with the touch / clearance
// adjustment applied) projected on the travel plane, the ball, the turf; one panel per sampled tick. Writes an SVG (and a PNG through puppeteer).
// usage: node d1_strip.mjs <out.svg> v t0 t1 [every] [env: AHEAD BSP NOERR ARCH]
import fs from "fs"; import { makeSim, DT, COLLIDERS } from "./d1_env.mjs";
const [out, v0, t0s, t1s, ev] = process.argv.slice(2), v = +v0, t0 = +t0s, t1 = +t1s, every = +(ev || 2);
const scn = { id: "STRAIGHT", init: { v, heading: 0, pos: [10, 34] }, cmds: [], dur: t1 + 0.1, ball: { ahead: +(process.env.AHEAD || 1.4), speed: v * +(process.env.BSP || 0.55) } };
const S = makeSim(scn, { seed: +(process.env.SEED || 20261016), arch: process.env.ARCH || "B", opts: { noError: !!process.env.NOERR, recBones: true } }); S.run(t1 + 0.05);
const Mv = (R, p) => [R[0] * p[0] + R[1] * p[1] + R[2] * p[2], R[3] * p[0] + R[4] * p[1] + R[5] * p[2], R[6] * p[0] + R[7] * p[1] + R[8] * p[2]];
const hull2 = (P) => { P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const c = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && c(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of P.slice().reverse()) { while (up.length >= 2 && c(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
const recs = S.rec.filter(r => r.t >= t0 - 1e-9 && r.t <= t1 + 1e-9 && Math.round(r.t / DT) % every === 0 && r.bones);
const W = 230, H = 150, sc = 300, cols = 6, rows = Math.ceil(recs.length / cols), parts = [];
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * W}" height="${rows * H + 30}" font-family="Menlo" font-size="10"><rect width="100%" height="100%" fill="#10161a"/>`);
parts.push(`<text x="8" y="18" fill="#ddd">side view (x = travel, y = height) · R boot green · L boot magenta · ball white · v ${v} · ${process.env.ARCH || "B"} · touches: ${S.touches.map(T => T.F + T.reg[0] + "@" + T.t.toFixed(3)).join(" ")} · contacts: ${S.contacts.map(c => c.part + "@" + c.t.toFixed(3)).join(" ")}</text>`);
recs.forEach((r, i) => {
  const ox = (i % cols) * W, oy = 30 + Math.floor(i / cols) * H, bx = r.ball.p[0], cx = bx - 0.25, X = (x) => ox + 10 + (x - cx) * sc, Y = (y) => oy + H - 18 - y * sc;
  parts.push(`<rect x="${ox + 1}" y="${oy + 1}" width="${W - 2}" height="${H - 2}" fill="#18222a" stroke="#2c3a44"/><line x1="${ox}" y1="${Y(0)}" x2="${ox + W}" y2="${Y(0)}" stroke="#3d6b45"/>`);
  for (const [F, col] of [["R", "#6eff96"], ["L", "#ff6ec8"]]) for (const part of ["boot", "toe"]) {
    const fr = r.bones[(part === "boot" ? "f" : "t") + F], pts = COLLIDERS.sides[F][part].points.map(p => { const q = Mv(fr.R, p); return [fr.p[0] + q[0], fr.p[1] + q[1]]; }), h = hull2(pts);
    parts.push(`<polygon points="${h.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}" fill="${col}33" stroke="${col}" stroke-width="1"/>`); }
  parts.push(`<circle cx="${X(bx)}" cy="${Y(r.ball.p[1])}" r="${0.11 * sc}" fill="#ffffff22" stroke="#fff"/>`);
  const T = S.touches.find(T => Math.abs(T.t - r.t) < 1e-6), C = S.contacts.filter(c => Math.abs(c.t - r.t) < DT * every / 2 + 1e-9);
  parts.push(`<text x="${ox + 6}" y="${oy + 13}" fill="#ccc">t ${r.t.toFixed(3)} wR ${r.bones.wR < 0 ? "st" : r.bones.wR.toFixed(2)} wL ${r.bones.wL < 0 ? "st" : r.bones.wL.toFixed(2)}</text>`);
  parts.push(`<text x="${ox + 6}" y="${oy + 25}" fill="#9cf">${r.plan ? "plan " + r.plan.F + r.plan.reg[0] + "@" + (r.plan.kc * DT).toFixed(3) : ""} ${r.adj ? Object.keys(r.adj).join("") + " adj" : ""}</text>`);
  if (T) parts.push(`<text x="${ox + 6}" y="${oy + 37}" fill="#ffd45e">TOUCH ${T.F} ${T.reg} ${T.launched ? "" : "X"}</text>`);
  if (C.length) parts.push(`<text x="${ox + 6}" y="${oy + 49}" fill="#ff7070">contact ${C.map(c => c.part).join(",")}</text>`);
});
parts.push("</svg>"); fs.writeFileSync(out, parts.join("\n")); console.log("wrote", out, recs.length, "panels");

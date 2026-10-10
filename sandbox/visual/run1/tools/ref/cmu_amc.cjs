// run1/tools/ref/cmu_amc.cjs — Acclaim ASF/AMC parser + forward kinematics for the CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu;
// the database was created with funding from NSF EIA-0196217). REFERENCE ONLY: the motion files are never copied into this repository —
// fetch them into a scratch directory (see RUN1_1_EFFORT.md) and pass that directory to the tools.
const fs = require("fs");
const D2R = Math.PI / 180;
const mul = (A, B) => { const C = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j]; return C; };
const tr = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
const mv = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
const Rx = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const Ry = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const Rz = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const euler = (x, y, z) => mul(Rz(z), mul(Ry(y), Rx(x)));          // static xyz: X applied first
function parseASF(path) {
  const L = fs.readFileSync(path, "utf8").split(/\r?\n/), bones = { root: { name: "root", dof: [], dir: [0, 0, 0], len: 0, C: [1, 0, 0, 0, 1, 0, 0, 0, 1], children: [] } };
  let scale = 1, i = 0, sec = null, cur = null;
  for (; i < L.length; i++) { const l = L[i].trim(); if (!l || l[0] === "#") continue;
    if (l[0] === ":") { sec = l.split(/\s+/)[0]; if (sec === ":hierarchy") break; continue; }
    const t = l.split(/\s+/);
    if (sec === ":units" && t[0] === "length") scale = (1 / +t[1]) * 0.0254;
    if (sec === ":bonedata") {
      if (t[0] === "begin") cur = { dof: [], children: [] };
      else if (t[0] === "end") { bones[cur.name] = cur; cur = null; }
      else if (t[0] === "name") cur.name = t[1];
      else if (t[0] === "direction") cur.dir = t.slice(1, 4).map(Number);
      else if (t[0] === "length") cur.len = +t[1] * scale;
      else if (t[0] === "axis") { const a = t.slice(1, 4).map(x => +x * D2R); cur.C = euler(a[0], a[1], a[2]); }
      else if (t[0] === "dof") cur.dof = t.slice(1);
    } }
  for (i++; i < L.length; i++) { const l = L[i].trim(); if (!l || l === "begin") continue; if (l === "end") break; const t = l.split(/\s+/); for (const c of t.slice(1)) { bones[c].parent = t[0]; bones[t[0]].children.push(c); } }
  const order = []; const visit = (n) => { order.push(n); for (const c of bones[n].children) visit(c); }; visit("root");
  return { bones, order, scale };
}
function parseAMC(path) {
  const L = fs.readFileSync(path, "utf8").split(/\r?\n/), frames = []; let f = null;
  for (const raw of L) { const l = raw.trim(); if (!l || l[0] === "#" || l[0] === ":") continue; const t = l.split(/\s+/);
    if (/^\d+$/.test(t[0]) && t.length === 1) { f = {}; frames.push(f); continue; } if (f) f[t[0]] = t.slice(1).map(Number); }
  return frames;
}
// FK of one frame → {name: {p (end point), R (global rotation), start}}
function fk(S, fr) {
  const out = {};
  for (const n of S.order) { const b = S.bones[n];
    if (n === "root") { const v = fr.root; const R = mul(b.C, mul(euler(v[3] * D2R, v[4] * D2R, v[5] * D2R), tr(b.C))); out.root = { R, p: [v[0] * S.scale, v[1] * S.scale, v[2] * S.scale] }; out.root.start = out.root.p; continue; }
    const rv = [0, 0, 0], vals = fr[n] || []; b.dof.forEach((d, k) => { const ax = { rx: 0, ry: 1, rz: 2 }[d]; rv[ax] = (vals[k] || 0) * D2R; });
    const P = out[b.parent], R = mul(P.R, mul(b.C, mul(euler(rv[0], rv[1], rv[2]), tr(b.C))));
    const d = mv(R, b.dir); out[n] = { R, start: P.p, p: [P.p[0] + d[0] * b.len, P.p[1] + d[1] * b.len, P.p[2] + d[2] * b.len] };
  }
  return out;
}
module.exports = { parseASF, parseAMC, fk };

// PCS-1 §2.1 law provider (PCS1_PREREG.md, frozen 8585adc): the SIMULATION's own runner pose — V1.3 ptRxBody → ptRxBodyChar, loaded read-only in a node
// vm (pi1/trackB/scripts/charcollide_sim.mjs via pcg_f0.mjs) — with its full-skeleton FK captured by wrapping skelFK inside the vm (the wrapper returns
// the original result unchanged). Row rule: for τ ∈ (r, r+1] the state is row r with dt = (τ − (r+1))/60 — the simulation's own sub-step bodies
// (simBody[r][n−1] = ptRxBody(row r, −(1 − n/4)/60)). Render frame = T(x, y, dir)·FK; V2 reference bodies by the PI-1 mapping WITHOUT foot reconciliation
// (rawRotations rk + project / hard-box clamp). Run from the worktree root with V13_WT set (pcg_f0 / compat_lib conventions).
const M0 = await import(new URL("../../../pi1/trackB/scripts/pcg_f0.mjs", import.meta.url).href);
export const { SIMV, PROF, L } = M0; const { V, Q, B, NB, rawRotations, project } = L;
SIMV.g("(() => { const __o = skelFK; skelFK = function (s, p, r) { const out = __o(s, p, r); globalThis.__pcsFK = out; return out; }; })()");
const M4 = SIMV.g("M4"), skelFK = SIMV.g("skelFK");
export const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal));
// column-major 4x4 product
const mul4 = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
export function makeLaw(R) {
  const cache = new Map(), legLen = R.legLen[0];
  const state = (r) => { const w = R.rows[r]; return { char: "vinicius", p: { x: w[8], y: w[9], vx: w[10], vy: w[11], facing: w[12], gaitPhase: w[13], legLen } }; };
  // the simulation body + FK for row r at offset off (ticks; dt = off/60)
  function bodyAt(r, off) { const key = r + ":" + off; if (cache.has(key)) return cache.get(key);
    const Bd = SIMV.body(state(r), off / 60, SIMV.footLenV12), fk = SIMV.g("__pcsFK"), fx = Bd.fx, fy = Bd.fy;
    const T = [-fy, 0, -fx, 0, 0, 1, 0, 0, fx, 0, -fy, 0, Bd.x, 0, -Bd.y, 1];   // character-local → render: (x + fx·lz − fy·lx, ly, −(y + fy·lz + fx·lx))
    const world = fk.world.map(m => mul4(T, Array.from(m)));
    const rr = rawRotations(R.bones, R.bind, world, { rk: true }), P = project(rr.raw, world, rr.idx);
    const o = { r, off, Bd, world, S: P.S, clamp: P.clamp, planted: { L: !!Bd.legs.L.planted, R: !!Bd.legs.R.planted } }; cache.set(key, o);
    if (cache.size > 64) cache.delete(cache.keys().next().value); return o; }
  // the row whose interval contains τ (τ ∈ (r, r+1]) and the offset of τ in it
  const rowOf = (tau) => Math.ceil(tau - 1e-9) - 1;
  // the reference at τ, evaluated on the row of `center` (stencil points use their centre's row: no later row is read)
  const at = (tau, center = tau) => { const r = rowOf(center); return bodyAt(r, +(tau - (r + 1)).toFixed(6)); };
  return { bodyAt, rowOf, at, state };
}
// K0: segments of the law provider vs the recorded simBody, and the skeleton's bind vs the record's
export function k0(R, rows) {
  const law = makeLaw(R); let segMax = 0, who = null, n = 0;
  for (const r of rows) for (let s = 1; s <= 4; s++) { const off = -(1 - s / 4), o = law.bodyAt(r, off), segs = SIMV.segs(o.Bd), rec = R.simBody[r][s - 1].segs;
    for (const g of segs) { if (!g.sd) continue; const h = rec.find(x => x.name === g.name); for (const e of ["a", "b"]) { const d = Math.hypot(...[0, 1, 2].map(i => g[e][i] - h[e][i])); if (d > segMax) { segMax = d; who = { r, s, seg: g.name }; } } n++; } }
  const skel = SIMV.g("ptRxCharSkel")(PROF), r8 = (x) => Math.round(x * 1e8) / 1e8, bind = skelFK(skel, {}, M4.ident()).world.map(m => Array.from(m).map(r8)); let bindMax = 0;
  const sameBones = JSON.stringify(skel.bones.map(b => b.name)) === JSON.stringify(R.bones.map(b => b.name));
  for (let b = 0; b < bind.length; b++) for (let i = 0; i < 16; i++) bindMax = Math.max(bindMax, Math.abs(bind[b][i] - R.bind[b][i]));
  return { segmentsCompared: n, segMaxM: segMax, segWorst: who, bindMax, sameBones, pass: segMax <= 1e-9 && bindMax <= 1e-9 && sameBones };
}

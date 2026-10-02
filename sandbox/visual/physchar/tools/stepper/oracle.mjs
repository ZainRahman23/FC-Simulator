// ═══ physchar/tools/stepper/oracle.mjs — the Jolt ORACLE placement search on a worker pool (OFFLINE DIAGNOSTIC / TEACHER, never a controller) ══
// The deterministic simulator itself is the model. Per step k of a start: the prefix (steps < k as committed) is replayed to step k's start
// (its state z_k and the controller's own decision there), candidate commands for step k are each replayed from scratch to step k+1's start,
// scored, and — horizon 2 — the best `beam` of them are each followed by a search of step k+1 (scored at step k+2's start); the first command
// with the best outcome is committed. Every candidate's outcome is logged (the viable-action-set data).
// usage: node tools/stepper/oracle.mjs --cfg <name | JSON> --starts R@0.5,L@0.6 --kmax 29 --workers 9 --out file.json
import { spawn } from "child_process"; import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
// ── worker pool ──
export class Pool { constructor(n, env) { this.free = []; this.q = []; this.cb = new Map(); this.nid = 0; this.ready = [];
    for (let i = 0; i < n; i++) { const w = spawn("node", [path.join(here, "sim_worker.mjs")], { env: { ...process.env, ...(env || {}) }, stdio: ["pipe", "pipe", "inherit"] }); let buf = "";
      this.ready.push(new Promise(res => { w.stdout.on("data", (d) => { buf += d; let i2; while ((i2 = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i2); buf = buf.slice(i2 + 1); const m = JSON.parse(line);
        if (m.ready) { this.free.push(w); res(); this._pump(); continue; } const f = this.cb.get(m.id); this.cb.delete(m.id); this.free.push(w); f(m); this._pump(); } }); })); this.all = (this.all || []).concat(w); } }
  run(job) { return new Promise(res => { const id = ++this.nid; this.q.push({ job: { ...job, id }, res }); this._pump(); }); }
  _pump() { while (this.free.length && this.q.length) { const w = this.free.shift(), { job, res } = this.q.shift(); this.cb.set(job.id, res); w.stdin.write(JSON.stringify(job) + "\n"); } }
  async init() { await Promise.all(this.ready); }
  close() { for (const w of this.all) w.stdin.end(); } }
// ── configurations ──
const DF_WIDE = [0.10, 0.16, 0.22, 0.28, 0.34, 0.40, 0.46], T3 = [0.34, 0.40, 0.46];
export const CFGS = {
  // yesterday's oracles, reproduced exactly (legacy: absolute foothold grid with the controller's width, then width variants; cost on the
  // capture-point offsets at the next step start and the instantaneous forward speed there)
  legacy1: { horizon: 1, grid: { df: DF_WIDE, T: T3, dl: "ctrl" }, dlVar: [-0.06, -0.03, 0.03, 0.06], cost: { tf: 0, tl: 0.10, tv: 0.45, sv: 0.1 } },
  legacy2: { horizon: 2, beam: 3, grid: { df: [...DF_WIDE, 0.52], T: T3, dl: "ctrl" }, dlVar: [-0.06, -0.03, 0.03, 0.06], grid2: { df: [0.10, 0.18, 0.26, 0.34, 0.42, 0.50], T: T3, dl: "ctrl" }, cost: { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 }, w1: 0.5 },
  // ── the nominal-gait vs foresight matrix (Part 4): matched offsets, timing range and cost; only the centre and the horizon differ ──
  B: { horizon: 1, grid: { center: "ctrl", dfOff: [-0.12, -0.06, 0, 0.06, 0.12], TOff: [-0.06, 0, 0.06] }, dlVar: [-0.06, -0.03, 0.03, 0.06], cost: { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 } },
  C: { horizon: 2, beam: 3, grid: { center: "ctrl", dfOff: [-0.12, -0.06, 0, 0.06, 0.12], TOff: [-0.06, 0, 0.06] }, dlVar: [-0.06, -0.03, 0.03, 0.06], grid2: { center: "ctrl", dfOff: [-0.12, -0.06, 0, 0.06, 0.12], TOff: [-0.06, 0, 0.06] }, cost: { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 }, w1: 0.5 },
  E: { horizon: 1, grid: { center: "nominal", nom: { df: 0.39, T: 0.40 }, dfOff: [-0.12, -0.06, 0, 0.06, 0.12], TOff: [-0.06, 0, 0.06] }, dlVar: [-0.06, -0.03, 0.03, 0.06], cost: { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 } },
  G: { horizon: 2, beam: 3, grid: { center: "nominal", nom: { df: 0.39, T: 0.40 }, dfOff: [-0.12, -0.06, 0, 0.06, 0.12], TOff: [-0.06, 0, 0.06] }, dlVar: [-0.06, -0.03, 0.03, 0.06], grid2: { center: "nominal", nom: { df: 0.39, T: 0.40 }, dfOff: [-0.12, -0.06, 0, 0.06, 0.12], TOff: [-0.06, 0, 0.06] }, cost: { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 }, w1: 0.5 },
};
const COSTF = (C) => (s) => !s ? Infinity : ((s.xi[0] - C.tf) / 0.03) ** 2 + ((s.xi[1] - C.tl) / 0.03) ** 2 + ((s.v[0] - C.tv) / C.sv) ** 2;
// candidate commands for a step: an ABSOLUTE grid (legacy), or OFFSETS around a centre — the controller's own step-start decision ("ctrl") or the
// nominal proposal ("nominal": G.nom = { df, T } — the improved operating region) — with the controller's width; timing clipped to [Tlo, Thi]
function cands(G, uc) { const out = []; if (!G.center || G.center === "abs") { const dls = G.dl === "ctrl" ? [uc[1]] : G.dl; for (const df of G.df) for (const T of G.T) for (const dl of dls) out.push([df, dl, T]); return out; }
  const c = G.center === "ctrl" ? uc : [G.nom.df, uc[1], G.nom.T], lo = G.Tlo ?? 0.30, hi = G.Thi ?? 0.54, seen = new Set();
  for (const d of G.dfOff) for (const t of G.TOff) { const u = [c[0] + d, c[1], Math.max(lo, Math.min(hi, c[2] + t))], key = u.map(x => x.toFixed(4)).join(); if (!seen.has(key)) { seen.add(key); out.push(u); } } return out; }
// the continuation (terminal) value model: ridge regression on features of the next step's start state (fitted offline, analysis/fit_terminal.py)
export function terminalV(model) { return (z) => { if (!z) return Infinity; const f = model.feats.map(nm => featOf(z, nm)); let y = model.b; for (let i = 0; i < f.length; i++) y += model.w[i] * (f[i] - model.mu[i]) / model.sd[i]; return Math.max(0, y); }; }
export function featOf(z, nm) { const [k, i] = nm.split("."); const v = z[k]; return Array.isArray(v) ? v[+i] : v; }
// a linear step policy on the step-start features (behaviour-cloned offline, analysis/fit_policy.py): u = W φ(z) + b
// ── the search for one start ──
export async function search(pool, start, cfg, kmin, kmax, log) { const C = cfg, cost = COSTF(C.cost), fixed = {}, steps = [];
  for (let k = kmin; k <= kmax; k++) {
    const ref = await pool.run({ start, fixed, stopAt: k }); const zk = ref.starts[k], uc = ref.uc[k];
    if (!zk || !uc) { steps.push({ k, end: "no step k (the prefix fell before it)", status: ref.status }); break; }
    const ev = async (u, f0, kk) => { const r = await pool.run({ start, fixed: { ...f0, [kk]: { df: u[0], dl: u[1], T: u[2] } }, stopAt: kk + 1 }); const s = r.starts[kk + 1] || null; return { u, c: cost(s), s, uc1: r.uc[kk + 1] || null, status: r.status }; };
    if (C.policy) { const u = C.policyFn(zk, uc); fixed[k] = { df: u[0], dl: u[1], T: u[2] }; steps.push({ k, z: zk, uc, u }); if (log) log(`${start} k ${k} | policy ${u.map(v => v.toFixed(3))}`); continue; }
    const c1 = cands(C.grid, uc), ev1 = await Promise.all(c1.map(u => ev(u, fixed, k)));
    if (C.Vfn) for (const e of ev1) { e.v1 = C.Vfn(e.s); e.c0 = e.c; e.c = C.w1 * e.c + e.v1; }
    let best = null; for (const e of ev1) if (!best || e.c < best.c) best = e;
    // (width variants SEQUENTIALLY, each around the current best — the legacy oracles' order, kept for exact reproduction)
    if (C.dlVar && best) for (const d of C.dlVar) { const e = await ev([best.u[0], best.u[1] + d, best.u[2]], fixed, k); if (C.Vfn) { e.v1 = C.Vfn(e.s); e.c0 = e.c; e.c = C.w1 * e.c + e.v1; } ev1.push(e); if (e.c < best.c) best = e; }
    let best2 = null, lvl2 = [];
    if (C.horizon === 2) { const top = ev1.filter(e => Number.isFinite(e.c)).slice().sort((a, b) => a.c - b.c).slice(0, C.beam);
      const res = await Promise.all(top.map(async (e1) => { const f1 = { ...fixed, [k]: { df: e1.u[0], dl: e1.u[1], T: e1.u[2] } }; if (!e1.uc1) return { e1, b1: Infinity, ev2: [] };
        const ev2 = await Promise.all(cands(C.grid2, e1.uc1).map(u => ev(u, f1, k + 1))); let b1 = Infinity; for (const e of ev2) if (e.c < b1) b1 = e.c; return { e1, b1, ev2 }; }));
      for (const { e1, b1, ev2 } of res) { const tot = C.w1 * e1.c + b1; lvl2.push({ u: e1.u, c1: e1.c, b1, n2: ev2.length, viable2: ev2.filter(e => Number.isFinite(e.c)).length }); if (!best2 || tot < best2.tot) best2 = { ...e1, tot }; }
      if (best2 && Number.isFinite(best2.tot)) best = best2; }
    if (!best || !Number.isFinite(best.c)) { steps.push({ k, z: zk, uc, end: "every candidate falls before step k+1", n1: ev1.length }); break; }
    fixed[k] = { df: best.u[0], dl: best.u[1], T: best.u[2] };
    steps.push({ k, z: zk, uc, u: best.u, c: best.c, tot: best.tot ?? null, z1: best.s, n1: ev1.length, viable1: ev1.filter(e => Number.isFinite(e.c)).length, cands: ev1.map(e => ({ u: e.u, c: Number.isFinite(e.c) ? e.c : null, c0: e.c0 ?? null, st: e.status, z1: e.s })), lvl2 });
    if (log) log(`${start} k ${k} | xi ${zk.xi.map(v => v.toFixed(3))} v ${zk.v[0].toFixed(2)} | ctrl ${uc.map(v => v.toFixed(3))} → ${best.u.map(v => v.toFixed(3))} | next xi ${best.s.xi.map(v => v.toFixed(3))} v ${best.s.v[0].toFixed(2)} cost ${best.c.toFixed(1)} | viable ${ev1.filter(e => Number.isFinite(e.c)).length}/${ev1.length}`); }
  return { start, cfg: C, fixed, steps }; }
if (process.argv[1] && process.argv[1].endsWith("oracle.mjs")) {
  const cfgArg = arg("--cfg", "legacy1"), cfg = { ...(CFGS[cfgArg] || JSON.parse(cfgArg)) };
  if (arg("--terminal", null)) { const m = JSON.parse(fs.readFileSync(arg("--terminal"), "utf8")); cfg.Vfn = terminalV(m); cfg.w1 = cfg.w1 ?? 0.5; cfg.terminalModel = arg("--terminal"); }
  if (arg("--policy", null)) { const m = JSON.parse(fs.readFileSync(arg("--policy"), "utf8")); cfg.policy = arg("--policy"); cfg.policyFn = (z, uc) => m.out.map((o, j) => { let y = m.b[j]; m.feats.forEach((nm, i) => { y += m.W[j][i] * featOf(z, nm); }); if (o === "dl" && m.dlFromCtrl) y = uc[1]; return Math.max(m.lo[j], Math.min(m.hi[j], y)); }); }
  const starts = arg("--starts", "R@0.5").split(","), kmax = +arg("--kmax", 29), nw = +arg("--workers", 9), outP = arg("--out", null), t0 = Date.now();
  const pool = new Pool(nw); await pool.init(); const results = [], par = +arg("--par", 2);
  const one = async (st) => { const r = await search(pool, st, cfg, 2, kmax, (s) => console.log(s, `| ${((Date.now() - t0) / 1000).toFixed(0)} s`));
    // the committed sequence replayed in full (the oracle's walk; the controller takes over after the search horizon)
    const fin = await pool.run({ start: st, fixed: r.fixed, stopAt: 99, n: Object.keys(r.fixed).length + 10 }); r.final = { status: fin.status, tStop: fin.tStop, hash: fin.hash, upright: fin.done.filter(d => d.td != null && (fin.status !== "fell" || d.td < fin.tStop)).length, done: fin.done };
    console.log(`${st} FINAL: committed ${Object.keys(r.fixed).length} · upright ${r.final.upright} · ${fin.status} at ${fin.tStop} · hash ${fin.hash}`); results.push(r);
    if (outP) fs.writeFileSync(outP, JSON.stringify({ generated: "tools/stepper/oracle.mjs", cfgName: cfgArg, results })); };
  const queue = starts.slice(); await Promise.all(Array.from({ length: Math.min(par, queue.length) }, async () => { while (queue.length) await one(queue.shift()); }));
  pool.close(); }

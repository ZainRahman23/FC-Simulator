// occupy3b/tools/l3_calib.mjs — THE LIMB MOMENTUM CALIBRATION (owner, 25 Oct): the contact SPECTRUM run under each collision-effective velocity
// formulation (l3_world.js limbV / bodyV; RES3B.vsrc A · B · C · D · E, RES3B.artMass), every contact application fully accounted:
//   the pair and its contact type (knee = the thigh's last 20 % or the shin's first 20 %), the normal, each side's root velocity, the velocity
//   used (and its part relative to the root), the five parts of the authored motion (frame · turn · sway · pelvis rotation · limb about its hip)
//   on the normal, the closing, the effective masses (and the hip's share), λ, each limb's normal speed removed, the impulse each body took,
//   the relative normal kinetic energy before / after — and per case each player's Stage 3 outcome, the ledger (ground: strut + balance) and its
//   residual. Rotated versions run through l3_rot.js (the same encounter, the world turned).
//   node l3_calib.mjs [--forms A,B,C,D,E,E+M] [--ids side,headon-jog,…] [--rot 0,37,90] [--json f]
import { ENV, runO3, arg, setOf, DT } from "./l3_common.mjs";
import { runRotated } from "../l3_rot.js";
import fs from "node:fs";
export { SPECTRUM, FORMS } from "../l3_forms.js";
import { SPECTRUM, FORMS } from "../l3_forms.js";
const region = (id, u) => (/^THIGH/.test(id) ? (u >= 0.8 ? "knee" : "thigh") : /^SHIN/.test(id) ? (u <= 0.2 ? "knee" : "shin") : /^FOOT/.test(id) ? "foot" : "body");
export function contactType(a) { const r = [region(a.idA, a.uA), region(a.idB, a.uB)].sort(); return r.join("–"); }
const dn = (v, n) => (v ? v[0] * n[0] + v[1] * n[1] : 0);
// one run: every application, accounted; each player's Stage 3 outcome; the ledger
export function calibRun(tc, form, rot = 0, mirror = false) { const o = { record: false, l3: FORMS[form] }, R = rot ? runRotated(ENV, tc, "S3B", rot, o) : runO3(ENV, tc, "S3B", o), W = R.W;
  const apps = W.l3.apps.map((a) => { const n = a.n, s = (side) => { const P = side === "A" ? a.partsA : a.partsB, sg = side === "A" ? -1 : 1, vr = side === "A" ? a.vRootA : a.vRootB, vu = side === "A" ? a.vA : a.vB;
      // (on the normal, + = toward the other side)
      return { id: side === "A" ? a.idA : a.idB, u: +(side === "A" ? a.uA : a.uB).toFixed(3), route: side === "A" ? a.routeA : a.routeB, root: +(sg * dn(vr, n)).toFixed(3), used: +(sg * dn(vu, n)).toFixed(3), rel: +(sg * (dn(vu, n) - dn(vr, n))).toFixed(3),
        parts: P ? Object.fromEntries(["frame", "turn", "sway", "prot", "limb", "total"].map((k) => [k, +(sg * dn(P[k], n)).toFixed(3)])) : null, m: +(1 / (side === "A" ? a.wA : a.wB)).toFixed(2), hipShare: +((side === "A" ? a.wHipA : a.wHipB) || 0).toFixed(4),
        dvLimb: +((side === "A" ? a.dvnA : a.dvnB) || 0).toFixed(3), dvHip: +((side === "A" ? a.dvhA : a.dvhB) || 0).toFixed(3), J: (side === "A" ? a.JA : a.JB).slice(0, 2).map((v) => +v.toFixed(3)) }; };
    return { t: +(a.k * DT - R.t0).toFixed(3), pair: a.key, type: contactType(a), held: a.held, n: n.slice(0, 2).map((v) => +v.toFixed(3)), closing: +(-a.vn).toFixed(3), lam: +a.lam.toFixed(3), bound: +a.src.toFixed(3), keB: +a.keB.toFixed(3), keA: +a.keA.toFixed(4), A: s("A"), B: s("B") }; });
  const players = {}; for (const e of W.imp.episodes) for (const [k, q] of Object.entries(e.players)) { const p = players[k] || (players[k] = []); p.push({ sev: q.sev, cls: q.cls, du: q.du, steps: q.steps.length }); }
  const worst = (k) => { const L = players[k] || []; const rank = { BRUSH: 0, LIGHT: 1, MODERATE: 2, STRONG: 3, SEVERE: 4 }, crank = { ABSORB: 0, CORRECT: 1, "RECOVERY STEP": 2, "STAGGER CANDIDATE": 3, "FALL CANDIDATE": 4 }; let b = null; for (const q of L) if (!b || rank[q.sev] * 10 + crank[q.cls] > rank[b.sev] * 10 + crank[b.cls]) b = q; return b; };
  const acc = W.l3.acc, C = W.l3.check;
  return { apps, lamSum: +apps.reduce((s, a) => s + a.lam, 0).toFixed(2), lamMax: +Math.max(0, ...apps.map((a) => a.lam)).toFixed(2), ATT: worst("ATT"), DEF: worst("DEF"), episodes: W.imp.episodes.length,
    ground: Object.fromEntries(["ATT", "DEF"].map((k) => [k, { strut: acc[k].STRUT.map((v) => +v.toFixed(2)), balance: acc[k].BALANCE.map((v) => +v.toFixed(2)), ext3b: acc[k].EXT3B.map((v) => +v.toFixed(2)), s3body: acc[k].S3_BODY.map((v) => +v.toFixed(2)) }])),
    check: { stage3: C.stage3, pair: C.pair, bound: C.bound, energy: C.energy }, oldStrikes: W.imp.events.filter((e) => /LIMB STRIKE/.test(e.kind)).length }; }
const cls = (q) => (q ? `${q.sev[0]}${q.sev === "STRONG" ? "T" : q.sev === "SEVERE" ? "!" : ""}/${q.cls === "CORRECT" ? "C" : q.cls === "ABSORB" ? "A" : q.cls === "RECOVERY STEP" ? "STEP" : q.cls === "STAGGER CANDIDATE" ? "STAG" : "FALL"}` : "—");
if (process.argv[1] && process.argv[1].endsWith("l3_calib.mjs")) {
  const forms = arg("forms", "A,B,C,D,E,F,D+M,E+M,F+M").split(","), ids = arg("ids") ? arg("ids").split(",") : SPECTRUM.map((x) => x[0]), rots = arg("rot", "0").split(",").map(Number), mir = arg("mirror", "1") === "1";
  const L = setOf("l3"), out = arg("from") ? JSON.parse(fs.readFileSync(arg("from"), "utf8")) : []; const lines = [];
  if (arg("from")) for (const row of out) lines.push(`${row.id.padEnd(20)} ${forms.map((f) => { const x = row.forms[f]; return `${f}: ${x.lamSum.toFixed(1).padStart(6)} (${x.lamMax.toFixed(1).padStart(5)}) ${cls(x.ATT).padEnd(7)} ${cls(x.DEF).padEnd(7)}`; }).join(" │ ")}`);
  for (const id of arg("from") ? [] : ids) { const base = L.find((x) => x.id === id), name = (SPECTRUM.find((x) => x[0] === id) || [id, id])[1]; if (!base) continue;
    const variants = [[id, base, 0]]; if (mir) { const m = L.find((x) => x.id === id + "-m"); if (m) variants.push([id + "-m", m, 0]); } for (const r of rots) if (r) variants.push([`${id}@${r}°`, base, r]);
    for (const [vid, tc, r] of variants) { const row = { id: vid, base: id, name, rot: r, forms: {} };
      for (const f of forms) { row.forms[f] = calibRun(tc, f, r); process.stderr.write("."); }
      out.push(row);
      lines.push(`${vid.padEnd(20)} ${forms.map((f) => { const x = row.forms[f]; return `${f}: ${x.lamSum.toFixed(1).padStart(6)} (${x.lamMax.toFixed(1).padStart(5)}) ${cls(x.ATT).padEnd(7)} ${cls(x.DEF).padEnd(7)}`; }).join(" │ ")}`); } }
  console.log(`\nTHE CONTACT SPECTRUM × THE FORMULATIONS — per case: Σλ (largest) N·s · Stage 3's worst response per player (ATT DEF: M moderate, ST strong, S! severe, L light, B brush / C correct, A absorb, STEP recovery step, STAG stagger, FALL fall candidate)`);
  for (const l of lines) console.log(l);
  // THE FIRST CONTACT of each encounter — everything before it is identical under every formulation (the like-for-like comparison): its tick's
  // applications (Gauss–Seidel passes) summed; the first pass's closing; the contact type
  const first = (x) => { const a = x.apps; if (!a.length) return null; const t = a[0].t, g = a.filter((q) => q.t === t); return { t, type: g[0].type, closing: g[0].closing, lam: g.reduce((s, q) => s + q.lam, 0), held: g[0].held }; };
  console.log(`\nTHE FIRST CONTACT of each encounter (identical before it under every formulation): type · closing m/s → λ N·s`);
  const FT = {};
  for (const r of out) { const f0 = first(r.forms[forms[0]]); if (!f0) continue; console.log(`  ${r.id.padEnd(20)} t ${f0.t.toFixed(3)} ${f0.type.padEnd(12)} ${forms.map((f) => { const x = first(r.forms[f]); return x ? `${f}: ${x.closing.toFixed(2).padStart(5)} → ${x.lam.toFixed(1).padStart(5)}` : `${f}: —`; }).join(" │ ")}`);
    for (const f of forms) { const x = first(r.forms[f]); if (!x) continue; const key = `${f}|${f0.type}`, T0 = FT[key] || (FT[key] = []); T0.push(x.lam); } }
  console.log(`\nTHE FIRST CONTACT by type (all variants): median λ [min … max] N·s`);
  for (const ty of [...new Set(Object.keys(FT).map((k) => k.split("|")[1]))].sort()) console.log(`  ${ty.padEnd(12)} ${forms.map((f) => { const v = (FT[`${f}|${ty}`] || []).slice().sort((a, b) => a - b); return v.length ? `${f}: ${v[v.length >> 1].toFixed(1).padStart(5)} [${v[0].toFixed(1)} … ${v[v.length - 1].toFixed(1)}]` : `${f}: —`; }).join(" │ ")}`);
  // the contact-type table: per formulation, every application's closing and λ by contact type
  const T = {}; for (const r of out) for (const f of forms) for (const a of r.forms[f].apps) { const key = `${f}|${a.type}`, x = T[key] || (T[key] = { n: 0, cl: [], lam: [] }); x.n++; x.cl.push(a.closing); x.lam.push(a.lam); }
  const med = (v) => { const s = v.slice().sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
  console.log(`\nBY CONTACT TYPE (all variants): applications · median closing m/s · median λ · largest λ N·s`);
  const types = [...new Set(Object.keys(T).map((k) => k.split("|")[1]))].sort();
  for (const ty of types) console.log(`  ${ty.padEnd(12)} ${forms.map((f) => { const x = T[`${f}|${ty}`]; return x ? `${f}: ${String(x.n).padStart(3)} · ${med(x.cl).toFixed(2)} · ${med(x.lam).toFixed(1).padStart(5)} · ${Math.max(...x.lam).toFixed(1).padStart(5)}` : `${f}: —`; }).join(" │ ")}`);
  // the invariants over every run
  const worstC = { stage3: 0, pair: 0, bound: 0, energy: -Infinity, old: 0 }; for (const r of out) for (const f of forms) { const c = r.forms[f].check; worstC.stage3 = Math.max(worstC.stage3, c.stage3); worstC.pair = Math.max(worstC.pair, c.pair); worstC.bound = Math.max(worstC.bound, c.bound); worstC.energy = Math.max(worstC.energy, c.energy); worstC.old += r.forms[f].oldStrikes; }
  console.log(`\nTHE LEDGER over every run: Stage 3 took exactly its impulses ${worstC.stage3.toExponential(1)} · pairing ${worstC.pair.toExponential(1)} · bound ${worstC.bound.toExponential(1)} · energy ${worstC.energy.toExponential(1)} · OLD limb strikes ${worstC.old}`);
  if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out));
}

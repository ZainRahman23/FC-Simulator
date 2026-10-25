// occupy3b/tools/l3_metrics.mjs — §18 THE MEASUREMENTS, STAGE 2 (as decided) · OLD STAGE 3 · STAGE 3B, one case set, the bodies as drawn.
// Stage 3's own instruments (occupy3/tools/o3_metrics.mjs measure(), unchanged: penetration, the planted feet's slide, root jolts, knee / foot
// jumps, crossed legs, the turf, joint speeds, knee folding, stuck, Stage 3's episodes) on every run, plus the LIMB measurements: penetration by
// contact class (thigh–thigh · thigh–shin · shin–shin · foot–leg · leg–trunk · torso) and the ticks beyond the 5 cm hard limit, the knee / hip
// angles drawn against the authored leg (the knee never changes; the hip within its anatomical range — introduced or already authored), the
// perturbation's largest angles and ankle displacement, and Stage 3B's own record (strikes, routes, the impulses, the yield, the projection,
// the events, the checks).   node l3_metrics.mjs --set review|matrix|moves|search|l3 [--json f]
import { ENV, runO3, setOf, arg, cm, CLASSES, limbMeasure, l3Stats } from "./l3_common.mjs";
import { measure } from "../../occupy3/tools/o3_metrics.mjs";
import { RES3B } from "../l3_limb.js";
import fs from "node:fs";
if (arg("l3")) Object.assign(RES3B, JSON.parse(arg("l3")));   // (a VARIANT: RES3B overrides for every Stage 3B run of this invocation — compared, never adopted silently)
const SET = arg("set", "matrix"), IDS = arg("ids") ? arg("ids").split(",") : null, L = setOf(SET).filter((x) => !IDS || IDS.includes(x.id)), M = ["S2D", "S3", "S3B"], rows = [];
for (const tc of L) { if (tc.onlyCommitted) { const p = runO3(ENV, tc, "S2D", { record: false }); if (!p.W.tk.act) continue; }
  const r = { id: tc.id, group: tc.group }; for (const m of M) { const o = measure(tc, m), R = runO3.last; o.limb = limbMeasure(R); o.l3 = l3Stats(R.W); r[m] = o; } rows.push(r); process.stderr.write("."); }
const agg = (m, f) => rows.reduce((a, r) => a + f(r[m]), 0), mx = (m, f) => Math.max(0, ...rows.map((r) => f(r[m])));
console.log(`\n§18 THE MEASUREMENTS — set ${SET} (${rows.length} encounters), the bodies as drawn`);
console.log(`${"".padEnd(52)}${M.map((m) => ({ S2D: "STAGE 2", S3: "OLD S3", S3B: "STAGE 3B" })[m].padStart(11)).join("")}`);
const line = (nm, f, k) => console.log(`${nm.padEnd(52)}${M.map((m) => (k === "max" ? cm(mx(m, f)) : k === "sum3" ? `${agg(m, (o) => o.jolt.f1)}/${agg(m, (o) => o.jolt.f2)}/${agg(m, (o) => o.jolt.f4)}` : String(+agg(m, f).toFixed(1))).padStart(11)).join("")}`);
for (const c of CLASSES) line(`deepest ${c} (cm)`, (o) => o.limb.pen[c], "max");
line("deepest LEG penetration, any class (cm)", (o) => o.limb.legs, "max"); line("ticks with a leg pair > 5 cm", (o) => o.limb.legs5, "sum");
for (const c of CLASSES) line(`  ticks > 5 cm, ${c}`, (o) => o.limb.t5[c], "sum");
for (const [nm, f, k] of [["planted ball-of-foot slide on the turf, largest (cm)", (o) => o.footSlide, "max"], ["pelvis jolts per frame > 1 / 2 / 4 cm", (o) => o.jolt.f1, "sum3"], ["largest pelvis jolt (cm per frame²)", (o) => o.jolt.max, "max"],
  ["knee / foot jumps > 4 cm in a tick", (o) => o.disc, "sum"], ["largest knee / foot jump in a tick (cm)", (o) => o.discMax, "max"], ["crossed-legs ticks (feet across > 5 cm)", (o) => o.crossed, "sum"], ["turf penetration ticks", (o) => o.ground, "sum"],
  ["joint > 15 m/s (ticks × joints)", (o) => o.jointV, "sum"], ["knee folding > 2000 °/s", (o) => o.kneeRate, "sum"], ["stuck seconds (asking, not moving)", (o) => o.stuck / 10, "sum"]]) line(nm, f, k);
console.log(`\nTHE LIMB LAYER's ANGLES (STAGE 3B, every perturbed leg against its authored self, every tick):`);
console.log(`  knee angle changed by the perturbation: largest ${mx("S3B", (o) => o.limb.kneeDiff).toFixed(4)}° (rigid hip rotations and the swivel keep the hip–ankle distance)`);
console.log(`  hip flexion / abduction changed: largest ${mx("S3B", (o) => o.limb.angDiff.flex).toFixed(1)}° / ${mx("S3B", (o) => o.limb.angDiff.abd).toFixed(1)}° · the perturbation's largest angles (ab/adduction · flexion · swivel): ${[0, 1, 2].map((i) => mx("S3B", (o) => o.limb.qMax[i]).toFixed(1)).join(" · ")}° · the ankle moved at most ${cm(mx("S3B", (o) => o.limb.dMax))} cm`);
console.log(`  leg-ticks OUTSIDE the anatomical range (hip flexion −30 … 125°, abduction −30 … 45°, knee 0 … 150°): introduced by the perturbation ${agg("S3B", (o) => o.limb.romNew)} · already in the authored pose ${agg("S3B", (o) => o.limb.romAuth)}`);
const S = rows.map((r) => r.S3B.l3), routes = {}, ev = {}; for (const s of S) { for (const [k, v] of Object.entries(s.route)) routes[k] = (routes[k] || 0) + v; for (const [k, v] of Object.entries(s.events)) ev[k] = (ev[k] || 0) + v; }
console.log(`\nSTAGE 3B: ${S.reduce((a, s) => a + s.strikes, 0)} strikes in ${S.filter((s) => s.strikes).length} / ${rows.length} encounters · ${S.reduce((a, s) => a + s.apps, 0)} impulse applications · Σ impulse ${S.reduce((a, s) => a + s.lamSum, 0).toFixed(1)} N·s · largest ${Math.max(...S.map((s) => s.lamMax)).toFixed(1)} N·s`);
console.log(`  routes (side A / side B): ${Object.entries(routes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`  yielded closing (held contacts, no impulse) Σ ${S.reduce((a, s) => a + s.yielded, 0).toFixed(1)} m/s · positional projection Σ ${cm(S.reduce((a, s) => a + s.posn, 0))} cm · contact-ticks left unresolved (both sides at their range / planted) ${S.reduce((a, s) => a + s.unresolvedTicks, 0)}`);
console.log(`  events: ${Object.entries(ev).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · ") || "—"}`);
console.log(`  checks (max over the set): Stage 3 took exactly its impulses ${Math.max(...S.map((s) => s.check.stage3)).toExponential(1)} · pairing ${Math.max(...S.map((s) => s.check.pair)).toExponential(1)} · bound (λ − its closing's) ${Math.max(...S.map((s) => s.check.bound)).toExponential(1)} · energy (after − before) ${Math.max(...S.map((s) => s.check.energy)).toExponential(1)} · OLD limb strikes left in S3B: ${rows.reduce((a, r) => a + r.S3B.events.filter((e) => /LIMB STRIKE/.test(e.kind)).length, 0)}`);
for (const m of ["S3", "S3B"]) { const E = rows.flatMap((r) => r[m].eps), P = E.flatMap((e) => ["ATT", "DEF"].filter((k) => e.players[k]).map((k) => e.players[k])), count = (f) => { const c = {}; for (const x of P) { const v = f(x); c[v] = (c[v] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${b}`).join(" · "); };
  const st = P.flatMap((x) => x.steps); console.log(`\n${m === "S3" ? "OLD STAGE 3" : "STAGE 3B → STAGE 3"}: intervened ${rows.filter((r) => r[m].eps.length).length} / ${rows.length} · ${E.length} episodes · ${P.length} responses · severity ${count((x) => x.sev)} · balance ${count((x) => x.cls)} · recovery steps ${st.length} · fall candidates ${P.filter((x) => x.fall).length} · regained ${P.filter((x) => x.regainAfter != null).length}`); }
console.log(`\nPER ENCOUNTER: legs cm (STAGE 2 · OLD S3 · 3B) · torso · ticks > 5 cm · 3B strikes / Σ N·s / largest · Stage 3 responses (OLD → 3B)`);
const resp = (o) => o.eps.flatMap((e) => ["ATT", "DEF"].filter((k) => e.players[k]).map((k) => `${k} ${e.players[k].sev[0]}${e.players[k].cls === "FALL CANDIDATE" ? "!" : ""}`)).join(",") || "—";
for (const r of rows) { const [a, b, c] = M.map((m) => r[m]); console.log(`${r.id.slice(0, 22).padEnd(23)}legs ${cm(a.limb.legs)} · ${cm(b.limb.legs)} · ${cm(c.limb.legs)}  torso ${cm(a.limb.pen.torso)} · ${cm(b.limb.pen.torso)} · ${cm(c.limb.pen.torso)}  >5 ${a.limb.legs5} · ${b.limb.legs5} · ${c.limb.legs5}  3B ${c.l3.strikes} / ${c.l3.lamSum.toFixed(1)} / ${c.l3.lamMax.toFixed(1)}  ${resp(b)} → ${resp(c)}${a.outKind || c.outKind ? `  tackle ${a.outKind} · ${b.outKind} · ${c.outKind}` : ""}`); }
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(rows.map((r) => Object.fromEntries([["id", r.id], ["group", r.group], ...M.map((m) => [m, Object.assign({}, r[m], { events: undefined, l3: r[m].l3 && Object.assign({}, r[m].l3, { cpu: undefined }) })])])), null, 0));

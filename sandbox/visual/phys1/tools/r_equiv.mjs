// phys1/tools/r_equiv.mjs — PHYSICAL RATINGS V1 changes nothing it should not. Seeded torture programs (c_torture.mjs), every tick's hash,
// position and ball compared (bit-identical):
//   (1) phys1 WITHOUT a rating set ≡ ballon1 (BALL-ON PACE V1, CARRY-B approved: its implementation preserved) — BALL OFF, BALL ON · CONTROLLED ·
//       CARRY-B, BALL ON · FREE
//   (2) PHYSICAL-99 (S99 · Acc99 · A99) ≡ phys1 without a rating set — BALL OFF, and BALL ON · CONTROLLED · CARRY-B (the 99 ratings are D38 and
//       A99-C themselves: CARRY-B on the 99 player is untouched)
//   (3) PHYSICAL-99 BALL OFF ≡ the S99 build (speed99/, D38 + EXPANDED)
//   (4) DETERMINISM: PHYSICAL-80-A / -B / -C and a custom extreme (S1 / Acc1 / A1-C) each simulated twice → identical
//   node r_equiv.mjs [--seeds 6] [--dur 30]
import { ENV, DT } from "./u_env.mjs";
import { ControlledSim as Phys1, presetLayers } from "../c_sim.js";
import { ControlledSim as Ball1 } from "../../ballon1/c_sim.js";
import { ControlledSim as S99 } from "../../speed99/c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
import { PHYS_PRESETS } from "../ratings.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, seeds = +opt("seeds", 6), dur = +opt("dur", 30);
const base = (extra) => Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), pace: "D38", vocab: "EXPANDED" }, extra), cl = (o) => JSON.parse(JSON.stringify(o));
const P99 = Object.assign({ id: "PHYSICAL-99" }, PHYS_PRESETS["PHYSICAL-99"]);
function same(A, B, P) { for (let k = 0; k < Math.round(dur / DT); k++) { const q = P.req(k * DT); A.step(q); B.step(q); const x = A.stateAt(A.t), y = B.stateAt(B.t);
  if (A.hash !== B.hash || x.P[0] !== y.P[0] || x.P[1] !== y.P[1] || x.s !== y.s || A.ball.p[0] !== B.ball.p[0] || A.ball.p[1] !== B.ball.p[1]) return k; } return -1; }
const rows = [];
function check(label, mkA, mkB) { let ok = 0; const bad = []; for (let s = 1; s <= seeds; s++) { const k = same(mkA(), mkB(), program(s, dur)); if (k < 0) ok++; else bad.push(`seed ${s} diverged at tick ${k}`); } rows.push({ label, ok, n: seeds, bad }); console.log(`${ok === seeds ? "IDENTICAL" : "DIFFERENT"} ${ok}/${seeds} · ${label}${bad.length ? " · " + bad.slice(0, 3).join(", ") : ""}`); }
const MODES = { "BALL OFF": { ballOn: false }, "BALL ON · CONTROLLED · CARRY-B": { control: "CONTROLLED", carry: "B" }, "BALL ON · FREE": {} };
for (const [m, x] of Object.entries(MODES)) check(`(1) phys1 without ratings ≡ ballon1 · ${m}`, () => new Phys1(ENV, base(cl(x))), () => new Ball1(ENV, base(cl(x))));
for (const m of ["BALL OFF", "BALL ON · CONTROLLED · CARRY-B"]) check(`(2) PHYSICAL-99 ≡ phys1 without ratings · ${m}`, () => new Phys1(ENV, base(Object.assign(cl(MODES[m]), { phys: P99 }))), () => new Phys1(ENV, base(cl(MODES[m]))));
check(`(3) PHYSICAL-99 BALL OFF ≡ the S99 build (speed99/) BALL OFF`, () => new Phys1(ENV, base({ ballOn: false, phys: P99 })), () => new S99(ENV, base({ ballOn: false })));
for (const [id, ph] of [...["PHYSICAL-80-A", "PHYSICAL-80-B", "PHYSICAL-80-C"].map((i) => [i, Object.assign({ id: i }, PHYS_PRESETS[i])]), ["S1 / Acc1 / A1-C", { id: "CUSTOM", sprint: 1, accel: 1, agility: 1, agiScale: "C" }]])
  check(`(4) determinism · ${id} BALL OFF, simulated twice`, () => new Phys1(ENV, base({ ballOn: false, phys: cl(ph) })), () => new Phys1(ENV, base({ ballOn: false, phys: cl(ph) })));
if (opt("json")) (await import("node:fs")).writeFileSync(opt("json"), JSON.stringify({ seeds, dur, rows }, null, 1));

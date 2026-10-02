import { walk, fallT, f3 } from "./lib.mjs"; import { dsAnalyse, dsPrint } from "./dsan.mjs";
const CH = { 0: { df: 0.237, dl: 0.368, T: 0.45 }, 1: { df: 0.34, dl: 0.26, T: 0.45 } };
for (const [name, x] of [["char nominal (natural inner loop)", { n: 3, seconds: 3.7, walk: { char: CH } }], ["DCM planner, natural inner loop", { n: 12, seconds: 8 }], ["G2b-style walk (CHAR_BASE + kXi defaults)", { n: 12, seconds: 8, walk: { kXiAlong: undefined, kXiAcross: undefined, kXiDS: undefined } }]]) {
  const r = walk({ ...x, keep: true }); console.log(`== ${name}: outcome ${r.outcome} fall ${f3(fallT(r), 2)}`); dsPrint(dsAnalyse(r)); }

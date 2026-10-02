import { walk, spec, f3 } from "./lib.mjs";
const r = walk({ n: 12, seconds: 2.8, keep: true }); const q = r.recs.find(q => q.t > 2.75);
console.log(Object.keys(q.arb[0]), q.arb.length); console.log(JSON.stringify(q.arb.slice(0, 3)).slice(0, 1500));

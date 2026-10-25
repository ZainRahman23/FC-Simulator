// occupy3b/tools/l3_tanworld.mjs — THE TANGENTIAL TEST in the world (owner, §7: "increasing purely tangential limb speed does not incorrectly create a
// larger normal collision impulse"): each case run with every limb's source velocity, relative to its root, keeping its normal part and its part
// off the normal scaled ×2 and ×0 (RES3B.tanScale, a diagnostic) — every contact application compared with the unscaled run, in order: the same
// tick, λ within 1e-9 N·s. (An application of λ below 1e-12 N·s is numerical zero — a limb at its range with no bodies' approach — and may come and
// go with floating-point noise; it is listed, not counted.)   node l3_tanworld.mjs [--ids …] [--form F+M]
import { ENV, runO3, setOf, arg } from "./l3_common.mjs";
import { FORMS } from "../l3_forms.js";
const ids = arg("ids", "side,headon-jog,static-jog,croq-leg,x90-jog,in-croq,bf-fake,both-committed").split(","), forms = arg("forms", "A,F+M").split(",");
let worst = 0, bad = 0, n = 0;
for (const f of forms) for (const id of ids) { const tc = setOf("l3").find((x) => x.id === id), apps = (sc) => runO3(ENV, tc, "S3B", { record: false, l3: Object.assign({ tanScale: sc }, FORMS[f]) }).W.l3.apps.filter((a) => a.lam > 1e-12).map((a) => [a.k, a.lam]);
  const a1 = apps(1); const res = [];
  for (const sc of [2, 0]) { const b = apps(sc); let i = 0; while (i < Math.min(a1.length, b.length) && a1[i][0] === b[i][0] && Math.abs(a1[i][1] - b[i][1]) < 1e-9) i++; const d = Math.max(0, ...a1.slice(0, i).map((x, j) => Math.abs(x[1] - b[j][1]))); worst = Math.max(worst, d); n++;
    const same = i === a1.length && i === b.length; if (!same) bad++; res.push(`×${sc}: ${same ? "identical" : `first ${i} of ${a1.length}/${b.length} identical`} (largest λ change ${d.toExponential(1)} N·s)`); }
  console.log(`  ${f.padEnd(4)} ${id.padEnd(16)} ${a1.length} applications · ${res.join(" · ")}`); }
console.log(`THE TANGENTIAL TEST (world): ${n - bad} / ${n} scaled runs identical in every application; the largest λ change ${worst.toExponential(1)} N·s`);

// net mechanical work of the passive MTP joints over a whole run (every physics tick): P = τ·ω about the hinge axis; a passive spring-damper toward 0 can only return what it stored
import { J, body, G2 } from "./lib.mjs";
for (const fm of ["F2", "F2h"]) { const { spec, poses } = body(fm); const r = G2.runG2a(J, spec, "G2W_A8", { poses, seconds: 8 });
  for (const s of ["L", "R"]) { let W = 0, Wpos = 0, Wneg = 0, prev = null, amax = -9, tmax = 0; const tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t; for (const q of r.recs) { if (!q.mtp) continue; if (process.env.UPRIGHT && q.t >= tF) break; const m = q.mtp[s]; amax = Math.max(amax, m.a); tmax = Math.max(tmax, Math.abs(m.tau));
      if (prev) { const dt = q.t - prev.t, w = (m.a - prev.a) / dt, P = 0.5 * (m.tau + prev.tau) * w * dt; W += P; if (P > 0) Wpos += P; else Wneg += P; } prev = { t: q.t, a: m.a, tau: m.tau }; }
    console.log(fm, s, "net work", W.toFixed(3), "J  (+", Wpos.toFixed(3), " / ", Wneg.toFixed(3), ")  max angle", (amax * 57.3).toFixed(1), "° max |τ|", tmax.toFixed(1), "N·m"); } }

// SLIDE CONTACT GEOMETRY V1.2 — the changed-fields regression gate against the frozen reference (baseline/tackled-player-v1).
// Two probe dumps of the SAME fixtures (tag vs head). A fixture passes when it is IDENTICAL, or — ONLY if it launches a slide — when
// (1) the authoritative trace and every event are identical up to the slide REQUEST (TACKLE_START), and (2) its changes are reported field by
// field: the technique chosen at the request (tackling / tucked leg, SWEEP / BLOCK), the ball contact (tick, outcome, region, ball velocity out),
// the body contacts (segments, reactions), the possession events after it. A fixture WITHOUT a slide must be IDENTICAL. Anything else fails.
//   node of_slide_gate.js <tag probe.json> <head probe.json> [--slide-only-change]
const fs = require("fs");
const [A, B] = process.argv.slice(2, 4).map(f => JSON.parse(fs.readFileSync(f)).results);
let bad = 0; const rows = [];
const pick = (ev, k) => ev.filter(e => e.kind === k);
for (const k of Object.keys(A)) {
  const x = A[k], y = B[k]; if (!y) { rows.push([k, "MISSING"]); bad++; continue; }
  const L = Math.min(x.trace.length, y.trace.length); let first = -1;
  for (let i = 0; i < L && first < 0; i++) for (let j = 1; j < x.trace[i].length; j++) if (x.trace[i][j] !== y.trace[i][j]) { first = i; break; }
  const evSameAll = JSON.stringify(x.events) === JSON.stringify(y.events);
  if (first < 0 && x.trace.length === y.trace.length && evSameAll) { rows.push([k, "IDENTICAL"]); continue; }
  const stX = x.events.find(e => e.kind === "TACKLE_START" && e.type === "SLIDE"), stY = y.events.find(e => e.kind === "TACKLE_START" && e.type === "SLIDE");
  if (!stX && !stY) { rows.push([k, "UNEXPECTED (no slide in this fixture)", first >= 0 ? `first divergence tick ${x.trace[first][0]}` : "events differ"]); bad++; continue; }
  const req = Math.min(stX ? stX.tick : 1e9, stY ? stY.tick : 1e9), tick = first >= 0 ? x.trace[first][0] : null;
  const before = (ev) => JSON.stringify(ev.filter(e => e.tick < req).map(e => Object.assign({}, e)));
  const okBefore = (tick == null || tick >= req - 1) && before(x.events) === before(y.events);
  if (!okBefore) bad++;
  const f = (ev) => { const st = ev.find(e => e.kind === "TACKLE_START" && e.type === "SLIDE"), tk = pick(ev, "TACKLE").find(e => e.type === "SLIDE"), bc = pick(ev, "PLAYER_CONTACT"), bb = pick(ev, "TACKLE_BODY_CONTACT");
    return { leg: st ? `${st.foot}${st.tuck ? "/tuck " + st.tuck + " " + st.tech : ""}` : "-", ball: tk ? `${tk.out}${tk.contactTick != null ? "@" + tk.contactTick : ""}${tk.region ? " " + tk.region : ""}${tk.vOut ? " v(" + tk.vOut.map(v => v.toFixed(1)) + ")" : ""}` : "-",
      body: bb.map(e => `${e.prim}→${e.seg}@${e.tick}${e.took && e.took !== "REACTION" ? "(" + e.took + ")" : ""}`).join(" ") || "-", react: bc.map(e => `${e.react || e.cls}${e.family ? " " + e.family : ""}`).join(" ") || "-",
      poss: ev.filter(e => /LOOSE|RECEPTION|OUT|LINE|RESTART/.test(e.kind) && e.tick >= (st ? st.tick : 0)).slice(0, 3).map(e => e.kind + (e.outcome ? ":" + e.outcome : "") + "@" + e.tick).join(" ") || "-" }; };
  const fx = f(x.events), fy = f(y.events), changed = Object.keys(fx).filter(q => fx[q] !== fy[q]);
  rows.push([k, okBefore ? "EXPECTED CHANGE (slide)" : "UNEXPECTED — differs BEFORE the slide request", `request tick ${req}, first trace divergence ${tick}`, "changed: " + (changed.length ? changed.map(q => `${q}: ${fx[q]} → ${fy[q]}`).join("  ·  ") : "trace only (same facts)")]);
}
for (const r of rows) console.log(r.join("  |  "));
console.log(bad ? `SLIDE GATE FAIL (${bad})` : "SLIDE GATE PASS — every fixture without a slide is identical to baseline/tackled-player-v1; every slide fixture is identical up to the slide request and its changed facts are listed");

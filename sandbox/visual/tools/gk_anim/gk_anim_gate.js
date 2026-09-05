// GK ANIMATION V1 — REGRESSION GATE: the renderer must not alter the simulation.
// Runs every built-in keeper scenario for N ticks on a page and hashes the per-tick SIMULATION trace (keeper root, hand,
// leg tip, ball, held flag, contact tick/outcome/volume). Compare runs: current page with the animation drawn every tick
// (+ debug overlay) vs the same page with GK_ANIM disabled vs a frozen pre-animation page copy.
//   node gk_anim_gate.js --url <page url> --out <json> [--ticks 150] [--anim on|off] [--udd <chrome dir>]
const NM = process.env.PUPPETEER_NODE_MODULES; if (NM) module.paths.unshift(NM);
const puppeteer = require("puppeteer-core"); const fs = require("fs"); const crypto = require("crypto");
const a = process.argv; const opt = (k, d) => { const i = a.indexOf(k); return i > 0 ? a[i + 1] : d; };
const URL = opt("--url", "http://127.0.0.1:8126/sandbox/visual/match.html"), OUT = opt("--out", "gate.json"), TICKS = +opt("--ticks", 150), ANIM = opt("--anim", "on"), UDD = opt("--udd", "chrome-gate-" + ANIM);
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", userDataDir: UDD, args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + (URL.indexOf("?") >= 0 ? "&" : "?") + "r=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 180000 });
  for (let i = 0; i < 900; i++) { const ok = await p.evaluate(() => { const el = document.getElementById("loading"); return !!(el && el.style.display === "none" && typeof ptEnter === "function"); }); if (ok) break; await new Promise(r => setTimeout(r, 100)); }
  const res = await p.evaluate((TICKS, ANIM) => {
    if (!(S.pt && S.pt.on)) ptEnter();
    const hasAnim = typeof GK_ANIM !== "undefined"; if (hasAnim) GK_ANIM.enabled = ANIM === "on"; if (hasAnim) S.dbg.anim = ANIM === "on";
    const out = {}; const r3 = v => v == null ? "-" : (Array.isArray(v) ? v.map(x => (+x).toFixed(4)).join(",") : (+v).toFixed(4));
    for (let idx = 0; idx < GK_SCENARIOS.length; idx++) {
      ptReset(); S.pt.paused = true; ptGkScenario(idx); S.pt.paused = true; if (typeof gkAnimResetView === "function") gkAnimResetView();
      const lines = [];
      for (let k = 0; k < TICKS; k++) {
        ptStep(); if (hasAnim && ANIM === "on" && typeof gkAnimDraw === "function") gkAnimDraw(S.pt, S.pt.gk, 1 / 60);   // draw EVERY tick (worst case for any side effect)
        const g = S.pt.gk, bl = S.pt.b;
        lines.push([S.pt.now.toFixed(4), r3([g.x, g.y]), r3(g.handNow), r3(g.legTipNow), r3([bl.x, bl.y, bl.z]), bl.held || "-", g.phase, g.contact ? g.contact.tickT + "/" + g.contact.volume + "/" + g.contact.outcome : "-", g.committed ? g.committed.action + "/" + g.committed.t0.toFixed(4) : "-"].join("|"));
      }
      out[idx] = { name: GK_SCENARIOS[idx].name, trace: lines.join("\n"), last: lines[lines.length - 1] };
    }
    return { out, hasAnim, perf: (hasAnim && S.gkAnim && S.gkAnim.perf) || null };
  }, TICKS, ANIM);
  const summary = {}; for (const [k, v] of Object.entries(res.out)) summary[k] = { name: v.name, hash: crypto.createHash("sha256").update(v.trace).digest("hex").slice(0, 16), last: v.last };
  fs.writeFileSync(OUT, JSON.stringify({ url: URL, anim: ANIM, ticks: TICKS, hasAnim: res.hasAnim, perf: res.perf, scenarios: summary, errors: errs }, null, 1));
  console.log("gate", ANIM, URL, "scenarios", Object.keys(summary).length, "errors", errs.length, "perf", JSON.stringify(res.perf)); await b.close();
})();

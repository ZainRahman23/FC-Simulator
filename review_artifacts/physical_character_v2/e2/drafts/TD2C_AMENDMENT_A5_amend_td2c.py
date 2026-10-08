# TD2C amendment A5 (e2/DVG_PREREG.md §5.4; applied only after DVG's combined qualification passes): TD2C runs with the adopted DVG.
# Changes ONLY the configuration it runs (PSTAR5CHABV / PSTAR5CHABTDV) and the guard-law checks (DVG's law via tools/dvg_lib.mjs). Conditions, criteria, run list entries otherwise unchanged.
import sys, json, re
root = sys.argv[1]   # repository root (worktree) or a scratch copy with the same layout
P = root + "/sandbox/visual/physchar2/"; E = root + "/review_artifacts/physical_character_v2/e2/"
def edit(f, pairs):
    s = open(f).read()
    for a, b in pairs:
        assert s.count(a) == 1, (f, a[:100], s.count(a)); s = s.replace(a, b, 1)
    open(f, "w").write(s)
edit(P + "tools/td2c_val.mjs", [
  ('!["PSTAR5CHABG", "PSTAR5CHABTDC"].includes(CFGN)', '!["PSTAR5CHABV", "PSTAR5CHABTDV"].includes(CFGN)'),
  ('td2bOn(C.o) !== (CONFIG === "PSTAR5CHABTDC") || (CONFIG === "PSTAR5CHABG" && COND !== "nominal") || !C.o.d1Guard) throw new Error("configuration");',
   'td2bOn(C.o) !== (CONFIG === "PSTAR5CHABTDV") || (CONFIG === "PSTAR5CHABV" && COND !== "nominal") || C.o.d1Guard !== 2) throw new Error("configuration");   // amendment A5 (DVG)'),
  ("series = { t: [], dTau: [], dTau0: [], onset: [], closInc: [], wA: [], c: [], onS: [], gm: [], gw: [], gv: [], cmdMax: [] }", "series = { t: [], dTau: [], dTau0: [], onset: [], closInc: [], wA: [], c: [], onS: [], gm: [], gw: [], gv: [], cmdMax: [], gt: [], rate: [], wq: [] }"),
  ("const G = C.d1g && C.d1g[nL] && C.d1g[nL].tick === C.n - 1 ? C.d1g[nL] : null", "const G = C.dvg && C.dvg[nL] && C.dvg[nL].tick === C.n - 1 ? C.dvg[nL] : null"),
  ("series.gt = series.gt || []; series.gt.push(G && G.tRatio != null ? +G.tRatio.toFixed(5) : null);", "series.gt.push(G && G.tRatio != null ? +G.tRatio.toFixed(5) : null); series.rate.push(G ? +G.rateEnv.toFixed(6) : null); series.wq.push(G ? +G.wq.toFixed(4) : null);"),
  ("""    const E = G ? { t: +t.toFixed(6), mode: G.mode, w: G.w, okR: G.okR, okC: G.okC, okF: G.okF, okT: G.okT, tRatio: G.tRatio, err: G.err, lam: G.lam, src: G.src ? Object.fromEntries(Object.entries(G.src.T).map(([k, v]) => [k, v.slice()])) : null,
      ax: C.legK[nL].flatMap(k => (c && c[k] ? c[k].map((r, i) => (r && r.L ? [k, i, r.L.d1x, r.L.d1src, r.L.d1w, r.tau0] : null)).filter(Boolean) : [])) } : null;""",
   """    const E = G ? { t: +t.toFixed(6), mode: G.mode, w: G.w, okR: G.okR, okC: G.okC, okF: G.okF, okT: G.okT, tRatio: G.tRatio, err: G.err, lam: G.lam, wq: G.wq, srcTick: G.srcTick, tick: G.tick, Cprev: G.Cprev, rateEnv: G.rateEnv, pw: G.pw || 0,
      ax: C.legK[nL].flatMap(k => (c && c[k] ? c[k].map((r, i) => (r && r.L && r.L.dvx != null ? [k, i, r.L.dvx, r.L.dvu, r.L.dvf, r.L.dvw, r.tau0] : null)).filter(Boolean) : [])) } : null;   // amendment A5: DVG's record"""),
  ('const out = { generated: "tools/td2c_val.mjs", prereg: "e2/D1G_TD2C_PREREG.md", td2c:', 'const out = { generated: "tools/td2c_val.mjs", prereg: "e2/D1G_TD2C_PREREG.md (amendment A5: DVG, e2/DVG_PREREG.md)", tau: C.lc.o.release, td2c:'),
])
edit(P + "tools/td2c_eval.mjs", [
  ('AB = "PSTAR5CHABG", TD = "PSTAR5CHABTDC"', 'AB = "PSTAR5CHABV", TD = "PSTAR5CHABTDV"'),
  ('import { guardMetrics, bCmd } from "./d1g_lib.mjs";', 'import { bCmd } from "./d1g_lib.mjs"; import { guardLaw } from "./dvg_lib.mjs";   // amendment A5: the guard law is DVG\'s'),
  ("  const { lawBad, lawWorst, attrMax, attrBad, srcHoldBad, dwBad, lenBad, nFade, nRamp, heldMax } = guardMetrics(r, TAU_G);\n",
   "  const GL = c.gtr && c.gtr.length ? guardLaw(c.gtr, r.hz, r.tau) : { lawBad: 0, lawWorst: 0, attrMax: 0, attrBad: 0, srcBad: 0, wBad: 0, cBad: 0, fades: 0, ramps: 0, heldMax: 0, rateMax: 0, srcInvalid: 0 };\n  const lawBad = GL.lawBad, lawWorst = GL.lawWorst, attrMax = GL.attrMax, attrBad = GL.attrBad, srcHoldBad = GL.srcBad + GL.srcInvalid, dwBad = GL.wBad + GL.cBad + (GL.rateMax < 1 ? 0 : 1), lenBad = 0, nFade = GL.fades, nRamp = GL.ramps, heldMax = GL.heldMax;   // amendment A5: DVG's law (the weight law replaces the fixed fade length; the rate envelope and source validity are part of DG-6)\n"),
])
L = json.load(open(E + "TD2C_RUN_LIST.json"))
for q in L["runs"]:
    q["cfg"] = {"PSTAR5CHABG": "PSTAR5CHABV", "PSTAR5CHABTDC": "PSTAR5CHABTDV"}[q["cfg"]]
L["configs"] = ["PSTAR5CHABV", "PSTAR5CHABTDV"]; L["amendment"] = "A5 (e2/DVG_PREREG.md §5.4): configuration names only"
json.dump(L, open(E + "TD2C_RUN_LIST.json", "w"))
print("TD2C amendment A5 applied")

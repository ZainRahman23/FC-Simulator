# Approved motion foundations — the pre-integration recovery point (23 Oct 2026)

On 23 Oct (≈ 23:31 EEST) the owner marked two motions as **PROVISIONALLY APPROVED MOTION FOUNDATIONS**. This is the exact state of both, preserved before their integration into the dribbling vocabulary. They are not frozen: future work on defenders, ratings, input and speed may revise them, but integration must not retune them.

**Where:**

| | |
|---|---|
| Repository | https://github.com/ZainRahman23/FC-Simulator (remote `fc-simulator` in the `dribble-1` worktree) |
| Branch | `prototype/dribble-1` |
| Tag | **`checkpoint/touchline-feint-croqueta-approved-2026-10-23`** (annotated). It points at the commit that adds this manifest; that commit's code is byte-identical to `b489e4fd`. |
| Machine-readable | `APPROVED_MOTIONS_MANIFEST.json` (with the git blob of every file the four pages load) and `closure_<page>.json` |

## BODY FEINT — video-guided + exit foot

| | |
|---|---|
| Commits | video-guided **7853a88f** (instruction bbc87f4a) · exit foot **f8a0e374** (instruction 5d1a7ec7) |
| Source | `sandbox/visual/feint2ef/`: a copy of `feint2vg/`, itself a copy of `feint2/` |
| Templates | `feint2ef/v_tech.js` `bodyFeintOf()`:<br>· **BFEINT_L** (low speed, 1.0 – 2.9 m/s);<br>· **BFEINT_J** (jog, 2.4 – 4.6);<br>· **BFEINT_R** (run, 4.0 – 7.6).<br>BFEINT_JS / JX (shallow / strong) are the same function at other depths and were not in the reviewed cases. |
| Catalogue | `feint2ef/v_meta.js` `BODY_FEINT_V2` (ids BFEINT_L / J / R; MANUAL) |
| Reviewed cases | `feint2ef/v_cases.js` `BF_VG`: jog fake L → R and R → L; low speed both; run both |
| Pages | `feint2ef_lab.html` (EXIT-FOOT REVIEW) · `feint2ef_sandbox.html` · `feint2vg_lab.html` (the previous pass) |
| Reports | `review_artifacts/body_feint_v2_vg/` · `review_artifacts/body_feint_v2_ef/` (report, handoff, status, evidence, sources) |
| Also | Unchanged in `croqvg/` → `croqhs/` → `croqxs/` → `croqlw/`: its measurements are identical at each step. |

## LA CROQUETA — LEG-WAVE V4

| | |
|---|---|
| Commit | **b489e4fd** (instruction and the owner's L1 screenshot 4d63f13a) |
| Lineage | ADV-4 (`adv4/`, c11579a3) → VIDEO-GUIDED V1 (`croqvg/`, 4a549b8f) → HOP/SWEEP V2 (`croqhs/`, 753d0cc6) → X-SWEEP V3 (`croqxs/`, f7645d10) → **LEG-WAVE V4 (`croqlw/`)** |
| Source | `sandbox/visual/croqlw/`: a copy of `croqxs/`. It brings X-SWEEP V3's `bend` / `proll` body channels and per-template lateral band, plus the leg-wave template. |
| Template | `croqlw/v_tech.js` `croqLWOf()` → **CROQ_LW** (jog: its `vRange` is 2.0 – 4.2 m/s) |
| Catalogue | `croqlw/v_meta.js` `CROQUETA`: ids CROQ_LW / CROQ_W / CROQ_R, plus the generic LAT fallback |
| Validated | the reference-side jog case `REF · JOG R → L` and its mirror `REF · JOG L → R` |
| Measuring | `croqlw/lw_geom.js` (the leg wave) · `x_geom.js` (the X-shape) · `tools/croq_legwave.mjs` · `croq_xgeom.mjs` · `croq_integrity.mjs` |
| Pages | `croqlw_lab.html` (LEG-WAVE V4 REVIEW) · `croqlw_sandbox.html` |
| Report | `review_artifacts/croqueta_lw/` (report, comparison, handoff, status, evidence, sources) |

## Reconstructing it

```sh
git fetch fc-simulator 'refs/tags/checkpoint/touchline-feint-croqueta-approved-2026-10-23:refs/tags/checkpoint/touchline-feint-croqueta-approved-2026-10-23'   # once pushed
git checkout -b <yours> checkpoint/touchline-feint-croqueta-approved-2026-10-23
python3 -m http.server 8361 --bind 127.0.0.1          # from the checkout root
# open http://127.0.0.1:8361/sandbox/visual/croqlw_lab.html and feint2ef_lab.html
git hash-object <file>                                # = its blob in APPROVED_MOTIONS_MANIFEST.json
node review_artifacts/vocab_integration1/tools/page_closure.mjs sandbox/visual/croqlw_lab.html --blobs   # regenerate a closure
```

**Local only:** the characters are real players' models; never publish the pages.

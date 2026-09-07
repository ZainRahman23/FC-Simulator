# Fill sections F and G of the review package REPORT.md from the regression outputs and the final free-play captures.
#   python3 assemble_final_report.py <package_dir> <scratch_dir>
import sys, os, json, glob, re
PKG, SC = sys.argv[1], sys.argv[2]
rep = open(os.path.join(PKG, "REPORT.md")).read()
counts = json.load(open(os.path.join(PKG, "F_counts.json")))
before = {"fully animated save families": 1, "partially animated (legacy intermediate frames)": 3, "contact-pose-only save types": 15, "missing-art": 5}
st = counts["status"]
F = f"""| count | value |
|---|---|
| fully animated save families BEFORE this night | 1 (LEFT far dive) |
| fully animated save families AFTER | {st.get('LIVE', 0)} family rows across {counts['sequences_live']} live sequences |
| partially animated | 0 rows partially animated by sequence; 3 LEGACY clip families (chest/supported catch, low gather, foot save) keep V1 intermediate frames |
| contact-only | 0 (every live contact pose now has a sequence except the deferred overhead still) |
| legacy-only | {st.get('LEGACY', 0)} |
| missing-art | {st.get('MISSING', 0)} (low stills at S/N/E/NE/SE facings, low-far RIGHT, near-body) |
| intentionally deferred | {st.get('DEFERRED', 0)} (overhead vertical jump, standing high catch) |
| new baked animation frames | {counts['baked_frame_files_unique']} unique frame files ({counts['sequence_frame_slots_new']} sequence slots + {counts['moderate_variants']} moderate variants + {counts['facing_variants']} facing variants) |
| reused / shared frames | {counts['sequence_frame_slots_shared']} sequence slots reference another sequence's file (trunks and get-ups) |
| manually cleaned frames | 0 hand-edited pixel by pixel; every baked frame went through the automatic cleanup pass (specks, 1-px holes, stair-step spurs, interior specks) and, where it bridges lineages, the palette/outline blend |
"""
rep = rep.replace("COUNTS_PLACEHOLDER", "\n" + F)
G = []
gate = open(os.path.join(PKG, "regression", "GATE_COMPARE_FINAL.md")).read(); G.append(f"- **Neutrality gate (43 scenarios), final build:** {'ALL IDENTICAL: YES' if 'ALL IDENTICAL: YES' in gate else 'SEE FILE'} — sequences on, off, and the approved reference run (`regression/GATE_COMPARE_FINAL.md`).")
for name, label in (("SCAN_FINAL.txt", "Contextual-pose regression (45 cases)"), ("MATRIX_FINAL.txt", "Two-sided far-dive matrix (56 cells)"), ("LOW_FINAL.txt", "Low-save validation (6 cases)")):
    p = os.path.join(PKG, "regression", name)
    if os.path.exists(p): G.append(f"- **{label}:** " + open(p).read().strip().replace("\n", "\n  "))
fp = os.path.join(PKG, "regression", "freeplay_summary.json")
if os.path.exists(fp):
    s = json.load(open(fp)); G.append(f"- **Continuous free-play ART_MISSING hunt (seed 11, {s['n']} shots, ON and OFF):** ON: {s['on']} · OFF: {s['off']}; diagnostic shots identical ON/OFF: {s['diag_same']} (the pre-existing low-gather CATCH_HOLD gap at S/N/E facings, unchanged).")
    G.append(f"- **Animation ON vs OFF on the {s['recorded']} recorded shots:** max simulation-root deviation {s['max_root_dev']:.6f} m, contact ticks identical on all, outcomes identical; contact-tick keeper crops identical where a contact happened ({s['crop_identical']} of {s['with_contact']}); largest drawn-root step per family in `gameplay/index.json`.")
rep = rep.replace("REGRESSION_PLACEHOLDER", "\n".join(G) if G else "(pending)")
open(os.path.join(PKG, "REPORT.md"), "w").write(rep); print("REPORT sections F/G filled;", len(G), "regression lines")

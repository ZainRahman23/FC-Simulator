#!/usr/bin/env python3
# CF-6 preregistration: the V2 walking ladder derived from the CF-6 human walking calibration pack (sources/2026-10-08_cf6_human_walking_calibration_pack.md) under the user's
# decision (a) (sources/2026-10-08_user_decision_cf6_option_a.md). No fitting, no tuning: every number is a stated rule applied to cited values or to the V2 model.
#   speed v_k            = the pack's five reference speeds (§D), identical for all bodies
#   reference step s_ref = the pack's mean step length at v_k: S 0.38 / 0.45 / 0.52 m (M) at 0.4 / 0.6 / 0.8 m/s; C kinematic equivalents 0.634 / 0.708 m (D) at 1.1176 / 1.34112 m/s
#   V2 step s            = min(s_ref, s_max(body)); s_max = the flat-foot step-length limit at the validated posture height (scripts/reach_limit.mjs)  [decision (a)]
#   V2 cadence C         = 60 v / s  (steps/min; the pack's accounting identity v = C s / 60)
#   combined DS fraction = the pack's speed-specific value: S-derived 43.2 / 35.5 / 31.1 % (D) at 0.4 / 0.6 / 0.8; H 28.8 / 27.4 % (F/D) at 1.1176 / 1.34112 (H not used below 0.6)
#   V2 timing            = stride T = 120 / C; each DS interval = (DS% / 2) · T (the two DS intervals taken equal: H's loading-response and pre-swing regressions differ by 0.1·v %);
#                          single support (= the swing) T_SS = 60 / C − T_DS
import json, math
L = {"V2-REF": (0.40, 0.9317), "V2-165-62": (0.38, 0.8441), "V2-198-92": (0.42, 1.0142), "V2-long-legs": (0.42, 0.9750)}   # s_max (m), hip-joint height (m)
REF = [(0.400, 0.38, "S M", 43.2, "S D", (57.6, 72.0), (0.48, 0.62)), (0.600, 0.45, "S M", 35.5, "S D (H 32.0 F)", (73.2, 87.6), (0.44, 0.56)), (0.800, 0.52, "S M", 31.1, "S D", (85.2, 98.4), (0.41, 0.51)),
       (1.11760, 0.634, "C D", 28.8, "H F/D", (99.7, 111.9), None), (1.34112, 0.708, "C D", 27.4, "H F/D", (107.5, 119.7), None)]
LIFECYCLE_MIN_DS = 0.0125 + 0.10 + 0.05 + 0.10   # release debounce + release ramp + accept debounce + accept ramp (ctrl/v2_support.js LIFECYCLE), s
rows = []
for b, (smax, hip) in L.items():
    for k, (v, sref, ssrc, ds, dsrc, cref, ssref) in enumerate(REF, 1):
        s = min(sref, smax); C = 60 * v / s; Tstep = 60 / C; T = 2 * Tstep; Tds = ds / 200 * T; Tss = Tstep - Tds
        rows.append({"body": b, "level": f"L{k}", "v": v, "s_ref": sref, "s_ref_src": ssrc, "s_V2": round(s, 3), "reach_limited": s < sref, "cadence_V2": round(C, 1), "cadence_ref_meanpm1SD": cref, "T_step": round(Tstep, 4), "T_stride": round(T, 4),
                     "DS_pct": ds, "DS_src": dsrc, "T_DS_each": round(Tds, 4), "T_SS": round(Tss, 4), "SS_ref_meanpm1SD_s": ssref, "hof_vhat": round(v / math.sqrt(9.81 * hip), 3), "Tds_below_lifecycle_min": Tds < LIFECYCLE_MIN_DS})
json.dump(rows, open(__file__.replace("ladder_table.py", "ladder_table.json"), "w"), indent=1)
print("| body | level | v m/s | V2 step m (ref) | V2 cadence steps/min (ref ±1SD) | T_step s | T_DS each s | T_SS s (ref ±1SD) | DS % (src) | v/√(gL) | T_DS < lifecycle min 0.2625 s |")
print("|---|---|---|---|---|---|---|---|---|---|---|")
for r in rows: print(f"| {r['body']} | {r['level']} | {r['v']} | {r['s_V2']} ({r['s_ref']} {r['s_ref_src']}{', reach-limited' if r['reach_limited'] else ''}) | {r['cadence_V2']} ({r['cadence_ref_meanpm1SD'][0]}–{r['cadence_ref_meanpm1SD'][1]}) | {r['T_step']} | {r['T_DS_each']} | {r['T_SS']} ({'–'.join(map(str, r['SS_ref_meanpm1SD_s'])) if r['SS_ref_meanpm1SD_s'] else 'n/a'}) | {r['DS_pct']} ({r['DS_src']}) | {r['hof_vhat']} | {'yes' if r['Tds_below_lifecycle_min'] else 'no'} |")

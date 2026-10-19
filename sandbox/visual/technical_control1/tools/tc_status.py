# technical_control1/tools/tc_status.py — review_artifacts/technical_control1/TECHNICAL_CONTROL1_STATUS.json from the evidence of record.   python3 tc_status.py
import json, os
RA = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../../review_artifacts/technical_control1")); E = lambda f: json.load(open(os.path.join(RA, "evidence", f)))
S, C, VS, AB, NE, RG, DT, CP, CH, SP = E("tc_sweep_summary.json"), E("tc_chain_summary.json"), E("tc_vs_re1.json")["summary"], E("tc_body_ab.json")["summary"], E("tc_neutral.json")["summary"], E("tc_regress.json"), E("tc_det.json"), E("tc_cpu.json")["summary"], E("tc_chrome.json"), E("tc_vocab_spread.json")
fro = open(os.path.join(RA, "evidence/frozen_sha256_end_check.txt")).read().strip().split("\n")[-1].replace("# ", "")
pre = lambda k: {x: S["preset:" + k][x] for x in ["sepMaxMed", "sepMax", "sepMean", "perS", "tOrient", "vExit", "recovery", "rxClean", "rxTCont"]}
st = { "milestone": "TECHNICAL-CONTROL-1", "state": "presented for review — NOT frozen (no RECEIVE-V1 / DRIBBLE freeze), not integrated", "date": "2026-10-19",
  "instruction": "sources/2026-10-19_user_instruction_receive_dribble_phase.md", "report": "TECHNICAL_CONTROL1_REPORT.md", "review": "review/TECHNICAL_CONTROL1_REVIEW.html (local only)", "lab": "sandbox/visual/technical_control1.html",
  "phase1_exit_touch": { "re1_receive_set_99": {"sepMedian": VS["99"]["re1"]["sepRxMed"], "sepWorst": VS["99"]["re1"]["sepRxMax"], "exitLaunchMedian": VS["99"]["re1"]["exitSpeedMed"]}, "new_99": {"sepMedian": VS["99"]["tc1"]["sepRxMed"], "sepWorst": VS["99"]["tc1"]["sepRxMax"], "exitTouches": VS["99"]["tc1"]["exitTouches"], "clean": VS["99"]["tc1"]["clean"]} },
  "phase2_low_agility": { a: {"re1SepWorst": VS[a]["re1"]["sepRxMax"], "re1Clean": VS[a]["re1"]["clean"], "newSepWorst": VS[a]["tc1"]["sepRxMax"], "newClean": VS[a]["tc1"]["clean"], "newFailed": VS[a]["tc1"]["failed"]} for a in ["50", "25"] },
  "phase3_body_ab_receive_chain": AB, "human_motion_diagnostics": NE,
  "presets": { k: pre(k) for k in ["99/99/99", "90/90/90", "80/80/80", "70/70/70", "60/60/60", "50/50/50", "BC99/D99/A50", "BC99/D50/A99", "BC50/D99/A99", "95/95/55", "95/55/95", "55/95/95"] },
  "styles_90": { k.split(":")[1]: {x: S[k][x] for x in ["sepMaxMed", "perS", "gapP50", "prefShare", "actions", "surfaces"]} for k in S if k.startswith("style:") },
  "vocabulary_spread_sophisticated_share": { r: SP[r]["soph"] for r in SP },
  "bridge_sprint": { k.split(":")[2]: {"sepMaxMed": C[k]["sepMaxMed"], "sepMax": C[k]["sepMax"]} for k in C if k.startswith("chain:sprint") },
  "failures": "0 in 2826 sweep + 396 chain + 180 RECEIVE-ELITE-1-set runs",
  "regression": {"isolation": [RG["isolation"]["identical"], RG["isolation"]["runs"]], "nonTurn": [RG["nonTurn"]["identical"], RG["nonTurn"]["runs"]], "turnsChanged": [RG["turns"]["changed"], RG["turns"]["runs"]]},
  "determinism": {"repeat": [DT["repeat"]["identical"], DT["repeat"]["runs"]], "actions": [DT["repeat"]["actionsSame"], DT["repeat"]["runs"]], "keyedDraws": [DT["draws"]["matched"], DT["draws"]["pairs"]], "chromeNode": [CH["identical"], CH["runs"]]},
  "neutrality": [NE["identical"], NE["runs"]], "protected": fro, "cpu": CP }
json.dump(st, open(os.path.join(RA, "TECHNICAL_CONTROL1_STATUS.json"), "w"), indent=1, ensure_ascii=False); print("status written")

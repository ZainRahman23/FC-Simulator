# receive11/tools/rx_status.py — RECEIVE11_STATUS.json from the evidence: python3 rx_status.py <receive11 review dir>
import json, os, sys
R = sys.argv[1]; EV = os.path.join(R, "evidence"); J = lambda f: json.load(open(os.path.join(EV, f)))
A, CPU, CPUA, CH, DET, REG, MIR, BND = J("analysis.json"), J("cpu.json"), J("cpu_anim.json"), J("chrome_node_seed1.json"), J("determinism_node.json"), J("dribble_v1_regression.json"), J("mirror.json"), J("receive_turn_angle_boundary.json")
sha = open(os.path.join(EV, "frozen_sha256_end_check.txt")).read()
S = {
  "milestone": "RECEIVE-CONTROL-1.1", "date": "2026-10-18", "branch": "prototype/dribble-1", "frozen": False,
  "readyToFreeze": "NO — presented for the owner's visual review, as instructed ('DO NOT FREEZE RECEIVE-CONTROL YET')",
  "architecture": "authored receive-action system beside the frozen DRIBBLE-V1: receive11/rx_core.js ReceiveSim11 extends DribbleSim (dribble15/d15_core.js, tag dribble-v1-foundation-1, unchanged); one authoritative kernel launch at the action's CONTACT marker; Ball Control execution (rx_exec.js); explicit TURN-1.2 handoff",
  "families": list(A["families"].keys()) + ["CUSHION"],
  "matrix": {"runs": A["n"], "contactMade": A["contactMade"], "outcomes": A["cls5"], "detail": A["outcomes"], "rc1": A.get("rc1")},
  "noContact": A["missed"], "deg180": A["deg180"], "braking": A["braking"], "fullThrottle": A["fullThrottle"], "handoff": A["handoff"], "execution": A["execution"], "ballControl": A["ballControl"], "kill": A["kill"],
  "cpu": {"receiveMsPerSMean": CPU["mean"]["receiveMsPerS"], "receiveMsPerSMedian": CPU["median"]["receiveMsPerS"], "receiveMsPerReceive": CPU["mean"]["receiveMsTotal"], "animatedReceiveMsPerS": CPUA["mean"]["receiveMsPerS"], "afterHandoffMsPerS": CPU["mean"]["afterMsPerS"], "worstReceiveStepMs": CPU["worstReceiveStepMs"], "worstAfterStepMs": CPU["worstAfterStepMs"], "candidatesPerReceive": CPU["mean"]["candidates"], "rc1ReceiveMsPerS": 816.4},
  "determinism": {"chromeNodeDecisions": f'{CH["summary"]["decisionsIdentical"]}/{CH["summary"]["total"]}', "chromeNodeStateBitIdentical": f'{CH["summary"]["stateIdentical"]}/{CH["summary"]["total"]}', "receivePhaseBitIdentical": "all; remaining last-bit differences start after the handoff (frozen TURN-1.2 / DRIBBLE-V1)",
    "animationOnOff": f'{DET["animOnOffIdentical"]}/{DET["runs"]}', "nodeReplay": f'{DET["replayIdentical"]}/{DET["runs"]}', "drawsDifferAcrossSeeds": f'{DET["drawsDifferAcrossSeeds"]}/{DET["seedPairs"]}'},
  "boundary": {"function": BND["function"], "pass": BND["functionPass"], "matrix": f'{BND["pass"]}/{BND["n"]}'},
  "mirror": {"pairs": f'{MIR["pass"]}/{MIR["n"]}', "worstPathErrM": MIR["worstPathErrM"]},
  "dribbleV1": {"beforeEqualsAfterReceives": f'{REG["beforeEqualsAfter"]}/{REG["runs"]}', "matchesEvidenceOfRecord": f'{REG["evidenceMatch"]}/{REG["evidenceCompared"]}', "D1unchanged": REG["D1unchanged"], "frozenFilesIdentical": "IDENTICAL" in sha},
  "limitations": [
    "The body is a procedural placeholder for authored animation (rx_body.js); RECEIVE11_ANIMATION_CONTRACT.md defines what production assets must meet.",
    f'DRIBBLE-V1 takeover gap: in {A["handoff"]["takenNoDribbleTouch"]} runs DRIBBLE-V1 never touches a ball on the line ~1.4 m ahead (its stride-phase sensitivity, reproduced in pure DRIBBLE-V1 starts) — owner decision.',
    "TURN-1.2 cannot walk or stand: the ready stance and kill-and-hold are authored; the handoff speed is >= 2.5 m/s.",
    "RECEIVE-CONTROL-1's side passes at RUN/FAST are aimed behind the runner (forced braking); rear passes into space for joggers are often reached after the 4 s runs end.",
    "Ball Control constants are calibration values, not locked; agility, reactions, pressure, fatigue are extension points; no opponents in the matrix.",
  ],
  "review": "review/RECEIVE11_REVIEW.html (local only: real player names)",
}
json.dump(S, open(os.path.join(R, "RECEIVE11_STATUS.json"), "w"), indent=1); print("wrote", os.path.join(R, "RECEIVE11_STATUS.json"))

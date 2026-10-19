// ═══ technical_control13/tc13_cases.js — TECHNICAL-CONTROL-1.3: the TRANSITION TORTURE TEST (owner's list), both turn sides, 99 / 99 / 99 first ═══════
// RECEIVE-ELITE-1's receive cases on TECHNICAL-CONTROL-1.2's carry model. (Chest → foot and thigh → foot are not in the receive → dribble pipeline:
// its passes are ground passes — the chest / thigh controls exist only in RECEIVE-KILL-1's standalone study; not tested here.)
export const TORTURE = [
  { key: "straight", label: "ground receive → straight carry (sprint, from behind)", ids: ["RL_0_SPRINT_NORMAL"] },
  { key: "c30", label: "ground receive → 30° carry", ids: ["L_30_RUN_NORMAL", "L_30L_RUN_NORMAL", "ST_30_V12", "ST_30L_V12"] },
  { key: "c60", label: "receive → 60° cut", ids: ["L_60_RUN_NORMAL", "L_60L_RUN_NORMAL", "ST_60_V12", "ST_60L_V12"] },
  { key: "c90", label: "receive → 90° turn", ids: ["L_90_RUN_NORMAL", "L_90L_RUN_NORMAL", "ST_90_V12", "ST_90L_V12"] },
  { key: "half", label: "half-turn → preferred-foot outside carry (left-dominant close-control carrier)", ids: ["ST_90_V12@L@DOMINANT_CLOSE", "ST_90L_V12@L@DOMINANT_CLOSE", "ST_120_V12@L@DOMINANT_CLOSE", "L_60_RUN_NORMAL@L@DOMINANT_CLOSE"] },
  { key: "through", label: "through-stance turn → carry", ids: ["ST_150_V12", "ST_180_V12", "ST_180L_V12", "L_150_RUN_NORMAL", "L_150L_RUN_NORMAL"] },
  { key: "sprint", label: "sprint receive → first carry touch", ids: ["L_90_SPRINT_NORMAL", "L_90L_SPRINT_NORMAL", "L_30_SPRINT_NORMAL", "F_180R_SPRINT_NORMAL"] },
];
export const tortureIds = () => TORTURE.flatMap((g) => g.ids.map((s) => ({ group: g.key, spec: s })));
export const specId = (spec, r = [99, 99, 99]) => { const [id, foot, style] = spec.split("@"); return { id: `${id}_B${r[0]}_D${r[1]}_A${r[2]}`, foot: foot || "R", style: style || null }; };

// ═══ occupy3/o3_facts.js — a player's action and where it is in it, at time t (the same definition for the Lab, the study and the metrics):
// a Standing Tackle (its phase, its decisive event = its contact), a Body Feint / Croqueta (planned · committed before / after its decisive
// touch · released), else ordinary. Browser-safe (no node imports)
const MOVE = /BODY FEINT|CROQUETA/, r3 = (x) => (x == null ? null : +x.toFixed(3));
export function actionState(W, p, t) { const tk = p.tk, A = tk && (tk.acts || []).find((x) => t >= x.t0 - 1e-9 && t < x.tCtl - 1e-9);
  if (A) { const tau = t - A.t0, hit = A.hits.find((h) => h.t <= t + 1e-9); return { kind: "TACKLE", label: "STANDING TACKLE (" + A.fam + ")", committed: true, phase: tk.phaseAt(t), tau: r3(tau), progress: r3(tau / A.M.end), decisiveAt: r3(A.t0 + A.M.tc), beforeDecisive: tau < A.M.tc - 1e-9, decisiveDone: tau >= A.M.tc - 1e-9, ballTouched: !!hit }; }
  const a = p.planAt(t).action; if (a && a.tech && a.tCommit != null && MOVE.test(a.label || "")) { const dc = p.contacts.find((c) => c.actionId === a.id && c.decisive && c.t <= t + 1e-9), before = !dc;
    const phase = t < a.tCommit - 1e-9 ? "PLANNED (not yet committed)" : t < a.tRelease - 1e-9 ? (before ? "COMMITTED · before the decisive touch" : dc.missed ? "COMMITTED · the decisive touch NOT made" : "COMMITTED · after the decisive touch") : "EXIT (released)";
    return { kind: a.label.startsWith("BODY") ? "BODY FEINT" : "CROQUETA", label: a.label, committed: t >= a.tCommit - 1e-9 && t < a.tRelease - 1e-9, planned: t < a.tCommit - 1e-9, phase, progress: r3((t - a.tCommit) / (a.tRelease - a.tCommit)), decisiveAt: r3(a.tC), beforeDecisive: before, decisiveDone: !!dc && !dc.missed, decisiveMissed: !!(dc && dc.missed), ballTouched: !!p.contacts.find((c) => c.actionId === a.id && !c.missed && c.t <= t + 1e-9) }; }
  return { kind: "ORDINARY", label: a ? a.label : "—", committed: false, phase: "—" }; }

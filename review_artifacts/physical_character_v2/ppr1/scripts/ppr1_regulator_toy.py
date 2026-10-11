# PPR-1 design analysis (NOT V2, NOT the PVP collision): single-joint toy models of B's two layers, to choose a delayed posture-regulator rule
# that is stable with a 125 ms neural delay BEFORE the preregistration is frozen. Each joint = a point-mass load (A's own gain data: mass m and
# lever L of the load the joint supports) with gravity (inverted for the support chain and head, hanging for the arms), B's intrinsic
# elastoplastic element at its entry values (K_i, D_i, yield bounds from PPR1_DESIGN_TABLE.json; the anchor slips when the elastic torque
# exceeds the bound) and a delayed regulator τ = −K_r·θ(t−L) − D_r·θ'(t−L). Initial deflection 0.5° (inside the elastic range) and 3° (beyond).
# Output: peak |θ| in 1–2 s and 3–4 s and the final angle (99 = diverged past 86°).
# usage: python3 ppr1_regulator_toy.py  (from review_artifacts/physical_character_v2)
import json
L = json.load(open("ppr1/evidence/PPR1_AUDIT_LAW_A.json")); T = json.load(open("ppr1/evidence/PPR1_DESIGN_TABLE.json"))
A = {(r["joint"], r["axis"]): r for r in L["rows"]}; Bt = {(r["joint"], r["axis"]): r for r in T["rows"]}
def sim(I, Kg, Ki, Di, Kr, Dr, yUp, yDn, th0, tauf=0.0, delay=0.125, dt=1/2400, tend=4.0, inverted=True):
    n = int(tend/dt); d = int(round(delay/dt)); th = [0.0]*(n+1); om = [0.0]*(n+1); th[0] = th0; anc = 0.0; ureg = 0.0; a = dt/(tauf+dt) if tauf > 0 else 1.0
    for i in range(n):
        thd = th[i-d] if i-d >= 0 else 0.0; omd = om[i-d] if i-d >= 0 else 0.0   # before entry the body is at its entry pose (as A assumes)
        ureg += a*((-Kr*thd - Dr*omd) - ureg); el = Ki*(anc-th[i])
        if el > yUp: anc = th[i] + yUp/Ki; el = yUp
        if el < -yDn: anc = th[i] - yDn/Ki; el = -yDn
        acc = ((Kg if inverted else -Kg)*th[i] + el - Di*om[i] + ureg)/I; om[i+1] = om[i] + acc*dt; th[i+1] = th[i] + om[i+1]*dt
        if abs(th[i+1]) > 1.5: return (99, 99, 99)
    seg = lambda a_, b: max(abs(x) for x in th[int(a_/dt):int(b/dt)])*57.2958
    return round(seg(1, 2), 3), round(seg(3, 4), 3), round(th[-1]*57.2958, 3)
mgh = L["body"]["mgh"]; Iwb = L["body"]["M"]*L["body"]["comHeightAboveAnklesM"]**2
WB = dict(I=Iwb, Kg=mgh, Ki=T["ankleSagittalSumKi"], Di=sum(r["Di"] for r in T["rows"] if r["fam"] == "ankle" and r["axis"] == "df"), KA=L["ankleSagittal"]["K"], DA=L["ankleSagittal"]["D"],
          y=sum(r["yieldDownNm"] for r in T["rows"] if r["fam"] == "ankle" and r["axis"] == "df"), inv=True)
JOINTS = [("WB", None), ("knee_R", "flex"), ("hip_R", "flex"), ("hip_R", "abd"), ("lumbar", "flex"), ("thoracic", "flex"), ("neck", "flex"), ("shoulder_R", "flex"), ("elbow_R", "flex")]
def P(j, a):
    if j == "WB": return WB["I"], WB["Kg"], WB["Ki"], WB["Di"], WB["KA"], WB["DA"], WB["y"], WB["y"], True
    ra, rb = A[(j, a)], Bt[(j, a)]; m, Lr = ra["loadM"], ra["loadL"]
    return m*Lr*Lr, m*9.81*Lr, rb["Ki"], rb["Di"], ra["K"], ra["D"], max(rb["yieldUpNm"], 1e-3), max(rb["yieldDownNm"], 1e-3), not j.startswith(("shoulder", "elbow"))
RULES = [("A tone delayed (K_r = K_A, D_r = D_A)", lambda KA, DA, Ki, Kg, inv: (KA, DA), 0.0),
         ("remainder only (K_r = max(K_A − K_i, 0))", lambda KA, DA, Ki, Kg, inv: (max(KA-Ki, 0), DA*max(KA-Ki, 0)/KA), 0.0),
         ("remainder, floor 1.0·mgL", lambda KA, DA, Ki, Kg, inv: (max(KA-Ki, Kg if inv else 0), DA*max(KA-Ki, Kg if inv else 0)/KA), 0.0),
         ("remainder, floor 1.2·mgL (CHOSEN for the support chain)", lambda KA, DA, Ki, Kg, inv: (max(KA-Ki, 1.2*Kg if inv else 0), DA*max(KA-Ki, 1.2*Kg if inv else 0)/KA), 0.0),
         ("floor 1.2·mgL, D_r = 0", lambda KA, DA, Ki, Kg, inv: (max(KA-Ki, 1.2*Kg if inv else 0), 0.0), 0.0),
         ("floor 1.2·mgL, low-pass 100 ms", lambda KA, DA, Ki, Kg, inv: (max(KA-Ki, 1.2*Kg if inv else 0), DA*max(KA-Ki, 1.2*Kg if inv else 0)/KA), 0.1),
         ("no regulator (intrinsic + gravity only)", lambda KA, DA, Ki, Kg, inv: (0.0, 0.0), 0.0)]
out = {}
for name, rule, tf in RULES:
    out[name] = {}; print(name)
    for (j, a) in JOINTS:
        I, Kg, Ki, Di, KA, DA, yu, yd, inv = P(j, a); Kr, Dr = rule(KA, DA, Ki, Kg, inv)
        r1, r3 = sim(I, Kg, Ki, Di, Kr, Dr, yu, yd, 0.5/57.2958, tauf=tf, inverted=inv), sim(I, Kg, Ki, Di, Kr, Dr, yu, yd, 3/57.2958, tauf=tf, inverted=inv)
        out[name][f"{j}.{a or 'sag'}"] = {"Kr": round(Kr, 2), "Dr": round(Dr, 3), "start0.5deg": r1, "start3deg": r3}
        print(f"   {j}.{a or 'sag':5s} K_r {Kr:7.1f} D_r {Dr:7.2f}  0.5°→ {r1}  3°→ {r3}")
json.dump(out, open("ppr1/evidence/PPR1_REGULATOR_TOY.json", "w"), indent=1)

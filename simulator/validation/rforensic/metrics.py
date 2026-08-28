"""Renderer Forensic Case #1: quantify anim2 presentation defects on MW08."""
import json, statistics
from pathlib import Path

HERE = Path(__file__).parent
D = json.load(open(HERE / "mw08_replay.json"))
T = json.load(open(HERE / "anim2_trace.json"))
tr, feed = T["trace"], T["feed"]
events = D["events"]

M = lambda ax, ay, bx, by: (((ax-bx)*1.05)**2 + ((ay-by)*0.68)**2) ** 0.5

# ── 1. ball teleports: frame-to-frame displacement (60 fps virtual) ──────────
disp = []
for i in range(1, len(tr)):
    d = M(tr[i]["bx"], tr[i]["by"], tr[i-1]["bx"], tr[i-1]["by"])
    disp.append((d, i))
disp.sort(reverse=True)
tele = [d for d in disp if d[0] > 3.0]     # >3 m in 1/60 s = >180 m/s apparent
big = [d for d in disp if d[0] > 1.0]      # >60 m/s apparent
print(f"1. BALL TELEPORTS: frames with >3m jump (>=180 m/s): {len(tele)} | >1m (>=60 m/s): {len(big)}")
print(f"   worst single-frame displacements (m): {[round(d,1) for d,_ in disp[:8]]}")
per_min = len(tele) / (tr[-1]['T']/60)
print(f"   rate: {per_min:.1f} hard teleports per presented minute")

# ── 2. pass flight coverage: did each PASS get a rendered FLIGHT >= 0.15 s? ──
# reconstruct flight windows from trace ball state
flights = []
cur = None
for i, f in enumerate(tr):
    if f["bs"] == "FLIGHT" and cur is None: cur = [f["T"], f["S"], i]
    elif f["bs"] != "FLIGHT" and cur is not None:
        flights.append({"t0": cur[0], "t1": f["T"], "s0": cur[1], "i0": cur[2], "i1": i}); cur = None
passes = [e for e in events if e["event_type"] in ("PASS", "CROSS") and e["timestamp"] <= tr[-1]["S"]]
covered = 0; durs = []
fl_by_s = sorted(flights, key=lambda x: x["s0"])
import bisect
s0s = [f["s0"] for f in fl_by_s]
for e in passes:
    k = bisect.bisect_left(s0s, e["timestamp"] - 1.2)
    hit = None
    for f in fl_by_s[k:k+4]:
        if abs(f["s0"] - e["timestamp"]) <= 1.5: hit = f; break
    if hit and (hit["t1"] - hit["t0"]) >= 0.15: covered += 1
    if hit: durs.append(hit["t1"] - hit["t0"])
print(f"\n2. PASS VISIBILITY: {covered}/{len(passes)} passes with a rendered flight >=0.15s ({100*covered/len(passes):.0f}%)")
print(f"   rendered flight duration: med {statistics.median(durs):.2f}s p10 {sorted(durs)[len(durs)//10]:.2f}s (n={len(durs)}) | total flights rendered {len(flights)} vs pass events {len(passes)}")

# apparent ball speed during flights
spd = []
for f in flights:
    i0, i1 = f["i0"], min(f["i1"], len(tr)-1)
    if i1 <= i0: continue
    dist = M(tr[i1]["bx"], tr[i1]["by"], tr[i0]["bx"], tr[i0]["by"])
    dt = tr[i1]["T"] - tr[i0]["T"]
    if dt > 0.05 and dist > 2: spd.append(dist/dt)
print(f"   apparent ball speed in flight: med {statistics.median(spd):.0f} m/s p90 {sorted(spd)[int(len(spd)*.9)]:.0f} m/s (real football 15-30)")

# ── 3. action collapse: consecutive on-ball events fired within tiny presentation gaps ──
onball_ts = sorted(e["timestamp"] for e in events if e["event_type"] in ("PASS","CROSS","SHOT","CLEARANCE","DRIBBLE","TACKLE"))
# map sim time -> presentation T via trace
sim_to_T = {}
for f in tr: sim_to_T.setdefault(round(f["S"]), f["T"])
gaps = []
for a, b2 in zip(onball_ts, onball_ts[1:]):
    Ta, Tb = sim_to_T.get(round(a)), sim_to_T.get(round(b2))
    if Ta is not None and Tb is not None and b2 > a: gaps.append(Tb - Ta)
inst = sum(1 for g in gaps if g < 0.35)
print(f"\n3. ACTION COLLAPSE: {inst}/{len(gaps)} consecutive on-ball actions presented <0.35s apart ({100*inst/len(gaps):.0f}%)")
print(f"   presentation gap between on-ball actions: med {statistics.median(gaps):.2f}s p10 {sorted(gaps)[len(gaps)//10]:.2f}s")

# ── 4. player speeds (10 Hz samples) ──
pl_frames = [f for f in tr if "pl" in f]
speeds = []
last = {}
for f in pl_frames:
    for pid, x, y in f["pl"]:
        if pid in last:
            lt, lx, ly = last[pid]
            dt = f["T"] - lt
            if 0.05 < dt < 0.3:
                v = M(x, y, lx, ly) / dt
                speeds.append(v)
        last[pid] = (f["T"], x, y)
mv = [v for v in speeds if v > 0.4]
print(f"\n4. PLAYER SPEEDS: moving med {statistics.median(mv):.1f} m/s p90 {sorted(mv)[int(len(mv)*.9)]:.1f} p99 {sorted(mv)[int(len(mv)*.99)]:.1f} (sprint ~8.5)")
print(f"   samples >12 m/s (superhuman): {100*sum(1 for v in mv if v>12)/len(mv):.1f}% | >9 m/s: {100*sum(1 for v in mv if v>9)/len(mv):.1f}%")

# ── 5. camera visibility ──
vis = []
for f in pl_frames:
    W, H = 940, 583
    half_w = W / f["cs"] / 2; half_h = H / f["cs"] / 2
    n = sum(1 for pid, x, y in f["pl"]
            if abs(x*1.05 - f["cx"]) <= half_w and abs(y*0.68 - f["cy"]) <= half_h)
    vis.append(n)
print(f"\n5. CAMERA: players visible mean {statistics.mean(vis):.1f} / med {statistics.median(vis)} / min {min(vis)} of ~22")
print(f"   visible width at med scale: {940/statistics.median([f['cs'] for f in pl_frames]):.0f} m of 105 m pitch")

# ── 6. goals visibility ──
print("\n6. GOALS:")
for g in [e for e in events if e["event_type"]=="SHOT" and e["detail"].get("outcome")=="GOAL"]:
    t = g["timestamp"]
    win = [f for f in tr if abs(f["S"] - t) <= 4]
    if not win: print(f"   goal @{t}: NOT PRESENT in presentation trace"); continue
    rates = [f["r"] for f in win]
    fl = any(f["bs"]=="FLIGHT" for f in win)
    Ts = [f["T"] for f in win]
    print(f"   goal @{t} ({g['actor_id']}): presented over {max(Ts)-min(Ts):.1f} real-s, rate during {statistics.median(rates):.0f}x, shot flight rendered: {fl}")

# ── 7. feed sync: feed reveal vs presentation playhead ──
lead = []
Tof = {}
for f in tr: Tof.setdefault(round(f["S"]), f["T"])
for (et, Tseen, kind) in feed:
    Tplay = Tof.get(round(et))
    if Tplay is not None: lead.append(Tplay - Tseen)
print(f"\n7. FEED SPOILERS: feed reveals events med {statistics.median(lead):.1f}s of real time BEFORE the viewer sees them (p90 {sorted(lead)[int(len(lead)*.9)]:.1f}s)")

# ── 8. buffer/pacing ──
rates = [f["r"] for f in tr]
print(f"\n8. PACING: rate med {statistics.median(rates):.1f}x p90 {sorted(rates)[int(len(rates)*.9)]:.0f}x max {max(rates):.0f}x | presented {tr[-1]['T']/60:.1f} min for {tr[-1]['S']/60:.0f} sim-min")

# ── 9. dropped events (the S0-2 guard) ──
print(f"\n9. EVENT DROP GUARD: events older than 2s behind the racing playhead are silently discarded (code: `if(e.timestamp > S0 - 2) applyEvent`)")
print("METRICS-OK")

#!/usr/bin/env python3
"""Compare 8-direction traces: python3 compare.py <A.json> <B.json> [label]  — per direction: frames whose (animState, clip, dy) differ,
state histograms, first divergence, and the hold-phase behaviour (frames 120-360: stationary hold)."""
import json, sys, collections
A=json.load(open(sys.argv[1])); B=json.load(open(sys.argv[2])); lab=sys.argv[3] if len(sys.argv)>3 else ""
print(f"== {lab}: {sys.argv[1]} vs {sys.argv[2]}")
for d in ["north","north-east","east","south-east","south","south-west","west","north-west"]:
    ra=A[d]["rows"]; rb=B[d]["rows"]; n=min(len(ra),len(rb)); diff=[]; 
    for i in range(n):
        ka=(ra[i][10],ra[i][11],ra[i][12]); kb=(rb[i][10],rb[i][11],rb[i][12])
        if ka!=kb: diff.append(i)
    ha=collections.Counter(r[10] for r in ra); hb=collections.Counter(r[10] for r in rb)
    def hold(rows): 
        seg=[r for r in rows if 2.0<=r[1]<=6.0]; return collections.Counter(r[10] for r in seg), ''.join(str(r[12]) for r in seg[::12])
    holdA,dyA=hold(ra); holdB,dyB=hold(rb)
    first=diff[0] if diff else None
    print(f"{d:11s} frames {n}  differing (state|clip|dy): {len(diff):4d}  first at {('f%d t=%.2f A=%s B=%s'%(first,ra[first][1],ra[first][10:13],rb[first][10:13])) if first is not None else '-'}")
    print(f"             A states {dict(ha)}\n             B states {dict(hb)}")
    print(f"             hold 2-6s A {dict(holdA)} dy {dyA}\n             hold 2-6s B {dict(holdB)} dy {dyB}")

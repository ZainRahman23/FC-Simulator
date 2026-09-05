#!/usr/bin/env python3
"""E5 Handling/contact independence + E6 height independence, from a matched goal-face dataset that contains
K1, K1_HND (K1 + handling 95), K1_HGT (K1 + height 199).  python3 e5e6_check.py pgf/sens.json"""
import json,sys
D=json.load(open(sys.argv[1])); PROFS=D["profileOrder"]
def first(s,p):
    c=s["on"][p]["contacts"]; return (c[0]["t"],c[0]["volume"],tuple(c[0]["point"]) if c[0]["point"] else None) if c else None
for fam in D["families"]:
    on=[s for s in D["families"][fam]["shots"] if s.get("on")]
    print("\n### %s  (n=%d on-target)"%(fam,len(on)))
    if "K1_HND" in PROFS:
        same=sum(1 for s in on if first(s,"K1")==first(s,"K1_HND")); sameBool=sum(1 for s in on if bool(s["on"]["K1"]["contacts"])==bool(s["on"]["K1_HND"]["contacts"]))
        c1=[s for s in on if s["on"]["K1"]["contacts"]]; c2=[s for s in on if s["on"]["K1_HND"]["contacts"]]
        h1=sum(1 for s in c1 if s["on"]["K1"]["held"]); h2=sum(1 for s in c2 if s["on"]["K1_HND"]["held"])
        g1=sum(1 for s in on if s["on"]["K1"]["goal"]); g2=sum(1 for s in on if s["on"]["K1_HND"]["goal"])
        print("  E5 Handling 45 -> 95: FIRST CONTACT identical (t, volume, point) on %d/%d shots; contact/no-contact identical on %d/%d"%(same,len(on),sameBool,len(on)))
        print("     CATCH|CONTACT %.1f%% -> %.1f%%   TOTAL SAVE %.1f%% -> %.1f%%  (post-contact only)"%(100*h1/max(1,len(c1)),100*h2/max(1,len(c2)),100*(len(on)-g1)/len(on),100*(len(on)-g2)/len(on)))
        diff=[s for s in on if first(s,"K1")!=first(s,"K1_HND")][:5]
        for s in diff: print("     differs:",s["aimY"],s["c"],first(s,"K1"),first(s,"K1_HND"))
    if "K1_HGT" in PROFS:
        # E6: height changes GEOMETRY only. For shots where both keepers make their first contact with the same volume at a
        # similar point, the catch decision must agree (no hidden height->quality term); report the agreement and the reach gain.
        both=[s for s in on if s["on"]["K1"]["contacts"] and s["on"]["K1_HGT"]["contacts"] and s["on"]["K1"]["contacts"][0]["volume"]==s["on"]["K1_HGT"]["contacts"][0]["volume"]]
        near=[s for s in both if s["on"]["K1"]["contacts"][0]["point"] and s["on"]["K1_HGT"]["contacts"][0]["point"] and sum((a-b)**2 for a,b in zip(s["on"]["K1"]["contacts"][0]["point"],s["on"]["K1_HGT"]["contacts"][0]["point"]))**0.5<0.10]
        agree=sum(1 for s in near if s["on"]["K1"]["held"]==s["on"]["K1_HGT"]["held"])
        ct1=sum(1 for s in on if s["on"]["K1"]["contacts"]); ct2=sum(1 for s in on if s["on"]["K1_HGT"]["contacts"])
        print("  E6 height 183 -> 199: CONTACT %.1f%% -> %.1f%% (geometry);  same-volume first contacts within 10 cm: %d, catch decision agrees on %d (%.0f%%)"%(100*ct1/len(on),100*ct2/len(on),len(near),agree,100*agree/max(1,len(near))))
        dis=[s for s in near if s["on"]["K1"]["held"]!=s["on"]["K1_HGT"]["held"]][:4]
        for s in dis: print("     disagree:",s["aimY"],s["c"],s["on"]["K1"]["contacts"][0]["outcome"],"|",s["on"]["K1_HGT"]["contacts"][0]["outcome"],"norm",s["on"]["K1"]["contacts"][0].get("norm"),s["on"]["K1_HGT"]["contacts"][0].get("norm"))

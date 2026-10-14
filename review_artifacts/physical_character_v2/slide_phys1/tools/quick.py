# quick-look stick figures: quick.py in.json out.png  (in: {"segs":[[a,b],...], "frames":[{"t":..,"p":{name:[x,y,z]}}...], "title":..})
import json,sys,matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
d=json.load(open(sys.argv[1])); fr=d["frames"]; n=len(fr)
fig,ax=plt.subplots(3,1,figsize=(16,11))
import numpy as np
cols=plt.cm.viridis(np.linspace(0,1,n))
for k,f in enumerate(fr):
    P=f["p"]
    for a,b in d["segs"]:
        A=P[a];B=P[b]; c='r' if a.endswith('_R') or b.endswith('_R') else ('b' if a.endswith('_L') or b.endswith('_L') else 'k')
        ax[0].plot([A[2],B[2]],[A[1],B[1]],color=c,lw=1.2,alpha=0.85)
        ax[1].plot([A[2],B[2]],[A[0],B[0]],color=c,lw=1.2,alpha=0.85)
        ax[2].plot([A[0],B[0]],[A[1],B[1]],color=c,lw=1.2,alpha=0.85)
    if "com" in f:
        ax[0].plot(f["com"][2],f["com"][1],'o',color=cols[k],ms=4); ax[1].plot(f["com"][2],f["com"][0],'o',color=cols[k],ms=4)
    ax[0].text(P["headTop"][2],P["headTop"][1]+0.05,f'{f["t"]:.2f}',fontsize=7,ha='center')
ax[0].axhline(0,color='g'); ax[0].set_aspect('equal'); ax[0].set_title(d.get("title","")+"  side (z fwd, y up)")
ax[1].set_aspect('equal'); ax[1].set_title("top (z fwd, x)"); ax[2].axhline(0,color='g'); ax[2].set_aspect('equal'); ax[2].set_title("front (x, y)")
plt.tight_layout(); plt.savefig(sys.argv[2],dpi=90)

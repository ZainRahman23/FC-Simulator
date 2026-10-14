# filmstrip: strip.py in.json out.png [tmax] — side view (z fwd, y up) and front view (x, y) per frame, each panel centred on the COM
import json,sys,matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
d=json.load(open(sys.argv[1])); T=float(sys.argv[3]) if len(sys.argv)>3 else 9
fr=[f for f in d["frames"] if f["t"]<=T+1e-9]; n=len(fr)
fig,ax=plt.subplots(3,n,figsize=(1.55*n,6.6),squeeze=False)
for k,f in enumerate(fr):
    P=f["p"]; c=f.get("com",P["pelvisM"]); cz,cx=c[2],c[0]
    for a,b in d["segs"]:
        A=P[a];B=P[b]; col='r' if a.endswith('_R') or b.endswith('_R') else ('b' if a.endswith('_L') or b.endswith('_L') else 'k')
        ax[0][k].plot([A[2]-cz,B[2]-cz],[A[1],B[1]],color=col,lw=1.6)
        ax[1][k].plot([A[0]-cx,B[0]-cx],[A[1],B[1]],color=col,lw=1.6)
        ax[2][k].plot([A[2]-cz,B[2]-cz],[A[0]-cx,B[0]-cx],color=col,lw=1.6)
    for r,(xl,yl) in enumerate([((-1.1,1.1),(-0.05,2.0)),((-1.0,1.0),(-0.05,2.0)),((-1.1,1.1),(-1.0,1.0))]):
        a=ax[r][k]; a.set_xlim(*xl); a.set_ylim(*yl); a.set_aspect('equal'); a.set_xticks([]); a.set_yticks([])
        if r<2: a.axhline(0,color='g',lw=1)
    ax[0][k].plot(0,c[1],'ko',ms=3); ax[0][k].set_title(f'{f["t"]:.2f}',fontsize=8)
ax[0][0].set_ylabel("side"); ax[1][0].set_ylabel("front"); ax[2][0].set_ylabel("top")
plt.suptitle(d.get("title",""),fontsize=9); plt.tight_layout(); plt.savefig(sys.argv[2],dpi=72)

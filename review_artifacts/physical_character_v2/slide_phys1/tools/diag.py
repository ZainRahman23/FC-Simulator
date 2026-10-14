import json,sys,matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt, numpy as np
d=json.load(open(sys.argv[1])); t=np.array(d["t"]); T=float(sys.argv[3]) if len(sys.argv)>3 else 1.0; m=t<=T
fig,ax=plt.subplots(3,3,figsize=(18,12)); ax=ax.ravel()
ax[0].plot(t[m],np.array(d["comY"])[m],label="com y"); ax[0].plot(t[m],np.array(d["vy"])[m],label="vy"); ax[0].plot(t[m],np.array(d["vz"])[m],label="vz"); ax[0].plot(t[m],np.array(d["vx"])[m],label="vx"); ax[0].legend(); ax[0].grid(); ax[0].set_title("COM")
for k,c in [("pitch","C0"),("roll","C1"),("yaw","C2")]:
    ax[1].plot(t[m],[p[k] for p in np.array(d["pel"])[m]],c,label=k)
    if d["pelPlan"]: ax[1].plot(t[m],[p[k] for p in np.array(d["pelPlan"])[m]],c+"--")
ax[1].legend(); ax[1].grid(); ax[1].set_title("pelvis world (deg): actual — plan --")
for i,(grp,keys) in enumerate([("fold leg",["hip_L.flex","knee_L.flex","ankle_L.df","hip_L.abd","hip_L.rot","ankle_L.inv"]),("tackling leg + trunk",["hip_R.flex","knee_R.flex","ankle_R.df","lumbar.flex","lumbar.lat"]),("arms",["shoulder_L.flex","shoulder_R.flex"])]):
    a=ax[2+i]
    for j,k in enumerate(keys): c="C%d"%j; a.plot(t[m],np.array(d["ang"][k])[m],c,label=k); a.plot(t[m],np.array(d["tgt"][k])[m],c+"--")
    a.legend(fontsize=7); a.grid(); a.set_title(grp+" anat (deg) actual — target --")
for nm,v in d["grf"].items():
    v=np.array(v)
    if v.max()>0.05: ax[5].plot(t[m],v[m],label=nm)
ax[5].legend(fontsize=7); ax[5].grid(); ax[5].set_title("turf vertical force (BW)"); ax[5].set_ylim(0,4)
for j,k in enumerate(d["tau"]):
    tau=np.array([x if x is not None else np.nan for x in d["tau"][k]]); req=np.array([x if x is not None else np.nan for x in d["req"][k]])
    ax[6].plot(t[m],tau[m],"C%d"%j,label=k); ax[6].plot(t[m],req[m],"C%d:"%j)
ax[6].legend(fontsize=7); ax[6].grid(); ax[6].set_title("actuator torque (anat sign) delivered — request :"); ax[6].set_ylim(-400,400)
F=[x if x else [np.nan]*3 for x in d["vfF"]]; ax[7].plot(t[m],np.array([f[1] for f in F])[m]/(77.4*9.81),label="VF Fy (BW)")
TT=[x if x else [np.nan]*3 for x in d["vfT"]]; ax[7].plot(t[m],np.array([f[0] for f in TT])[m]/1000,label="T x (kNm)"); ax[7].plot(t[m],np.array([f[2] for f in TT])[m]/1000,label="T z (kNm)"); ax[7].legend(); ax[7].grid(); ax[7].set_title("support objectives")
ax[8].plot(t[m],np.array([x if x is not None else np.nan for x in d["errDeg"]])[m]); ax[8].grid(); ax[8].set_title("rms tracking error (deg)")
plt.suptitle(d["cand"]); plt.tight_layout(); plt.savefig(sys.argv[2],dpi=80)

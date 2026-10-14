import cv2,numpy as np,sys,glob
fs=sorted(glob.glob(sys.argv[1]+'/f*.jpg'))
prev=None
out=[]
for i,f in enumerate(fs):
    im=cv2.imread(f,cv2.IMREAD_GRAYSCALE)
    im=cv2.resize(im,(104,138)).astype(np.float32)
    # mask HUD regions roughly: top 22% and bottom 30% contain overlay; use middle band
    mid=im[30:95]
    if prev is not None:
        d=np.mean(np.abs(mid-prev))
        out.append((i+1,d))
    prev=mid
ds=np.array([d for _,d in out])
med=np.median(ds)
for n,d in out:
    if d>max(4*med,8): print(n, round((n-1)/60,3), round(d,1))
print('median',med)

import cv2,numpy as np,sys,json
# usage: stab.py name a b ref -> per-frame homography mapping frame n image -> frame ref image (ground plane), via grass features
name=sys.argv[1]; a,b,ref=map(int,sys.argv[2:5])
def load(n): return cv2.imread(f'all/f{n:04d}.jpg')
def mask(im):
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    g=((hsv[...,0]>28)&(hsv[...,0]<90)&(hsv[...,1]>40)).astype(np.uint8)
    g=cv2.erode(g,np.ones((9,9),np.uint8))
    g[:210]=0; g[690:]=0      # HUD: title/icon top, label + button bottom
    return g*255
H={ref:np.eye(3)}
def pair(n0,n1):
    i0=load(n0);i1=load(n1)
    g0=cv2.cvtColor(i0,cv2.COLOR_BGR2GRAY);g1=cv2.cvtColor(i1,cv2.COLOR_BGR2GRAY)
    p0=cv2.goodFeaturesToTrack(g0,1500,0.005,6,mask=mask(i0))
    p1,st,err=cv2.calcOpticalFlowPyrLK(g0,g1,p0,None,winSize=(21,21),maxLevel=3)
    ok=st.ravel()==1
    M,inl=cv2.findHomography(p0[ok],p1[ok],cv2.RANSAC,1.5)
    return M,int(inl.sum()),int(ok.sum())   # maps n0 -> n1
stats={}
for n in range(ref+1,b+1):
    M,ni,nt=pair(n-1,n); H[n]=H[n-1]@np.linalg.inv(M); stats[n]=(ni,nt)   # n -> ref
for n in range(ref-1,a-1,-1):
    M,ni,nt=pair(n,n+1); H[n]=H[n+1]@M; stats[n]=(ni,nt)
json.dump({str(k):v.tolist() for k,v in H.items()},open(f'stab_{name}.json','w'))
print('min inliers',min(v[0] for v in stats.values()))
# report camera translation of image centre
for n in range(a,b+1,6):
    p=H[n]@np.array([415,450,1.0]); print(n, np.round(p[:2]/p[2]-[415,450],1))

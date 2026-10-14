import cv2,numpy as np,sys
# usage: stride.py a b cx cy w h  -> tracks torso template, computes lower-body self-similarity vs lag
a,b,cx,cy,w,h=map(int,sys.argv[1:7])
def g(n): return cv2.imread(f'all/f{n:04d}.jpg',cv2.IMREAD_GRAYSCALE).astype(np.float32)
im=g(a)
tpl=im[cy-h//2:cy,cx-w//2:cx+w//2].copy()  # upper half (torso)
crops=[];pts=[]
for n in range(a,b+1):
    im=g(n)
    x0,y0=max(cx-w,0),max(cy-h,0)
    reg=im[y0:cy+h,x0:cx+w]
    r=cv2.matchTemplate(reg,tpl,cv2.TM_CCOEFF_NORMED)
    _,mv,_,ml=cv2.minMaxLoc(r)
    nx=x0+ml[0]+w//2; ny=y0+ml[1]+h//2
    cx,cy=nx,ny
    tpl=0.7*tpl+0.3*im[cy-h//2:cy,cx-w//2:cx+w//2]
    low=im[cy:cy+h//2+10,cx-w//2:cx+w//2]
    low=(low-low.mean())/(low.std()+1e-6)
    crops.append(low);pts.append((cx,cy))
N=len(crops)
for L in range(2,min(40,N-4)):
    s=np.mean([np.mean(crops[i]*crops[i+L]) for i in range(N-L)])
    sm=np.mean([np.mean(crops[i]*crops[i+L][:,::-1]) for i in range(N-L)])
    print(L, round(s,3), round(sm,3))
print('track', pts[0], pts[len(pts)//2], pts[-1])

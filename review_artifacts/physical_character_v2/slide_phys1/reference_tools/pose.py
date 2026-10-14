import cv2,numpy as np,sys,json
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
# usage: pose.py name a b cx cy half [kfjson]
name=sys.argv[1]; a,b,cx,cy,half=map(int,sys.argv[2:7])
kf=json.loads(sys.argv[7]) if len(sys.argv)>7 else {}
opts=vision.PoseLandmarkerOptions(base_options=mpt.BaseOptions(model_asset_path='/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/models/pose_heavy.task'),
    running_mode=vision.RunningMode.IMAGE,num_poses=3,min_pose_detection_confidence=0.2,min_pose_presence_confidence=0.2)
det=vision.PoseLandmarker.create_from_options(opts)
# keyframe centres: {"frame":[x,y],...} linear interp
ks=sorted((int(k),v) for k,v in kf.items())
def centre(n):
    if not ks: return cx,cy
    if n<=ks[0][0]: return ks[0][1]
    for (f0,p0),(f1,p1) in zip(ks,ks[1:]):
        if f0<=n<=f1:
            t=(n-f0)/(f1-f0); return [p0[0]+t*(p1[0]-p0[0]),p0[1]+t*(p1[1]-p0[1])]
    return ks[-1][1]
SC=4
out={}
tiles=[]
CON=[(11,12),(11,13),(13,15),(12,14),(14,16),(11,23),(12,24),(23,24),(23,25),(25,27),(27,31),(24,26),(26,28),(28,32)]
for n in range(a,b+1):
    im=cv2.imread(f'all/f{n:04d}.jpg')
    c=centre(n); x0=int(c[0]-half); y0=int(c[1]-half)
    x0=max(0,min(x0,im.shape[1]-2*half)); y0=max(0,min(y0,im.shape[0]-2*half))
    crop=im[y0:y0+2*half,x0:x0+2*half]
    up=cv2.resize(crop,None,fx=SC,fy=SC,interpolation=cv2.INTER_CUBIC)
    r=det.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(up,cv2.COLOR_BGR2RGB)))
    poses=[]
    for lm in r.pose_landmarks:
        pts=[(x0+p.x*2*half, y0+p.y*2*half, p.visibility) for p in lm]
        poses.append(pts)
    # choose pose closest to centre
    best=None
    if poses:
        d=[np.hypot(np.mean([p[0] for p in P[23:25]])-c[0],np.mean([p[1] for p in P[23:25]])-c[1]) for P in poses]
        best=poses[int(np.argmin(d))]
    out[n]={'crop':[x0,y0,2*half],'pose':best,'n':len(poses)}
    vis=cv2.resize(crop,None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC)
    if best:
        for i,j in CON:
            p=best[i];q=best[j]
            cv2.line(vis,(int((p[0]-x0)*2),int((p[1]-y0)*2)),(int((q[0]-x0)*2),int((q[1]-y0)*2)),(0,0,255) if i%2 else (255,0,0),2)
    cv2.putText(vis,f'{n}',(3,15),cv2.FONT_HERSHEY_SIMPLEX,0.5,(255,255,255),1)
    tiles.append(vis)
json.dump(out,open(f'pose_{name}.json','w'))
cols=8
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(f'sheets/pose_{name}.jpg',np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
print('ok',sum(1 for v in out.values() if v['pose']), 'of', len(out))

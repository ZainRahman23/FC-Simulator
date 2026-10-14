import cv2,numpy as np,sys
# usage: sheet.py out start end step cols x0 y0 x1 y1 scale
out=sys.argv[1]; a,b,st,cols=map(int,sys.argv[2:6]); x0,y0,x1,y1=map(int,sys.argv[6:10]); sc=float(sys.argv[10])
tiles=[]
for n in range(a,b+1,st):
    im=cv2.imread(f'{sys.argv[11]}/f{n:04d}.jpg')[y0:y1,x0:x1]
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    cv2.putText(im,f'{n} {((n-1)/60):.3f}s',(4,16),cv2.FONT_HERSHEY_SIMPLEX,0.45,(0,0,0),3)
    cv2.putText(im,f'{n} {((n-1)/60):.3f}s',(4,16),cv2.FONT_HERSHEY_SIMPLEX,0.45,(255,255,255),1)
    tiles.append(im)
h,w=tiles[0].shape[:2]
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])

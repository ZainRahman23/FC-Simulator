// PROPOSED VISUAL CALIBRATION ONLY. Never imported by gameplay.
export const PRESETS=Object.freeze([40,60,70,80,90,95,99]);
export function dispersion(accuracy,relativeSpeed){
 if(!Number.isFinite(accuracy)||accuracy<1||accuracy>99)throw Error('Accuracy must be 1–99');
 const deficit=99-accuracy;
 const sigmaBaseH=.02+4*deficit**2/(deficit**2+45**2),sigmaBaseV=.6*sigmaBaseH;
 const difficulty=1+.10*relativeSpeed**4,sigmaH=sigmaBaseH*difficulty,sigmaV=sigmaBaseV*difficulty;
 return {accuracy,sigmaBaseH,sigmaBaseV,difficulty,powerIncreasePercent:100*(difficulty-1),addedSigmaH:sigmaH-sigmaBaseH,addedSigmaV:sigmaV-sigmaBaseV,sigmaH,sigmaV,maxH:Math.sqrt(6)*sigmaH,maxV:Math.sqrt(6)*sigmaV};
}
export function sampleGrid(D,u,v){
 const N=D.grid.length,gx=(u+1)*(N-1)/2,gy=(v+1)*(N-1)/2,i=Math.min(N-2,Math.max(0,Math.floor(gx))),j=Math.min(N-2,Math.max(0,Math.floor(gy))),s=gx-i,t=gy-j;
 const a=D.grid[j][i],b=D.grid[j][i+1],c=D.grid[j+1][i+1],d=D.grid[j+1][i],du=2/(N-1);
 const x=a.x*(1-s)*(1-t)+b.x*s*(1-t)+c.x*s*t+d.x*(1-s)*t,y=a.y*(1-s)*(1-t)+b.y*s*(1-t)+c.y*s*t+d.y*(1-s)*t;
 const xu=((b.x-a.x)*(1-t)+(c.x-d.x)*t)/du,yu=((b.y-a.y)*(1-t)+(c.y-d.y)*t)/du,xv=((d.x-a.x)*(1-s)+(c.x-b.x)*s)/du,yv=((d.y-a.y)*(1-s)+(c.y-b.y)*s)/du;
 return {x,y,xu,yu,xv,yv,jac:xu*yv-yu*xv};
}
export function createField(D,accuracy){
 const ds=dispersion(accuracy,D.ideal.relativeSpeed),ratio=ds.maxH/D.domain.maxH,N=D.grid.length;
 const sample=(u,v)=>{const p=sampleGrid(D,u*ratio,v*ratio);return {...p,xu:p.xu*ratio,yu:p.yu*ratio,xv:p.xv*ratio,yv:p.yv*ratio,jac:p.jac*ratio*ratio};};
 const coords=[-1,...Array.from({length:N},(_,i)=>(-1+2*i/(N-1))/ratio).filter(t=>t>-1&&t<1),1];
 const points=coords.flatMap(v=>coords.map(u=>sample(u,v)));
 const bounds={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),bottom:Math.min(...points.map(p=>p.y)),top:Math.max(...points.map(p=>p.y))};
 const offsets={left:D.targetLocal.x-bounds.left,right:bounds.right-D.targetLocal.x,down:D.targetLocal.y-bounds.bottom,up:bounds.top-D.targetLocal.y};
 function perimeter(scale=1){const result=[];for(let e=0;e<4;e++)for(let i=0;i<=32;i++){const t=-1+2*i/32,u=e===0?t:e===1?1:e===2?-t:-1,v=e===0?-1:e===1?t:e===2?1:-t;result.push(sample(scale*u,scale*v));}return result;}
 const inverse=(x,y)=>{
  let u=(x-D.targetLocal.x)/(D.jacobian.xx*ds.maxH),v=(y-D.targetLocal.y-D.jacobian.yx*u*ds.maxH)/(D.jacobian.yy*ds.maxV);
  for(let i=0;i<5;i++){const p=sample(u,v),dx=p.x-x,dy=p.y-y;u-=(p.yv*dx-p.xv*dy)/p.jac;v-=(-p.yu*dx+p.xu*dy)/p.jac;}
  if(Math.abs(u)>1||Math.abs(v)>1)return null;
  const p=sample(u,v);return {u,v,density:(1-Math.abs(u))*(1-Math.abs(v))/p.jac};
 };
 const J=D.jacobian,spatialSigma={horizontal:Math.hypot(J.xx*ds.sigmaH,J.xy*ds.sigmaV),vertical:Math.hypot(J.yx*ds.sigmaH,J.yy*ds.sigmaV),definition:'Local linearized spatial standard deviation; theoretical, not sampled.'};
 return {ds,sample,inverse,perimeter:perimeter(),baseBound:perimeter(1/ds.difficulty),peak:1/sample(0,0).jac,
  summary:{accuracy,dispersion:ds,spatialSigma,bounds,offsets,extent:{width:bounds.right-bounds.left,height:bounds.top-bounds.bottom},maxHorizontalDeviation:Math.max(offsets.left,offsets.right),maxVerticalDeviation:Math.max(offsets.down,offsets.up)}};
}

import {datan2,dnorm} from '../physchar2/core/v2_math.js';
import {add,sub,mul,dot,cross,len,norm,clamp,rot,conj,qm,advanceQ,closestTriangle,finite3} from './math.js';
// Compile the actual convex boot pieces once. Supporting coplanar faces are
// grouped and triangulated; no AABB substituted for the boot's contact surface.
export function convexFaces(points){
 const planes=[];
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)for(let k=j+1;k<points.length;k++){
  let n=cross(sub(points[j],points[i]),sub(points[k],points[i]));if(len(n)<1e-10)continue;n=norm(n);let d=dot(n,points[i]);
  const ds=points.map(p=>dot(n,p)-d);if(ds.some(x=>x>1e-7)&&ds.some(x=>x< -1e-7))continue;
  if(ds.some(x=>x>1e-7)){n=mul(n,-1);d=-d;}
  if(planes.some(f=>dot(f.n,n)>1-1e-7&&Math.abs(f.d-d)<1e-7))continue;
  const face=points.filter(p=>Math.abs(dot(n,p)-d)<1e-7),center=mul(face.reduce(add,[0,0,0]),1/face.length);
  const u=norm(sub(face[0],center)),v=cross(n,u);face.sort((a,b)=>datan2(dot(sub(a,center),v),dot(sub(a,center),u))-datan2(dot(sub(b,center),v),dot(sub(b,center),u)));
  planes.push({n,d,points:face,tri:face.slice(1,-1).map((p,m)=>[face[0],p,face[m+2]])});
 }
 return planes;
}
export function compileShape(s){
 const r={...s,pos:s.pos||[0,0,0],rot:s.rot||[0,0,0,1]};
 if(s.type==='hull'){r.faces=convexFaces(s.points);r.bound=Math.max(...s.points.map(len));}
 else r.bound=s.type==='box'?len(s.he):s.type==='sphere'?s.r:s.half+Math.max(s.r||0,s.rTop||0,s.rBot||0);
 return r;
}
export function collider(c){
 if(!c.id)throw Error('Collider requires stable id');
 if(![c.p||[0,0,0],c.v||[0,0,0],c.w||[0,0,0]].every(finite3)||!Array.isArray(c.shapes)||!c.shapes.length)throw Error('Invalid collider state');
 const cq=c.q||[0,0,0,1];if(cq.length!==4||cq.some(x=>!Number.isFinite(x))||Math.abs(Math.sqrt(cq.reduce((a,x)=>a+x*x,0))-1)>1e-6)throw Error('Invalid collider rotation');
 if(c.response&&(!Number.isFinite(c.response.e)||c.response.e<0||c.response.e>1||!Number.isFinite(c.response.mu)||c.response.mu<0))throw Error('Invalid material response');
 if(c.material&&!['body','boot','post','turf'].includes(c.material))throw Error('Unknown collider material');
 const shapes=c.shapes.map(compileShape);
 return {...c,p:c.p||[0,0,0],q:c.q||[0,0,0,1],v:c.v||[0,0,0],w:c.w||[0,0,0],epoch:c.epoch||0,material:c.material||'body',shapes,bound:Math.max(...shapes.map(s=>len(s.pos)+s.bound))};
}
export function pose(c,t){return {p:add(c.p,mul(c.v,t-c.epoch)),q:advanceQ(c.q,c.w,t-c.epoch)};}
function localDistance(s,p){
 if(s.type==='sphere'){const l=len(p);return {d:l-s.r,n:norm(p)};}
 if(s.type==='capsule'||s.type==='tapered'){
  const rb=s.r??s.rBot,rt=s.r??s.rTop,L=2*s.half,k=L>1e-12?(rt-rb)/L:0;
  const radial=dnorm(p[0],p[2]),axis=clamp(p[1]+s.half+k*radial/Math.sqrt(Math.max(1e-12,1-k*k)),0,L);
  const dif=sub(p,[0,axis-s.half,0]);return {d:len(dif)-(rb+(L?axis/L:0)*(rt-rb)),n:norm(dif)};
 }
 if(s.type==='box'){
  const near=p.map((v,i)=>clamp(v,-s.he[i],s.he[i])),dv=sub(p,near),l=len(dv);
  if(l>1e-12)return {d:l,n:mul(dv,1/l)};
  const gaps=p.map((v,i)=>s.he[i]-Math.abs(v));const i=gaps.indexOf(Math.min(...gaps));const n=[0,0,0];n[i]=Math.sign(p[i])||1;return {d:-gaps[i],n};
 }
 let plane=s.faces[0],inside=true,best=Infinity,near;
 for(const f of s.faces){if(dot(f.n,p)-f.d>0)inside=false;if(dot(f.n,p)-f.d>dot(plane.n,p)-plane.d)plane=f;
  for(const tr of f.tri){const q=closestTriangle(p,...tr),d=len(sub(p,q));if(d<best){best=d;near=q;}}
 }
 if(inside)return {d:dot(plane.n,p)-plane.d,n:plane.n};
 return {d:best,n:norm(sub(p,near))};
}
export function distance(c,p,t){
 const cp=pose(c,t);let best={d:Infinity};
 for(const s of c.shapes){const q=qm(cp.q,s.rot),o=add(cp.p,rot(cp.q,s.pos)),lp=rot(conj(q),sub(p,o)),hit=localDistance(s,lp);
  if(hit.d<best.d)best={...hit,n:rot(q,hit.n),shape:s};}
 return {...best,bodyPosition:cp.p};
}
// Lipschitz conservative advancement covers both a fast ball and a fast moving
// or rotating collider. Free motion is linear only inside a physics substep.
export function sweep(c,p,v,t,dt,r,stats){
 const speed=len(sub(v,c.v))+len(c.w)*c.bound;
 if(len(sub(p,pose(c,t).p))>r+c.bound+speed*dt+1e-5)return null;
 stats.candidates++;
 let u=0;
 for(let i=0;i<256;i++){
  stats.distanceQueries++;
  const at=add(p,mul(v,u)),h=distance(c,at,t+u),gap=h.d-r;
  const point=sub(at,mul(h.n,r)),surface=add(c.v,cross(c.w,sub(point,h.bodyPosition)));
  if(gap<=1e-6){
   if(dot(sub(v,surface),h.n)<-1e-7||gap< -1e-5)return {...h,time:u,point,surface,c};
   return null;
  }
  if(speed<1e-10)return null;
  u+=Math.max(1e-9,gap/speed*0.95);
  if(u>dt)return null;
 }
 stats.ccdExhausted++;
 // Explicit fail-closed: never silently advance through an unresolved sweep.
 throw Error(`CCD iteration budget exhausted: ${c.id}`);
}

import {dsin,dcos,dnorm} from '../physchar2/core/v2_math.js';
// Right-handed numeric coordinates: X pitch length, Y up, Z pitch width. SI units.
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const mul=(a,s)=>a.map(x=>x*s);
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const len=a=>dnorm(...a);
export const norm=(a,f=[1,0,0])=>len(a)>1e-14?mul(a,1/len(a)):f.slice();
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const conj=q=>[-q[0],-q[1],-q[2],q[3]];
export const qm=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-dot(a,b)];
export function rot(q,v){const t=mul(cross(q,v),2);return add(v,add(mul(t,q[3]),cross(q,t)));}
export function advanceQ(q,w,dt){const m=len(w),a=m*dt/2; if(m<1e-14)return q.slice();const s=dsin(a)/m;return norm4(qm([w[0]*s,w[1]*s,w[2]*s,dcos(a)],q));}
export const norm4=q=>{const m=dnorm(...q);return q.map(x=>x/m);};
export const finite3=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
export function closestTriangle(p,a,b,c){
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);
 if(d1<=0&&d2<=0)return a;
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;
 const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return add(a,mul(ab,d1/(d1-d3)));
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;
 const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return add(a,mul(ac,d2/(d2-d6)));
 const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0)return add(b,mul(sub(c,b),(d4-d3)/((d4-d3)+(d5-d6))));
 const den=1/(va+vb+vc);return add(a,add(mul(ab,vb*den),mul(ac,vc*den)));
}

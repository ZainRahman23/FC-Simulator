// Provisional four-dimensional Cross execution. The ideal is immutable.
// Errors live in delivery space; a contact-only inverse maps them to a physical
// launch. This avoids the directional mean shift caused by nonlinear propagation
// of zero-mean launch-angle/weight errors. No force or correction follows contact.
import {C,rad,deg,magnitude,rotate,launchVector,clamp} from './config.mjs';
import {makeWorld,blend} from './cross-physics.mjs';
import {atTime} from './flight-router.mjs';
export const CROSS_EXECUTION=Object.freeze({version:'cross-execution-v2',exponent:1.2,distanceReference:47.27272727272727,difficultyBase:.65,difficultySlope:.35,yawScale:14,yawBound:24,depthScale:.55,depthBound:.45,heightScale:1.3,heightBound:1,spinScale:.35,spinBound:.6,tolerance:.00002,maxIterations:16});
const encoder=new TextEncoder();
export async function crossDraws({seed,passerId='calibration-passer',drawEventId}){
 const result={contract:'cross-execution-v2',seed:String(seed),passerId,drawEventId:String(drawEventId),uniforms:{},z:{}};
 for(const [k,dimension] of Object.entries({direction:'AZIMUTH',weight:'DEPTH',elevation:'ELEVATION',spin:'SPIN'})){
  const pair=await Promise.all([0,1].map(async n=>{const key=JSON.stringify([String(seed),String(passerId),String(drawEventId),'cross-execution-v2',dimension,n]);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(key))),b=>b.toString(16).padStart(2,'0')).join('');return {key,hash,u:(parseInt(hash.slice(0,13),16)+.5)/2**52};}));
  result.uniforms[k]=pair;result.z[k]=Math.sqrt(6)*(pair[0].u-pair[1].u);
 }return result;
}
export function crossPrecision(rating,baseDifficulty,solved,redirect=0,motion=0){
 const c=CROSS_EXECUTION,d=solved.intent.distance,g=((99-rating)/89)**c.exponent,D=c.difficultyBase+c.difficultySlope*d/c.distanceReference+.25*(redirect/180)**2+.2*(motion/8.2)**2;
 return {model:'variation',rating,factor:g,ratingDifficulty:D,baseDifficulty,scales:{direction:c.yawScale*g*D,weight:c.depthScale*g*D,elevation:c.heightScale*g*D,spin:c.spinScale*g*D},floors:{direction:.018*baseDifficulty,weight:.0008*baseDifficulty*.6,elevation:rad(.012*baseDifficulty)*d*.65,spin:.0001},bounds:{direction:c.yawBound,weight:c.depthBound,elevation:c.heightBound,spin:c.spinBound},note:'Independent bounded delivery-space errors, inverse-calibrated before contact. Contact yaw/speed/pitch can couple physically; RNG dimensions do not.'};
}
export function crossErrors(sigma,z,distance,idealHeight){
 const e={};for(const k of ['direction','weight','elevation','spin'])e[k]=sigma.floors[k]*z[k]+sigma.bounds[k]*Math.tanh(sigma.scales[k]*z[k]/sigma.bounds[k]);
 // Symmetric height envelope stays above turf for every draw. Scaling is even
 // and deterministic, so it cannot introduce a preferred high/low miss.
 const maxH=sigma.floors.elevation*Math.sqrt(6)+sigma.bounds.elevation;
 const heightScale=Math.min(1,(idealHeight-C.radius-.04)/maxH);e.elevation*=heightScale;
 return {directionDeg:e.direction,depthFraction:e.weight,lateral:distance*Math.tan(rad(e.direction)),depth:distance*e.weight,height:e.elevation,spinFraction:e.spin,heightEnvelopeScale:heightScale};
}
function probe(action,time){
 const w=makeWorld(action);w.snapshot=()=>({time:w.time,p:w.ball.p.slice()});let prev=w.snapshot(),point=null;
 w.onSubstep=f=>{if(!point&&prev.time<=time&&f.time>=time)point={p:prev.p.map((x,k)=>x+(f.p[k]-x)*((time-prev.time)/(f.time-prev.time)))};prev=f;};
 while(!point&&w.time<time+C.dt)w.step();return point??w.snapshot();
}
function solve3(a,b){a=a.map((r,i)=>[...r,b[i]]);for(let c=0;c<3;c++){let n=c;for(let r=c+1;r<3;r++)if(Math.abs(a[r][c])>Math.abs(a[n][c]))n=r;[a[c],a[n]]=[a[n],a[c]];if(Math.abs(a[c][c])<1e-10)throw Error('Cross execution Jacobian singular');const v=a[c][c];for(let k=c;k<4;k++)a[c][k]/=v;for(let r=0;r<3;r++)if(r!==c){const x=a[r][c];for(let k=c;k<4;k++)a[r][k]-=x*a[c][k];}}return a.map(r=>r[3]);}
function solveDraw(solved,sigma,draws,errorScale=1,totals=null){
 const start=performance.now(),reference=atTime(solved.ideal.frames,solved.arrivalTime),raw=crossErrors(sigma,draws.z,solved.intent.distance,reference.p[1]),e=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,k==='heightEnvelopeScale'?v:v*errorScale])),yaw=rad(solved.intent.directYaw),u=[Math.cos(yaw),Math.sin(yaw)],sampledPoint=[reference.p[0]+e.depth*u[0]-e.lateral*u[1],reference.p[1]+e.height,reference.p[2]+e.depth*u[1]+e.lateral*u[0]],spinMagnitude=solved.solution.spin[1]*(1+e.spinFraction);
 const initialHorizontal=Math.hypot(solved.action.velocity[0],solved.action.velocity[2])*(1+e.depthFraction),initialVertical=solved.action.velocity[1];
 let params=[Math.hypot(initialHorizontal,initialVertical),deg(Math.atan2(initialVertical,initialHorizontal)),solved.yaw+e.directionDeg],count=0,iterations=0,retries=0,best=null;
 const actionFor=([speed,pitch,azimuth])=>({...solved.action,velocity:launchVector(speed,pitch,azimuth),spin:rotate([0,spinMagnitude,solved.solution.spin[2]],azimuth)});
 const evalAt=p=>{const action=actionFor(p),f=probe(action,solved.arrivalTime),r=f.p.map((x,k)=>x-sampledPoint[k]),norm=magnitude(r);count++;if(totals)totals.probes++;return {action,point:f.p,residual:r,norm,params:p.slice()};};
 // Seed horizontal and vertical velocity separately. Scaling total speed first
 // can put a short underhit below the required vertical speed, seed a grounded
 // probe and flatten the height Jacobian. This changes only the initial guess.
 let current=evalAt(params),jacobian=null;
 for(let n=0;n<CROSS_EXECUTION.maxIterations;n++){
  iterations++;if(totals)totals.iterations++;const a=current;if(!best||a.norm<best.norm)best=a;if(a.norm<CROSS_EXECUTION.tolerance)break;
  const freshJacobian=!jacobian;
  if(!jacobian){const eps=[.03,.03,.03],cols=eps.map((h,k)=>{const p=params.slice();p[k]+=h;const b=evalAt(p);return b.residual.map((v,j)=>(v-a.residual[j])/h);});jacobian=[0,1,2].map(j=>cols.map(c=>c[j]));}
  const step=solve3(jacobian,a.residual);let next=null;
  for(const factor of [1,.5,.25,.125]){const p=params.map((v,k)=>v-factor*step[k]);if(p[0]<=.5||p[0]>solved.ceiling||p[1]<=.05||p[1]>=85)continue;const b=evalAt(p);if(b.norm<a.norm){next=b;break;}}
  if(!next){if(!freshJacobian&&n<CROSS_EXECUTION.maxIterations-2){retries++;if(totals)totals.jacobianRefreshes++;jacobian=null;continue;}break;}
  const dx=next.params.map((v,k)=>v-params[k]),den=dx.reduce((s,x)=>s+x*x,0),dy=next.residual.map((v,k)=>v-a.residual[k]);
  if(den>1e-16)jacobian=jacobian.map((row,j)=>{const correction=dy[j]-row.reduce((s,v,k)=>s+v*dx[k],0);return row.map((v,k)=>v+correction*dx[k]/den);});
  params=next.params;current=next;if(next.norm<best.norm)best=next;
 }

 if(!best||best.norm>=.001)throw Error('UNRESOLVED Cross execution: '+(best?.norm??Infinity).toFixed(4)+' m residual; no clamped or retargeted substitute released');
 return {action:best.action,params:best.params,error:e,diagnostics:{sampledExecutionPoint:sampledPoint,idealReferencePoint:reference.p,actualProbePoint:best.point,residual:best.norm,candidates:count,iterations,candidateRetries:retries,fallback:false,cpuMs:performance.now()-start,referenceTime:solved.arrivalTime,spinMagnitude,method:'Independent zero-centred delivery errors → pre-contact physical inverse → one launch. Intended target unchanged.'}};
}

export function resolveCrossExecution(solved,sigma,draws){
 const start=performance.now(),totals={probes:0,iterations:0,jacobianRefreshes:0};
 const done=r=>{Object.assign(r.diagnostics,{totalProbes:totals.probes,totalIterations:totals.iterations,jacobianRefreshes:totals.jacobianRefreshes,cpuMs:performance.now()-start,limits:{iterationsPerSolve:16,pairAttempts:12,acceptanceMetres:.001,targetToleranceMetres:CROSS_EXECUTION.tolerance}});return r;};
 if(solved.intent.distance<55&&sigma.rating>=40){try{return done(solveDraw(solved,sigma,draws,1,totals));}catch(e){if(!e.message.startsWith('UNRESOLVED Cross execution'))throw e;}}
 // Near the launch ceiling, test both antipodal executions. If either is
 // physically infeasible, contract both by the same amount. The contraction
 // depends on the unordered {z,-z} pair, preserving oddness and zero mean.
 const opposite={...draws,z:Object.fromEntries(Object.entries(draws.z).map(([k,v])=>[k,-v]))};
 let attempts=0,totalCandidates=0,totalIterations=0,totalRetries=0;
 const pair=scale=>{attempts++;try{const a=solveDraw(solved,sigma,draws,scale,totals),b=solveDraw(solved,sigma,opposite,scale,totals);totalCandidates+=a.diagnostics.candidates+b.diagnostics.candidates;totalIterations+=a.diagnostics.iterations+b.diagnostics.iterations;totalRetries+=a.diagnostics.candidateRetries+b.diagnostics.candidateRetries;return {a,b};}catch(e){if(!e.message.startsWith('UNRESOLVED Cross execution'))throw e;return null;}};
 let scale=1,p=pair(scale);if(!p){let lo=0,hi=1;p=pair(0);if(!p)throw Error('UNRESOLVED Cross execution: ideal contact failed feasibility check');for(let n=0;n<9;n++){const mid=(lo+hi)/2,q=pair(mid);if(q){lo=mid;p=q;}else hi=mid;}scale=lo*.98;p=pair(scale);if(!p)throw Error('UNRESOLVED Cross execution: symmetric feasibility contraction failed');}
 p.a.diagnostics.feasibility={scale,paired:true,attempts,oppositeResidual:p.b.diagnostics.residual,oppositeSpeed:p.b.params[0]};Object.assign(p.a.diagnostics,{acceptedPairCandidates:totalCandidates,acceptedPairIterations:totalIterations,candidateRetries:attempts-1,fallback:scale<1,fallbackReason:scale<1?'Existing symmetric feasibility contraction at launch ceiling':null});p.a.diagnostics.cpuMs=performance.now()-start;return done(p.a);
}

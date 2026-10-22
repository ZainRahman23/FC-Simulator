// Visual calibration only. This file imports frozen gameplay modules read-only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const out=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(out,'../../work/touchline-ball-phys1');
const source=p=>path.join(repo,p);
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const roots=['sandbox/visual/shotcharge13/resolver.js','sandbox/visual/shotcharge13/config.js','sandbox/visual/shotcharge13/live.js','sandbox/visual/shotcharge13/worker.js','sandbox/visual/shotcharge13/experiments.js','sandbox/visual/ballfeel14/world.js','sandbox/visual/curve11/experiments.js','sandbox/visual/match.js'];
const protectedFiles=new Map();
function protect(p){
 if(protectedFiles.has(p)||!fs.existsSync(source(p)))return;
 const text=fs.readFileSync(source(p),'utf8');protectedFiles.set(p,digest(source(p)));
 for(const m of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))protect(path.normalize(path.join(path.dirname(p),m[1])));
}
roots.forEach(protect);
const initialGitStatus=execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'});
const {scheduledLaunch}=await import(pathToFileURL(source('sandbox/visual/shotcharge13/resolver.js')));
const {launchVector}=await import(pathToFileURL(source('sandbox/visual/shotcharge11/resolver.js')));
const {BallWorld}=await import(pathToFileURL(source('sandbox/visual/ballfeel14/world.js')));
const {SETUP}=await import(pathToFileURL(source('sandbox/visual/shotcharge13/config.js')));

// Read the current pitch markings rather than invent a second pitch definition.
const pitchSource=fs.readFileSync(source('sandbox/visual/match.js'),'utf8');
for(const needle of ['circlePts(94, 34, 9.15','105 - 16.5','34 - 20.16'])if(!pitchSource.includes(needle))throw Error('Pitch geometry source changed: '+needle);
const geometry={pitchLength:105,pitchWidth:68,goalX:SETUP.goalPlaneX,goalCentreZ:34,goalWidth:SETUP.goalWidth,goalHeight:SETUP.goalHeight,penaltyDepth:16.5,penaltyWidth:40.32,penaltySpotDistance:11,arcRadius:9.15,ballRadius:.11,source:'sandbox/visual/match.js:759–768; sandbox/visual/shotcharge1/config.js:5'};
const origin=[geometry.goalX-geometry.penaltySpotDistance-geometry.arcRadius,geometry.ballRadius,geometry.goalCentreZ];
// Target is a ball-centre point, 25 cm in from each nominal frame reference.
const target=[geometry.goalX,geometry.goalHeight-.25,geometry.goalCentreZ+geometry.goalWidth/2-.25];
const inside=origin[0]>=geometry.goalX-geometry.penaltyDepth&&origin[0]<=geometry.goalX&&Math.abs(origin[2]-geometry.goalCentreZ)<=geometry.penaltyWidth/2;
const player={id:'accuracy-visual-80',finishing:80,longShots:80,shotPower:80,curve:80,technique:80,weakFoot:80,preferredFoot:'R'};
const effectiveAccuracy=inside?player.finishing:.2*player.finishing+.8*player.longShots;
const yaw=Math.atan2(target[2]-origin[2],target[0]-origin[0])*180/Math.PI;
let projectionCalls=0;
function project(velocity,spin){
 projectionCalls++;
 const w=new BallWorld({p:origin.slice(),v:[0,0,0],w:[0,0,0],colliders:[],dt:SETUP.dt,substeps:SETUP.substeps});
 w.schedule({id:'projection-only',tick:0,position:origin.slice(),velocity:velocity.slice(),spin:spin.slice()});
 let prev=w.snapshot(),crossing=null,apex=origin[1],landed=false;
 w.onSubstep=f=>{
  apex=Math.max(apex,f.p[1]);
  if(!crossing&&prev.p[0]<geometry.goalX&&f.p[0]>=geometry.goalX){const u=(geometry.goalX-prev.p[0])/(f.p[0]-prev.p[0]);crossing={x:prev.p[2]+u*(f.p[2]-prev.p[2])-geometry.goalCentreZ,y:prev.p[1]+u*(f.p[1]-prev.p[1]),time:prev.time+u*(f.time-prev.time),apex};}
  prev=f;
 };
 for(let i=0;i<300&&!crossing;i++){w.step();if(w.events.some(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf'))landed=true;}
 if(!crossing||landed)throw Error('Projection must reach plane in its first free flight');
 return crossing;
}
function idealAt(holdMs){
 const action=scheduledLaunch({family:'LACES',shotPower:80,holdMs,actionId:'ideal-visual',attributes:player,aim:{yawDeg:yaw},context:{selectedFoot:'R',pressure:0,stamina:1,energy:1,bodySetup:1,executionQuality:1,startingVelocity:[0,0,0]}},{position:origin});
 return {action,plane:project(action.velocity,action.spin),holdMs};
}
// Choose an ordinary input on the unchanged charge curve that reaches the target.
let low=270,high=310;
const pLow=idealAt(low),pHigh=idealAt(high);
if(!(pLow.plane.y<target[1]&&pHigh.plane.y>target[1]))throw Error('Normal-charge interval does not bracket chosen corner');
let ideal;
for(let i=0;i<20;i++){ideal=idealAt((low+high)/2);if(ideal.plane.y<target[1])low=ideal.holdMs;else high=ideal.holdMs;}
ideal=idealAt((low+high)/2);
const a=ideal.action.metadata;
const sigmaBaseH=.2+2.8*((99-effectiveAccuracy)/98)**1.5;
const relativeSpeed=a.speed/a.capabilityCeiling;
const difficulty=1+.35*relativeSpeed**4;
const sigmaH=sigmaBaseH*difficulty,sigmaV=.6*sigmaH;
const Bx=Math.sqrt(6)*sigmaH,By=Math.sqrt(6)*sigmaV;
const field=(dh,dv)=>project(launchVector(a.speed,a.launchAngleDeg+dv,yaw+dh),ideal.action.spin);
const N=17,grid=[];
for(let j=0;j<N;j++){
 const row=[];
 for(let i=0;i<N;i++){const u=-1+2*i/(N-1),v=-1+2*j/(N-1);row.push({...field(u*Bx,v*By),u,v});}
 grid.push(row);
}
function interp(u,v){
 const gx=(u+1)*(N-1)/2,gy=(v+1)*(N-1)/2,i=Math.min(N-2,Math.max(0,Math.floor(gx))),j=Math.min(N-2,Math.max(0,Math.floor(gy))),s=gx-i,t=gy-j;
 const P=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]],weights=[(1-s)*(1-t),s*(1-t),s*t,(1-s)*t];
 return {x:P.reduce((r,p,k)=>r+weights[k]*p.x,0),y:P.reduce((r,p,k)=>r+weights[k]*p.y,0)};
}
const baseBound=[];
for(let edge=0;edge<4;edge++)for(let i=0;i<17;i++){
 const t=-1+2*i/16,u=edge===0?t:edge===1?1:edge===2?-t:-1,v=edge===0?-1:edge===1?t:edge===2?1:-t;
 baseBound.push(field(u*Bx/difficulty,v*By/difficulty));
}
const h=.001,jx0=field(-h,0),jx1=field(h,0),jy0=field(0,-h),jy1=field(0,h);
const J={xx:(jx1.x-jx0.x)/(2*h),yx:(jx1.y-jx0.y)/(2*h),xy:(jy1.x-jy0.x)/(2*h),yy:(jy1.y-jy0.y)/(2*h)};
const spatialSigma={horizontal:Math.hypot(J.xx*sigmaH,J.xy*sigmaV),vertical:Math.hypot(J.yx*sigmaH,J.yy*sigmaV),definition:'Local linearized spatial standard deviation including both angular axes; not an empirical sample.'};
const flat=grid.flat(),bounds={left:Math.min(...flat.map(p=>p.x)),right:Math.max(...flat.map(p=>p.x)),bottom:Math.min(...flat.map(p=>p.y)),top:Math.max(...flat.map(p=>p.y))};
const targetLocal={x:target[2]-geometry.goalCentreZ,y:target[1]};
const offsets={left:targetLocal.x-bounds.left,right:bounds.right-targetLocal.x,down:targetLocal.y-bounds.bottom,up:bounds.top-targetLocal.y};
// Fixed off-grid probes validate interpolation. These are not random shot samples.
let maxInterpolationError=0,minJacobian=Infinity,maxJacobian=-Infinity;
for(const [u,v] of [[-.93,-.73],[-.43,-.17],[.19,.57],[.81,.91],[-.79,.41],[.31,-.89],[.97,-.31],[.07,.03],[-.31,.99]]){
 const exact=field(u*Bx,v*By),p=interp(u,v);maxInterpolationError=Math.max(maxInterpolationError,Math.hypot(exact.x-p.x,exact.y-p.y));
}
for(let j=0;j<N-1;j++)for(let i=0;i<N-1;i++){
 const p=grid[j][i],q=grid[j][i+1],r=grid[j+1][i];
 const jac=((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x))/(2/(N-1))**2;
 minJacobian=Math.min(minJacobian,jac);maxJacobian=Math.max(maxJacobian,jac);
}
if(maxInterpolationError>.001)throw Error('Projection interpolation exceeds 1 mm');
if(minJacobian<=0)throw Error('Projected field folds');
if(Math.hypot(ideal.plane.x-targetLocal.x,ideal.plane.y-targetLocal.y)>.00001)throw Error('Ideal launch does not reach marked target');
const repeat=project(ideal.action.velocity,ideal.action.spin);
if(JSON.stringify(repeat)!==JSON.stringify(ideal.plane))throw Error('Projection is not deterministic');
// Probability of (1-|u|)(1-|v|) >= k under the product triangular law.
const massAt=k=>k===0?1:1-k*k+2*k*k*Math.log(k);
const contours=[.5,.9,.99].map(mass=>{let lo=0,hi=1;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(massAt(mid)>mass)lo=mid;else hi=mid;}return {mass,k:(lo+hi)/2};});
const preservation={protectedFileCount:protectedFiles.size,hashes:Object.fromEntries(protectedFiles),unchanged:[...protectedFiles].every(([p,h])=>digest(source(p))===h),gitStatusBefore:initialGitStatus,gitStatusAfter:execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'})};
if(!preservation.unchanged||preservation.gitStatusAfter!==initialGitStatus)throw Error('Frozen source changed');
const data={version:'SHOT-ACCURACY-1.0 · visual calibration only',geometry,origin,target,targetLocal,insidePenaltyArea:inside,player,effectiveAccuracy,
 distanceToGoalCentre:geometry.goalX-origin[0],groundDistanceToTarget:Math.hypot(target[0]-origin[0],target[2]-origin[2]),
 ideal:{holdMs:ideal.holdMs,speed:a.speed,capability:a.capabilityCeiling,relativeSpeed,yaw,elevation:a.launchAngleDeg,requestedApex:a.trajectoryProfile.desiredApex,plane:ideal.plane,velocity:ideal.action.velocity,spin:ideal.action.spin},
 dispersion:{sigmaBaseH,sigmaBaseV:.6*sigmaBaseH,difficulty,powerIncreasePercent:100*(difficulty-1),addedSigmaH:sigmaH-sigmaBaseH,addedSigmaV:sigmaV-.6*sigmaBaseH,sigmaH,sigmaV,maxH:Bx,maxV:By},
 spatialSigma,bounds,offsets,jacobian:J,grid,baseBound,contours,
 method:{kind:'Deterministic theoretical push-forward of independent bounded triangular angular errors',gridSize:N,projectionNodes:N*N,projectionCalls,maxInterpolationError,minJacobian,maxJacobian,randomDraws:0,monteCarlo:false,goalkeeper:false,colliders:false,density:'p_goal = ((1-|u|)(1-|v|)) / abs(det(d(goalX,goalY)/d(u,v))). u and v are angular errors normalized to their hard bounds.',contourMeaning:'50/90/99% exact angular probability sets, mapped to goal-plane space. Heat uses projected density per square metre; contours are not spatial iso-density contours.',boundMeaning:'Full rectangular support in angular-error coordinates mapped through frozen flight physics. Display uses a validated bilinear mesh; boundary is not a confidence ellipse.'},
 validation:{idealTargetError:Math.hypot(ideal.plane.x-targetLocal.x,ideal.plane.y-targetLocal.y),deterministic:true,meshUnfolded:minJacobian>0,frozenSourceUnchanged:preservation.unchanged,gitClean:preservation.gitStatusAfter===''},
 formula:{accuracy:'Inside actual penalty area: Finishing. Outside: 0.20 Finishing + 0.80 Long Shots. Boundary line counts inside.',base:'sigmaH0 = 0.20° + 2.80° × ((99 − effectiveAccuracy) / 98)^1.5; sigmaV0 = 0.60 sigmaH0',power:'r = requestedSpeed / capabilityCeiling; D = 1 + 0.35 r^4',final:'sigmaH = sigmaH0 × D; sigmaV = sigmaV0 × D',distribution:'epsilonAxis = sigmaAxis × sqrt(6) × (U1 − U2); independent axes; hard bound ±sqrt(6) sigmaAxis'}
};
fs.writeFileSync(path.join(out,'data.js'),'window.ACCURACY_VISUAL = '+JSON.stringify(data)+';\n');
fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({...data,grid:undefined,baseBound:undefined},null,2)+'\n');
fs.writeFileSync(path.join(out,'preservation.json'),JSON.stringify(preservation,null,2)+'\n');
console.log(JSON.stringify({...data,grid:undefined,baseBound:undefined,geometry:undefined,player:undefined,formula:undefined,method:data.method},null,2));

// Separate theoretical visualization only: frozen shot copied bit-for-bit from v1.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {dispersion,createField,sampleGrid,PRESETS} from './model.mjs';
const out=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(out,'../../work/touchline-ball-phys1');
const previous=JSON.parse(fs.readFileSync(path.join(out,'baseline-v1/measurements.json'))),preserved=JSON.parse(fs.readFileSync(path.join(out,'baseline-v1/preservation.json')));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function verifySources(){if(!Object.entries(preserved.hashes).every(([p,h])=>sha(path.join(repo,p))===h))throw Error('Frozen source modified');if(execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'})!==preserved.gitStatusBefore)throw Error('Gameplay git state changed');}
verifySources();
const {BallWorld}=await import(pathToFileURL(path.join(repo,'sandbox/visual/ballfeel14/world.js')));
const {launchVector}=await import(pathToFileURL(path.join(repo,'sandbox/visual/shotcharge11/resolver.js')));
let calls=0;
function project(eh,ev){
 calls++;
 const {ideal,origin,geometry}=previous;
 const w=new BallWorld({p:origin.slice(),v:[0,0,0],w:[0,0,0],colliders:[],dt:1/60,substeps:4});
 w.schedule({id:'accuracy-visual-projection',tick:0,position:origin.slice(),velocity:launchVector(ideal.speed,ideal.elevation+ev,ideal.yaw+eh),spin:ideal.spin.slice()});
 let prev=w.snapshot(),cross=null;
 w.onSubstep=f=>{if(!cross&&prev.p[0]<geometry.goalX&&f.p[0]>=geometry.goalX){const t=(geometry.goalX-prev.p[0])/(f.p[0]-prev.p[0]);cross={x:prev.p[2]+t*(f.p[2]-prev.p[2])-geometry.goalCentreZ,y:prev.p[1]+t*(f.p[1]-prev.p[1])};}prev=f;};
 for(let i=0;i<240&&!cross;i++)w.step();
 if(!cross||w.events.some(e=>e.kind==='PHYSICAL_CONTACT'))throw Error('Projection encountered a surface before the plane');
 return cross;
}
const domain=dispersion(1,previous.ideal.relativeSpeed),N=25,grid=[];
for(let j=0;j<N;j++){const row=[];for(let i=0;i<N;i++){const u=-1+2*i/(N-1),v=-1+2*j/(N-1);row.push({...project(u*domain.maxH,v*domain.maxV),u,v});}grid.push(row);}
const D={...previous,version:'SHOT-ACCURACY-1.0 · visual proposal 2',proposalStatus:'Unapproved calibration candidate',domain,grid,presets:PRESETS};
delete D.baseBound;
let maxInterpolationError=0,minJacobian=Infinity,maxJacobian=-Infinity;
for(const [u,v] of [[-.93,-.73],[-.43,-.17],[.19,.57],[.81,.91],[-.79,.41],[.31,-.89],[.97,-.31],[.07,.03],[-.31,.99]]){const exact=project(u*domain.maxH,v*domain.maxV),p=sampleGrid(D,u,v);maxInterpolationError=Math.max(maxInterpolationError,Math.hypot(exact.x-p.x,exact.y-p.y));}
for(let j=0;j<N-1;j++)for(let i=0;i<N-1;i++){const p=sampleGrid(D,-1+2*(i+.5)/(N-1),-1+2*(j+.5)/(N-1));minJacobian=Math.min(minJacobian,p.jac);maxJacobian=Math.max(maxJacobian,p.jac);}
if(maxInterpolationError>.001||minJacobian<=0)throw Error('Invalid theoretical projection mesh');
const comparisons=PRESETS.map(a=>createField(D,a).summary);
let maxPresetBoundError=0,precise99Error=0;
for(const a of PRESETS){const field=createField(D,a);for(const u of [-1,1])for(const v of [-1,1]){const exact=project(u*field.ds.maxH,v*field.ds.maxV),p=field.sample(u,v),error=Math.hypot(exact.x-p.x,exact.y-p.y);maxPresetBoundError=Math.max(maxPresetBoundError,error);if(a===99)precise99Error=Math.max(precise99Error,error);}}
if(maxPresetBoundError>.001||precise99Error>.0001)throw Error('Insufficient projection accuracy');
const selected=createField(D,80).summary,allRatings=Array.from({length:99},(_,i)=>createField(D,i+1).summary);
for(let i=1;i<allRatings.length;i++){if(allRatings[i].dispersion.sigmaH>=allRatings[i-1].dispersion.sigmaH)throw Error('Accuracy curve not monotone');}
const zero=project(0,0),repeat=project(0,0);
if(JSON.stringify(zero)!==JSON.stringify(repeat)||Math.hypot(zero.x-previous.targetLocal.x,zero.y-previous.targetLocal.y)>1e-7)throw Error('Frozen target changed');
Object.assign(D,{dispersion:selected.dispersion,spatialSigma:selected.spatialSigma,bounds:selected.bounds,offsets:selected.offsets,comparisons,allRatings,
 fullView:{xmin:-4.8,xmax:7.3,ymin:-.25,ymax:4.5},
 method:{...previous.method,gridSize:N,projectionNodes:N*N,projectionCalls:calls,maxInterpolationError,maxPresetBoundError,precise99Error,minJacobian,maxJacobian,randomDraws:0,monteCarlo:false,idealReSolved:false,projectionDomainAccuracy:1,allRatingsFirstFlight:true},
 validation:{...previous.validation,deterministic:true,frozenIdealIdentical:JSON.stringify(D.ideal)===JSON.stringify(previous.ideal),fixedOriginAndTarget:JSON.stringify(D.origin)===JSON.stringify(previous.origin)&&JSON.stringify(D.target)===JSON.stringify(previous.target),monotoneAll99Ratings:true,nonzeroFloor:dispersion(99,D.ideal.relativeSpeed).sigmaH>0,fullViewContainsAllBounds:allRatings.every(r=>r.bounds.left>=-4.8&&r.bounds.right<=7.3&&r.bounds.bottom>=-.25&&r.bounds.top<=4.5)},
 formula:{...previous.formula,base:'x = 99 − effectiveAccuracy; sigmaH0 = 0.02° + 4.00° × x² / (x² + 45²); sigmaV0 = 0.60 sigmaH0',power:'r = requestedSpeed / capabilityCeiling; D = 1 + 0.10 r^4'},
 candidateRationale:'Quadratic growth near 99 separates pinpoint from excellent execution. The rational denominator gently limits growth at very low ratings, retaining a finite football-scale envelope across 1–99. Floor 0.02°, scale 4.00° and half-rise deficit 45 are provisional visual-calibration constants.'});
if(!Object.values(D.validation).every(Boolean))throw Error('Validation failed');
verifySources();
fs.writeFileSync(path.join(out,'data.js'),'window.ACCURACY_VISUAL = '+JSON.stringify(D)+';\n');
fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({...D,grid:undefined,allRatings:undefined},null,2)+'\n');
fs.writeFileSync(path.join(out,'model-validation.json'),JSON.stringify({status:'PASS',validation:D.validation,method:D.method,protectedFileCount:Object.keys(preserved.hashes).length},null,2)+'\n');
console.log(JSON.stringify({difficulty:selected.dispersion.difficulty,method:D.method,comparisons:comparisons.map(r=>({accuracy:r.accuracy,base:r.dispersion.sigmaBaseH,finalH:r.dispersion.sigmaH,finalV:r.dispersion.sigmaV,sigmaCm:[100*r.spatialSigma.horizontal,100*r.spatialSigma.vertical],maxDeviation:[r.maxHorizontalDeviation,r.maxVerticalDeviation],extent:r.extent})),validation:D.validation},null,2));

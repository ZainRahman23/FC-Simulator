import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {TARGET_ASSISTANCE,corridorWidth,preferredDepth,selectPassTarget,assistInput} from '../passing/target-assistance.mjs';
import {assistanceFixture} from '../passing/assist-fixtures.mjs';import {selectionMap} from '../passing/selection-map.mjs';
import * as now from '../passing/pass-router.mjs';import * as old from './baseline/pass-router.mjs';
import {fixture} from '../passing-attributes-5/common.mjs';import {simulate} from '../passing/flight-router.mjs';
const checks=[],check=(name,value)=>{assert.ok(value,name);checks.push(name);},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),three=[],diagonal=[],boundaries=[],capability=[],stability=[],maps=[],physical=[],sameTarget=[],widths=[];
const action=a=>({position:a.position,velocity:a.velocity,spin:a.spin,metadata:a.metadata}),point=(d,a)=>[20+d*Math.cos(a*Math.PI/180),.11,34+d*Math.sin(a*Math.PI/180)];
for(const family of ['SHORT','CROSS']){
 const c=TARGET_ASSISTANCE[family],full=c.fullHoldMs;
 for(const d of [1,5,10,20,30,40,60,90]){const w=corridorWidth(family,d),oldW=(family==='SHORT'?3:4.5)*(-Math.expm1(-d/c.distanceScale));check('Exact doubled width '+family+d,w===2*oldW);widths.push({family,d,old:oldW,new:w});}
 let prev=0;for(let ms=0;ms<=full;ms++){const p=preferredDepth(family,ms).preferred;assert.ok(ms===0||p>prev);prev=p;}check('Strictly continuous monotone depth samples '+family,true);check('No hold overflow '+family,preferredDepth(family,full+100).preferred===c.depthFar);
 for(const q of [0,.5,1]){const hold=full*q,a=selectPassTarget(assistanceFixture(family,'three',0,40,hold)),want=['A','B','C'][q*2];check('Required three-depth '+family+q,a.selectedId===want);three.push({family,hold,preferred:a.depth.preferred,selected:a.selectedId});}
 for(const [angle,q,want] of [[0,0,'A'],[0,1,'B'],[12,1,'C']]){const hold=full*q,a=selectPassTarget(assistanceFixture(family,'diagonal',angle,40,hold));check('Diagonal conflict '+family+angle+q,a.selectedId===want);diagonal.push({family,angle,hold,preferred:a.depth.preferred,selected:a.selectedId});}
 const d=family==='SHORT'?20:40,w=corridorWidth(family,d),angle=Math.asin(w/d)*180/Math.PI,cases=[];
 for(const offset of [-.01,0,.01,30-angle]){const i=assistanceFixture(family,'one',angle+offset,d,full);i.candidates=[{id:'A',position:[20+d,.11,34],velocity:[0,0,0]}];i.receiver=i.candidates[0];i.assistancePreviousId='A';const a=selectPassTarget(i),selected=a.selectedId??'MANUAL';cases.push({angle:angle+offset,selected});check('Manual boundary '+family+offset,selected===(offset<=0?'A':'MANUAL'));}
 boundaries.push({family,distance:d,angle,oldAngle:Math.asin(w/2/d)*180/Math.PI,cases});
 // Selection is independent of every player attribute, including in charge-target mode.
 for(const mode of ['point','charge'])for(const hold of [0,full/2,full]){
  const i=assistanceFixture(family,'line',0,40,hold);i.manualTargetMode=mode;const a=selectPassTarget(i);
  for(const sp of [20,40,60,99])for(const rating of [1,60,99]){const j=structuredClone(i);j.attributes={shot_power:sp,short_passing:rating,long_passing:rating,crossing:rating,vision:rating,curve:rating};const b=selectPassTarget(j);check('Attribute-independent intent '+family+mode+hold+sp+rating,a.selectedId===b.selectedId&&same(a.depth,b.depth)&&same(a.candidates,b.candidates));}
 }
 for(const scenario of ['line','crossline','diagonal','crowded','manual'])for(const hold of [0,full/2,full]){const i=assistanceFixture(family,scenario,0,40,hold),a=selectPassTarget(i),b=selectPassTarget({...i,candidates:i.candidates.slice().reverse()});check('Order-independent '+family+scenario+hold,a.selectedId===b.selectedId);check('Deterministic selector '+family+scenario+hold,same(a,selectPassTarget(i)));}
 // Find the smooth A/B score crossing, then jitter around it with memory.
 let low=0,high=full;for(let n=0;n<45;n++){const hold=(low+high)/2,a=selectPassTarget(assistanceFixture(family,'three',0,40,hold)),[A,B]=a.candidates;if(A.score<B.score)low=hold;else high=hold;}const at=(low+high)/2;
 let previousId='A',holdIds=[];for(let n=0;n<200;n++){const i=assistanceFixture(family,'three',0,40,at+(n%2?-.2:.2));i.assistancePreviousId=previousId;previousId=selectPassTarget(i).selectedId;holdIds.push(previousId);}
 const countChanges=ids=>ids.slice(1).filter((v,k)=>v!==ids[k]).length;
 check('Hold jitter stable '+family,countChanges(holdIds)===0);let aimIds=[];previousId='A';for(let n=0;n<200;n++){const i=assistanceFixture(family,'between',(n%2?-.01:.01),40,full/2);i.assistancePreviousId=previousId;previousId=selectPassTarget(i).selectedId;aimIds.push(previousId);}check('Aim jitter stable '+family,countChanges(aimIds)===0);
 const long=assistanceFixture(family,'three',0,40,full);long.assistancePreviousId='A';check('Responsive genuine depth change '+family,selectPassTarget(long).selectedId==='C');
 function sweep(reverse=false){let previousId=null;const rows=[];for(let n=0;n<=full;n++){const hold=reverse?full-n:n,i=assistanceFixture(family,'line',0,40,hold);i.assistancePreviousId=previousId;const a=selectPassTarget(i);previousId=a.selectedId;rows.push({hold,selected:a.selectedId});}return rows;}
 const forward=sweep(),back=sweep(true),transitions=xs=>xs.filter((v,n)=>n===0||v.selected!==xs[n-1].selected);check('Hold sweep deterministic '+family,same(forward,sweep()));check('All crowded-line depths reachable '+family,same([...new Set(forward.map(x=>x.selected))],['A','B','C','D']));
 stability.push({family,scoreCrossingHold:at,holdJitterChanges:countChanges(holdIds),aimJitterChanges:countChanges(aimIds),forwardTransitions:transitions(forward),reverseTransitions:transitions(back)});
 for(const scenario of ['line','diagonal',...(family==='CROSS'?['crossline']:[])]){
  const m=selectionMap(family,scenario),again=selectionMap(family,scenario),seen=new Uint8Array(m.cells.length),components=[];
  check('2D map determinism '+family+scenario,same(m,again));
  for(let start=0;start<m.cells.length;start++){if(seen[start]||m.cells[start]===0)continue;const pending=[start];seen[start]=1;let size=0;while(pending.length){const j=pending.pop(),x=j%m.columns,y=Math.floor(j/m.columns);size++;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,k=ny*m.columns+nx;if(nx>=0&&ny>=0&&nx<m.columns&&ny<m.rows&&!seen[k]&&m.cells[k]===m.cells[j]){seen[k]=1;pending.push(k);}}}components.push({id:m.ids[m.cells[start]],size});}
  const tinyIslands=components.filter(c=>c.size<12).length;check('No fragile map islands '+family+scenario,tinyIslands===0);maps.push({family,scenario,samples:m.cells.length,components,tinyIslands,sha256:crypto.createHash('sha256').update(JSON.stringify(m.cells)).digest('hex')});
  fs.writeFileSync(new URL('map-'+family.toLowerCase()+'-'+scenario+'.json',import.meta.url),JSON.stringify(m));
 }
}
// Compare execution against the prior physical system with exactly the same inferred intent.
for(const family of ['SHORT','CROSS'])for(const scenario of ['three','line','diagonal','manual'])for(const q of [0,.5,1])for(const rating of [60,99]){
 const i=assistanceFixture(family,scenario,scenario==='manual'?30:0,40,q*TARGET_ASSISTANCE[family].fullHoldMs);i.attributes[family==='SHORT'?'short_passing':'crossing']=rating;i.drawEventId='depth9-'+family+'-'+scenario+'-'+(q*100)+'-'+rating;
 const resolved=assistInput(i).input,p=await now.preparePass(i),b=await old.preparePass(resolved);
 check('No physical retune '+i.drawEventId,same(action(p.idealAction),action(b.idealAction))&&same(p.ideal,b.ideal));check('Unchanged accuracy and draws '+i.drawEventId,same(p.audit.sigma,b.audit.sigma)&&same(p.audit.draws,b.audit.draws)&&same(action(p.actualAction),action(b.actualAction)));
 const actual=simulate(p.actualAction,p.target,p.arrivalTime),repeated=await now.preparePass(i);check('One launch deterministic '+i.drawEventId,actual.launchCount===1&&same(p.actualAction,repeated.actualAction));physical.push({family,scenario,hold:i.holdMs,rating,selected:p.audit.targetAssistance.selectedId,solverValid:p.audit.solver.valid,physicalMiss:now.measurements(p,actual).physicalMiss});
}
// Cross holds selecting the same receiver produce one unchanged delivery, not another range scale.
for(const family of ['SHORT','CROSS']){
 const rows=[];for(const hold of [0,TARGET_ASSISTANCE[family].fullHoldMs/2,TARGET_ASSISTANCE[family].fullHoldMs]){const i=assistanceFixture(family,'one',3,40,hold),p=await now.preparePass(i);rows.push({hold,selected:p.audit.targetAssistance.selectedId,target:p.target,launch:action(p.idealAction),desiredArrival:p.audit.desiredArrivalSpeed});}
 if(family==='CROSS')check('Cross not double-scaled',rows.every(r=>same(r.launch,rows[0].launch)&&same(r.target,rows[0].target)));
 else check('Short original pace preserved',rows[0].desiredArrival===8&&rows[2].desiredArrival>rows[0].desiredArrival&&rows.every(r=>same(r.target,rows[0].target)));
 sameTarget.push({family,rows});
}
for(const sp of [40,60,80,99]){const i=assistanceFixture('CROSS','capability',0,70,550);i.attributes.shot_power=sp;i.manualTargetMode='charge';const p=await now.preparePass(i),cap=p.audit.capability;check('Far intent survives SP cap '+sp,p.audit.targetAssistance.selectedId==='C'&&cap.requestedRange===45);capability.push({sp,selected:'C',requested:cap.requestedRange,maximum:cap.physicalMaxRange,resolved:cap.resolvedRange,shortfall:cap.shortfall,launch:p.idealAction});}
for(const sp of [40,60,99])for(const d of [20,30,50]){const i=fixture('THROUGH',d,60,75);i.requestedDistance=d;i.attributes.shot_power=sp;i.targetAssistance=true;const a=await now.preparePass(i),b=await old.preparePass(i);check('Through byte-equivalent '+sp+d,same(a.actualAction,b.actualAction)&&same(a.ideal,b.ideal)&&same(a.audit.sigma,b.audit.sigma)&&same(a.audit.draws,b.audit.draws)&&!a.audit.targetAssistance);}
const i=assistanceFixture('CROSS','crowded',0,40,275),N=10000,t=performance.now();for(let n=0;n<N;n++)selectPassTarget(i);const microseconds=(performance.now()-t)*1000/N;
// Every original delivery, accuracy, random and physics file remains byte-for-byte untouched.
const allowed=new Set(['app.js','index.html','style.css','scene.mjs','pass-router.mjs','worker.js','target-assistance.mjs','assist-fixtures.mjs','assist-view.mjs']),baseline=new URL('baseline/',import.meta.url),root=new URL('../passing/',import.meta.url);let preserved=0;
function walk(dir,prefix=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const name=prefix+e.name;if(e.isDirectory())walk(new URL(e.name+'/',dir),name+'/');else if(!allowed.has(name)){check('Delivery module unchanged '+name,fs.readFileSync(new URL(name,baseline)).equals(fs.readFileSync(new URL(name,root))));preserved++;}}}walk(baseline);
const data={constants:TARGET_ASSISTANCE,checks:{passed:checks.length,failed:0,list:checks},three,diagonal,boundaries,capability,stability,maps,physical,sameTarget,widths,performance:{microseconds},deliveryFilesUnchanged:preserved};fs.writeFileSync(new URL('data.json',import.meta.url),JSON.stringify(data));console.log(JSON.stringify({checks:data.checks.passed,three,diagonal,boundaries,capability,stability,maps,performance:data.performance,deliveryFilesUnchanged:preserved},null,2));

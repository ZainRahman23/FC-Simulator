import {SETUP,OVERCHARGE,CHARGE} from './config.js';
import {createTapAudit} from './tap-audit.js';
import {behindSVG} from './render.js';
import {attachInput} from './input.js';
import {physicalOutcome,chargeState} from './outcome.js';
const $=id=>document.getElementById(id),scene=$('scene'),shoot=$('shoot'),rating=$('rating'),status=$('status');
const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
const idle={initial:{p:SETUP.origin},frames:[{time:0,p:SETUP.origin,q:[0,0,0,1]}],metrics:{desiredApex:.32},shotPower:80,holdMs:0};
let token=0,mode='idle',run=null,replayStart=0,pressStart=0,latchedPower=80,inputRecord=null,lastDraw=-Infinity,history=[];
const completed=new Set(),pending=new Map();
const tapAudit=createTapAudit();
const f=(v,n=2)=>v===null||v===undefined?'—':Number(v).toFixed(n);
const draw=(r,t)=>{scene.innerHTML=behindSVG(r,t,{label:false});};
function clearMeter(){$('useful-fill').style.width='0%';$('over-fill').style.width='0%';shoot.classList.remove('holding','overcharged');$('over-label').textContent='OVERCHARGE';}
function ready(){mode='idle';run=null;rating.disabled=false;clearMeter();draw(idle,0);status.textContent='Hold Space or the button. Release to shoot.';}
function reset(){token++;controller.cancel();ready();}
function historyView(){
 $('history-count').textContent=history.length;
 $('history-body').innerHTML=history.map(r=>`<tr><td>${f(r.holdMs,1)} ms</td><td>${r.shotPower}</td><td>${f(r.metrics?.launchSpeed)} m/s</td><td>${f(r.metrics?.apexHeight)} m</td><td>${physicalOutcome(r)}</td></tr>`).join('');
}
function readout(r){
 const m=r.metrics,rawCharge=Math.max(0,(r.holdMs-CHARGE.tapFloorEndMs)/(CHARGE.fullHoldMs-CHARGE.tapFloorEndMs))*100;
 const fields=[['Hold',`${f(r.holdMs,1)} ms`],['Shot Power',r.shotPower],['Charge',`${f(rawCharge,1)}%`],['State',chargeState(r.holdMs)],['Result',physicalOutcome(r)],['Launch speed',`${f(m?.launchSpeed,3)} m/s`],['Launch angle',`${f(m?.launchAngleDeg,2)}°`],['Actual apex',`${f(m?.apexHeight,3)} m`],['Goal-plane height',m?.goalPlane?`${f(m.goalPlane.height,3)} m`:'Not reached']];
 $('readout').innerHTML='<div class="readout-grid">'+fields.map(([k,v])=>`<div><small>${k}</small><strong class="${k==='Result'?'result':''}">${v}</strong></div>`).join('')+'</div>';
 // Exact unrounded values are exposed as read-only DOM evidence for the input audit.
 Object.assign($('readout').dataset,{holdMs:String(r.holdMs),forwardedHoldMs:String(m?.launch.holdMs??r.holdMs),shotPower:String(r.shotPower),inputKind:inputRecord.kind,pressTime:String(inputRecord.pressTime),releaseTime:String(inputRecord.releaseTime),requestedApex:String(m?.desiredApex??''),speed:String(m?.launchSpeed??''),result:physicalOutcome(r)});
}
const controller=attachInput({keyboard:window,pointer:shoot,cancelTarget:window,
 onStart(press){token++;mode='charging';pressStart=press.start;latchedPower=Number(rating.value);rating.disabled=true;run=null;draw(idle,0);shoot.classList.add('holding');status.textContent='Charging… release to shoot.';},
 onRelease(record){inputRecord=record;pending.set(token,{record,manualId:tapAudit.record(record,latchedPower)});mode='resolving';rating.disabled=false;shoot.classList.remove('holding');$('over-label').textContent=record.holdMs>OVERCHARGE.startMs?'OVERCHARGED':'OVERCHARGE';status.textContent='Resolving your shot…';worker.postMessage({token,holdMs:record.holdMs,shotPower:latchedPower});},
 onCancel(){ready();}
});
worker.onmessage=({data})=>{
 const entry=pending.get(data.token);pending.delete(data.token);if(entry)tapAudit.resolve(entry.manualId,data);
 if(data.token!==token)return;
 if(data.error){ready();status.textContent=`Shot could not resolve: ${data.error}`;return;}
 run=data.run;readout(run);history.unshift(run);history=history.slice(0,10);historyView();
 completed.forEach(fn=>fn({run,record:{...inputRecord}}));
 mode='replay';replayStart=performance.now();status.textContent=`${physicalOutcome(run)} · 1× playback`;
};
worker.onerror=e=>{ready();status.textContent='The shot resolver failed to load. Reload this page.';console.error(e.message);};
$('reset').addEventListener('click',reset);
$('clear').addEventListener('click',()=>{history=[];historyView();});
$('fullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();else document.querySelector('.play').requestFullscreen();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)controller.cancel();});
shoot.addEventListener('contextmenu',e=>e.preventDefault());
function animate(now){
 if(mode==='charging'){
  const held=now-pressStart,extra=Math.max(0,held-OVERCHARGE.startMs);
  $('useful-fill').style.width=`${Math.min(1,held/OVERCHARGE.startMs)*100}%`;
  // This meter is only elapsed-time feedback; the worker alone resolves trajectory.
  $('over-fill').style.width=`${100*(-Math.expm1(-(extra/OVERCHARGE.scaleMs)))}%`;
  shoot.classList.toggle('overcharged',extra>0);$('over-label').textContent=extra>0?'OVERCHARGING':'OVERCHARGE';
  status.textContent=extra>0?'Overcharging… release to shoot.':'Charging… release to shoot.';
 }else if(mode==='replay'){
  const t=(now-replayStart)/1000;
  if(now-lastDraw>=1000/65){draw(run,Math.min(t,run.duration));lastDraw=now;}
  if(t>=run.duration+.45)ready();
 }
 requestAnimationFrame(animate);
}
ready();requestAnimationFrame(animate);
// This diagnostic page mode is not part of owner controls. It exercises the actual
// DOM handlers with timed synthetic events and the real worker, never an alternate solve.
if(new URLSearchParams(location.search).has('test')){
 $('test-panel').hidden=false;
 $('run-checks').addEventListener('click',async()=>{
  $('run-checks').disabled=true;const results=[];let liveOvercharge=false;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  try{
   for(const c of [{kind:'keyboard',ms:5,sp:80},{kind:'pointer',ms:20,sp:80},{kind:'keyboard',ms:173,sp:80},{kind:'pointer',ms:700,sp:80},...[50,70,80,90,99].map(sp=>({kind:'keyboard',ms:200,sp}))]){
    reset();rating.value=String(c.sp);
    let timeout;
    const result=new Promise((resolve,reject)=>{const listener=value=>{completed.delete(listener);clearTimeout(timeout);resolve(value);};completed.add(listener);timeout=setTimeout(()=>{completed.delete(listener);reject(Error('Resolver response timeout'));},10000);});
    if(c.kind==='keyboard')window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true,cancelable:true}));else shoot.dispatchEvent(new PointerEvent('pointerdown',{pointerId:91,button:0,bubbles:true,cancelable:true}));
    if(c.ms>OVERCHARGE.startMs){await wait(OVERCHARGE.startMs+40);liveOvercharge=Number.parseFloat($('over-fill').style.width)>0&&mode==='charging'&&shoot.classList.contains('overcharged');await wait(c.ms-OVERCHARGE.startMs-40);}else await wait(c.ms);
    if(c.kind==='keyboard')window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true,cancelable:true}));else shoot.dispatchEvent(new PointerEvent('pointerup',{pointerId:91,button:0,bubbles:true,cancelable:true}));
    const {run:r,record}=await result,forwarded=r.metrics.launch.holdMs;
    assert(r.holdMs===record.releaseTime-record.pressTime&&r.holdMs===forwarded,'Measured duration was changed');
    assert(r.shotPower===c.sp&&r.registered,'Wrong rating / unregistered');
    assert(Math.abs(r.holdMs-c.ms)<150,'Timer drift outside test allowance');
    if(c.ms===700)assert(r.metrics.desiredApex>6.4&&r.metrics.launchSpeed===r.metrics.capabilityCeiling,'Overcharge inactive / speed exceeded');
    if(c.ms<=20)assert(r.metrics.launch.requestedSpeedFraction===.4&&Math.abs(r.metrics.apexHeight-.32)<1e-6,'Quick tap did not preserve weak floor');
    results.push({input:c.kind,requestedTimerMs:c.ms,measuredHoldMs:r.holdMs,forwardedHoldMs:forwarded,shotPower:r.shotPower,apex:r.metrics.apexHeight,speed:r.metrics.launchSpeed,physicalResult:physicalOutcome(r),exactForwarding:true});
   }
   assert(liveOvercharge,'Meter did not continue while holding');
   reset();rating.value='80';history=[];historyView();
   $('test-result').textContent=JSON.stringify({pass:true,scope:'Timed synthetic DOM keyboard/pointer events; actual monotonic input clock, event handlers, worker and physical resolver. Not a hardware input timing claim.',liveOvercharge,ratings:[50,70,80,90,99],cases:results},null,2);
  }catch(error){$('test-result').textContent=JSON.stringify({pass:false,error:error.message,cases:results},null,2);}
  $('run-checks').disabled=false;
 });
}

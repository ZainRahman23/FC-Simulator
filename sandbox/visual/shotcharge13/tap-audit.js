import {CANDIDATE} from './config.js';
// Owner-initiated manual capture is kept separate from automated test evidence.
// Stored only in this browser's local storage; all timings remain unrounded.
export function createTapAudit(){
 if(new URLSearchParams(location.search).has('test'))return {record:()=>null,resolve:()=>{}};
 const key='SHOT-CHARGE-1.3-manual-taps',el=id=>document.getElementById(id);
 let sample=null;try{sample=JSON.parse(localStorage.getItem(key)||'null');}catch{}
 function save(){
  try{localStorage.setItem(key,JSON.stringify(sample));}catch{}
  el('tap-records').textContent=JSON.stringify(sample,null,2);
  if(!sample){el('tap-summary').textContent='No manual sample recorded.';return;}
  const rs=sample.records,keyboard=rs.filter(r=>r.kind==='keyboard').length,pointer=rs.filter(r=>r.kind==='pointer').length;
  const range=rs.length?`${Math.min(...rs.map(r=>r.holdMs)).toFixed(1)}–${Math.max(...rs.map(r=>r.holdMs)).toFixed(1)} ms`:'—';
  el('tap-summary').textContent=`${sample.active?'Recording':'Finished'} · ${keyboard} Space / ${pointer} pointer taps · ${range} · ${rs.filter(r=>r.registered).length}/${rs.length} shots resolved`;
 }
 el('start-taps').addEventListener('click',()=>{sample={candidate:CANDIDATE,sessionId:Date.now(),active:true,provenance:'Owner-initiated manual capture; not an automated calibration sample',startedAt:new Date().toISOString(),records:[]};save();});
 el('finish-taps').addEventListener('click',()=>{if(sample){sample.active=false;sample.finishedAt=new Date().toISOString();save();}});
 save();
 return {
  record(record,shotPower){
   if(!sample?.active)return null;
   const id=`${sample.sessionId}-${sample.records.length}`;
   sample.records.push({id,...record,shotPower,registered:null});save();return id;
  },
  resolve(id,data){
   if(!id||!sample)return;const row=sample.records.find(r=>r.id===id);if(!row)return;
   const r=data.run;Object.assign(row,{registered:!!r?.registered,error:data.error??null,forwardedHoldMs:r?.metrics?.launch.holdMs??null,speed:r?.metrics?.launchSpeed??null,speedFraction:r?.metrics?.launch.requestedSpeedFraction??null,requestedApex:r?.metrics?.desiredApex??null,actualApex:r?.metrics?.apexHeight??null});save();
  }
 };
}

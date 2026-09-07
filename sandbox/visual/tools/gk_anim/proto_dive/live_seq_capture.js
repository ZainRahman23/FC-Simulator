// FREE-PLAY HUNT on the plain default page: emulates what a player does — teleport-dribble to a spot, face a point in the goal, hold a
// kick key (z / 1-5) and release it (ptChargeBegin/ptChargeRelease → ptKick, the exact keyboard path), optionally keep running after the
// shot — with ONE continuous keeper (never reset between shots), a seeded sequence so BEFORE/AFTER runs are identical. For every airborne
// dive the live overlay (S.dbg.anim) frame is captured at mid-action and the full selector readout is recorded.
//   node live_freeplay_hunt.js <outdir> [shots] [seed]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"freeplay"; const N=+(process.argv[3]||360); const SEED=+(process.argv[4]||7); const LEFT_FRAC=+(process.argv[5]||0.7); const REC=new Set((process.argv[6]||"").split(",").filter(Boolean).map(Number)); const OFF=process.argv.includes("--off"); fs.mkdirSync(OUT,{recursive:true});
let s=SEED; const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; }; const pick=a=>a[Math.floor(rnd()*a.length)];
const XS=[82,86,90,94,98,101], YS=[20,24,28,31,34,37,40,44,48];
const AIM_LEFT=[35.4,36.3,37.0,37.5], AIM_RIGHT=[30.5,31.0,31.8,32.6];        // keeper's LEFT = south (larger y) for a west-facing keeper
const KEYS=[{k:"z",c:[0.4,1.0]},{k:"3",c:[0.5,1.0]},{k:"2",c:[0.6,1.0]},{k:"5",c:[0.5,0.9]},{k:"1",c:[0.7,1.0]},{k:"z",c:[0.7,1.0]}];
const SHOTS=[];
for(let i=0;i<N;i++){ const left=rnd()<LEFT_FRAC; const key=pick(KEYS); const c=key.c[0]+rnd()*(key.c[1]-key.c[0]);
  SHOTS.push({i, origin:[pick(XS),pick(YS)], aim:[105, pick(left?AIM_LEFT:AIM_RIGHT)], key:key.k, c:+c.toFixed(3), settle:rnd()<0.75?120:30, run:pick(["none","none","goal","side"]), wantSide:left?"LEFT":"RIGHT"}); }
let b=null, p=null, restarts=0;
async function openPage(){ if(b){ try{ await b.close(); }catch(e){} } b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-fp-"+Date.now()+"-"+restarts,args:["--no-sandbox"]});
  p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1}); p.on("error",e=>console.log("PAGE CRASH:",String(e).slice(0,80)));
  await p.goto((process.env.GK_PAGE||"http://127.0.0.1:8126/sandbox/visual/match.html")+"?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
  for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
  await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.pauseAtContact=false; S.pt.slow=1; });
  await new Promise(r=>setTimeout(r,300)); await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}}); }
(async()=>{await openPage(); await p.evaluate((off)=>{ GK_ANIM.sequences=!off; }, OFF);
const rec=[];
for(const sh of SHOTS){
 if(sh.i>0 && sh.i%90===0){ restarts++; await openPage(); await p.evaluate((off)=>{ GK_ANIM.sequences=!off; }, OFF); sh.pageReloaded=true; }
 const record=REC.has(sh.i);
 try {
  const st=await p.evaluate((sh)=>{ const t=S.pt, A=S.gkAnim; const tm=KICK_CHARGE.timing[ptKickSpec(sh.key,t).chargeFam]||KICK_CHARGE.timing.LACES;
    const holdMs=Math.max(0,(sh.c-tm.bias)*tm.ms); const holdTicks=Math.round(holdMs/1000*60);
    const fac=Math.atan2(sh.aim[1]-sh.origin[1], sh.aim[0]-sh.origin[0]);
    t.keys={}; t.charge=null; if(t.kick && t.kick.kicked===false) t.kick=null;
    t.p={x:sh.origin[0], y:sh.origin[1], vx:0, vy:0, facing:fac, touchT:t.now};
    t.b={x:sh.origin[0]+Math.cos(fac)*0.3, y:sh.origin[1]+Math.sin(fac)*0.3, z:0, vx:0, vy:0, vz:0, ctrl:true, exclT:0};
    for(let k=0;k<sh.settle;k++){ ptStep(); gkAnimDraw(t,t.gk,1/60); }
    if(!t.b.ctrl || t.kick) return {skipped:"no control/kick busy"};
    ptChargeBegin(t, sh.key, ptKickSpec(sh.key,t)); for(let k=0;k<holdTicks;k++){ ptStep(); gkAnimDraw(t,t.gk,1/60); }
    ptChargeRelease(t, sh.key);
    if(!t.kick) return {skipped:"kick not scheduled"};
    if(sh.run==="goal") t.keys={right:true}; else if(sh.run==="side") t.keys={down:true};
    return {phase:"armed", kickInfo:t.kickInfo}; }, sh);
  if(st.skipped){ rec.push({...sh, ...st}); continue; }
  // run the shot tick by tick; record frames for the selected shots from the kick until the keeper is back to SET after the action
  const tr=[]; let tick=0, shotTick=null, commitTick=null, contactTick=null, backToSet=null, clip=null, diagTicks=0;
  while(tick<420){
    const s1=await p.evaluate(()=>{ const t=S.pt, A=S.gkAnim; ptStep(); gkAnimDraw(t,t.gk,1/60); const gk=t.gk, cur=A.cur, q=sproj3(gk.x,0,gk.y);
      const cm=A.commit; const c=gk.committed;
      return {now:+t.now.toFixed(4), sp:[+q.x.toFixed(2),+q.y.toFixed(2)], root:[+gk.x.toFixed(4),+gk.y.toFixed(4)], shotActive:!!gk.shotActive, committed:!!c, u:c?+Math.max(0,Math.min(1,(t.now-c.t0)/c.execTime)).toFixed(3):null,
        state:cur?cur.state:null, art:cur?cur.artLabel:null, seq:cur&&cur.seq?{key:cur.seq.key, mode:cur.seq.mode, pres:cur.seq.pres?{dm:+cur.seq.pres.dm.toFixed(3),sx:+cur.seq.pres.sx.toFixed(2),sy:+cur.seq.pres.sy.toFixed(2)}:null}:null,
        place:cur&&cur.place?{dx:cur.place.dx,dy:cur.place.dy}:null, diagnostic:!!(cur&&cur.diagnostic), contact:gk.contact?{tickT:gk.contact.tickT,outcome:gk.contact.outcome,volume:gk.contact.volume}:null,
        cls:cm&&cm.cls?{family:cm.cls.family,side:cm.cls.side,hClass:cm.cls.hClass,norm:cm.cls.norm,tier:cm.cls.tier,lat:cm.cls.lat,z:cm.cls.z}:null, pick:cm&&cm.ctx&&cm.ctx.pick?{id:cm.ctx.pick.id,score:cm.ctx.pick.score}:null, seqPick:cm&&cm.seq?{id:cm.seq.id,variant:cm.seq.variant,norm:cm.seq.norm}:null,
        facing:+(gk.facing*180/Math.PI).toFixed(1), ball:[+t.b.x.toFixed(2),+t.b.y.toFixed(2),+t.b.z.toFixed(2)]}; });
    tick++;
    if(s1.shotActive && shotTick==null) shotTick=tick;
    if(s1.committed && commitTick==null){ commitTick=tick; if(record && !clip) clip={x:Math.round(s1.sp[0])-230, y:Math.round(s1.sp[1])-250, width:460, height:330}; }
    if(s1.contact && contactTick==null) contactTick=tick;
    if(s1.diagnostic) diagTicks++;
    if(record){ tr.push({tick, ...s1}); if(commitTick!=null || (shotTick!=null && tick>=shotTick)){ if(!clip) clip={x:Math.round(s1.sp[0])-230, y:Math.round(s1.sp[1])-250, width:460, height:330}; await new Promise(r=>setTimeout(r,25)); await p.screenshot({path:path.join(OUT,`shot${String(sh.i).padStart(3,"0")}_t${String(tick).padStart(3,"0")}.png`), clip}); } }
    if(commitTick!=null && backToSet==null && (s1.state==="SET"||s1.state==="IDLE") && tick>commitTick+10 && !s1.committed) backToSet=tick;
    if(backToSet!=null && tick>backToSet+6) break;
    if(shotTick!=null && !s1.shotActive && !s1.committed && tick>shotTick+40 && commitTick==null) break;
    if(commitTick!=null && contactTick==null && tick>commitTick+120) break;
    if(!record && commitTick!=null && backToSet!=null) break;
  }
  const last=tr.length?tr[tr.length-1]:null;
  const cm=await p.evaluate(()=>{ const A=S.gkAnim, gk=S.pt.gk; const cls=A.lastContact?A.lastContact.cls:null; return {lastContact:A.lastContact?{outcome:A.lastContact.outcome, art:A.lastContact.art, state:A.lastContact.state}:null, flags:A.flags?A.flags.slice(-3):[]}; });
  const r={...sh, phase:"done", shotTick, commitTick, contactTick, backToSet, diagTicks, recorded:record, ...cm, trace: record?tr:undefined, clip};
  rec.push(r);
  if(record) fs.writeFileSync(path.join(OUT,`shot${String(sh.i).padStart(3,"0")}_trace.json`), JSON.stringify(r,null,1));
  const seqKeys=record?tr.map(x=>x.seq?x.seq.key:(x.state==="SET"?"SET":"live")).filter((v,i,a)=>i===0||v!==a[i-1]).join(">"):"";
  console.log(`#${String(sh.i).padStart(3)} ${sh.key} c${sh.c} ${JSON.stringify(sh.origin)}->y${sh.aim[1]} | commit ${commitTick} contact ${contactTick} set ${backToSet} diag ${diagTicks}${last&&last.cls?" | "+last.cls.family+" "+last.cls.side+" "+last.cls.hClass+" norm "+last.cls.norm:""}${last&&last.pick?" pick "+last.pick.id:""}${last&&last.seqPick?" SEQ "+last.seqPick.variant:""}${record?" | "+seqKeys:""}`);
 } catch(e){ console.log("ERROR shot", sh.i, String(e).slice(0,160)); rec.push({...sh, error:String(e)}); if(/Target closed|Session closed|detached/i.test(String(e))){ await openPage(); await p.evaluate((off)=>{ GK_ANIM.sequences=!off; }, OFF); } }
 if(sh.i%30===0) fs.writeFileSync(path.join(OUT,"freeplay.json"), JSON.stringify({seed:SEED, n:N, off:OFF, shots:rec.map(x=>({...x, trace:undefined}))},null,1));
}
fs.writeFileSync(path.join(OUT,"freeplay.json"), JSON.stringify({seed:SEED, n:N, off:OFF, shots:rec.map(x=>({...x, trace:undefined}))},null,1));
const dives=rec.filter(r=>r.contactTick!=null||r.commitTick!=null); console.log("shots", rec.length, "| committed", dives.length, "| with diagnostic ticks", rec.filter(r=>r.diagTicks>0).length, "| recorded", rec.filter(r=>r.recorded).length);
await b.close();})();

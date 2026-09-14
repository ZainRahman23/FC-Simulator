// FREE-PLAY HUNT on the plain default page: emulates what a player does — teleport-dribble to a spot, face a point in the goal, hold a
// kick key (z / 1-5) and release it (ptChargeBegin/ptChargeRelease → ptKick, the exact keyboard path), optionally keep running after the
// shot — with ONE continuous keeper (never reset between shots), a seeded sequence so BEFORE/AFTER runs are identical. For every airborne
// dive the live overlay (S.dbg.anim) frame is captured at mid-action and the full selector readout is recorded.
//   node live_freeplay_hunt.js <outdir> [shots] [seed]
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"freeplay"; const N=+(process.argv[3]||360); const SEED=+(process.argv[4]||7); const LEFT_FRAC=+(process.argv[5]||0.7); fs.mkdirSync(OUT,{recursive:true});
// --off: the sequences-OFF twin of a run (GK_ANIM.sequences=false, the same switch capture_full.js / right_geometry.js use): the keeper still
// classifies and draws its save poses, only the authored dive/jump sequences are off; every shot's simulation trace must match the ON run.
const OFF=process.argv.includes("--off");
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
  if(OFF) await p.evaluate(()=>{ GK_ANIM.sequences=false; });
  await new Promise(r=>setTimeout(r,300)); await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}}); }
(async()=>{await openPage();
const rec=[];
for(const sh of SHOTS){
 if(sh.i>0 && sh.i%90===0){ restarts++; await openPage(); sh.pageReloaded=true; }     // fresh page every 90 shots (memory); the keeper restarts SET there
 try {
  // setup + settle + charge + release + run until the keeper commits and the action is mid-way (or the shot dies)
  const st=await p.evaluate((sh)=>{ const t=S.pt, A=S.gkAnim; const tm=KICK_CHARGE.timing[ptKickSpec(sh.key,t).chargeFam]||KICK_CHARGE.timing.LACES;
    const holdMs=Math.max(0,(sh.c-tm.bias)*tm.ms); const holdTicks=Math.round(holdMs/1000*60);
    const fac=Math.atan2(sh.aim[1]-sh.origin[1], sh.aim[0]-sh.origin[0]);
    t.keys={}; t.charge=null; if(t.kick && t.kick.kicked===false) t.kick=null;
    t.p={x:sh.origin[0], y:sh.origin[1], vx:0, vy:0, facing:fac, touchT:t.now};
    t.b={x:sh.origin[0]+Math.cos(fac)*0.3, y:sh.origin[1]+Math.sin(fac)*0.3, z:0, vx:0, vy:0, vz:0, ctrl:true, exclT:0};
    const gkBefore={x:+t.gk.x.toFixed(2), y:+t.gk.y.toFixed(2), facing:+(t.gk.facing*180/Math.PI).toFixed(1), state:A.cur?A.cur.state:null, phase:t.gk.phase};
    for(let k=0;k<sh.settle;k++){ ptStep(); gkAnimDraw(t,t.gk,1/60); }
    const gkSet={x:+t.gk.x.toFixed(2), y:+t.gk.y.toFixed(2), facing:+(t.gk.facing*180/Math.PI).toFixed(1), state:A.cur?A.cur.state:null};
    if(!t.b.ctrl || t.kick) return {skipped:"no control/kick busy", gkBefore, gkSet, ctrl:t.b.ctrl, kick:!!t.kick};
    ptChargeBegin(t, sh.key, ptKickSpec(sh.key,t)); for(let k=0;k<holdTicks;k++){ ptStep(); gkAnimDraw(t,t.gk,1/60); }
    ptChargeRelease(t, sh.key);
    if(!t.kick) return {skipped:"kick not scheduled", gkBefore, gkSet};
    const kickInfo=t.kickInfo;
    if(sh.run==="goal") t.keys={right:true}; else if(sh.run==="side") t.keys={down:true};
    let tick=0, shotTick=null, commitTick=null, captured=false, diagTicks=0, artAtCapture=null, stateAtCapture=null, uAtCapture=null;
    while(tick<420){ ptStep(); gkAnimDraw(t,t.gk,1/60); tick++; const gk=t.gk, cur=A.cur;
      if(gk.shotActive && shotTick==null) shotTick=tick;
      if(gk.committed && commitTick==null) commitTick=tick;
      if(cur && cur.diagnostic) diagTicks++;
      if(commitTick!=null && cur && cur.u>=0.55 && !captured){ captured=true; artAtCapture=cur.artLabel; stateAtCapture=cur.state; uAtCapture=cur.u; t.keys={}; return {phase:"capture", gkBefore, gkSet, kickInfo, shotTick, commitTick, tick, artAtCapture, stateAtCapture, uAtCapture, diagTicks}; }
      if(shotTick!=null && !gk.shotActive && !gk.committed && tick>shotTick+40) break;
      if(commitTick!=null && t.now>=gk.committed.t0+gk.committed.execTime+0.5) break;
    }
    t.keys={}; return {phase:"done", gkBefore, gkSet, kickInfo, shotTick, commitTick, tick, diagTicks, artAtCapture:A.cur?A.cur.artLabel:null, stateAtCapture:A.cur?A.cur.state:null}; }, sh);
  let shot=null;
  const cm=await p.evaluate(()=>{ const A=S.gkAnim, cm=A.commit, gk=S.pt.gk; const cls=cm&&cm.cls, ctx=cm&&cm.ctx; const c=gk.committed;
    return {cls:cls?{family:cls.family, side:cls.side, goalSide:cls.goalSide, hClass:cls.hClass, z:cls.z, zH:cls.zH, L:cls.L, lat:cls.lat, norm:cls.norm, bestEffort:cls.bestEffort, nearMax:cls.expr?cls.expr.nearMax:null, action:cls.action, tier:cls.tier, feetPlanted:cls.feetPlanted}:null,
      facingAtCommitDeg:cm?+(cm.facing*180/Math.PI).toFixed(1):null, dir:cm?cm.dir:null, situation:ctx?ctx.situation:null, scored:ctx?ctx.scored:null, pick:ctx&&ctx.pick?{id:ctx.pick.id,score:ctx.pick.score,why:ctx.pick.why}:null,
      contact:gk.contact?{outcome:gk.contact.outcome, volume:gk.contact.volume}:null, target:c?c.target.map(v=>+v.toFixed(2)):null, feet:c?c.feet.map(v=>+v.toFixed(2)):null, shooterNow:[+S.pt.p.x.toFixed(2),+S.pt.p.y.toFixed(2)]}; });
  if(st.phase==="capture"){
    const g=await p.evaluate(()=>{ const gk=S.pt.gk, q=sproj3(gk.x,0,gk.y); S.dbg.anim=true; return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)]}; });
    await new Promise(r=>setTimeout(r,120));
    const fn=`shot${String(sh.i).padStart(3,"0")}`; await p.screenshot({path:path.join(OUT,fn+"_frame.png"), clip:{x:Math.round(g.sp[0])-170,y:Math.round(g.sp[1])-170,width:340,height:240}});
    await p.screenshot({path:path.join(OUT,fn+"_overlay.png"), clip:{x:0,y:56,width:1200,height:90}});
    await p.evaluate(()=>{ S.dbg.anim=false; }); shot=fn;
    // finish the action (LAND/RECOVER) so the next shot meets a continuous keeper
    const fin=await p.evaluate(()=>{ const t=S.pt, A=S.gkAnim; let k=0, diag=0; while(k<300){ ptStep(); gkAnimDraw(t,t.gk,1/60); k++; if(A.cur&&A.cur.diagnostic) diag++; if(!t.gk.committed && !t.gk.shotActive && k>30) break; if(t.gk.committed && t.now>=t.gk.committed.t0+t.gk.committed.execTime+1.2) break; } return {diag}; });
    st.diagTicks+=fin.diag;
  }
  const post=await p.evaluate(()=>{ const gk=S.pt.gk; return {contactFinal:gk.contact?{outcome:gk.contact.outcome, volume:gk.contact.volume}:null}; });
  const r={...sh, ...st, ...cm, ...post, shot}; rec.push(r);
  fs.writeFileSync(path.join(OUT,"freeplay.json"), JSON.stringify({seed:SEED, n:N, off:OFF, shots:rec},null,1));
  const fam=r.cls?r.cls.family:"-"; const miss=/ART_MISSING/.test(r.artAtCapture||"")||r.diagTicks>0;
  if(fam==="AIRBORNE_DIVE") console.log(`#${String(sh.i).padStart(3)} ${sh.key} c${sh.c} from ${JSON.stringify(sh.origin)} → y${sh.aim[1]} settle ${sh.settle} run ${sh.run.padEnd(4)} | ${(r.cls.family+"/"+r.cls.side).padEnd(20)} ${r.cls.hClass.padEnd(7)} ${r.cls.goalSide.padEnd(10)} norm ${String(r.cls.norm).padEnd(6)} | facing ${String(r.facingAtCommitDeg).padEnd(7)} bearing ${r.situation?String(r.situation.facingDeg).padEnd(7):"-      "} | pick ${r.pick?(r.pick.id+" "+r.pick.score):"NONE"} ${miss?"  <<< ART_MISSING":""}`);
 } catch(e){ console.log(`#${sh.i} ERROR ${String(e).slice(0,90)} — relaunching`); rec.push({...sh, error:String(e).slice(0,120)}); restarts++; await openPage(); }
}
fs.writeFileSync(path.join(OUT,"freeplay.json"), JSON.stringify({seed:SEED, n:N, off:OFF, shots:rec},null,1));
const dives=rec.filter(r=>r.cls&&r.cls.family==="AIRBORNE_DIVE"); const miss=dives.filter(r=>/ART_MISSING/.test(r.artAtCapture||"")||r.diagTicks>0);
const by={}; for(const r of miss){ const k=`${r.cls.side}/${r.cls.hClass}`; by[k]=(by[k]||0)+1; }
console.log(`\nshots ${rec.length} | airborne dives ${dives.length} | with ART_MISSING ${miss.length} ${JSON.stringify(by)} | skipped ${rec.filter(r=>r.skipped).length}`);
await b.close();})();

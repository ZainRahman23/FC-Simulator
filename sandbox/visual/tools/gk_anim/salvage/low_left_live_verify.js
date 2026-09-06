// LIVE VERIFICATION of the SW far-dive poses on the PLAIN default page (no query parameter, no override, no forced state):
// real SOUTH-WEST-facing far airborne saves to both physical sides, plus the cases that must NOT change.
//   node sw_live_verify.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"sw_live"; fs.mkdirSync(OUT,{recursive:true});
const CASES=[
 {id:"LOWLEFT_MODERATE", deg:180, lat:1.6, z:0.30, v:24, expect:"(ground still)", note:"moderate low-left dive — ground stills keep it"},
 {id:"LOWLEFT_FAR",      deg:180, lat:1.9, z:0.45, v:24, expect:"LOW_DIVE_LEFT_FAR", note:"far low-left airborne dive"},
 {id:"LOWLEFT_BEST",     deg:180, lat:2.2, z:0.45, v:24, expect:"LOW_DIVE_LEFT_FAR", note:"best-effort low-left airborne dive"},
 {id:"LOWRIGHT_FAR",     deg:180, lat:-1.9, z:0.45, v:24, expect:"(ground still)", note:"far low dive to his RIGHT — no art for that side"},
 {id:"LOW_GROUND",       deg:180, lat:1.6, z:0.45, v:24, expect:"(ground still)", note:"low ball that stays a LOW_COLLAPSE ground action"},
 {id:"SW_FAR_RIGHT", deg:135, lat:-2.2, z:1.45, v:25, expect:"SW_FAR_DIVE_RIGHT", note:"SW-facing far dive to his physical RIGHT"},
 {id:"SW_FAR_LEFT",  deg:135, lat: 2.2, z:1.45, v:25, expect:"SW_FAR_DIVE_LEFT",  note:"SW-facing far dive to his physical LEFT"},
 {id:"SW_FAR_RIGHT_UNREACH", deg:135, lat:-2.6, z:1.45, v:25, expect:"SW_FAR_DIVE_RIGHT", note:"SW-facing unreachable far dive, right"},
 {id:"SW_LOW",       deg:135, lat:-1.8, z:0.30, v:22, expect:"(ground still)", note:"SW-facing low save — ground stills keep it"},
 {id:"SW_NEARBODY",  deg:135, lat:-0.4, z:1.10, v:22, expect:"(none)", note:"SW-facing near-body save"},
 {id:"W_FAR_NORTH",  deg:180, lat:-2.4, z:1.40, v:24, expect:"DIVE_NORTH_MEDHIGH", note:"west-facing far dive — the north pose keeps it"},
];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-swl-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
console.log("default contextual poses:", await p.evaluate(()=>(S.gkAnim.contextual||[]).map(c=>c.id).join(" ")));
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
for(const c of CASES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const a=c.deg*Math.PI/180, R=20, origin=[101.7+Math.cos(a)*R, 34+Math.sin(a)*R];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    const f0=S.pt.gk.facing;
    ptGkFire({name:c.id, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null, cls=null, ctx=null, contact=null;
    while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
      if(S.gkAnim.commit&&S.gkAnim.commit.ctx!==undefined&&!ctx) ctx=S.gkAnim.commit.ctx;
      if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, cur=S.gkAnim.cur, q=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), pl=cur&&cur.place;
    return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)], ballSp:[+bq.x.toFixed(1),+bq.y.toFixed(1)], root:[+gk.x.toFixed(2),+gk.y.toFixed(2)],
      facingAtCommitBin: headingToDir(f0*180/Math.PI), facingAtCommitDeg:+(f0*180/Math.PI).toFixed(1),
      cls: cls?{family:cls.family,hClass:cls.hClass,side:cls.side,goalSide:cls.goalSide,z:cls.z,L:cls.L,norm:cls.norm,bestEffort:cls.bestEffort}:null,
      committed: committed?{tier:committed.tier,action:committed.action}:null,
      ctx: ctx&&ctx.pick?{id:ctx.pick.id, transform:ctx.pick.transform, score:ctx.pick.score, why:ctx.pick.why}:null,
      scored: ctx?ctx.scored.filter(s=>s.score>0).sort((a,b)=>b.score-a.score).slice(0,3):null,
      liveArt: cur&&cur.artLabel, place: pl?{raw:pl.rawErrPx,corr:pl.corrPx,res:pl.finalErrPx,capped:pl.capped}:null, contact}; }, c);
  await new Promise(r=>setTimeout(r,180));
  const clip={x:Math.round(g.sp[0])-190, y:Math.round(g.sp[1])-180, width:380, height:290};
  await p.screenshot({path:path.join(OUT,c.id+".png"), clip});
  rec.push({...c, ...g, clip});
  const cl=g.cls;
  console.log(`${c.id.padEnd(20)} facing ${String(g.facingAtCommitBin).padEnd(11)} | ${cl?(cl.family+" "+cl.hClass).padEnd(22)+" side "+String(cl.side).padEnd(6)+" norm "+String(cl.norm).padEnd(6):"-"} | pick ${g.ctx?(g.ctx.id+" "+g.ctx.transform+" "+g.ctx.score):"NONE"} | place ${g.place?JSON.stringify(g.place):"-"} | ${g.contact?g.contact.volume+" "+g.contact.outcome:"no contact"}`);
}
fs.writeFileSync(path.join(OUT,"cases.json"), JSON.stringify(rec,null,1));
await b.close();})();

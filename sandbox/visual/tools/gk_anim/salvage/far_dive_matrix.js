// FAR-DIVE MATRIX on the PLAIN default page: keeper-right (north / GOAL_LEFT) airborne saves across four heights and four lateral
// demands, reachable and unreachable, plus the controls that must NOT change (ground save, near-body save, opposite side).
// The simulation runs untouched and is paused at its own contact / max-extension tick; the live selector chooses the art.
//   node far_dive_matrix.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"far_matrix"; fs.mkdirSync(OUT,{recursive:true});
const HEIGHTS=[{k:"z035",z:0.35},{k:"z090",z:0.90},{k:"z140",z:1.40},{k:"z190",z:1.90}];
const LATS=[{k:"L12",lat:-1.2},{k:"L18",lat:-1.8},{k:"L24",lat:-2.4},{k:"L30",lat:-3.0}];
const CASES=[];
for(const h of HEIGHTS) for(const l of LATS) CASES.push({id:h.k+"_"+l.k, lat:l.lat, z:h.z, v:24, grid:[h.k,l.k]});
const CONTROLS=[
 {id:"CTRL_GROUND",   lat:-1.0, z:0.22, v:20, note:"low ball that stays a ground-save action"},
 {id:"CTRL_NEARBODY", lat:-0.3, z:1.05, v:22, note:"near-body save"},
 {id:"CTRL_OPPOSITE", lat: 2.4, z:1.40, v:24, note:"same far dive to GOAL_RIGHT (no art exists)"},
 {id:"TOPLEFT_FULL",  lat:-1.9, z:1.90, v:26, note:"full-stretch top-left corner (the new pose's case)"},
 {id:"TOPLEFT_UNREACH", lat:-2.3, z:2.15, v:26, note:"unreachable top-left corner attempt"},
 {id:"TOP_CENTRAL",   lat:-0.4, z:2.10, v:24, note:"mostly vertical top ball, little lateral demand"},
];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-fdm-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
for(const c of CASES.concat(CONTROLS)){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const origin=[101.7-20,34];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    ptGkFire({name:c.id, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null, cls=null, ctx=null, contact=null;
    while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.cls&&!cls) cls=S.gkAnim.commit.cls;
      if(S.gkAnim.commit&&S.gkAnim.commit.ctx!==undefined&&!ctx) ctx=S.gkAnim.commit.ctx;
      if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(S.pt.paused){ if(gk.contact) contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, cur=S.gkAnim.cur, q=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), pl=cur&&cur.place;
    return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)], ballSp:[+bq.x.toFixed(1),+bq.y.toFixed(1)],
      cls: cls?{family:cls.family,hClass:cls.hClass,z:cls.z,zH:cls.zH,L:cls.L,norm:cls.norm,maxLat:cls.maxLat,goalSide:cls.goalSide,bestEffort:cls.bestEffort,nearMax:cls.expr?cls.expr.nearMax:null}:null,
      committed: committed?{tier:committed.tier,action:committed.action}:null,
      ctx: ctx&&ctx.pick?{id:ctx.pick.id, score:ctx.pick.score, why:ctx.pick.why}:null, scored: ctx?ctx.scored.filter(s=>s.score>0).sort((a,b)=>b.score-a.score):null,
      liveArt: cur&&cur.artLabel, place: pl?{raw:pl.rawErrPx,res:pl.finalErrPx,capped:pl.capped}:null, contact, ticks:t}; }, c);
  await new Promise(r=>setTimeout(r,170));
  const clip={x:Math.round(g.sp[0])-160, y:Math.round(g.sp[1])-190, width:320, height:250};
  await p.screenshot({path:path.join(OUT,c.id+".png"), clip});
  rec.push({...c, ...g, clip});
  const cl=g.cls;
  console.log(`${c.id.padEnd(13)} | ${cl?(cl.family+" "+cl.hClass).padEnd(22)+" norm "+String(cl.norm).padEnd(6)+" L "+String(cl.L).padEnd(6)+" "+cl.goalSide.padEnd(10)+(cl.bestEffort?" BEST-EFFORT":"           "):"-"} | ${g.committed?(g.committed.tier+"/"+g.committed.action).padEnd(34):"-"} | pick ${g.ctx?(g.ctx.id+" "+g.ctx.score):"NONE"} | ${g.contact?g.contact.volume+" "+g.contact.outcome:"no contact"}`);
}
fs.writeFileSync(path.join(OUT,"cases.json"), JSON.stringify(rec,null,1));
await b.close();})();

// LIVE VERIFICATION of the integrated DIVE_NORTH pose on the PLAIN default page (no query parameter, no override, no forced state):
// the simulation runs, the selector chooses, the renderer draws. Captures the north medium/high dive, the opposite side (which must
// stay on the ART_MISSING diagnostic), a low north dive (which must stay on the ground stills) and REAL kicks that produce a north dive.
//   node north_dive_live_verify.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"north_live"; fs.mkdirSync(OUT,{recursive:true});
const SYNTH=[
 {id:"NORTH_MEDHIGH", expect:"DIVE_NORTH_MEDHIGH", lat:-2.0, z:1.45, v:25, label:"medium/high airborne dive to the keeper's right (north)"},
 {id:"SOUTH_MEDHIGH", expect:null,                 lat: 2.0, z:1.45, v:25, label:"same save mirrored to GOAL_RIGHT — no art exists, must stay on the diagnostic"},
 {id:"NORTH_LOW",     expect:"W_LOW_LEFT",         lat:-1.4, z:0.25, v:22, label:"low north save — the ground stills must keep it"},
];
const REAL=[
 {id:"REAL_A", origin:[93,40], aim:[105,31.2], tech:"LACES", c:0.72},
 {id:"REAL_B", origin:[90,38], aim:[105,31.0], tech:"POWER", c:0.75},
 {id:"REAL_C", origin:[95,41], aim:[105,31.5], tech:"LACES", c:0.7},
 {id:"REAL_D", origin:[88,36], aim:[105,30.9], tech:"POWER", c:0.8},
 {id:"REAL_E", origin:[91,37], aim:[105,32.0], tech:"LACES", c:0.62},
 {id:"REAL_F", origin:[96,39], aim:[105,32.2], tech:"LACES", c:0.6},
 {id:"REAL_G", origin:[99,40], aim:[105,32.3], tech:"LACES", c:0.58},
 {id:"REAL_H", origin:[94,30], aim:[105,32.0], tech:"LACES", c:0.6},
];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-nlv-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
console.log("default contextual poses:", await p.evaluate(()=>(S.gkAnim.contextual||[]).map(c=>c.id).join(" ")));
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
async function run(c, real){
  const g=await p.evaluate((c,real)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const origin=real?c.origin:[101.7-20,34];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    const shot=real?{name:c.id, origin, aim:c.aim, tech:c.tech, c:c.c}:{name:c.id, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}};
    ptGkFire(shot); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null, cls=null, ctx=null, contact=null;
    while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.ctx!==undefined&&!ctx){ ctx=S.gkAnim.commit.ctx; cls=S.gkAnim.commit.cls; }
      if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(S.pt.paused){ if(gk.contact) contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; }
      if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, cur=S.gkAnim.cur, q=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), pl=cur&&cur.place, lc=S.gkAnim.lastContact;
    return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)], ballSp:[+bq.x.toFixed(1),+bq.y.toFixed(1)], root:[+gk.x.toFixed(2),+gk.y.toFixed(2)], ball:[+bl.x.toFixed(2),+bl.y.toFixed(2),+bl.z.toFixed(2)],
      cls: cls?{family:cls.family,hClass:cls.hClass,zClass:cls.zClass,z:cls.z,zH:cls.zH,L:cls.L,goalSide:cls.goalSide}:null,
      committed: committed?{tier:committed.tier,action:committed.action}:null,
      ctx: ctx&&ctx.pick?{id:ctx.pick.id, transform:ctx.pick.transform, score:ctx.pick.score, why:ctx.pick.why}:null, scored: ctx?ctx.scored.filter(s=>s.score>0):null,
      liveArt: cur&&cur.artLabel, liveState: cur&&cur.state, place: pl?{raw:pl.rawErrPx, corr:pl.corrPx, res:pl.finalErrPx, capped:pl.capped}:null,
      lastContact: lc?{spritePx:lc.spritePx, errM:lc.errM}:null, contact, ticks:t}; }, c, real);
  await new Promise(r=>setTimeout(r,180));
  const clip={x:Math.round(g.sp[0])-210, y:Math.round(g.sp[1])-215, width:420, height:300};
  await p.screenshot({path:path.join(OUT,c.id+"_game.png"), clip});
  await p.evaluate(()=>{ S.dbg.anim=true; }); await new Promise(r=>setTimeout(r,180));
  await p.screenshot({path:path.join(OUT,c.id+"_overlay.png"), clip:{x:0,y:56,width:1200,height:120}});
  await p.evaluate(()=>{ S.dbg.anim=false; });
  rec.push({...c, real:!!real, ...g, clip});
  console.log(`${c.id} | ${g.cls?g.cls.family+" "+g.cls.hClass+" "+g.cls.goalSide+" z "+g.cls.z+" L "+g.cls.L:"-"} | pick ${g.ctx?g.ctx.id+" "+g.ctx.score:"NONE"} | art ${g.liveArt} | place ${g.place?JSON.stringify(g.place):"-"} | ${g.contact?g.contact.volume+" "+g.contact.outcome:"no contact"}`);
}
for(const c of SYNTH) await run(c,false);
for(const c of REAL)  await run(c,true);
fs.writeFileSync(path.join(OUT,"cases.json"), JSON.stringify(rec,null,1));
await b.close();})();

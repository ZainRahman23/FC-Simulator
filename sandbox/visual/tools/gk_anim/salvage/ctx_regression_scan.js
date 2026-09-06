// CONTEXTUAL-POSE REGRESSION SCAN on the plain default page: a fixed list of synthetic (facing by shooter bearing) and real cases across
// every live pose family; records the classifier, the committed action, EVERY pose's score (not just the pick), the drawn art and the
// placement at the simulation's own contact tick, plus a game frame. Run before and after a pose integration and diff with ctx_scan_diff.py.
//   node ctx_regression_scan.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"ctx_scan"; fs.mkdirSync(OUT,{recursive:true});
const CASES=[
 // north far dives (DIVE_NORTH) + north controls
 {id:"N_HIGH", deg:180, lat:-2.0, z:1.45, v:25}, {id:"N_MID", deg:180, lat:-1.8, z:0.9, v:24}, {id:"N_BEST", deg:180, lat:-3.0, z:1.4, v:24}, {id:"N_MOD", deg:180, lat:-1.2, z:1.0, v:24},
 {id:"REAL_D", origin:[88,36], aim:[105,30.9], tech:"POWER", c:0.8}, {id:"REAL_A", origin:[93,40], aim:[105,31.2], tech:"LACES", c:0.72}, {id:"REAL_H", origin:[94,30], aim:[105,32.0], tech:"LACES", c:0.6},
 // top corner / overhead
 {id:"TOPLEFT_FULL", deg:180, lat:-1.9, z:1.9, v:26}, {id:"TOPLEFT_UNREACH", deg:180, lat:-2.3, z:2.15, v:26}, {id:"TOP_CENTRAL", deg:180, lat:-0.4, z:2.1, v:24},
 // south-west facing far dives + controls
 {id:"SW_FAR_RIGHT", deg:135, lat:-2.2, z:1.45, v:25}, {id:"SW_FAR_LEFT", deg:135, lat:2.2, z:1.45, v:25}, {id:"SW_FAR_RIGHT_UNREACH", deg:135, lat:-2.6, z:1.45, v:25}, {id:"SW_LOW", deg:135, lat:-1.8, z:0.30, v:22}, {id:"SW_NEARBODY", deg:135, lat:-0.4, z:1.10, v:22}, {id:"W_FAR_NORTH", deg:180, lat:-2.4, z:1.40, v:24},
 // low / ground saves (three facings, both sides)
 {id:"SW_L", deg:135, lat:-1.8, z:0.25, v:22}, {id:"SW_R", deg:135, lat:1.4, z:0.5, v:22}, {id:"W_L", deg:180, lat:-1.4, z:0.25, v:22}, {id:"W_R", deg:180, lat:1.4, z:0.25, v:22}, {id:"NW_L", deg:225, lat:-1.4, z:0.5, v:22}, {id:"NW_R", deg:225, lat:1.8, z:0.25, v:22},
 // tight-angle / overhead real chips
 {id:"S_NEAR", origin:[103.5,46], aim:[105,37.3], tech:"CHIP", c:0.55}, {id:"S_FAR", origin:[102.5,45], aim:[105,30.7], tech:"CHIP", c:0.6}, {id:"N_NEAR", origin:[103.5,22], aim:[105,30.7], tech:"CHIP", c:0.55}, {id:"N_FAR", origin:[101,24], aim:[105,37.3], tech:"CHIP", c:0.6}, {id:"OVER", origin:[86,34], aim:[105,34], tech:"CHIP", c:0.74},
 // low far dive left (GOAL_RIGHT low)
 {id:"S_LOWFAR", deg:180, lat:2.0, z:0.6, v:25}, {id:"S_LOW_BEST", deg:180, lat:2.6, z:0.4, v:24},
 // SOUTH far dives (GOAL_RIGHT mid/high) — the new pose's cases, currently ART_MISSING
 {id:"S_HIGH", deg:180, lat:2.0, z:1.45, v:25}, {id:"S_MID", deg:180, lat:2.0, z:1.0, v:25}, {id:"S_MID_MOD", deg:180, lat:1.4, z:1.0, v:24}, {id:"S_BEST", deg:180, lat:3.0, z:1.4, v:24}, {id:"S_HIGH_FAR", deg:180, lat:2.4, z:1.5, v:25}, {id:"S_TOP", deg:180, lat:1.9, z:1.9, v:26}, {id:"S_MID_NEAR", deg:180, lat:1.0, z:1.1, v:24},
 {id:"REAL_S1", origin:[88,32], aim:[105,37.1], tech:"POWER", c:0.8}, {id:"REAL_S2", origin:[93,28], aim:[105,36.8], tech:"LACES", c:0.72}, {id:"REAL_S3", origin:[90,30], aim:[105,37.0], tech:"POWER", c:0.75}, {id:"REAL_S4", origin:[95,27], aim:[105,36.0], tech:"LACES", c:0.62}, {id:"REAL_S5", origin:[88,40], aim:[105,36.5], tech:"POWER", c:0.8}, {id:"REAL_S6", origin:[91,31], aim:[105,36.2], tech:"LACES", c:0.7},
 {id:"REAL_S7", origin:[86,33], aim:[105,37.2], tech:"CHIP", c:0.7}, {id:"REAL_S8", origin:[90,33], aim:[105,37.4], tech:"LACES", c:0.85}, {id:"REAL_S9", origin:[86,30], aim:[105,37.3], tech:"POWER", c:0.85},
];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-ctx-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
const poses=await p.evaluate(()=>(S.gkAnim.contextual||[]).map(c=>c.id)); console.log("live contextual poses ("+poses.length+"):", poses.join(" "));
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
for(const c of CASES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    let origin=c.origin; if(!origin){ const a=c.deg*Math.PI/180, R=20; origin=[101.7+Math.cos(a)*R, 34+Math.sin(a)*R]; }
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    const shot=c.lat!==undefined?{name:c.id, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}:{name:c.id, origin, aim:c.aim, tech:c.tech, c:c.c};
    ptGkFire(shot); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null, contact=null; while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(gk.contact){ contact={outcome:gk.contact.outcome, volume:gk.contact.volume, tick:t}; break; } if(S.pt.paused){ if(gk.contact) contact={outcome:gk.contact.outcome, volume:gk.contact.volume, tick:t}; break; } if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, cur=S.gkAnim.cur, q=sproj3(gk.x,0,gk.y), pl=cur&&cur.place, cm=S.gkAnim.commit, cls=cm&&cm.cls, ctx=cm&&cm.ctx;
    return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)], dir:headingToDir(gk.facing*180/Math.PI), ticks:t,
      cls: cls?{family:cls.family,hClass:cls.hClass,goalSide:cls.goalSide,side:cls.side,norm:cls.norm,L:cls.L,zH:cls.zH,bestEffort:cls.bestEffort,nearMax:cls.expr?cls.expr.nearMax:null}:null,
      committed: committed?{tier:committed.tier,action:committed.action,target:committed.target.map(v=>+v.toFixed(3))}:null, contact,
      pick: ctx&&ctx.pick?{id:ctx.pick.id, transform:ctx.pick.transform, score:ctx.pick.score, why:ctx.pick.why}:null,
      scored: ctx?ctx.scored:null, baseline: ctx?ctx.baseline:null, situation: ctx?ctx.situation:null,
      art: cur&&cur.artLabel, state: cur&&cur.state, place: pl?{raw:pl.rawErrPx,corr:pl.corrPx,res:pl.finalErrPx,capped:pl.capped}:null}; }, c);
  await new Promise(r=>setTimeout(r,150));
  await p.screenshot({path:path.join(OUT,c.id+".png"), clip:{x:Math.round(g.sp[0])-120, y:Math.round(g.sp[1])-140, width:240, height:200}});
  rec.push({...c, ...g});
  console.log(`${c.id.padEnd(20)} ${g.cls?(g.cls.family+" "+g.cls.hClass+" "+g.cls.goalSide).padEnd(34)+"norm "+String(g.cls.norm).padEnd(6):"-".padEnd(45)} | pick ${g.pick?(g.pick.id+" "+g.pick.transform+" "+g.pick.score):"NONE"} | ${g.contact?g.contact.volume+" "+g.contact.outcome:"no contact"} | ${(g.art||"").slice(0,48)}`);
}
fs.writeFileSync(path.join(OUT,"scan.json"), JSON.stringify({poses, cases:rec},null,1));
await b.close();})();

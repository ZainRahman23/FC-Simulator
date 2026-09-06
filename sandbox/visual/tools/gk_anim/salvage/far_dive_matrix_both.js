// TWO-SIDED FAR-DIVE MATRIX on the PLAIN default page: the same lateral demands and heights to GOAL_LEFT (north, keeper-right) and
// GOAL_RIGHT (south, keeper-left), for the WEST-facing keeper plus the SOUTH-WEST and NORTH-WEST facings, so the two authored far-dive
// poses can be checked cell by cell for consistent coverage. Simulation untouched; paused at its own contact / max-extension tick.
//   node far_dive_matrix_both.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"far_both"; fs.mkdirSync(OUT,{recursive:true});
const HEIGHTS=[{k:"z035",z:0.35,cls:"LOW-MID (control)"},{k:"z090",z:0.90,cls:"MID"},{k:"z140",z:1.40,cls:"HIGH"},{k:"z190",z:1.90,cls:"TOP"}];
const LATS=[{k:"L12",lat:1.2},{k:"L18",lat:1.8},{k:"L24",lat:2.4},{k:"L30",lat:3.0}];
const CASES=[];
for(const h of HEIGHTS) for(const l of LATS) for(const side of ["GOAL_LEFT","GOAL_RIGHT"]) CASES.push({id:`W_${h.k}_${l.k}_${side}`, facing:"west", deg:180, lat:side==="GOAL_LEFT"?-l.lat:l.lat, z:h.z, v:24, grid:[h.k,l.k,side]});
for(const f of [{name:"southwest",deg:135},{name:"northwest",deg:225}]) for(const h of HEIGHTS.slice(1)) for(const l of [LATS[1],LATS[2]]) for(const side of ["GOAL_LEFT","GOAL_RIGHT"])
  CASES.push({id:`${f.name.toUpperCase()}_${h.k}_${l.k}_${side}`, facing:f.name, deg:f.deg, lat:side==="GOAL_LEFT"?-l.lat:l.lat, z:h.z, v:24, grid:[h.k,l.k,side]});
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-fdb-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
for(const c of CASES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const a=c.deg*Math.PI/180, R=20, origin=[101.7+Math.cos(a)*R, 34+Math.sin(a)*R];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    ptGkFire({name:c.id, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat,z:c.z,v:c.v}}); gkAnimResetView(); S.pt.paused=false;
    let t=0, committed=null, contact=null; while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk; if(gk.committed&&!committed) committed=gk.committed;
      if(gk.contact){ contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; } if(S.pt.paused){ if(gk.contact) contact={outcome:gk.contact.outcome,volume:gk.contact.volume,tick:t}; break; } if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, cur=S.gkAnim.cur, q=sproj3(gk.x,0,gk.y), pl=cur&&cur.place, cm=S.gkAnim.commit, cls=cm&&cm.cls, ctx=cm&&cm.ctx;
    return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)], dir:headingToDir(gk.facing*180/Math.PI),
      cls: cls?{family:cls.family,hClass:cls.hClass,goalSide:cls.goalSide,side:cls.side,norm:cls.norm,L:cls.L,zH:cls.zH,bestEffort:cls.bestEffort,nearMax:cls.expr?cls.expr.nearMax:null}:null,
      committed: committed?{tier:committed.tier,action:committed.action}:null, contact,
      pick: ctx&&ctx.pick?{id:ctx.pick.id,score:ctx.pick.score,transform:ctx.pick.transform,why:ctx.pick.why}:null, scored: ctx?ctx.scored.filter(s=>s.score>0).sort((a,b)=>b.score-a.score):null, situation: ctx?ctx.situation:null,
      art: cur&&cur.artLabel, place: pl?{raw:pl.rawErrPx,corr:pl.corrPx,res:pl.finalErrPx,capped:pl.capped}:null}; }, c);
  await new Promise(r=>setTimeout(r,150));
  await p.screenshot({path:path.join(OUT,c.id+".png"), clip:{x:Math.round(g.sp[0])-120, y:Math.round(g.sp[1])-140, width:240, height:200}});
  rec.push({...c, ...g});
  const cl=g.cls; console.log(`${c.id.padEnd(30)} | ${cl?(cl.family+" "+cl.hClass).padEnd(22)+"norm "+String(cl.norm).padEnd(6)+cl.goalSide.padEnd(10)+(cl.bestEffort?" BEST":"     "):"-".padEnd(48)} | ${g.committed?(g.committed.tier+"/"+g.committed.action).padEnd(32):"-"} | pick ${g.pick?(g.pick.id+" "+g.pick.score):"NONE"} | ${g.contact?g.contact.volume+" "+g.contact.outcome:"no contact"}`);
}
fs.writeFileSync(path.join(OUT,"cases.json"), JSON.stringify(rec,null,1));
await b.close();})();

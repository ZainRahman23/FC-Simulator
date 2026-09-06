// REPRODUCE live ART_MISSING airborne dives on the PLAIN default page (real simulation, built-in scenarios and real kicks with the keeper
// settled on the ball first). Captures the frame at the diagnostic/contact with the GK ANIM overlay on, and dumps the COMPLETE selector
// readout (classifier, facing vs shooter bearing, every candidate's score, why and rejection reason).
//   node art_missing_repro.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"repro"; fs.mkdirSync(OUT,{recursive:true});
const CASES=[   // real kicks first (fresh default keeper capability); built-in scenarios after (some pin a capability band that persists)
 {id:"FLANK_N_nearpost_MID", origin:[96,22], aim:[105,30.8], tech:"LACES", c:0.8, settle:120, label:"real LACES from the north flank [96,22] → near post [105,30.8], keeper settled first"},
 {id:"FLANK_N_farpost_MID", origin:[96,22], aim:[105,35.7], tech:"LACES", c:0.8, settle:120, label:"real LACES from the north flank [96,22] → far post [105,35.7], keeper settled first"},
 {id:"FLANK_S_TOP_chip", origin:[100,40], aim:[105,37.2], tech:"CHIP", c:0.8, settle:120, label:"real CHIP from the south flank [100,40] → near top [105,37.2], keeper settled first"},
 {id:"CLOSE_farpost_POWER", origin:[100,34], aim:[105,37.2], tech:"POWER", c:0.8, settle:120, label:"real POWER from 5 m central [100,34] → [105,37.2] (best effort), keeper settled first"},
 {id:"SCENARIO_5_close_POWER", scenario:5, label:"built-in scenario 5 'close POWER' (LACES_POWER from [99,34], c 0.55)"},
 {id:"SCENARIO_15_rocket_top_corner", scenario:15, label:"built-in scenario 15 'rocket top corner (unreachable)' ([95,34] → [105,30.7], c 1.0)"},
 {id:"SCENARIO_22_close_POWER_at_feet", scenario:22, label:"built-in scenario 22 'close POWER at feet'"},
];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-repro-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto((process.env.GK_PAGE||"http://127.0.0.1:8126/sandbox/visual/match.html")+"?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400));
await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
for(const c of CASES){
  const g=await p.evaluate((c)=>{ const A=S.gkAnim; if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
    let gk0=null;
    if(c.scenario!=null){ ptGkScenario(c.scenario); S.pt.paused=true; gkAnimResetView(); }
    else { ptGkFire({name:"PLACE", origin:c.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false;
      for(let k=0;k<(c.settle||2);k++) ptStep(); gk0=[+S.pt.gk.x.toFixed(2),+S.pt.gk.y.toFixed(2),+(S.pt.gk.facing*180/Math.PI).toFixed(1)];
      ptGkFire({name:c.id, origin:c.origin, aim:c.aim, tech:c.tech, c:c.c}); gkAnimResetView(); }
    S.pt.paused=false;
    let t=0, committed=null, commitTick=null, diagTick=null, shotFacing=null, firstContact=null; const facingTrace=[];
    // run through the whole action: a close shot can touch the keeper (leg/hand) BEFORE he commits — the dive comes after, at a ball
    // already beside or behind him — so never stop at the first contact; stop 60 % into the committed action (the diagnostic/pose is drawn)
    while(t<400){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk;
      if(gk.shotActive && shotFacing==null) shotFacing=+(gk.facing*180/Math.PI).toFixed(1);
      if(gk.contact && !firstContact) firstContact={tick:t, volume:gk.contact.volume, outcome:gk.contact.outcome, beforeCommit:!committed};
      if(gk.shotActive || gk.committed) facingTrace.push([t, +(gk.facing*180/Math.PI).toFixed(1), +gk.x.toFixed(2), +gk.y.toFixed(2), +S.pt.b.x.toFixed(2), +S.pt.b.y.toFixed(2), +S.pt.b.z.toFixed(2)]);
      if(gk.committed&&!committed){ committed=gk.committed; commitTick=t; }
      if(A.cur&&A.cur.diagnostic&&diagTick==null) diagTick=t;
      if(committed&&S.pt.now>=committed.t0+0.6*committed.execTime) break;
      if(!gk.shotActive && !gk.committed && t>150) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, cur=A.cur, q=sproj3(gk.x,0,gk.y), cm=A.commit, cls=cm&&cm.cls, ctx=cm&&cm.ctx;
    return {gk0, shotFacing, commitTick, diagTick, ticks:t, sp:[+q.x.toFixed(1),+q.y.toFixed(1)], facingTrace: facingTrace.filter((v,i)=>i%3===0||v[0]===commitTick),
      family:cls?cls.family:null, cls, facingAtCommitDeg:cm?+(cm.facing*180/Math.PI).toFixed(1):null, dir:cm?cm.dir:null, situation:ctx?ctx.situation:null, scored:ctx?ctx.scored:null, pick:ctx&&ctx.pick?{id:ctx.pick.id,score:ctx.pick.score}:null, baseline:ctx?ctx.baseline:null,
      committed: committed?{tier:committed.tier, action:committed.action, target:committed.target.map(v=>+v.toFixed(3)), feet:committed.feet.map(v=>+v.toFixed(3)), envNorm:committed.envNorm, bestEffort:committed.bestEffort}:null,
      contact: gk.contact?{outcome:gk.contact.outcome, volume:gk.contact.volume}:null, firstContact, art:cur&&cur.artLabel, state:cur&&cur.state, shooter:S.pt.p?[+S.pt.p.x.toFixed(2),+S.pt.p.y.toFixed(2)]:null, minScore:GK_CTX.minScore}; }, c);
  await new Promise(r=>setTimeout(r,150));
  await p.screenshot({path:path.join(OUT,c.id+"_frame.png"), clip:{x:Math.round(g.sp[0])-200, y:Math.round(g.sp[1])-190, width:400, height:280}});
  await p.evaluate(()=>{ S.dbg.anim=true; }); await new Promise(r=>setTimeout(r,180));
  await p.screenshot({path:path.join(OUT,c.id+"_overlay.png"), clip:{x:0,y:56,width:1200,height:130}});
  await p.evaluate(()=>{ S.dbg.anim=false; });
  rec.push({...c, ...g});
  console.log(`${c.id}: family ${g.family} pick ${g.pick?g.pick.id+" "+g.pick.score:"NONE"} | facing@commit ${g.facingAtCommitDeg} bearing ${g.situation?g.situation.facingDeg:"-"} | ${g.cls?g.cls.hClass+" z "+g.cls.z+" L "+g.cls.L+" norm "+g.cls.norm+" best "+g.cls.bestEffort:""} | art ${(g.art||"").slice(0,50)}`);
}
fs.writeFileSync(path.join(OUT,"repro.json"), JSON.stringify(rec,null,1));
await b.close();})();

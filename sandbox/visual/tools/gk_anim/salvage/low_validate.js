// LOW-SAVE ORIENTATION VALIDATION on the DEFAULT page: six real synthetic low balls (SW / W / NW facing × GOAL_LEFT / GOAL_RIGHT), the
// simulation positions, reads, commits and reaches; paused at its own contact tick. The live selector draws its pick (no override);
// the debug overlay marks root / commit target / sim hand / drawn glove; the alternative orientation is drawn once via the review override
// for comparison. Nothing in the simulation is moved for the art.  node low_validate.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"low_val"; fs.mkdirSync(OUT,{recursive:true});
const CASES=[
 {id:"SW_L", facing:"south-west", deg:135, side:"GOAL_LEFT",  lat:-1.8, z:0.25, v:22, expect:"SW_LOW_LEFT",  alt:"SW_LOW_RIGHT"},
 {id:"SW_R", facing:"south-west", deg:135, side:"GOAL_RIGHT", lat: 1.4, z:0.5,  v:22, expect:"SW_LOW_RIGHT", alt:"SW_LOW_LEFT"},
 {id:"W_L",  facing:"west",       deg:180, side:"GOAL_LEFT",  lat:-1.4, z:0.25, v:22, expect:"W_LOW_LEFT",   alt:"W_LOW_RIGHT"},
 {id:"W_R",  facing:"west",       deg:180, side:"GOAL_RIGHT", lat: 1.4, z:0.25, v:22, expect:"W_LOW_RIGHT",  alt:"W_LOW_LEFT"},
 {id:"NW_L", facing:"north-west", deg:225, side:"GOAL_LEFT",  lat:-1.4, z:0.5,  v:22, expect:"NW_LOW_LEFT",  alt:"NW_LOW_RIGHT"},
 {id:"NW_R", facing:"north-west", deg:225, side:"GOAL_RIGHT", lat: 1.8, z:0.25, v:22, expect:"NW_LOW_RIGHT", alt:"NW_LOW_LEFT"},
];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-lowv-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
console.log("contextual:",await p.evaluate(()=>(S.gkAnim.contextual||[]).map(c=>c.id).join(" ")));
await p.evaluate(()=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; }); await new Promise(r=>setTimeout(r,400)); await p.screenshot({path:path.join(OUT,"_warmup.png"),clip:{x:0,y:0,width:100,height:100}});
const rec=[];
for(const c of CASES){
  const g=await p.evaluate((c)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=true;
    const a=c.deg*Math.PI/180, R=20, origin=[101.7+Math.cos(a)*R, 34+Math.sin(a)*R];
    ptGkFire({name:"PLACE", origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    const f0=S.pt.gk.facing; ptGkFire({name:"LOW "+c.id, origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:c.lat, z:c.z, v:c.v}}); gkAnimResetView(); S.pt.paused=false;
    let ticks=0, committed=null, ctx=null, cls=null, contact=null;
    while(ticks<300){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); ticks++; const g=S.pt.gk; if(g.committed&&!committed) committed=g.committed; if(S.gkAnim.commit&&S.gkAnim.commit.ctx!==undefined&&!ctx){ ctx=S.gkAnim.commit.ctx; cls=S.gkAnim.commit.cls; } if(g.contact){ contact={outcome:g.contact.outcome,volume:g.contact.volume,tick:ticks}; break; } if(S.pt.paused){ if(g.contact) contact={outcome:g.contact.outcome,volume:g.contact.volume,tick:ticks}; break; } if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, cur=S.gkAnim.cur, A=S.gkAnim, q=sproj3(gk.x,0,gk.y), bl=S.pt.b, bq=sproj3(bl.x,bl.z,bl.y), hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null, tg=committed?sproj3(committed.target[0],committed.target[2],committed.target[1]):null;
    const pl=cur&&cur.place; const lc=A.lastContact;
    return {origin:origin.map(v=>+v.toFixed(1)), facingDeg:+(f0*180/Math.PI).toFixed(1), facingBin:headingToDir(f0*180/Math.PI), ticks, root:[+gk.x.toFixed(2),+gk.y.toFixed(2)], sp:[+q.x.toFixed(1),+q.y.toFixed(1)], ball:[+bl.x.toFixed(2),+bl.y.toFixed(2),+bl.z.toFixed(2)], ballSp:[+bq.x.toFixed(1),+bq.y.toFixed(1)], handSp: hn?[+hn.x.toFixed(1),+hn.y.toFixed(1)]:null, targetSp: tg?[+tg.x.toFixed(1),+tg.y.toFixed(1)]:null,
      committed: committed?{target:committed.target.map(v=>+v.toFixed(2)), feet:committed.feet.map(v=>+v.toFixed(2)), tier:committed.tier, action:committed.action}:null, cls: cls?{family:cls.family,zClass:cls.zClass,hClass:cls.hClass,zH:cls.zH,goalSide:cls.goalSide,L:cls.L,dz:cls.dz,z:cls.z}:null,
      ctx: ctx?{pick:ctx.pick&&{id:ctx.pick.id,inventory:ctx.pick.inventory_id,transform:ctx.pick.transform,score:ctx.pick.score,why:ctx.pick.why}, situation:ctx.situation, scored:ctx.scored}:null, contact, liveState:cur&&cur.state, liveArt:cur&&cur.artLabel, place: pl?{raw:pl.rawErrPx,corr:pl.corrPx,res:pl.finalErrPx,capped:pl.capped}:null, lastContact: lc?{errPx:lc.errPx,spritePx:lc.spritePx,errM:lc.errM,source:lc.source}:null }; }, c);
  await new Promise(r=>setTimeout(r,150)); const clip={x:Math.round(g.sp[0])-120,y:Math.round(g.sp[1])-115,width:240,height:150};
  await p.screenshot({path:path.join(OUT,c.id+"_live.png"),clip});
  await p.evaluate(()=>{ S.dbg.anim=true; }); await new Promise(r=>setTimeout(r,150)); await p.screenshot({path:path.join(OUT,c.id+"_live_marks.png"),clip}); await p.screenshot({path:path.join(OUT,c.id+"_overlay_full.png"),clip:{x:0,y:60,width:1100,height:160}}); await p.evaluate(()=>{ S.dbg.anim=false; });
  // the alternative orientation, drawn once by the review override with the same bounded hand alignment, for comparison
  const alt=await p.evaluate((altKey)=>{ const gk=S.pt.gk; const hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null; GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key:altKey, ik:true, simHand:hn, showLabel:false}; return {altKey}; }, c.alt);
  await new Promise(r=>setTimeout(r,150)); await p.screenshot({path:path.join(OUT,c.id+"_alt.png"),clip}); await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; });
  rec.push({...c,...g,file:c.id+"_live.png",fileMarks:c.id+"_live_marks.png",fileAlt:c.id+"_alt.png"});
  const pk=g.ctx&&g.ctx.pick; console.log(c.id,"| expect",c.expect,"| picked",pk?pk.id+" "+pk.transform+" "+pk.score:"none","| cls",g.cls&&g.cls.family,g.cls&&g.cls.zClass,"z",g.cls&&g.cls.z,"L",g.cls&&g.cls.L,g.cls&&g.cls.goalSide,"| contact",g.contact&&g.contact.outcome,"| place",g.place,"| lastContact",g.lastContact&&g.lastContact.spritePx,"| scored",g.ctx&&g.ctx.scored.filter(x=>x.score>0).map(x=>x.id+" "+x.score).join(", "));
}
fs.writeFileSync(path.join(OUT,"cases.json"),JSON.stringify(rec,null,1)); await b.close();})();

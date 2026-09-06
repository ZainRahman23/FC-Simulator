// LOW-SAVE BODY-SCALE COMPARISON on the plain default page: for each source still (114 / 115 / 116) run its representative save, freeze
// at the simulation's own contact tick and capture, at the SAME keeper root: the SET keeper, the still drawn at the source art's own
// pixel density, and the still at its measured body scale. Also traces the SET → pose switch for a size pop.
//   node low_scale_compare.js <outdir>
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs"); const path=require("path");
const OUT=process.argv[2]||"low_scale"; fs.mkdirSync(OUT,{recursive:true});
const CASES=[
 {id:"P114", pose:"SW_LOW_LEFT", inv:"GK_POSE_114", facing:"south-west", deg:135, lat:-1.8, z:0.25, v:22},
 {id:"P115", pose:"W_LOW_LEFT",  inv:"GK_POSE_115", facing:"west",       deg:180, lat:-1.4, z:0.25, v:22},
 {id:"P116", pose:"NW_LOW_LEFT", inv:"GK_POSE_116", facing:"north-west", deg:225, lat:-1.4, z:0.5,  v:22},
];
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-lsc-"+Date.now(),args:["--no-sandbox"]});
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
    let t=0, committed=null, ctx=null, cls=null; while(t<300){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); t++; const gk=S.pt.gk;
      if(gk.committed&&!committed) committed=gk.committed;
      if(S.gkAnim.commit&&S.gkAnim.commit.ctx!==undefined&&!ctx){ ctx=S.gkAnim.commit.ctx; cls=S.gkAnim.commit.cls; }
      if(gk.contact||S.pt.paused) break; if(committed&&S.pt.now>=committed.t0+committed.execTime+0.25) break; }
    S.pt.paused=true;
    const gk=S.pt.gk, cur=S.gkAnim.cur, q=sproj3(gk.x,0,gk.y), pl=cur&&cur.place;
    return {sp:[+q.x.toFixed(1),+q.y.toFixed(1)], root:[+gk.x.toFixed(2),+gk.y.toFixed(2)], dir:headingToDir(gk.facing*180/Math.PI),
            pick: ctx&&ctx.pick?{id:ctx.pick.id, transform:ctx.pick.transform, score:ctx.pick.score}:null,
            cls: cls?{family:cls.family,hClass:cls.hClass,z:cls.z,L:cls.L,goalSide:cls.goalSide}:null,
            place: pl?{raw:pl.rawErrPx,corr:pl.corrPx,res:pl.finalErrPx,capped:pl.capped}:null, art:cur&&cur.artLabel}; }, c);
  const CLIP={x:Math.round(g.sp[0])-150, y:Math.round(g.sp[1])-150, width:300, height:220};
  // SET keeper at the same root
  await p.evaluate((dir)=>{ GK_ANIM.reviewOverride={kind:"state", state:"set", dir, showLabel:false}; }, g.dir);
  await new Promise(r=>setTimeout(r,180)); await p.screenshot({path:path.join(OUT,c.id+"_A_SET.png"), clip:CLIP});
  // the still at the source art's own density
  const keep=await p.evaluate((key)=>{ const an=S.gkAnim.savePoses.CONTEXTUAL.ANY[key].anchors, k={ps:an.pixel_scale};
    an.pixel_scale=1; const gk=S.pt.gk, hn=gk.handNow?sproj3(gk.handNow[0],gk.handNow[2],gk.handNow[1]):null;
    GK_ANIM.reviewOverride={kind:"savepose", family:"CONTEXTUAL", side:"ANY", key, ik:true, simHand:hn, showLabel:false}; return k; }, c.pose);
  await new Promise(r=>setTimeout(r,180)); await p.screenshot({path:path.join(OUT,c.id+"_B_BEFORE.png"), clip:CLIP});
  // the same still at its measured body scale
  await p.evaluate((a)=>{ S.gkAnim.savePoses.CONTEXTUAL.ANY[a.key].anchors.pixel_scale=a.ps; }, {key:c.pose, ps:keep.ps});
  await new Promise(r=>setTimeout(r,180)); await p.screenshot({path:path.join(OUT,c.id+"_C_CORRECTED.png"), clip:CLIP});
  await p.evaluate(()=>{ GK_ANIM.reviewOverride=null; }); await new Promise(r=>setTimeout(r,180));
  await p.screenshot({path:path.join(OUT,c.id+"_D_LIVE.png"), clip:CLIP});
  rec.push({...c, ...g, clip:CLIP, pixel_scale:keep.ps});
  console.log(`${c.id} ${c.inv} | ${g.cls?g.cls.family+" "+g.cls.hClass+" "+g.cls.goalSide:"-"} | pick ${g.pick?g.pick.id+" "+g.pick.transform+" "+g.pick.score:"NONE"} | scale ${keep.ps} | place ${g.place?JSON.stringify(g.place):"-"}`);
}
fs.writeFileSync(path.join(OUT,"cases.json"), JSON.stringify(rec,null,1));
await b.close();})();

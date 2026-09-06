// REAL-SHOT SCAN on the DEFAULT page (no manifest, no query, no override): which charge/technique from a tight-angle or central shooter
// produces a top-corner / overhead ball, what the simulation commits to, and which pose the live selector chooses on its own.
const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core"); const fs=require("fs");
const OUTF=process.argv[2]||"real_shot_scan.json";
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-rss-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900,deviceScaleFactor:1});
await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
console.log("default manifest contextual ids:",await p.evaluate(()=>(S.gkAnim.contextual||[]).map(c=>c.id)));
const shots=[]; const out=[];
const SPEC=JSON.parse(process.argv[3]||"null")||[["S_NEAR",[103.5,46],[105,37.3],["LACES","POWER","CHIP"],[0.55,0.7,0.85,1.0]]];
for(const [cid,origin,aim,techs,cs] of SPEC) for(const tech of techs) for(const c of cs) shots.push({cid,origin,aim,tech,c});
for(const sh of shots){
  const r=await p.evaluate((sh)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; S.dbg.anim=false; GK_ANIM.reviewOverride=null; S.pt.slow=1; S.pt.pauseAtContact=false;
    ptGkFire({name:"PLACE", origin:sh.origin, aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0, z:1.0, v:0.001}}); S.pt.b.vx=0; S.pt.b.vy=0; S.pt.b.vz=0; S.pt.kick=null; S.pt.gk.shotT0=null; S.pt.gk.shotActive=false; ptStep(); ptStep();
    try { ptGkFire({name:"REAL "+sh.cid, origin:sh.origin, aim:sh.aim, tech:sh.tech, c:sh.c}); } catch(e){ return {err:String(e)}; }
    gkAnimResetView(); S.pt.paused=false; let ticks=0, committed=null, ctx=null, cls=null, contact=null, crossZ=null;
    while(ticks<240){ ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); ticks++; const g=S.pt.gk, bl=S.pt.b;
      if(g.committed&&!committed) committed={target:g.committed.target.map(v=>+v.toFixed(2)), tier:g.committed.tier, action:g.committed.action};
      if(S.gkAnim.commit&&S.gkAnim.commit.ctx!==undefined&&!ctx){ ctx=S.gkAnim.commit.ctx; cls=S.gkAnim.commit.cls; }
      if(bl.x>=104.9&&crossZ===null) crossZ=[+bl.y.toFixed(2),+bl.z.toFixed(2)];
      if(g.contact&&!contact){ contact={outcome:g.contact.outcome, volume:g.contact.volume, tick:ticks}; break; }
      if(bl.x>106.5||bl.z<0) break; }
    return {ticks, committed, cls: cls?{family:cls.family,hClass:cls.hClass,L:cls.L,dz:cls.dz}:null, pick: ctx&&ctx.pick?{id:ctx.pick.id,score:ctx.pick.score}:null, situation: ctx?ctx.situation:null, contact, crossZ, art: S.gkAnim.cur?S.gkAnim.cur.artLabel:null}; }, sh);
  out.push({...sh,...r}); console.log(sh.cid, sh.tech, sh.c, "| line-crossing (y,z)", r.crossZ, "| committed", r.committed&&r.committed.target, r.committed&&r.committed.tier, "| cls", r.cls, "| pick", r.pick, "| contact", r.contact&&r.contact.outcome, r.err||"");
}
fs.writeFileSync(OUTF,JSON.stringify(out,null,1)); await b.close();})();

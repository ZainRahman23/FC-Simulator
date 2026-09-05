const NM=process.env.PUPPETEER_NODE_MODULES; if(NM) module.paths.unshift(NM);
const puppeteer=require("puppeteer-core");
(async()=>{const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"chrome-settle-"+Date.now(),args:["--no-sandbox"]});
const p=await b.newPage(); await p.setViewport({width:1400,height:900}); await p.goto("http://127.0.0.1:8126/sandbox/visual/match.html?r="+Date.now(),{waitUntil:"domcontentloaded",timeout:180000});
for(let i=0;i<900;i++){const ok=await p.evaluate(()=>{const el=document.getElementById("loading");return !!(el&&el.style.display==="none"&&typeof ptEnter==="function"&&S.gkAnim&&S.gkAnim.loaded);});if(ok)break;await new Promise(r=>setTimeout(r,100));}
for(const [d,deg] of [["west",180],["south-west",135],["north-west",225]]){
  const r=await p.evaluate((deg)=>{ if(!(S.pt&&S.pt.on))ptEnter(); ptReset(); S.pt.paused=true; GK_ANIM.reviewOverride=null; const a=deg*Math.PI/180, R=30; ptGkFire({name:"S", origin:[101.7+Math.cos(a)*R, 34+Math.sin(a)*R], aim:[105,34], tech:"LACES", c:0.5, synth:{lat:0,z:1.0,v:0.001}}); S.pt.b.vx=0;S.pt.b.vy=0;S.pt.b.vz=0;S.pt.b.z=0;S.pt.kick=null;S.pt.gk.shotT0=null;S.pt.gk.shotActive=false;
    const out=[]; for(let t=1;t<=20;t++){ for(let i=0;i<60;i++) ptStep(); gkAnimDraw(S.pt,S.pt.gk,1/60); const g=S.pt.gk; const c=S.gkAnim.cur; out.push([t, +(Math.hypot(g.vx||0,g.vy||0)).toFixed(3), c&&c.state, +g.x.toFixed(2), +g.y.toFixed(2)]); } return out; },deg);
  console.log(d, JSON.stringify(r.filter((_,i)=>i%2==1)));
}
await b.close();})();

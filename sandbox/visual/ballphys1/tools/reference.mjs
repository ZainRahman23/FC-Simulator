// Extract real current repository functions, not a hand-written comparison.
import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../match.js',import.meta.url),'utf8');
function block(token){let p=source.indexOf(token);if(p<0)throw Error('Missing reference '+token);let start=source.indexOf('{',p),depth=1,i=start+1,quote=null,comment=null;
 for(;i<source.length&&depth;i++){const ch=source[i],next=source[i+1];if(comment==='line'){if(ch==='\n')comment=null;continue;}if(comment==='block'){if(ch==='*'&&next==='/'){comment=null;i++;}continue;}
 if(quote){if(ch==='\\'){i++;continue;}if(ch===quote)quote=null;continue;}if(ch==='/'&&next==='/'){comment='line';i++;continue;}if(ch==='/'&&next==='*'){comment='block';i++;continue;}if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}if(ch==='{')depth++;if(ch==='}')depth--;}
 return source.slice(p,i)+(token.startsWith('const ')?';':'');}
const tokens=['const PT =','const PT_CURVE =','const PT_CURVE_SETUP =','const PT_X3 =','function ptX3()','function ptX3K()','function ptX3Deg()','function ptX3Reach()','function ptCurveClampDist(','function ptCurveSetupLookupDeg(','function ptCurveNaturalRange(','const KICK_CHARGE =','function ptChargeLaunch(','function ptFam(','function ptBallStep('];
const ctx=vm.createContext({console,Math});vm.runInContext(tokens.map(block).join('\n')+`\nconst PT_DT=1/60;const GOALFX={collision:false};function gkTryContact(){return null;}function netV2Collide(){};globalThis.api={ptChargeLaunch,ptFam,ptBallStep,ptCurveSetupLookupDeg,ptX3K,curve:PT_CURVE};`,ctx);
export function references(){
 const a=ctx.api,out=[];
 for(const [id,fam,D,tech,c] of [ ['current-ground','SHORT',15],['current-driven','DRIVEN',25],['current-loft','LOFT',25],['current-power',null,20,'LACES_POWER',0.8],['current-chip',null,15,'CHIP',0.6],['current-curve',null,25,'INSIDE',0.9] ]){
  const L=tech?a.ptChargeLaunch(tech,c):{v0:a.ptFam(fam,D)[0],vz:a.ptFam(fam,D)[1]};const angle=id==='current-curve'?a.ptCurveSetupLookupDeg(c,D)*Math.PI/180:0;
  const b={x:0,y:0,z:0,vx:L.v0*Math.cos(angle),vy:L.v0*Math.sin(angle),vz:L.vz,ctrl:false};if(id==='current-curve')b.curve={s:a.curve.base+a.curve.chargeGain*c**a.curve.fPow,sgn:1};
  const initial=structuredClone(b),t={b,net:null},frames=[{time:0,p:[0,0.11,0],v:[b.vx,b.vz,b.vy]}];
  for(let n=0;n<1200;n++){a.ptBallStep(t);frames.push({time:(n+1)/60,p:[b.x,b.z+0.11,b.y],v:[b.vx,b.vz,b.vy]});}
  out.push({id,title:id.replace('current-','').toUpperCase(),initial,frames,family:fam||'SHOT',technique:tech||fam,selectedFoot:'R',preferredFoot:'R',targetDistance:D,curveK:a.ptX3K(),source:'match.js actual ptBallStep; no keeper/net/frame in free-flight comparison'});
 }
 return out;
}
if(process.argv[1]===new URL(import.meta.url).pathname)console.log(JSON.stringify(references().map(({frames,...r})=>r),null,2));

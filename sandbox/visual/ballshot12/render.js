import {shotSVG,fmt,esc} from '../ballshot1/render.js';
export function comparisonSVG(runs,family,t){
 const chip=family==='CHIP',cols=chip?2:3,W=1920,pw=W/cols,ph=456,H=1032;
 const title={LACES:'NORMAL / LACES',POWER:'POWER SHOT',CHIP:'CHIP'}[family];
 const panels=runs.filter(r=>r.definition.family===family).map((s,i)=>{
  const x=i%cols*pw,y=100+Math.floor(i/cols)*ph,sp=s.definition.shotPower,v=s.action.metadata.speed,p=s.metrics.goalPlane;
  const view=chip?'side':'touchline';
  const scene=shotSVG(s,t,{width:pw,height:340,view,overlay:false,trail:false}).replace('<svg ','<svg x="0" y="52" ');
  const after=p&&t>=p.time,accent=sp===90?'#f3c56b':'#d7e6d9';
  return `<g transform="translate(${x} ${y})"><rect x="6" y="0" width="${pw-12}" height="${ph-10}" rx="9" fill="#143126" stroke="${sp===90?'#c8a05c':'#315343'}"/><text x="24" y="34" fill="${accent}" font-size="27" font-weight="700">${sp} SHOT POWER</text><text x="${pw-24}" y="34" fill="#c3d2c7" font-size="22" text-anchor="end">${fmt(v,2)} m/s</text>${scene}<rect x="12" y="392" width="${pw-24}" height="46" fill="#143126"/><text x="24" y="412" fill="${after?'#f3c56b':'#c3d2c7'}" font-size="17">${chip?`First landing ${fmt(s.metrics.firstLanding.distance,2)} m · apex ${fmt(s.metrics.apex,2)} m`:`19 m arrival ${fmt(p?.time,3)} s${after?' · reached':''}`}</text><text x="24" y="434" fill="#90ad9b" font-size="15">${chip?'Same 30° launch angle and backspin at every rating':'Same location, aim, spin and camera at every rating'}</text></g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial"><rect width="100%" height="100%" fill="#0b211a"/><text x="26" y="39" fill="#eff1df" font-size="30" font-weight="700">${esc(title)} · RATING COMPARISON</text><text x="26" y="74" fill="#a9c2ae" font-size="20">Full intent · clean preferred foot · synchronized at contact · 1× real time</text><text x="${W-28}" y="42" text-anchor="end" fill="#f3c56b" font-size="27">${fmt(t,2)} s</text><text x="${W-28}" y="74" text-anchor="end" fill="#a9c2ae" font-size="18">Reference goal at 19 m · no keeper or frame collision</text>${panels}</svg>`;
}

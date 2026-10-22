import {selectPassTarget,TARGET_ASSISTANCE} from './target-assistance.mjs?v=depth9b';
import {assistanceFixture} from './assist-fixtures.mjs?v=depth9b';
export const MAP_COLORS={MANUAL:'#15282c',A:'#74bdf0',B:'#63d5ad',C:'#f5c86b',D:'#f2917d',E:'#c5a0ee'};
export function selectionMap(family,scenario,{columns=161,rows=111,minAngle=-40,maxAngle=40}={}){
 const fullMs=TARGET_ASSISTANCE[family].fullHoldMs,base=assistanceFixture(family,scenario),ids=['MANUAL',...base.candidates.map(c=>c.id)],cells=[];
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  const angle=minAngle+x/(columns-1)*(maxAngle-minAngle),hold=y/(rows-1)*fullMs,r=angle*Math.PI/180;
  base.aimPoint=[base.origin[0]+40*Math.cos(r),.11,base.origin[2]+40*Math.sin(r)];base.holdMs=hold;
  cells.push(ids.indexOf(selectPassTarget(base).selectedId??'MANUAL'));
 }
 return {family,scenario,columns,rows,minAngle,maxAngle,fullMs,ids,cells,history:'stateless map: no previous receiver; live controls retain selection with hysteresis'};
}
export function drawSelectionMap(canvas,map,angle=0,hold=0){
 const g=canvas.getContext('2d'),r=canvas.getBoundingClientRect(),w=r.width,h=r.height,dp=Math.min(devicePixelRatio,2);canvas.width=Math.round(w*dp);canvas.height=Math.round(h*dp);g.setTransform(dp,0,0,dp,0,0);
 const box={x:60,y:24,w:w-80,h:h-72};g.fillStyle='#0f2025';g.fillRect(0,0,w,h);
 const cw=box.w/map.columns,ch=box.h/map.rows;
 for(let y=0;y<map.rows;y++)for(let x=0;x<map.columns;x++){g.fillStyle=MAP_COLORS[map.ids[map.cells[y*map.columns+x]]];g.fillRect(box.x+x*cw,box.y+y*ch,Math.ceil(cw),Math.ceil(ch));}
 g.font='12px system-ui';g.fillStyle='#d5e3dc';g.fillText('Hold ↓',5,15);g.fillText('Aim direction →',box.x+box.w/2-45,h-5);
 for(let n=0;n<=4;n++){const a=map.minAngle+n*(map.maxAngle-map.minAngle)/4;g.fillText(a.toFixed(0)+'°',box.x+n*box.w/4-10,h-28);g.fillText(Math.round(n*map.fullMs/4)+' ms',3,box.y+n*box.h/4+4);}
 const x=box.x+(angle-map.minAngle)/(map.maxAngle-map.minAngle)*box.w,y=box.y+Math.max(0,Math.min(1,hold/map.fullMs))*box.h;
 if(x>=box.x&&x<=box.x+box.w){g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.arc(x,y,6,0,Math.PI*2);g.stroke();g.strokeStyle='#000';g.lineWidth=1;g.beginPath();g.arc(x,y,8,0,Math.PI*2);g.stroke();}
 // Label the central run of each receiver's largest row span.
 for(const id of map.ids){if(id==='MANUAL')continue;const idx=map.ids.indexOf(id);let best=null;for(let y=2;y<map.rows-2;y++){let start=-1;for(let x=0;x<=map.columns;x++){const match=x<map.columns&&map.cells[y*map.columns+x]===idx;if(match&&start<0)start=x;if(!match&&start>=0){const len=x-start;if(!best||len>best.len)best={x:(start+x)/2,y,len};start=-1;}}}if(best){g.font='bold 14px system-ui';g.fillStyle='#172a28';g.fillText(id,box.x+best.x*cw-4,box.y+best.y*ch+5);}}
 return box;
}

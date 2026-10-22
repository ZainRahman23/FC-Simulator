export const FAMILIES=['INSIDE','OUTSIDE','LACES','POWER','CHIP'];
export const LABELS={INSIDE:'Finesse',OUTSIDE:'Trivela',LACES:'Normal / Laces',POWER:'Power',CHIP:'Chip'};
export const SPEEDS={INSIDE:30,OUTSIDE:32,LACES:34,POWER:39,CHIP:17};
export const ORIGINS={centre:[86,.11,34],left:[86,.11,27],right:[86,.11,41],long:[80,.11,34]};
export const GRID={nx:32,ny:12,attempts:20,xMin:-3.49,xMax:3.49,yMin:.11,yMax:2.27,strataX:4,strataY:5};
export const PROFILE={name:'GOOD',positioning:72,reflex:78,diving:78,handling:78,jump:74,height:190,weight:85,acceleration:72,sprint_speed:64,strength:74,agility:73};
export const OUTCOMES=['CLEAN CATCH','CONTROLLED PARRY','DANGEROUS PARRY','DEFLECTION WIDE/OVER','GOAL','GK CONTACT BUT GOAL','POST/CROSSBAR WITHOUT GK','MISS','UNRESOLVED'];
export function keyedSeed(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function unit(h){h=(h+0x6D2B79F5)>>>0;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
export function sampleTarget(origin,ix,iy,attempt){const seed=keyedSeed(`GK-SHOT-MAP-1/${origin}/${ix}/${iy}/${attempt}`),sx=attempt%GRID.strataX,sy=Math.floor(attempt/GRID.strataX),u=(sx+.15+.7*unit(seed))/GRID.strataX,v=(sy+.15+.7*unit(seed^0xA5A5A5A5))/GRID.strataY;return {seed,lateral:GRID.xMin+(ix+u)*(GRID.xMax-GRID.xMin)/GRID.nx,height:GRID.yMin+(iy+v)*(GRID.yMax-GRID.yMin)/GRID.ny};}
export function cellOf(c){if(!c)return null;const x=c.p[2]-34,y=c.p[1];if(x<GRID.xMin-1e-6||x>GRID.xMax+1e-6||y<GRID.yMin-1e-6||y>GRID.yMax+1e-6)return null;return [Math.min(GRID.nx-1,Math.max(0,Math.floor((x-GRID.xMin)/(GRID.xMax-GRID.xMin)*GRID.nx))),Math.min(GRID.ny-1,Math.max(0,Math.floor((y-GRID.yMin)/(GRID.yMax-GRID.yMin)*GRID.ny)))];}

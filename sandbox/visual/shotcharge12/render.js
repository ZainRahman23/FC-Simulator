import {behindSVG as approvedSVG,CAMERA,WIDTH,HEIGHT,project,frameAt} from '../shotcharge11/render.js';
export {CAMERA,WIDTH,HEIGHT,project,frameAt};
// The exact approved camera/projection and scene, with a larger fixed viewport
// around it so severe shanks remain visible. Same framing for every live shot/video.
export const VIEWPORT=Object.freeze({x:-160,y:-120,width:2240,height:1260});
export function behindSVG(run,t,{label=true}={}){
 let svg=approvedSVG(run,t).replace('viewBox="0 0 1920 1080"','viewBox="-160 -120 2240 1260"').replace('<rect width="1920" height="1080" fill="#285e43"/>','<rect x="-160" y="-120" width="2240" height="1260" fill="#285e43"/>');
 if(!label)svg=svg.replace(/<rect x="38" y="34"[\s\S]*?<\/text>/,'');
 return svg;
}

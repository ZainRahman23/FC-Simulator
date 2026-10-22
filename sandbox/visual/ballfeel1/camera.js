// Faithful CAMERA_V1 projection at runtime zoom=1. match.js uses a fixed
// 1280×720 reference viewport even when the CSS canvas dimensions change.
// Kernel Z=0 is pitch Y=34, so camera Z becomes 111-34 = 77.
export function touchlineProjection(width,height,railX){
 const th=22*Math.PI/180,fy=-Math.sin(th),fz=-Math.cos(th),uy=-fz,uz=fy,fp=360/Math.tan(14*Math.PI/180);
 return p=>{const vx=p[0]-railX,vy=p[1]-30,vz=p[2]-77,d=vy*fy+vz*fz;return [width/2+fp*vx/d,height/2-fp*(vy*uy+vz*uz)/d,fp/d];};
}

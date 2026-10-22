// Proposed contract only; not imported into gameplay.
const enc=new TextEncoder();
export async function accuracyDraws({matchSeed,shooterId,stableShotEventId}){
 const uniform=async(axis,drawIndex)=>{
  const key=JSON.stringify(['shot-accuracy-v1',String(matchSeed),String(shooterId),String(stableShotEventId),axis,drawIndex]);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(key)));
  const hex=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
  const integer52=Number.parseInt(hex.slice(0,13),16),value=(integer52+.5)/2**52;
  return {key,digest:hex,value};
 };
 const horizontal=await Promise.all([uniform('horizontal',0),uniform('horizontal',1)]),elevation=await Promise.all([uniform('elevation',0),uniform('elevation',1)]);
 return {horizontal,elevation,standardizedHorizontal:Math.sqrt(6)*(horizontal[0].value-horizontal[1].value),standardizedElevation:Math.sqrt(6)*(elevation[0].value-elevation[1].value)};
}

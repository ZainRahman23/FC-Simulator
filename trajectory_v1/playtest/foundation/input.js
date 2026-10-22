// One shared input controller; the real UI uses the default monotonic clock.
export function attachInput({keyboard,pointer,cancelTarget,now=()=>performance.now(),onStart,onRelease,onCancel}){
 let active=null;
 const begin=(kind,id,trusted)=>{if(active)return;active={kind,id,start:now(),trusted};onStart?.({...active});};
 const finish=(kind,id,trusted)=>{if(!active||active.kind!==kind||active.id!==id)return;const end=now(),press=active;active=null;onRelease({kind,holdMs:end-press.start,pressTime:press.start,releaseTime:end,pressTrusted:!!press.trusted,releaseTrusted:!!trusted});};
 const cancel=()=>{if(active){active=null;onCancel?.();}};
 const listeners=[];
 const listen=(target,name,fn)=>{target.addEventListener(name,fn);listeners.push(()=>target.removeEventListener(name,fn));};
 listen(keyboard,'keydown',e=>{if(e.code!=='Space')return;e.preventDefault();if(!e.repeat)begin('keyboard','Space',e.isTrusted);});
 listen(keyboard,'keyup',e=>{if(e.code!=='Space')return;e.preventDefault();finish('keyboard','Space',e.isTrusted);});
 listen(pointer,'pointerdown',e=>{if(e.button!==0||active)return;e.preventDefault();try{pointer.setPointerCapture?.(e.pointerId);}catch{}begin('pointer',e.pointerId,e.isTrusted);});
 listen(pointer,'pointerup',e=>{e.preventDefault();finish('pointer',e.pointerId,e.isTrusted);});
 listen(pointer,'pointercancel',cancel);listen(pointer,'lostpointercapture',cancel);
 listen(cancelTarget,'blur',cancel);
 return {cancel,getActive:()=>active?{...active}:null,destroy(){cancel();listeners.forEach(f=>f());}};
}

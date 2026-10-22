// One shared input controller; the real UI uses the default monotonic clock.
export function attachInput({keyboard,pointer,cancelTarget,now=()=>performance.now(),onStart,onRelease,onCancel}){
 let active=null;
 const begin=(kind,id)=>{if(active)return;active={kind,id,start:now()};onStart?.({...active});};
 const finish=(kind,id)=>{if(!active||active.kind!==kind||active.id!==id)return;const end=now(),press=active;active=null;onRelease({kind,holdMs:end-press.start,pressTime:press.start,releaseTime:end});};
 const cancel=()=>{if(active){active=null;onCancel?.();}};
 const listeners=[];
 const listen=(target,name,fn)=>{target.addEventListener(name,fn);listeners.push(()=>target.removeEventListener(name,fn));};
 listen(keyboard,'keydown',e=>{if(e.code!=='Space')return;e.preventDefault();if(!e.repeat)begin('keyboard','Space');});
 listen(keyboard,'keyup',e=>{if(e.code!=='Space')return;e.preventDefault();finish('keyboard','Space');});
 listen(pointer,'pointerdown',e=>{if(e.button!==0||active)return;e.preventDefault();try{pointer.setPointerCapture?.(e.pointerId);}catch{}begin('pointer',e.pointerId);});
 listen(pointer,'pointerup',e=>{e.preventDefault();finish('pointer',e.pointerId);});
 listen(pointer,'pointercancel',cancel);listen(pointer,'lostpointercapture',cancel);
 listen(cancelTarget,'blur',cancel);
 return {cancel,getActive:()=>active?{...active}:null,destroy(){cancel();listeners.forEach(f=>f());}};
}

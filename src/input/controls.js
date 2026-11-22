import {Actions,attachKeyboard,attachMouseLook,fpsBindings} from '../../vendor/vanillajs/modules/input/index.js';
import {FLAG,ANGLE} from '../sim/command.js';

export function controls(canvas,enabled,mouseEnabled,onLock,unlock,onError) {
  const actions=new Actions();
  const keyboard=attachKeyboard(window,actions,{enabled,bindings:{...fpsBindings,KeyQ:'focus',Digit1:'slot1',Digit2:'slot2',Digit3:'slot3'}});
  // Entry buttons and the canvas share this surface. The original trusted
  // pointerdown reaches the engine and its requestPointerLock in one gesture.
  const surface=canvas.closest('main');
  const radiansPerPixel=.0022;
  let dragOnly=false, drag=null, dragYaw=0, dragPitch=0;
  const mouse=attachMouseLook(surface,{enabled:()=>!dragOnly&&mouseEnabled(),onLock,onUnlock:unlock,onError,sensitivity:radiansPerPixel});
  const lifetime=new AbortController(), options={signal:lifetime.signal};
  let cancel=false, rightHeld=false;
  // An explicitly uncaptured mouse can still drag across the edge of the canvas.
  canvas.addEventListener('pointerdown',e=>{
    if(!dragOnly || !enabled() || e.button!==0 || drag)return;
    canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
    drag={id:e.pointerId,x:e.clientX,y:e.clientY};
  },options);
  canvas.addEventListener('pointermove',e=>{
    if(!enabled() || drag?.id!==e.pointerId)return;
    const bound=v=>Math.max(-Math.PI,Math.min(Math.PI,v));
    dragYaw=bound(dragYaw-(e.clientX-drag.x)*radiansPerPixel);
    dragPitch=bound(dragPitch-(e.clientY-drag.y)*radiansPerPixel);
    drag.x=e.clientX;drag.y=e.clientY;
  },options);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])
    canvas.addEventListener(event,e=>{if(e.pointerId===drag?.id)drag=null;},options);
  surface.addEventListener('mousedown',e=>{if(e.button===2 && enabled()){rightHeld=true;e.preventDefault();}},options);
  canvas.ownerDocument.addEventListener('mouseup',e=>{if(e.button===2)rightHeld=false;},options);
  surface.addEventListener('pointercancel',()=>{rightHeld=false;},options);
  surface.addEventListener('contextmenu',e=>{if(enabled())e.preventDefault();},options);
  return {
    get locked(){return mouse.locked;},
    useDrag(value){dragOnly=value;},
    discardPointerSample(){mouse.consume();},
    clear(release=true){
      keyboard.clear();mouse.consume();if(release)mouse.release();
      if(drag && canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id);
      drag=null;dragYaw=0;dragPitch=0;rightHeld=false;cancel=true;
    },
    sample(sensitivity,inverted){
      const m=mouse.consume(), angle=v=>Math.max(-31415,Math.min(31415,Math.round(v*ANGLE)));
      m.yaw+=dragYaw;m.pitch+=dragPitch;dragYaw=0;dragPitch=0;
      const fire=actions.consume('fire'), jump=actions.consume('jump'), reload=actions.consume('reload');
      const flags=(jump?FLAG.jump:0)|(actions.value('fire')||m.primary?FLAG.held:0)|(fire||m.pressed?FLAG.press:0)|
        (reload?FLAG.reload:0)|(actions.value('sprint')?FLAG.sprint:0)|(cancel?FLAG.cancel:0)|
        (rightHeld||actions.value('focus')?FLAG.focus:0);
      cancel=false;
      let slot=-1;
      for(let i=0;i<3;i++) if(actions.consume('slot'+(i+1))) slot=i;
      return [actions.axis('left','right'),actions.axis('forward','backward'),
        angle(m.yaw*sensitivity+actions.axis('yawRight','yawLeft')*.028),
        angle(m.pitch*sensitivity*(inverted?-1:1)+actions.axis('pitchDown','pitchUp')*.022),flags,slot];
    },
    dispose(){lifetime.abort();keyboard.dispose();mouse.dispose();}
  };
}

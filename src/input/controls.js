import {Actions,attachKeyboard,attachMouseLook,fpsBindings} from '../../vendor/vanillajs/modules/input/index.js';
import {FLAG,ANGLE} from '../sim/command.js';

export function controls(canvas,enabled,unlock,onError) {
  const actions=new Actions();
  const keyboard=attachKeyboard(window,actions,{enabled,bindings:{...fpsBindings,Digit1:'slot1',Digit2:'slot2',Digit3:'slot3'}});
  const mouse=attachMouseLook(canvas,{enabled,onUnlock:unlock,onError,sensitivity:.0022});
  let cancel=false;
  return {
    get locked(){return mouse.locked;},
    clear(release=true){keyboard.clear();mouse.consume();if(release)mouse.release();cancel=true;},
    sample(sensitivity,inverted){
      const m=mouse.consume(), angle=v=>Math.max(-31415,Math.min(31415,Math.round(v*ANGLE)));
      const fire=actions.consume('fire'), jump=actions.consume('jump'), reload=actions.consume('reload');
      const flags=(jump?FLAG.jump:0)|(actions.value('fire')||m.primary?FLAG.held:0)|(fire||m.pressed?FLAG.press:0)|
        (reload?FLAG.reload:0)|(actions.value('sprint')?FLAG.sprint:0)|(cancel?FLAG.cancel:0);
      cancel=false;
      let slot=-1;
      for(let i=0;i<3;i++) if(actions.consume('slot'+(i+1))) slot=i;
      return [actions.axis('left','right'),actions.axis('forward','backward'),
        angle(m.yaw*sensitivity+actions.axis('yawRight','yawLeft')*.028),
        angle(m.pitch*sensitivity*(inverted?-1:1)+actions.axis('pitchDown','pitchUp')*.022),flags,slot];
    },
    dispose(){keyboard.dispose();mouse.dispose();}
  };
}

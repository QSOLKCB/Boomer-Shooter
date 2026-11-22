export const PATTERNS=['Clockwork fan','Concentric rings','Rotating spiral','Split gate','Forge sweep'];
export const CHARGE=36;
const TAU=2*Math.PI;
const muzzle=[0,.98,-8.5];
const head=[.17,.17,.17];

export function patternAt(round,phase,seed,target) {
  // Each round samples aim, phase and lane once. Rendering reads this same plan.
  const mixed=Math.imul((seed^Math.imul(round+1,2654435761))>>>0,2246822519);
  const dial=((mixed^(mixed>>>13))>>>0)/4294967296;
  return {kind:round%5,phase,duration:138-12*phase,
    angle:Math.atan2(target[0]-muzzle[0],target[2]-muzzle[2]),dial:dial*TAU,
    lane:Math.round(Math.sin(dial*TAU)*6)};
}

export function emitPattern(field,plan,age) {
  const t=age-CHARGE;
  if(t<0)return;
  const {phase,kind}=plan;
  const stream=(angle,speed,size=head)=>field.emit(kind,muzzle,
    [Math.sin(angle)*speed,0,Math.cos(angle)*speed],size,145);
  switch(kind) {
    case 0:
      if(t%24===0 && t<=48)for(let i=-phase-2;i<=phase+2;i++)stream(plan.angle+i*.10,.25+.025*phase);
      break;
    case 1:
      if(t===0||t===26) {
        const n=26+phase*6;
        for(let i=0;i<n;i++)if(i%8!==0)stream(i*TAU/n+plan.dial+(t?.16:0),t?.32:.24);
      }
      break;
    case 2:
      if(t%5===0 && t<=65)for(let i=0;i<8;i++)stream(plan.dial+t*.028+i*TAU/8,.24+.018*phase);
      break;
    case 3:
      // Each row has its own centre lane, sized for the full standing body.
      if(t===0 || t===30) {
        const lane=gateLane(plan,t);
        for(let x=-12;x<=12;x++)if(Math.abs(x-lane)>2)
          field.emit(kind,[x,.94,-8.5],[0,0,.27],[.5,.94,.16],92);
      }
      break;
    case 4:
      if(t===0)field.emit(kind,[0,.25,-8.5],[0,0,.24+.02*phase],[12,.25,.18],96);
      break;
  }
}
export function gateLane(plan,t) {
  return t<30?plan.lane:plan.lane+(plan.lane>0?-2:2);
}

// Gameplay shapes are axis-aligned boxes. The player's coordinates are at the feet.
// Reduce both moving bodies to a segment relative to the player's starting box.
export function contactTime(hazard, before, after, half) {
  let enter=0, leave=1;
  for(let axis=0;axis<3;axis++) {
    const centre=before[axis]+(axis===1?half[1]:0);
    const origin=hazard.position[axis]-centre;
    const extent=hazard.half[axis]+half[axis];
    const travel=hazard.delta[axis]-(after[axis]-before[axis]);
    if(travel===0) {
      if(Math.abs(origin)>extent)return null;
      continue;
    }
    const a=(-extent-origin)/travel, b=(extent-origin)/travel;
    enter=Math.max(enter,Math.min(a,b));
    leave=Math.min(leave,Math.max(a,b));
    if(enter>leave)return null;
  }
  return enter;
}

export const MAX_SPAWNS=48;
function vector(v) {
  return Array.isArray(v) && v.length===3 &&
    [0,1,2].every(i=>Number.isFinite(v[i]) && Math.abs(v[i])<=1024);
}

export class HazardField {
  constructor(capacity=256) {
    if(!Number.isInteger(capacity)||capacity<1||capacity>512)throw RangeError('Invalid hazard capacity');
    this.capacity=capacity;
    this.live=[];
    this.nextId=1;
    this.spawned=0;
    this.rejected=0;
    this.checks=0;
    this.peak=0;
    this.batch=0;
  }
  emit(source,position,delta,half,life) {
    if(!Number.isInteger(source)||source<0||source>4||!vector(position)||!vector(delta)||
       !delta.some(v=>v!==0)||!vector(half)||half.some(v=>v<=0)||
       !Number.isInteger(life)||life<1||life>600)throw RangeError('Invalid hazard');
    if(this.batch>=MAX_SPAWNS||this.live.length>=this.capacity){this.rejected++;return false;}
    this.batch++;
    this.live.push({id:this.nextId++,source,position:[...position],delta:[...delta],half:[...half],life});
    this.spawned++;
    this.peak=Math.max(this.peak,this.live.length);
    return true;
  }
  // All contacts consume their projectile. Earliest time wins the one damage
  // slot in a tick, with original emission order breaking an exact tie.
  advance(before,after,half) {
    let keep=0, first=null;
    for(const h of this.live) {
      const time=contactTime(h,before,after,half);
      this.checks++;
      if(time!==null) {
        if(!first||time<first.time)first={id:h.id,source:h.source,time};
        continue;
      }
      for(let i=0;i<3;i++)h.position[i]+=h.delta[i];
      if(--h.life>0)this.live[keep++]=h;
    }
    this.live.length=keep;
    this.batch=0;
    return first;
  }
}

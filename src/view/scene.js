import {Renderer,boxVertices} from '../../vendor/vanillajs/modules/render-webgl/index.js';
import {mix,perspective,multiplyMatrices,viewMatrix,quatMultiply} from '../../vendor/vanillajs/modules/math/index.js';
import {characterView} from '../../vendor/vanillajs/modules/character/index.js';
import {steelworks,castingWheels} from './steelworks.js';
import {machine,viewGun,place} from './models.js';

const glow={health:[.31,1,.65],armour:[.28,.85,1],ammo:[1,.65,.19]};
const orange=[1,.49,.10], bright=[1,.91,.60];
function pickupMesh(out,p,t) {
  const [x,y,z]=p.position, c=glow[p.kind];
  boxVertices([x,y+.045,z],[.93,.085,.93],[.13,.19,.2],out);
  for(const side of [-1,1]) boxVertices([x+side*.44,y+.09,z],[.045,.055,.90],c,out);
  const height=y+.60+.085*Math.sin(t*.075+x), model=[];
  const box=(pos,size,color)=>boxVertices(pos,size,color,model);
  if (p.kind==='health') {
    box([0,0,0],[.40,.15,.14],c);box([0,0,0],[.15,.42,.14],c);
  } else if (p.kind==='armour') {
    box([0,.05,0],[.42,.25,.16],c);box([0,-.12,0],[.27,.13,.15],c);
    box([0,.05,-.09],[.22,.058,.02],[.88,.98,1]);
  } else for(let j=-1;j<=1;j++) {
    box([j*.12,0,0],[.086,.31,.11],c);box([j*.12,.18,0],[.07,.07,.09],bright);
  }
  place(out,model,[x,height,z],t*.025);
}

function trace(lines,a,b,c) { lines.push(...a,...c,...b,...c); }
function orientation(yaw,pitch) {
  return quatMultiply([0,Math.sin(yaw/2),0,Math.cos(yaw/2)],[Math.sin(pitch/2),0,0,Math.cos(pitch/2)]);
}

export class Scene {
  constructor(canvas,arena) {
    this.r=new Renderer(canvas);
    this.r.gl.clearColor(.16,.19,.19,1);
    this.structure=this.r.mesh(steelworks(arena));
    this.dynamic=this.r.mesh([]); this.lines=this.r.mesh([],'lines');
    this.guns=[0,1,2].map(i=>this.r.mesh(viewGun(i)));
    const flash=[]; boxVertices([.31,-.24,-1.10],[.08,.095,.15],bright,flash);
    boxVertices([.31,-.24,-1.22],[.039,.044,.13],orange,flash);
    this.flashMesh=this.r.mesh(flash);
    this.models=arena.pack.bots.types.map((p,i)=>machine(i,p.color));
    this.effects=[]; this.previous=null;
    this.stats={drawCalls:0,submittedTriangles:0,buffers:this.r.meshes.size,staticTriangles:this.structure.count/3};
  }
  reset() {this.effects.length=0;this.previous=null;}
  before(match) {this.previous=match.state;}
  feedback(match) {
    for(const e of match.events) {
      if(e.type==='death') this.effects.push({...e,point:[...match.actor(e.target).position]});
      else if (['shot','trace','impact','explosion'].includes(e.type)) this.effects.push(e);
    }
    this.effects=this.effects.filter(e=>match.tick-e.tick<=17).slice(-80);
  }
  draw(match,alpha,mode,resolution) {
    const r=this.r, gl=r.gl, world=[], lines=[], tick=match.tick, dt=tick+alpha;
    const player=match.units[0], view=characterView(player.body), current=match.actor('player');
    const position=a=>{
      const before=this.previous?.actors.find(v=>v.id===a.id);
      return before?.health>0 && a.health>0 ? mix(before.position,a.position,alpha) : a.position;
    };
    let eye=position(current).map((v,i)=>v+(i===1?(current.health?player.body.eyeHeight:.48):0));
    let camera=view.orientation;
    if(mode==='menu') { eye=[12.0,5.7,16.3]; camera=orientation(.57,-.185); }
    const feel=player.feel.presentation();
    r.begin(eye,camera,{fog:.014,fov:feel.fov,resolution});
    castingWheels(world,match.arena.pack.settings.size/2,dt,true);
    for(const bot of match.units.slice(1)) {
      const a=match.actor(bot.id); if (!a.health) continue;
      const p=position(a), motion=Math.hypot(bot.body.velocity[0],bot.body.velocity[2]);
      place(world,this.models[bot.index],p,bot.body.yaw,Math.sin(dt*.22+bot.index)*Math.min(motion/5,1)*.022);
    }
    for(const p of match.pickups) if(p.ready<=tick) pickupMesh(world,p,dt);
    for(const shot of match.state.projectiles) {
      const p=shot.position;
      boxVertices(p,[.18,.18,.24],bright,world);
      trace(lines,p,p.map((v,i)=>v-shot.velocity[i]*.046),orange);
    }
    for(const e of this.effects) {
      const age=tick-e.tick;
      if(e.type==='trace'&&age<=4) trace(lines,e.from,e.to,e.source==='player'?bright:[.95,.52,.25]);
      if(e.type==='shot'&&age<5&&e.source!=='player') {
        const p=e.origin.map((v,i)=>v+e.direction[i]*.43);
        boxVertices(p,[.105,.10,.13],bright,world);
      }
      if(e.type==='death' && age<=16) {
        const color=match.units.find(u=>u.id===e.target)?.profile?.color??bright;
        for(let j=0;j<6;j++) {
          const angle=j*2.4+e.shot;
          const p=[e.point[0]+Math.cos(angle)*age*.043,e.point[1]+.77+Math.sin(j+1)*.27+age*.052-age*age*.004,e.point[2]+Math.sin(angle)*age*.043];
          boxVertices(p,[.10,.13,.09],j%3===0?bright:color,world);
        }
      }
      if(e.type==='impact'||e.type==='explosion') {
        const explosive=e.type==='explosion', life=explosive?16:7;
        if(age>life) continue;
        const n=explosive?14:4;
        for(let i=0;i<n;i++) {
          const a=(i*2.4+e.shot)*1.8, size=(explosive?.12:.046)*(1-age/(life+1));
          const radius=(explosive?.085:.023)*age;
          const p=[e.point[0]+Math.cos(a)*radius,e.point[1]+Math.sin(i+e.shot)*radius+radius*.27,e.point[2]+Math.sin(a)*radius];
          boxVertices(p,[size,size,size],i%2?orange:bright,world);
        }
      }
    }
    r.update(this.dynamic,world); r.update(this.lines,lines);
    let calls=0, triangles=0;
    const draw=mesh=>{if(mesh.count){r.draw(mesh);calls++;if(mesh.mode===gl.TRIANGLES)triangles+=mesh.count/3;}};
    draw(this.structure); draw(this.dynamic); draw(this.lines);
    if(mode!=='menu' && current.health>0) {
      // Weapon occupies its own depth layer; its kick never rotates the aim ray.
      const motion=Math.min(1,Math.hypot(...player.body.velocity)/8);
      const reload=match.loadout('player').timers[feel.selected].reloadRemaining;
      const lower=reload>0 ? .16*Math.sin(Math.PI*reload/player.feel.profile().weapon.reload) : 0;
      const offset=[Math.sin(dt*.19)*motion*.008,lower+Math.cos(dt*.38)*motion*.006,-feel.recoil*.9];
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(r.vp,false,multiplyMatrices(perspective(1.14,gl.drawingBufferWidth/gl.drawingBufferHeight,.04,12),viewMatrix(offset,[0,0,0,1])));
      gl.uniform1f(r.fog,0); draw(this.guns[feel.selected]);
      if(feel.flash>0) draw(this.flashMesh);
    }
    Object.assign(this.stats,{drawCalls:calls,submittedTriangles:triangles,lines:lines.length/12,width:gl.drawingBufferWidth,height:gl.drawingBufferHeight});
  }
  dispose() {this.r.dispose();this.reset();this.stats.buffers=0;}
}

import {Renderer,boxVertices} from '../../vendor/vanillajs/modules/render-webgl/index.js';
import {characterView} from '../../vendor/vanillajs/modules/character/index.js';
import {perspective,multiplyMatrices,viewMatrix} from '../../vendor/vanillajs/modules/math/index.js';
import {viewGun} from '../view/models.js';
import {CHARGE,gateLane} from './patterns.js';
import {BoxVertexStream,BOX_STREAM_FLOATS} from '../../vendor/render-packing/index.js';
import {CORE} from './encounter.js';

const coal=[.11,.14,.17],iron=[.25,.32,.35],edge=[.42,.48,.47],brass=[.66,.40,.19];
const light=[1,.78,.34],heat=[1,.34,.08],ice=[.15,.9,.92];
const colors=[[1,.36,.12],[.18,1,.88],[.90,.42,1],[1,.72,.16],[.28,.88,1]];
const phaseColors=[heat,ice,colors[2]];
const tau=2*Math.PI;
function ring(out,x,y,z,radius,width,color,segments=48) {
  for(let i=0;i<segments;i++){
    const a=tau*i/segments,b=tau*(i+1)/segments;
    for(const [angle,r] of [[a,radius],[a,radius-width],[b,radius],[b,radius],[a,radius-width],[b,radius-width]])
      out.push(x+Math.cos(angle)*r,y+Math.sin(angle)*r,z,...color);
  }
}
function court() {
  const out=[],box=(x,y,z,w,h,d,c)=>boxVertices([x,y,z],[w,h,d],c,out);
  box(0,-.3,2,29,.6,29,[.20,.25,.27]);
  for(let j=-8;j<=15;j+=2)box(0,.008,j,24,.008,.038,coal);
  for(let i=-12;i<=12;i+=2){
    box(i,.009,3,.035,.012,24,coal);
    for(let j=-7;j<16;j+=3)box(i,.022,j,.055,.015,.65,[.42,.48,.45]);
  }
  for(const s of [-1,1]){
    box(s*12,.27,3,.24,.54,25,iron);box(s*12,.55,3,.28,.04,25,ice);
    for(let j=-20;j<=16;j+=5){
      box(s*15,4,j,2.1,8,1.5,coal);box(s*14.1,3,j,.3,6,.65,brass);
      box(s*13.9,4.1,j,.12,4.1,.21,light);box(s*15,8,j,4,.6,1.6,iron);
    }
    box(s*15,7.9,-3,1,.9,44,iron);
    for(let i=0;i<3;i++) {
      box(s*(14.6+i*.54),8.65,-4,.32,.34,43,i===1?brass:edge);
      for(let j=-22;j<=16;j+=4)box(s*(14.6+i*.54),8.65,j,.44,.46,.18,coal);
    }
    for(let j=-20;j<=16;j+=6) {
      box(s*17.7,4.4,j,4.5,8.8,5.7,iron);
      for(let k=0;k<4;k++)box(s*15.36,2+k*.73,j,.16,.17,3.8,k===2?heat:edge);
    }
    for(let i=0;i<4;i++){
      const x=s*(3.5+i*1.55),h=9+(i%3)*1.15;
      box(x,h/2,-16.4-i*.3,.96,h,2,coal);
      box(x,h-.2,-15.3-i*.3,.7,.25,.13,brass);
      box(x,h-1.9,-15.32-i*.3,.14,2.8,.16,heat);
    }
    // Shoulder forgings, stepped forearms and brass induction coils.
    box(s*3.2,4.8,-12.2,2.0,3.2,2.8,iron);
    box(s*3.35,6.6,-12.2,2.6,.68,3.15,edge);
    for(let i=0;i<5;i++)box(s*(3.5+i*.18),4.8-i*.56,-11.05,1.5,.45,1.4,i%2?brass:iron);
    box(s*4.25,1.45,-11.1,2.1,1,2.0,coal);
    box(s*4.25,1.48,-10.05,1.5,.25,.09,heat);
  }
  box(0,.36,15,24,.72,.28,iron);box(0,.75,15,24,.055,.31,ice);
  box(0,.16,-8.86,24,.32,.1,brass);
  box(0,2.5,-12.5,5.25,5,3,coal);
  box(0,5.7,-13,6.3,4.4,2.8,iron);
  ring(out,0,5.7,-11.45,3.15,.39,brass);
  ring(out,0,5.7,-11.43,2.69,.09,light);
  ring(out,0,5.7,-11.41,2.48,2.48,coal);
  for(let i=0;i<16;i++){
    const a=i*tau/16;
    box(Math.cos(a)*2.94,5.7+Math.sin(a)*2.94,-11.40,.13,.13,.12,light);
  }
  box(0,1.93,-10.14,3.46,3.44,.48,edge);
  for(let i=0;i<5;i++)box((i-2)*.64,3.88,-10.35,.44,.54,.6,brass);
  return out;
}
// Keep the established emissive colours and face order. Identical source kinds
// share a template; compacted slots need new RGB only when their kind changes.
const unitBox=new BoxVertexStream(1).appendXYZRGB(0,0,0,2,2,2,1,1,1).view();
const heads=colors.map(rgb=>{
  const shape=unitBox.slice();
  for(let i=0;i<shape.length;i+=6)
    for(let j=0;j<3;j++)shape[i+3+j]=rgb[j]*(.75+unitBox[i+3+j]*.85);
  return shape;
});
const coreCenter=CORE.min.map((v,i)=>(v+CORE.max[i])/2);
const coreSize=CORE.max.map((v,i)=>v-CORE.min[i]);
// Two 32-segment rings, and twelve triangles for the moving blades.
const turbineFloats=(2*32*6+12*3)*6;
export class StormScene {
  constructor(canvas,capacity=256) {
    this.r=new Renderer(canvas);const r=this.r;
    this.world=r.mesh(court());this.machine=r.mesh([]);this.bullets=r.mesh([]);
    this.lines=r.mesh([],'lines');this.gun=r.mesh(viewGun(1));
    this.packed=new Float32Array(BOX_STREAM_FLOATS*capacity);
    this.kind=new Int8Array(capacity).fill(-1);
    this.props=new BoxVertexStream(6+16); // core, five grilles, up to sixteen warning markers
    this.machineData=new Float32Array(this.props.capacityBoxes*BOX_STREAM_FLOATS+turbineFloats);
    this.trails=new Float32Array(12*capacity);this.stats={};
    r.gl.clearColor(.055,.079,.106,1);
  }
  draw(game,alpha=1,scale=1) {
    if(game.field.live.length>this.kind.length)throw RangeError('Hazards exceed the scene packing capacity');
    const r=this.r,gl=r.gl,body=game.body,eye=characterView(body);
    for(let i=0;i<3;i++)eye.position[i]+=(game.previous[i]-body.position[i])*(1-alpha);
    r.begin(eye.position,eye.orientation,{fov:1.24,fog:.019,resolution:scale});
    const dyn=[],color=phaseColors[game.phase-1],t=game.tick+alpha;
    const props=this.props.reset();
    props.append(coreCenter,coreSize,game.boss?color:coal);
    for(let i=-2;i<=2;i++)props.appendXYZRGB(i*.54,1.92,-9.18,.095,2.7,.05,...brass);
    const fixed=props.usedFloats;
    ring(dyn,0,1.95,-9.13,1.13,.13,light,32);
    for(let i=0;i<12;i++){
      const a=t*.016+i*tau/12;
      for(const [theta,rad,c] of [[a,.50,edge],[a+.4,2.36,brass],[a+.63,2.24,light]])
        dyn.push(rad*Math.cos(theta),5.7+rad*Math.sin(theta),-11.32,...c);
    }
    ring(dyn,0,5.7,-11.31,.6,.56,color,32);
    if(game.age<=CHARGE || (game.plan.kind===3 && game.age<CHARGE+30)){
      const plan=game.plan;
      if(plan.kind===3) {
        const lane=gateLane(plan,game.age<=CHARGE?0:30);
        for(const s of [-1,1])props.appendXYZRGB(lane+s*2.45,.035,3,.09,.02,23,...ice);
      } else if(plan.kind===0) {
        for(let j=1;j<=16;j++)props.appendXYZRGB(Math.sin(plan.angle)*j,.035,-8.5+Math.cos(plan.angle)*j,.13,.018,.36,...heat);
      } else if(plan.kind===4) {
        for(let x=-11;x<=11;x+=2)props.appendXYZRGB(x,.035,-7,1.3,.018,.13,...ice);
      }
    }
    const boxes=props.view(),machine=this.machineData;
    machine.set(boxes.subarray(0,fixed));
    machine.set(dyn,fixed);
    machine.set(boxes.subarray(fixed),fixed+dyn.length);
    r.update(this.machine,machine.subarray(0,boxes.length+dyn.length));
    let slot=0,l=0;
    for(const h of game.field.live){
      const x=h.position[0]-h.delta[0]*(1-alpha),y=h.position[1]-h.delta[1]*(1-alpha),z=h.position[2]-h.delta[2]*(1-alpha);
      const c=colors[h.source];
      const base=slot*BOX_STREAM_FLOATS;
      if(this.kind[slot]!==h.source){
        this.packed.set(heads[h.source],base);
        this.kind[slot]=h.source;
      }
      for(let i=0;i<BOX_STREAM_FLOATS;i+=6){
        this.packed[base+i]=x+unitBox[i]*h.half[0];
        this.packed[base+i+1]=y+unitBox[i+1]*h.half[1];
        this.packed[base+i+2]=z+unitBox[i+2]*h.half[2];
      }
      slot++;
      this.trails[l++]=x;this.trails[l++]=y;this.trails[l++]=z;
      for(const v of c)this.trails[l++]=v;
      this.trails[l++]=x-h.delta[0]*2.5;this.trails[l++]=y-h.delta[1]*2.5;this.trails[l++]=z-h.delta[2]*2.5;
      for(const v of c)this.trails[l++]=v*.38;
    }
    const n=slot*BOX_STREAM_FLOATS,start=performance.now();
    r.update(this.bullets,this.packed.subarray(0,n));r.update(this.lines,this.trails.subarray(0,l));
    const uploaded=performance.now();let calls=0;
    for(const mesh of [this.world,this.machine,this.lines,this.bullets])if(mesh.count){r.draw(mesh);calls++;}
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const kick=game.weapon.snapshot().cooldown;
    gl.uniformMatrix4fv(r.vp,false,multiplyMatrices(perspective(1.14,gl.drawingBufferWidth/gl.drawingBufferHeight,.04,12),
      viewMatrix([0,0,-kick*.32],[0,0,0,1])));
    gl.uniform1f(r.fog,0);r.draw(this.gun);
    this.stats={calls:calls+1,heads:slot,uploadBytes:4*(n+l),hazardUploadMs:uploaded-start,drawSubmitMs:performance.now()-uploaded};
  }
  dispose(){this.r.dispose();this.packed=null;this.trails=null;this.kind=null;this.machineData=null;this.props=null;}
}

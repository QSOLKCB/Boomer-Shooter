import {createCharacter,characterConfig,characterView,lookCharacter,stepCharacter} from '../../vendor/vanillajs/modules/character/index.js';
import {raycast} from '../../vendor/vanillajs/modules/collision/index.js';
import {rotate} from '../../vendor/vanillajs/modules/math/index.js';
import {WeaponTimer} from '../../vendor/vanillajs/modules/weapons/index.js';
import {checkCommand,appendRun,ANGLE,FLAG,NEUTRAL} from '../sim/command.js';
import {HazardField} from './field.js';
import {emitPattern,patternAt} from './patterns.js';

export const STEP=1/60, SEED=0x53544f52, MAX_TICKS=18000, BOSS_HP=240;
export const CORE={min:[-1.5,.45,-9.9],max:[1.5,3.45,-9.2]};
export const WALLS=[
  {min:[-13,-1,-10],max:[13,0,16]},
  {min:[-13,0,-10],max:[-12,8,16]}, {min:[12,0,-10],max:[13,8,16]},
  {min:[-13,0,15],max:[13,8,16]}, {min:[-13,0,-9.2],max:[13,8,-8.8]}
];
const targets=[{id:'core',box:CORE}]; // Open court. The front rail bounds movement only.
export const MOTOR=characterConfig({walkSpeed:9.6,sprintSpeed:12.8,groundAcceleration:104,airAcceleration:34,jumpSpeed:8.1});

// Order-sensitive same-runtime replay checksum over little-endian binary64 words.
class TickDigest {
  constructor(){this.hash=2166136261;this.view=new DataView(new ArrayBuffer(8));}
  number(n) {
    this.view.setFloat64(0,n,true);
    for(let i=0;i<8;i+=4)this.hash=Math.imul(this.hash^this.view.getUint32(i,true),16777619)>>>0;
  }
  row(values){for(const n of values)this.number(n);}
}
export class Encounter {
  constructor(seed=SEED) {
    if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('Invalid reactor seed');
    this.seed=seed;this.body=createCharacter({position:[0,0,10]});
    this.previous=[...this.body.position];this.field=new HazardField();
    this.weapon=new WeaponTimer({magazineSize:30,reserve:900,interval:.16,reloadTime:.85});
    this.tick=0;this.hp=100;this.boss=BOSS_HP;this.phase=1;
    this.safeUntil=0;this.round=0;this.age=0;this.result=null;
    this.plan=patternAt(0,1,seed,this.body.position);
    this.events=[];this.runs=[];this.digest=new TickDigest();
    this.digest.number(seed);
  }
  step(command=NEUTRAL) {
    if(this.result)return false;
    checkCommand(command);
    appendRun(this.runs,command);this.tick++;this.events=[];
    const [side,forward,yaw,pitch,flags]=command;
    const body=this.body;
    this.previous=[...body.position];
    lookCharacter(body,{yaw:yaw/ANGLE,pitch:pitch/ANGLE});
    stepCharacter(body,{move:[side,forward],sprint:!!(flags&FLAG.sprint),jump:!!(flags&FLAG.jump)},STEP,MOTOR,WALLS);
    const fire=!!(flags&(FLAG.held|FLAG.press));
    const ammo=this.weapon.snapshot().ammo;
    for(const event of this.weapon.step(STEP,{fire,reload:!!(flags&FLAG.reload)||(fire && ammo===0)})) {
      if(event.type!=='shot')continue;
      const eye=characterView(body);
      const hit=!!raycast(eye.position,rotate(eye.orientation,[0,0,-1]),64,targets);
      this.events.push({type:'shot',id:event.id,hit});
      if(hit){this.boss=Math.max(0,this.boss-4);this.phase=this.boss>160?1:this.boss>80?2:3;}
    }
    // A lethal operator shot wins before an enemy volley on the same tick.
    if(this.boss===0)this.result='victory';
    else {
      if(this.age===this.plan.duration) {
        this.plan=patternAt(++this.round,this.phase,this.seed,body.position);
        this.age=0;
      }
      emitPattern(this.field,this.plan,this.age++);
      const hit=this.field.advance(this.previous,body.position,body.halfExtents);
      if(hit && this.tick>=this.safeUntil) {
        this.hp=Math.max(0,this.hp-20);this.safeUntil=this.tick+36;
        this.events.push({type:'damage',id:hit.id,source:hit.source});
        if(!this.hp)this.result='defeat';
      }
      if(!this.result && this.tick===MAX_TICKS)this.result='timeout';
    }
    const d=this.digest,field=this.field,gun=this.weapon.snapshot();
    d.row(command);d.row([this.tick,this.hp,this.boss,this.safeUntil,this.round,this.age,this.phase,
      this.plan.phase,this.plan.angle,this.plan.dial,this.plan.lane,...body.position,...body.velocity,body.yaw,body.pitch,
      gun.ammo,gun.reserve,gun.cooldown,gun.reloadRemaining,field.nextId,field.rejected,field.live.length,this.events.length]);
    for(const e of this.events)d.row(e.type==='shot'?[1,e.id,Number(e.hit)]:[2,e.id,e.source]);
    for(const h of field.live){
      d.number(h.id);d.number(h.source);d.row(h.position);d.row(h.delta);d.row(h.half);d.number(h.life);
    }
    return true;
  }
  receipt() {
    return {format:'storm-protocol/v1',seed:this.seed,ticks:this.tick,runs:structuredClone(this.runs),
      state:{round:this.round,age:this.age,phase:this.phase,plan:{...this.plan},hp:this.hp,boss:this.boss,result:this.result},
      digest:this.digest.hash.toString(16).padStart(8,'0')};
  }
}

export function replay(tape) {
  if(tape?.format!=='storm-protocol/v1'||!Number.isInteger(tape.seed)||!Number.isInteger(tape.ticks)||tape.ticks<0||
    tape.ticks>MAX_TICKS||!Array.isArray(tape.runs)||tape.runs.length>tape.ticks)throw TypeError('Invalid reactor replay');
  const game=new Encounter(tape.seed);
  let total=0;
  for(const run of tape.runs) {
    if(!Array.isArray(run)||run.length!==2||!Number.isInteger(run[0])||run[0]<1||
      (total+=run[0])>tape.ticks)throw RangeError('Invalid command run');
    checkCommand(run[1]);
  }
  if(total!==tape.ticks)throw RangeError('Incomplete tape');
  for(const [count,command] of tape.runs)for(let i=0;i<count;i++)if(!game.step(command))throw Error('Commands after end');
  const result=game.receipt();
  if(result.digest!==tape.digest||JSON.stringify(result.state)!==JSON.stringify(tape.state))throw Error('Replay mismatch');
  return result;
}

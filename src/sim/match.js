import {Combat3D} from '../engine/combat3d.js';
import {fpsNumber} from '../../vendor/vanillajs/modules/combat3d/index.js';
import {characterConfig,createCharacter,stepCharacter,characterView} from '../../vendor/vanillajs/modules/character/index.js';
import {WeaponFeel,WEAPON_FEEL_FORMAT} from '../../vendor/vanillajs/modules/weapon-feel/index.js';
import {DEFAULT_SEED, LABELS, readArena, spawnPoint} from './arena.js';
import {botIntent,createBrain} from './bots.js';
import {checkCommand,appendRun,NEUTRAL,FLAG,ANGLE} from './command.js';

export const STEP=1/60;
export const rank = actors => [...actors].sort((a,b)=>b.kills-a.kills || a.deaths-b.deaths || (a.id<b.id?-1:a.id>b.id?1:0));
export function matchEnd(actors,tick,limit,duration) {
  const order=rank(actors);
  return order[0].kills>=limit || tick>=duration ? {winner:order[0].id,reason:order[0].kills>=limit?'frag limit':'time limit'} : null;
}

function equip(unit, match, position) {
  const seed=(match.seed+(unit.index+2)*997+unit.life*5813)>>>0;
  unit.body=createCharacter({position,yaw:Math.atan2(position[0],position[2])});
  unit.feel=new WeaponFeel({format:WEAPON_FEEL_FORMAT,version:1,seed,profiles:match.weapons.map(w=>({
    id:w.id,label:LABELS[w.id]??w.id,weapon:w,
    view:{hipFov:1.26,adsFov:1.0,adsSeconds:.12,sensitivity:1,adsSensitivity:1,recoilReturn:.09,flashSeconds:.085,effects:true},
    handling:{triggerBuffer:.09,switchSeconds:.11,spreadKick:w.archetype==='automatic'?.003:0,spreadRecovery:.045}
  }))});
  unit.feel.setAim(unit.body.yaw,0);
  if (unit.profile) unit.brain=createBrain(unit.index,seed);
}

export class Match {
  constructor(arena, {seed=DEFAULT_SEED,limit=arena.pack.settings.rules.scoreLimit,duration=arena.pack.settings.rules.durationTicks}={}) {
    this.seed=fpsNumber(seed,0,0xffffffff,true); this.limit=fpsNumber(limit,1,50,true);
    this.duration=fpsNumber(duration,600,36000,true); this.arena=arena;
    this.weapons=arena.pack.arsenal.weapons;
    this.motor=characterConfig({walkSpeed:8.5,sprintSpeed:11.5,groundAcceleration:74,airAcceleration:21,jumpSpeed:7.65});
    const rules=arena.pack.settings.rules;
    this.units=[{id:'player',index:-1,profile:null,life:0},...arena.pack.bots.types.map((profile,index)=>({id:profile.id,profile,index,life:0}))];
    const actors=this.units.map((u,i)=>{
      const position=arena.starts[i]; equip(u,this,position);
      return {id:u.id,team:i,position,health:u.profile?.health??rules.playerHealth,armour:u.profile?.armour??rules.playerArmour};
    });
    this.combat=new Combat3D({actors,weapons:this.weapons,solids:arena.pack.solids.map(({id,box,material})=>({id,box,material})),
      friendlyFire:rules.friendlyFire,selfDamage:rules.selfDamage});
    this.pickups=arena.pickups.map(p=>({...p,ready:0}));
    this.tick=0; this.result=null; this.tape=[]; this.events=[]; this.eventRows=[]; this.feed=[];
    this.lastPlayerPickup=null;
    this.work={paths:0,expanded:0,sight:0,coverRays:0,coverMoves:0};
    this.state=this.combat.snapshot();
  }
  actor(id) { return this.state.actors.find(a=>a.id===id); }
  loadout(id) { return this.state.weapons.find(w=>w.actor===id); }
  step(command=NEUTRAL) {
    if (this.result) return false;
    checkCommand(command);
    const player=this.units[0], wasDead=this.actor('player').health===0;
    const row=wasDead ? NEUTRAL : command;
    appendRun(this.tape,row);
    if (row[4]&FLAG.cancel) player.feel.cancel();
    const events=[];
    // Occupancy includes earlier respawns on this tick. Occupied starts retry next tick.
    const living=this.state.actors.filter(a=>a.health>0);
    for (const u of this.units) {
      const a=this.actor(u.id);
      if (a.health>0 || this.tick-a.deadAt < this.arena.pack.settings.rules.respawnTicks) continue;
      const p=spawnPoint(this.arena,living);
      if (!p) continue;
      events.push(this.combat.respawn(u.id,p)); u.life++; equip(u,this,p);
      living.push({id:u.id,position:p});
    }
    if (events.length) this.state=this.combat.snapshot();
    const shots=[], poses=[];
    for (const u of this.units) {
      if (this.actor(u.id).health<=0) continue;
      const flags=row[4], feel=u.feel;
      let intent;
      if (u.profile) {
        intent=botIntent(this,u,characterView(u.body).position);
        feel.setAim(intent.yaw,intent.pitch);
      } else {
        feel.addLook(row[2]/ANGLE,row[3]/ANGLE);
        intent={move:[row[0],row[1]],slot:row[5],jump:!!(flags&FLAG.jump),sprint:!!(flags&FLAG.sprint),
          press:!!(flags&FLAG.press),held:!!(flags&FLAG.held),reload:!!(flags&FLAG.reload)};
      }
      if (intent.slot>=0) feel.select(intent.slot);
      const aim=feel.aim(); u.body.yaw=aim.yaw; u.body.pitch=aim.pitch;
      stepCharacter(u.body,intent,STEP,this.motor,this.arena.boxes);
      const origin=characterView(u.body).position;
      poses.push({id:u.id,position:u.body.position,height:u.body.halfExtents[1]*2});
      if (intent.press) feel.trigger();
      const {id,...timer}=this.loadout(u.id).timers.find(t=>t.id===feel.profile().id);
      const shot=feel.step({actor:u.id,origin,timer,held:intent.held,reload:intent.reload});
      // Quaternion rotation can exceed a unit component by one ULP on cardinal axes.
      // Preserve the ray; Combat3D checks components before normalizing its length.
      const bound=Math.max(1,...shot.direction.map(Math.abs));
      if (bound>1) shot.direction=shot.direction.map(v=>v/bound);
      shots.push(shot);
    }
    this.combat.setPoses(poses);
    events.push(...this.combat.step(shots));
    this.state=this.combat.snapshot();
    this.tick=this.state.tick;
    this.collect(events);
    for (const u of this.units) {
      const a=this.actor(u.id), active=this.loadout(u.id);
      u.feel.confirm({shot:events.some(e=>e.type==='shot'&&e.source===u.id),hit:events.some(e=>e.type==='damage'&&e.source===u.id&&e.target!==u.id),
        damage:events.filter(e=>e.type==='damage'&&e.target===u.id).reduce((n,e)=>n+e.amount,0),
        reloading:active.timers.find(t=>t.id===active.selected).reloadRemaining>0});
      if (a.health===0) u.feel.cancel();
    }
    this.events=events;
    for (const event of events) if (event.type==='death') this.feed.push(event);
    if (this.feed.length>5) this.feed.splice(0,this.feed.length-5);
    if (events.length) this.eventRows.push(JSON.stringify([this.tick,events]));
    this.result=matchEnd(this.state.actors,this.tick,this.limit,this.duration);
    return true;
  }
  collect(events) {
    let changed=false;
    for (const pad of this.pickups) {
      if (pad.ready>this.tick) continue;
      for (const a of this.state.actors) {
        if (!a.health || Math.hypot(...a.position.map((v,i)=>v-pad.position[i]))>1.12) continue;
        const amount=pad.kind==='armour' ? this.combat.pickupArmour(a.id,pad.amount) : this.combat.pickup(a.id,pad.kind,pad.amount);
        if (!amount) continue;
        pad.ready=this.tick+(pad.kind==='ammo'?480:720); changed=true;
        events.push({type:'pickup',tick:this.tick,actor:a.id,pad:pad.id,kind:pad.kind,amount}); break;
      }
    }
    if (changed) {
      this.state=this.combat.snapshot();
      this.lastPlayerPickup=events.find(e=>e.type==='pickup'&&e.actor==='player')??this.lastPlayerPickup;
    }
  }
  canonical() {
    return {tick:this.tick,state:this.state,result:this.result,pickups:this.pickups.map(p=>[p.id,p.ready]),work:this.work,
      units:this.units.map(u=>({id:u.id,life:u.life,body:u.body,feel:u.feel.presentation(),aim:u.feel.aim(),brain:u.brain?{...u.brain,random:undefined}:null}))};
  }
}

export class MatchSlot {
  constructor(text, options) { this.replace(text,options); }
  replace(text, options) {
    const candidate=new Match(text===this.text?this.current.arena:readArena(text),options);
    this.current=candidate;this.text=text;
    return candidate;
  }
}

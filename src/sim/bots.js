import {findPath} from '../../vendor/vanillajs/modules/navigation/index.js';
import {clamp,seededRandom} from '../../vendor/vanillajs/modules/math/index.js';
import {sight} from './arena.js';

const flatDistance = (a,b) => Math.hypot(a[0]-b[0],a[2]-b[2]);
const chest = p => [p[0],p[1]+1.12,p[2]];
const MAX_AIM_PITCH = Math.PI/2-.01; // WeaponFeel.setAim's inclusive limit.

export function createBrain(index, seed) {
  return {index, random:seededRandom(seed), target:null, last:null, seenAt:-1000, ready:0, nextShot:0,
    scan:index*3, routeAt:0, goal:null, path:[], mode:'patrol', error:[0,0], side:1, coverUntil:0, supply:null, supplyUntil:0};
}

function route(match, brain, position, goal) {
  const {grid} = match.arena;
  const start = grid.worldToCell([position[0],position[2]]), end = grid.worldToCell([goal[0],goal[2]]);
  brain.path = [];
  if (start && end) {
    const search = findPath(grid,start,end,{maxExpanded:256});
    match.work.paths++; match.work.expanded += search.expanded;
    brain.path = search.path.slice(1).map(c => grid.cellCenter(c));
  }
  brain.routeAt = match.tick+44;
}

function decide(match, unit, brain, eye) {
  const {arena,tick} = match, {profile} = unit;
  const position = unit.body.position;
  const rivals = match.state.actors.filter(a => a.id !== unit.id && a.health > 0)
    .map(a => ({actor:a, distance:flatDistance(position,a.position)}))
    .sort((a,b) => a.distance-b.distance);
  let seen = null;
  for (const {actor,distance} of rivals) {
    if (distance > profile.range+6) continue;
    match.work.sight++;
    if (sight(arena,eye,chest(actor.position))) { seen=actor; break; }
  }
  if (seen) {
    if (brain.target !== seen.id) brain.ready=tick+arena.pack.settings.difficulty.normal.reaction+brain.index*3;
    brain.last = [...seen.position]; brain.seenAt=tick;
  }
  brain.target = seen?.id ?? null;
  const self=match.actor(unit.id), endangered=self.health<65;
  const primary=match.loadout(unit.id).timers.find(t=>t.id===profile.weapon);
  if (!brain.supply || brain.supply.ready>tick || tick>=brain.supplyUntil) {
    brain.supply=null;
    const useful=match.pickups.filter(p=>p.ready<=tick && p.position[1]===0 &&
      ((p.kind==='health' && endangered)||(p.kind==='armour' && self.armour<18)||(p.kind==='ammo' && primary.reserve===0)));
    useful.sort((a,b)=>flatDistance(position,a.position)-flatDistance(position,b.position));
    const pad=useful[0];
    if (pad && flatDistance(position,pad.position)<(seen?14:28)) {
      brain.supply=pad;brain.supplyUntil=tick+145;brain.routeAt=tick;
    }
  }
  const coverWindow = (tick+brain.index*51)%210 < (brain.index===1 ? 67 : 31);
  if (seen && tick >= brain.coverUntil && (endangered || (brain.index===1 && coverWindow)) && brain.mode !== 'cover') {
    const candidates = arena.cover.slice().sort((a,b)=>flatDistance(position,a)-flatDistance(position,b)).slice(0,12);
    for (const p of candidates) {
      match.work.coverRays++;
      if (!sight(arena,chest(seen.position),chest(p))) {
        brain.goal=p; brain.coverUntil=tick+68; brain.routeAt=tick; match.work.coverMoves++; break;
      }
    }
  }
  if (tick < brain.coverUntil && brain.goal) brain.mode='cover';
  else if (brain.supply && brain.supply.ready<=tick) { brain.mode='supply';brain.goal=brain.supply.position; }
  else if (seen) { brain.mode='engage'; brain.goal=null; }
  else if (brain.last && tick-brain.seenAt < 110) { brain.mode='hunt'; brain.goal=brain.last; }
  else {
    if (brain.mode !== 'patrol' || !brain.goal || flatDistance(position,brain.goal) < 1 || tick%240 < 10) {
      const supplies = match.pickups.filter(p=>p.ready<=tick && p.position[1]===0 && (!endangered || p.kind==='health'));
      const choices = supplies.length ? supplies.map(p=>p.position) : arena.starts;
      brain.goal=choices[Math.floor(brain.random()*choices.length)]; brain.routeAt=tick;
    }
    brain.mode='patrol';
  }
  if (brain.goal && tick >= brain.routeAt) route(match,brain,position,brain.goal);
  const error = arena.pack.settings.difficulty.normal.error;
  brain.error=[(brain.random()-.5)*error*1.7,(brain.random()-.5)*error];
  if (tick%65 < 10) brain.side = brain.random()<.5 ? -1 : 1;
  brain.scan=tick+9;
}

// Decisions observe living opponents through the same static solids used for combat.
// Between scans, tracking is limited to the last visible sample.
export function botIntent(match, unit, eye) {
  const b=unit.brain, p=unit.body.position, profile=unit.profile, tick=match.tick;
  if (tick>=b.scan) decide(match,unit,b,eye);
  let dx=0, dz=0, yaw=unit.body.yaw, pitch=0, fire=false;
  const target = b.target && match.actor(b.target);
  const aim = b.last && chest(b.last);
  if (target?.health>0 && aim) {
    const ax=aim[0]-p[0], az=aim[2]-p[2], range=Math.max(.001,Math.hypot(ax,az));
    yaw=Math.atan2(-ax,-az)+b.error[0];
    pitch=clamp(Math.atan2(aim[1]-eye[1],range)+b.error[1],-MAX_AIM_PITCH,MAX_AIM_PITCH);
    if (b.mode==='engage') {
      const ideal=profile.range*[.40,.62,.56][b.index], advance=range>ideal+2 ? .9 : range<ideal-2 ? -.55 : 0;
      const side=b.side*(b.index===2?.90:.54);
      dx=(ax*advance-az*side)/range; dz=(az*advance+ax*side)/range;
    }
    if (tick>=b.ready && tick>=b.nextShot && range<=profile.range && b.mode!=='cover') {
      match.work.sight++;
      if (sight(match.arena,eye,aim)) { fire=true; b.nextShot=tick+profile.cadence; }
    }
  }
  if (b.mode!=='engage' && b.path.length) {
    let point=b.path[0];
    if (Math.hypot(point[0]-p[0],point[1]-p[2])<.34) { b.path.shift(); point=b.path[0]; }
    if (point) {
      dx=point[0]-p[0]; dz=point[1]-p[2];
      if (!b.target) yaw=Math.atan2(-dx,-dz);
    }
  }
  const n=Math.max(1,Math.hypot(dx,dz)), speed=profile.speed/match.motor.walkSpeed;
  const c=Math.cos(yaw), s=Math.sin(yaw);
  const timers=match.loadout(unit.id).timers;
  let slot=timers.findIndex(w=>w.id===profile.weapon);
  if (timers[slot].ammo+timers[slot].reserve===0) {
    const backup=timers.findIndex(w=>w.ammo+w.reserve>0);
    if (backup>=0) slot=backup;
  }
  const timer=timers[slot];
  return {yaw,pitch,move:[speed*(dx*c-dz*s)/n,speed*(dx*s+dz*c)/n], slot, press:fire, held:fire,
    reload:timer.ammo===0 || (b.mode==='cover' && timer.ammo<timer.magazineSize*.4)};
}

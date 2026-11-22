import {validateFPSPack, FPS_PACK_BYTES} from '../../vendor/vanillajs/modules/mod-fps/index.js';
import {fpsRecord, fpsList, fpsId} from '../../vendor/vanillajs/modules/combat3d/index.js';
import {NavigationGrid} from '../../vendor/vanillajs/modules/navigation/index.js';
import {raycast} from '../../vendor/vanillajs/modules/collision/index.js';

export const ENGINE = '7a3a5a3ec49aed5b7063a05614951e69bb257da6';
export const DEFAULT_SEED = 0x464f5247;
export const LABELS = {player:'Operator', kiln:'Kiln', vise:'Vise', flux:'Flux', rivet:'Rivet Rifle', arc:'Arc Repeater', slag:'Slag Launcher'};

export function readArena(text) {
  if (typeof text !== 'string' || text.length > FPS_PACK_BYTES || new TextEncoder().encode(text).length > FPS_PACK_BYTES)
    throw new RangeError('Arena must be a local JSON document within 32 KiB');
  const {pack: source, armourPads} = fpsRecord(JSON.parse(text), ['pack', 'armourPads']);
  const pack = validateFPSPack(source);
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .,'’–-]{0,47}$/u.test(pack.settings.title)) throw new TypeError('Plain arena title required');
  const plates = new Set(fpsList(armourPads, 8).map(fpsId));
  if (plates.size !== armourPads.length || [...plates].some(id => !pack.spawns.pickups.some(p => p.id === id && p.kind === 'ammo')))
    throw new RangeError('Armour pads require distinct admitted supply positions');
  const ids = pack.bots.types.map(p => p.id);
  if (pack.spawns.bots.length < 3 || ids.length !== 3 || ids.includes('player')) throw new RangeError('Three distinct rival profiles and starts required');
  const pickups = pack.spawns.pickups.map(p => Object.freeze({...p, kind:plates.has(p.id) ? 'armour' : p.kind}));
  const size = pack.settings.size, blocked = [];
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const px = x + .5 - size/2, pz = z + .5 - size/2;
    if (pack.solids.some(({box:b}) => b.max[1] > .01 && b.min[1] < 1.8 &&
      px+.35 > b.min[0] && px-.35 < b.max[0] && pz+.35 > b.min[2] && pz-.35 < b.max[2])) blocked.push([x,z]);
  }
  const grid = new NavigationGrid({width:size,height:size,origin:[-size/2,-size/2],blocked});
  const cover = [];
  for (const s of pack.solids.filter(s => s.id.startsWith('block-') && s.size[1] >= 1.5)) {
    const [x,,z] = s.center, [w,,d] = s.size;
    for (const [cx,cz] of [[x-w/2-1,z],[x+w/2+1,z],[x,z-d/2-1],[x,z+d/2+1]]) {
      const cell = grid.worldToCell([cx,cz]);
      if (cell && grid.walkable(cell)) { const [a,b] = grid.cellCenter(cell); cover.push([a,0,b]); }
    }
  }
  return Object.freeze({pack, grid, cover, pickups:Object.freeze(pickups), boxes:pack.solids.map(s=>s.box), starts:[pack.spawns.player,...pack.spawns.bots]});
}

export function sight(arena, from, to) {
  const delta = to.map((x,i) => x-from[i]), distance = Math.hypot(...delta);
  return distance < .0001 || !raycast(from, delta, distance, arena.pack.solids);
}

export function spawnPoint(arena, living) {
  let best = null, bestScore = -Infinity;
  for (const p of arena.starts) {
    if (living.some(a => Math.abs(a.position[0]-p[0]) < .71 && Math.abs(a.position[2]-p[2]) < .71 && Math.abs(a.position[1]-p[1]) < 1.8)) continue;
    let nearest = 100, exposed = 0;
    for (const a of living) {
      nearest = Math.min(nearest, Math.hypot(...p.map((v,i)=>v-a.position[i])));
      if (sight(arena,[p[0],p[1]+1.3,p[2]],[a.position[0],a.position[1]+1.4,a.position[2]])) exposed++;
    }
    const score = nearest - 7*exposed;
    if (score > bestScore) { bestScore=score; best=p; }
  }
  return best;
}

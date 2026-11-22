import {fpsList, fpsNumber} from '../../vendor/vanillajs/modules/combat3d/index.js';

export const FLAG = Object.freeze({jump:1,held:2,press:4,reload:8,sprint:16,cancel:32});
export const NEUTRAL = Object.freeze([0,0,0,0,0,-1]);
export const ANGLE = 10000;

// Side/forward axes, relative yaw/pitch in 0.0001 rad, action bits, optional slot.
export function checkCommand(row) {
  fpsList(row,6);
  if (row.length!==6) throw new TypeError('Six command fields required');
  fpsNumber(row[0],-1,1,true); fpsNumber(row[1],-1,1,true);
  fpsNumber(row[2],-31415,31415,true); fpsNumber(row[3],-31415,31415,true);
  fpsNumber(row[4],0,63,true); fpsNumber(row[5],-1,2,true);
  return row;
}

export function appendRun(runs, command) {
  const last=runs.at(-1);
  if (last && command.every((v,i)=>v===last[1][i])) last[0]++;
  else runs.push([1,[...command]]);
}

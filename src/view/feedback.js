// Bearing in the arena's X/Z plane. Zero is forward at yaw zero (-Z).
export function bearing(from,to) {
  const x=to[0]-from[0], z=to[2]-from[2];
  return Math.hypot(x,z)<.001 ? null : Math.atan2(x,-z);
}

export const shotStyles={
  precision:{color:[1,.78,.35],flash:[.13,.12,.25],sparks:6,traceTicks:6},
  automatic:{color:[.32,.94,1],flash:[.09,.08,.14],sparks:3,traceTicks:3},
  projectile:{color:[1,.44,.83],flash:[.16,.14,.20],sparks:5,traceTicks:4}
};

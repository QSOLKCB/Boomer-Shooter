import {boxVertices} from '../../vendor/vanillajs/modules/render-webgl/index.js';

const iron=[.17,.23,.25], edge=[.46,.53,.52], dark=[.075,.10,.11], brass=[.68,.43,.22], light=[1,.82,.42];
function parts() {
  const vertices=[];
  return {vertices,box:(x,y,z,w,h,d,c)=>boxVertices([x,y,z],[w,h,d],c,vertices)};
}

export function machine(index,color) {
  const {vertices,box}=parts();
  for(const side of [-1,1]) {
    box(side*.17,.20,0,.19,.40,.27,dark); box(side*.17,.13,-.036,.23,.20,.34,edge);
    box(side*.16,.52,0,.18,.35,.23,color);
    box(side*.26,.98,0,.16,.45,.22,iron);
    box(side*.25,.90,-.13,.17,.15,.35,dark);
    box(side*.25,.90,-.31,.09,.07,.05,color);
  }
  box(0,.79,0,.43,.20,.32,iron);
  box(0,1.10,0,.56,.48,.37,color);
  box(0,1.12,-.194,.42,.23,.045,dark);
  for(let i=-1;i<=1;i++) box(i*.11,1.12,-.225,.055,.14,.015,light);
  box(0,1.39,0,.22,.17,.21,iron);
  if(index===0) { // Kiln: round-shouldered breaker with twin rear chimneys.
    for(const s of [-1,1]) { box(s*.281,1.28,.01,.17,.26,.35,color);box(s*.19,1.49,.13,.12,.49,.14,iron); }
    box(0,1.58,-.04,.43,.30,.32,color);box(0,1.60,-.21,.34,.085,.03,dark);
    box(0,1.60,-.23,.18,.055,.015,light);
  } else if(index===1) { // Vise: narrow optical turret with a horizontal sight bar.
    box(0,1.60,0,.25,.36,.28,edge);box(0,1.68,-.04,.48,.15,.28,color);
    box(0,1.67,-.19,.43,.065,.025,[.7,1,1]);box(.25,1.2,-.18,.14,.14,.43,iron);
  } else { // Flux: forked crown and asymmetric drum.
    box(0,1.55,0,.42,.27,.35,color);
    for(const s of [-1,1]) box(s*.16,1.70,0,.09,.19,.22,color);
    box(.27,1.20,.02,.18,.31,.36,edge);box(0,1.54,-.19,.12,.12,.025,light);
  }
  return vertices;
}

export function viewGun(type) {
  const {vertices,box}=parts(), c=type===0?[.82,.38,.13]:type===1?[.12,.67,.67]:[.77,.37,.17];
  // Local eye coordinates. A rear receiver, parallel rails and a visible front sight.
  box(.35,-.32,-.33,.24,.18,.38,dark);
  box(.32,-.265,-.47,.205,.14,.42,iron); box(.32,-.185,-.49,.19,.027,.35,edge);
  box(.32,-.29,-.57,.21,.034,.37,c);
  if(type===0) {
    box(.31,-.239,-.80,.105,.10,.49,edge); box(.31,-.24,-1.01,.15,.13,.19,dark);
    box(.31,-.176,-1.035,.105,.025,.13,brass); box(.31,-.15,-1.06,.012,.037,.014,light);
    box(.32,-.156,-.55,.083,.05,.20,dark); box(.32,-.151,-.438,.058,.024,.013,[.30,.89,.83]);
    for(let i=0;i<5;i++) box(.216,-.235,-.35-i*.051,.016,.057,.018,brass);
  } else if(type===1) {
    for(const s of [-1,1]) {box(.32+s*.064,-.235,-.79,.065,.087,.45,iron);box(.32+s*.064,-.181,-.79,.031,.017,.32,c);}
    box(.32,-.23,-1.0,.205,.13,.10,edge);box(.32,-.153,-1,.016,.035,.016,light);
    for(let i=0;i<6;i++)box(.32,-.168,-.36-i*.052,.15,.031,.024,dark);
  } else {
    box(.32,-.24,-.73,.25,.22,.44,iron);box(.32,-.24,-.97,.28,.25,.12,edge);
    box(.32,-.24,-1.035,.20,.16,.017,dark);
    for(let i=0;i<4;i++)box(.32,-.24,-.58-i*.088,.264,.23,.024,i===2?c:dark);
    box(.32,-.098,-.95,.026,.049,.028,light);
  }
  // Gloved support and trigger grips.
  box(.39,-.366,-.35,.15,.11,.18,[.32,.23,.16]);
  box(.232,-.32,-.72,.13,.095,.17,[.36,.26,.17]);
  return vertices;
}

export function place(out,model,p,yaw=0,bob=0) {
  const s=Math.sin(yaw),c=Math.cos(yaw);
  for(let i=0;i<model.length;i+=6) {
    const x=model[i],z=model[i+2];
    out.push(p[0]+x*c+z*s,p[1]+model[i+1]+bob,p[2]+z*c-x*s,model[i+3],model[i+4],model[i+5]);
  }
}

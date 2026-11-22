import {boxVertices} from '../../vendor/vanillajs/modules/render-webgl/index.js';

const iron=[.16,.21,.22], black=[.065,.09,.10], rim=[.42,.49,.47], rust=[.50,.27,.15];
const amber=[1,.54,.12], hot=[1,.84,.39], teal=[.22,.86,.83];
const tint=(c,f)=>c.map(v=>Math.min(1,v*f));
const quad=(out,a,b,c,d,color)=>{ for(const p of [a,b,c,a,c,d]) out.push(...p,...color); };

function annulus(out,x,z,inner,outer,y,color,start=0,end=2*Math.PI) {
  const p=(r,a)=>[x+Math.cos(a)*r,y,z+Math.sin(a)*r];
  const count=Math.max(2,Math.ceil(50*(end-start)/(2*Math.PI)));
  for(let i=0;i<count;i++) {
    const a=start+(end-start)*i/count,b=start+(end-start)*(i+1)/count;
    quad(out,p(inner,a),p(outer,a),p(outer,b),p(inner,b),color);
  }
}

const lettering={
  '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],
  '2':['111','001','111','100','111'],'3':['111','001','111','001','111'],
  '4':['101','101','111','001','001'],'P':['111','101','111','100','100'],
  'I':['111','010','010','010','111'],'T':['111','010','010','010','010'],
  'K':['101','110','100','110','101'],'L':['100','100','100','100','111'],
  'N':['1001','1101','1011','1001','1001']
};

function wallFace(out,side,half) {
  // u runs right when facing a wall. Relief is surface trim on the admitted solid.
  const convert=(u,y,depth)=>{
    if(side===0) return [u,y,-half+depth];
    if(side===1) return [half-depth,y,u];
    if(side===2) return [-u,y,half-depth];
    return [-half+depth,y,-u];
  };
  const tile=(u,y,w,h,c,d=.012)=>quad(out,convert(u,y,d),convert(u+w,y,d),convert(u+w,y+h,d),convert(u,y+h,d),c);
  const glyph=(word,u,y,k,c)=>{
    for (const letter of word) {
      const rows=lettering[letter];
      for(let r=0;r<rows.length;r++) for(let x=0;x<rows[r].length;x++) if(rows[r][x]==='1') tile(u+x*k,y+(4-r)*k,k*.98,k*.98,c,.064);
      u+=k*(rows[0].length+1);
    }
  };
  const light=side%2===0?amber:teal;
  for(let u=-half;u<half;u+=4) {
    tile(u+.06,.25,3.88,7.5,tint(iron,1.12+((u+half)%8)*.04),.006);
    tile(u+.16,.4,3.68,2.0,tint(rim,.64)); tile(u+.22,.48,3.55,1.8,iron,.018);
    for(let j=0;j<4;j++) tile(u+.36+j*.78,.62,.48,.15,black,.022);
    tile(u+.15,2.9,3.7,4.1,black,.019);
    for(let j=0;j<9;j++) {
      tile(u+.20,3.04+j*.41,3.60,.25,tint(side%2===0?rust:rim,.63+.14*(j%3)),.023);
      tile(u+.28,3.03+j*.41,3.44,.045,tint(light,.5+.25*(j%2)),.025);
    }
    tile(u+.03,.2,.17,9.5,rim,.03); tile(u+.22,.2,.10,9.5,black,.03);
    tile(u+.46,7.35,3.22,.19,rim,.03); tile(u+.63,7.40,2.85,.09,light,.035);
    tile(u+.08,8.2,3.83,2.7,tint(iron,1.4)); tile(u+.19,9.7,3.57,.16,black,.03);
  }
  tile(-half,2.55,half*2,.21,black,.035); tile(-half,2.67,half*2,.095,rust,.040);
  tile(-half,8.0,half*2,.13,rim,.04);
  // Central charging-door cassette, LED throat, stencil and diagonal lintel.
  tile(-3.18,.03,6.36,6.92,black,.045); tile(-3.04,.12,6.08,6.64,rim,.047);
  tile(-2.93,.18,5.86,6.45,iron,.049);
  for(let k=0;k<2;k++){
    const x=k*2.84-2.82;
    tile(x,.23,2.78,4.05,tint(iron,1.38),.052);
    for(let j=0;j<6;j++) tile(x+.2,.55+j*.57,2.37,.08,tint(black,1.3),.054);
  }
  tile(-.055,.28,.11,4.0,light,.056);
  for(let u=-2.75;u<2.75;u+=.46) {
    quad(out,convert(u,4.36,.058),convert(u+.21,4.36,.058),convert(u+.47,4.68,.058),convert(u+.26,4.68,.058),amber);
  }
  glyph('0'+(side+1),-1.0,4.95,.29,[.92,.88,.69]);
  glyph(side%2===0?'KILN':'PIT',-half+1.1,5.8,.14,[.83,.87,.78]);
}

// Casting wheels sit behind the north-wall grille. Their rotation is cosmetic.
export function castingWheels(out,half,tick,moving) {
  for(const x of [-10.1,10.1]) {
    const y=5.45, z=-half+(moving?.095:.081), point=(r,a,offset=0)=>[x+r*Math.cos(a),y+r*Math.sin(a),z+offset];
    const band=(a,b,r1,r2,c,offset=0)=>quad(out,point(r1,a,offset),point(r2,a,offset),point(r2,b,offset),point(r1,b,offset),c);
    for(let i=0;i<32;i++) {
      const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
      if(!moving) {
        band(a,b,2.02,2.15,black);band(a,b,2.15,2.31,i%4===0?brassPlate:rim);
        band(a,b,.42,2.02,i%4===0?[1,.51,.13]:[.95,.29,.065]);
        band(a,b,.47,.60,hot,.006);band(a,b,1.67,1.76,hot,.006);
      }
    }
    if(moving) {
      for(let i=0;i<8;i++) {
        const a=i*Math.PI/4+tick*.007*(x<0?1:-1);
        quad(out,point(.44,a),point(1.98,a+.27),point(1.98,a+.59),point(.42,a+.38),iron);
      }
      for(let i=0;i<16;i++) band(i*Math.PI/8,(i+1)*Math.PI/8,0,.48,brassPlate,.005);
    }
  }
}
const brassPlate=[.52,.40,.22];

export function steelworks(arena) {
  const out=[], {pack}=arena, half=pack.settings.size/2;
  const box=(p,s,c)=>boxVertices(p,s,c,out);
  for(const solid of pack.solids) box(solid.center,solid.size,solid.color);
  const floor=(x,z,w,d,y,c)=>quad(out,[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],c);
  for(let x=-half;x<half;x+=2) for(let z=-half;z<half;z+=2) {
    const noise=((x+half)*19+(z+half)*7+Math.abs(x*z))%13;
    const corners=[[x+.026,z+.026],[x+1.974,z+.026],[x+1.974,z+1.974],[x+.026,z+1.974]];
    const cols=corners.map(([px,pz])=>{
      const kiln=Math.max(0,1-Math.hypot(Math.abs(px)-10.1,pz+half)/9);
      const press=Math.max(0,1-Math.min(Math.hypot(px+3.5,pz+3),Math.hypot(px-4.5,pz-5))/4.6);
      const shade=pack.solids.some(s=>s.id.startsWith('block-') && px>s.box.min[0]-.45&&px<s.box.max[0]+1.2&&pz>s.box.min[2]+.4&&pz<s.box.max[2]+1.2)?.69:1;
      const c=tint(pack.settings.palette.floor,(.86+noise*.016)*shade);
      return [c[0]+kiln*.37+press*.14,c[1]+kiln*.064+press*.023,c[2]-.028*kiln];
    });
    for(const i of [0,1,2,0,2,3])out.push(corners[i][0],.008,corners[i][1],...cols[i]);
    if((x+z)%4===0) floor(x+.095,z+.095,.09,.09,.012,rim);
  }
  // Inlaid lines, service drains and a cast-metal charging ring; all at floor level.
  for(const side of [-1,1]) {
    floor(side*6.6,-half,.11,half*2,.018,tint(amber,.70));
    floor(-half,side*8,half*2,.08,.019,tint(rim,.96));
    for(let z=-half;z<half;z+=1.2) {
      floor(side*11.9,z,.76,.96,.020,black);
      for(let i=0;i<4;i++)floor(side*11.9,z+.07+i*.22,.76,.08,.023,iron);
    }
  }
  annulus(out,0,2,2.75,3.1,.023,black);
  for(let i=0;i<14;i++) annulus(out,0,2,2.80,3.02,.025,amber,i*.449,i*.449+.27);
  for(let side=0;side<4;side++) wallFace(out,side,half);
  castingWheels(out,half,0,false);
  for(const solid of pack.solids.filter(s=>s.id.startsWith('block-'))) {
    const [x,y,z]=solid.center,[w,h,d]=solid.size;
    const press=pack.geometry.blocks[Number(solid.id.slice(6))].id.startsWith('press');
    box([x,h-.09,z],[w+.025,.14,d+.025],rim);
    box([x,.16,z],[w+.028,.24,d+.028],black);
    for(const side of [-1,1]) {
      for(const sx of [-1,1]) box([x+sx*(w/2-.15),y,z+side*d/2],[.16,h-.25,.034],tint(rim,.84));
      box([x,h*.62,z+side*d/2],[w-.55,press?1.38:.44,.040],black);
      const lines=press?7:3;
      for(let j=0;j<lines;j++) {
        box([x,h*.62+(j-(lines-1)/2)*(press?.165:.11),z+side*(d/2+.024)],
          [w-.82,press?.077:.052,.018],press?(j%3===0?hot:amber):teal);
      }
      for(let k=0;k<3;k++) box([x+side*w/2,h*(.25+k*.24),z],[.034,.10,d-.34],tint(rim,.82));
    }
    for(let k=0;k<4;k++) floor(x-w/2+.2,z-d/2+.25+k*(d-.4)/4,w-.4,.07,h+.013,black);
  }
  for(const step of pack.solids.filter(s=>s.id.startsWith('ramp-'))) {
    const [x,,z]=step.center;
    floor(x-step.size[0]/2,z+step.size[2]/2-.10,step.size[0],.10,step.box.max[1]+.012,amber);
  }
  // Skyline and crane rails lie beyond the arena enclosure, above its playable routes.
  for(const s of [-1,1]) {
    for(let i=-3;i<=3;i++) {
      const x=i*6.2, h=8+((i+5)*7%6);
      box([x,12+h/2,s*(half+3)],[1.35,h,1.35],tint(iron,.75+(i+3)*.045));
      for(let j=1;j<5;j++) box([x,12+h*j/5,s*(half+3)],[1.51,.16,1.51],j===4?rust:rim);
      box([x,12+h*.87,s*(half+3)],[1.48,.42,1.48],rust);
      box([x,12+h,s*(half+3)],[1.1,.14,1.1],amber);
    }
    box([0,13.1,s*(half+1.1)],[half*2+5,.28,.42],iron);
    box([0,15.0,s*(half+1.1)],[half*2+5,.23,.42],iron);
    for(let x=-half-2;x<half+2;x+=3) {
      const z=s*(half+1.1),lo=(Math.round((x+half+2)/3)%2===0);
      quad(out,[x,lo?13.2:15.0,z],[x+.32,lo?13.2:15.0,z],[x+3.32,lo?15.0:13.2,z],[x+3,lo?15.0:13.2,z],tint(rim,.64));
    }
    // Warm haze on the far horizon, behind all world geometry.
    const far=half+63;
    for(const axis of [0,2]) for(const [u,y] of [[-far,-4],[far,-4],[far,95],[-far,-4],[far,95],[-far,95]]) {
      const sky=y<0?[.88,.49,.27]:[.15,.22,.24];
      out.push(axis===0?s*far:u,y,axis===2?s*far:u,...sky);
    }
  }
  return out;
}

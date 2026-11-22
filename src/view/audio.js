import {createSound2D,AUDIO2D_RATE} from '../../vendor/vanillajs/modules/audio2d/index.js';
import {bearing} from './feedback.js';

// Original short PCM scores. Each row is waveform, pitch, offset, duration, level.
const scores={
  rivet:[['noise',180,0,.075,9100],['triangle',89,0,.15,10500],['square',670,.019,.038,3700]],
  arc:[['square',220,0,.050,5650],['noise',120,0,.036,6500],['triangle',550,.018,.042,4500]],
  slag:[['saw',74,0,.17,8400],['noise',95,0,.095,7100],['triangle',340,.02,.10,4500]],
  explosion:[['noise',110,0,.23,10800],['triangle',47,0,.28,11500]],
  hit:[['triangle',1490,0,.042,8500],['square',1010,.025,.035,3800]],
  frag:[['triangle',880,0,.06,7600],['triangle',1320,.055,.10,6900]],
  pickup:[['triangle',620,0,.075,7700],['triangle',930,.048,.105,8500]],
  death:[['saw',175,0,.095,6800],['triangle',84,.056,.16,7500]],
  reload:[['noise',360,0,.045,6500],['square',295,.052,.03,3300]]
};
export class Sound {
  constructor() {this.ctx=null;this.bank=new Map();this.voices=new Set();this.enabled=false;this.generation=0;}
  async enable() {
    const generation=++this.generation;
    try {
      this.ctx??=new AudioContext();
      await this.ctx.resume();
      if(generation!==this.generation) return false;
      if(!this.bank.size) for(const [name,notes] of Object.entries(scores)) {
        const frames=Math.ceil(Math.max(...notes.map(n=>n[2]+n[3]))*AUDIO2D_RATE)+2;
        const events=notes.map(([wave,frequency,at,len,gain],i)=>({wave,frequency,gain,id:i+1,channel:i,seed:309+i*73,
          sample:Math.round(at*AUDIO2D_RATE),duration:Math.round(len*AUDIO2D_RATE)}));
        const pcm=createSound2D({frames,events}).renderAll(), buffer=this.ctx.createBuffer(1,frames,AUDIO2D_RATE);
        buffer.getChannelData(0).set(Float32Array.from(pcm,x=>x/32768));
        this.bank.set(name,buffer);
      }
      return this.enabled=true;
    } catch {this.enabled=false;return false;}
  }
  stop() {
    this.generation++;this.enabled=false;
    for(const s of this.voices) {s.onended=null;try{s.stop();}catch{}s.disconnect();s.gainNode.disconnect();s.panner?.disconnect();}
    this.voices.clear();
  }
  play(name,level=.5,pan=0) {
    if(!this.enabled||this.voices.size>=12||!this.bank.has(name)) return;
    const s=this.ctx.createBufferSource(), gain=this.ctx.createGain();
    s.buffer=this.bank.get(name);gain.gain.value=level;s.connect(gain);
    if(pan && this.ctx.createStereoPanner) {
      s.panner=this.ctx.createStereoPanner();s.panner.pan.value=pan;
      gain.connect(s.panner);s.panner.connect(this.ctx.destination);
    } else gain.connect(this.ctx.destination);
    s.gainNode=gain;this.voices.add(s);
    s.onended=()=>{this.voices.delete(s);s.disconnect();gain.disconnect();s.panner?.disconnect();}; s.start();
  }
  events(match) {
    if(!this.enabled) return;
    for(const e of match.events) {
      if(e.type==='shot'||e.type==='explosion') {
        const a=match.actor('player').position,p=e.origin??e.point;
        const distance=Math.hypot(...a.map((v,i)=>v-p[i]));
        const angle=bearing(a,p), pan=angle===null?0:.82*Math.sin(angle+match.units[0].body.yaw);
        this.play(e.type==='shot'?e.weapon:'explosion',.62/(1+.13*distance),pan);
      } else if(e.type==='damage' && e.source==='player' && e.target!=='player') this.play('hit',.40);
      else if(e.type==='pickup'&&e.actor==='player') this.play('pickup');
      else if(e.type==='reload-start'&&e.actor==='player') this.play('reload');
      else if(e.type==='death'&&e.target==='player') this.play('death');
      else if(e.type==='elimination'&&e.source==='player') this.play('frag',.45);
    }
  }
  dispose(){this.stop();this.bank.clear();this.ctx?.close().catch(()=>{});}
}

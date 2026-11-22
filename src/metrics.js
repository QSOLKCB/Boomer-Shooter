class Window {
  constructor(capacity){this.data=[];this.next=0;this.capacity=capacity;}
  add(value){if(this.data.length<this.capacity)this.data.push(value);else{this.data[this.next]=value;this.next=(this.next+1)%this.capacity;}}
  rows(){return [...this.data.slice(this.next),...this.data.slice(0,this.next)];}
}
export class Metrics {
  constructor(){this.frames=new Window(4096);this.ticks=new Window(8192);this.dropped=0;this.spikes=0;}
  frame(tick,interval,callback,steps,dropped,calls,triangles,projectiles) {
    this.dropped+=dropped;if(interval>33.34)this.spikes++;
    this.frames.add([tick,interval,callback,steps,dropped,calls,triangles,projectiles]);
  }
  export(){return {frameColumns:['tick','intervalMs','callbackMs','steps','droppedSeconds','drawCalls','submittedTriangles','projectiles'],
    tickColumns:['tick','stepMs'],frames:this.frames.rows(),ticks:this.ticks.rows(),droppedSeconds:this.dropped,spikesOver33ms:this.spikes};}
}

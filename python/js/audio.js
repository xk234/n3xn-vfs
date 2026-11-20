let context=null,master=null;
export function unlockAudio(){
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return;
  try{
    if(!context){context=new AudioContextClass();master=context.createGain();master.gain.value=0.22;master.connect(context.destination);}
    if(context.state==="suspended")context.resume().catch(()=>{});
  }catch(_){}
}
function tone(frequency,duration,wave="sine",volume=0.22,delay=0,slide=0){
  if(!context||!master||context.state!=="running")return;
  const start=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();
  osc.type=wave;osc.frequency.setValueAtTime(frequency,start);
  if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(35,frequency+slide),start+duration);
  gain.gain.setValueAtTime(0.0001,start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001,volume),start+0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
  osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+duration+0.025);
}
export function playGameSound(kind){
  if(!context||context.state!=="running")return;
  if(kind==="jump"){tone(420,0.09,"triangle",0.16,0,180);}
  else if(kind==="pad"){tone(280,0.16,"sawtooth",0.2,0,520);tone(620,0.12,"sine",0.12,0.045,180);}
  else if(kind==="orb"){tone(680,0.14,"sine",0.2,0,420);tone(980,0.2,"sine",0.12,0.06,120);}
  else if(kind==="death"){tone(240,0.34,"sawtooth",0.2,0,-180);tone(110,0.3,"triangle",0.14,0.08,-55);}
  else if(kind==="coin"){tone(880,0.11,"sine",0.16,0,220);tone(1320,0.16,"sine",0.10,0.045);}
  else if(kind==="checkpoint"){tone(520,0.12,"sine",0.14);tone(780,0.16,"sine",0.13,0.09);}
  else if(kind==="complete"){[523,659,784,1047].forEach((n,i)=>tone(n,0.22,"triangle",0.15,i*0.12,35));}
  else if(kind==="start"){tone(330,0.1,"triangle",0.12);tone(495,0.14,"triangle",0.12,0.08);}
}

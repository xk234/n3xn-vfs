let context=null,master=null,musicTimer=null,musicStep=0,musicWanted=false,musicPaused=false;
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
function kick(){
  if(!context||!master||context.state!=="running")return;
  const now=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
  osc.type="sine";osc.frequency.setValueAtTime(135,now);osc.frequency.exponentialRampToValueAtTime(42,now+0.13);
  gain.gain.setValueAtTime(0.0001,now);gain.gain.exponentialRampToValueAtTime(0.22,now+0.006);gain.gain.exponentialRampToValueAtTime(0.0001,now+0.15);
  osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+0.17);
}
function musicTick(){
  if(!musicWanted||musicPaused||!context||context.state!=="running")return;
  const step=musicStep%16;
  const bass=[55,0,55,0,65.4,0,73.4,0,49,0,49,0,65.4,0,73.4,0];
  const lead=[440,0,523,0,659,0,523,0,392,0,494,0,587,0,494,0];
  if(step%4===0)kick();
  if(step===4||step===12)tone(185,0.07,"triangle",0.055,0,-65);
  if(step%2===0)tone(bass[step],0.11,"sawtooth",0.035,0,-8);
  if(lead[step])tone(lead[step],0.095,"triangle",0.035,0,20);
  if(step===2||step===6||step===10||step===14)tone(1150,0.025,"square",0.018);
  musicStep++;
}
function startGameMusic(){
  if(!context||context.state!=="running")return;
  if(musicTimer)clearInterval(musicTimer);
  musicWanted=true;musicPaused=false;musicStep=0;musicTick();
  musicTimer=setInterval(musicTick,125);
}
function pauseGameMusic(){
  musicPaused=true;if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
}
function resumeGameMusic(){
  if(!musicWanted||!context||context.state!=="running")return;
  musicPaused=false;if(!musicTimer){musicTimer=setInterval(musicTick,125);}
}
export function stopGameMusic(){
  musicWanted=false;musicPaused=false;if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
}
export function playGameSound(kind){
  if(!context||context.state!=="running")return;
  if(kind==="jump"){tone(420,0.09,"triangle",0.16,0,180);}
  else if(kind==="pad"){tone(280,0.16,"sawtooth",0.2,0,520);tone(620,0.12,"sine",0.12,0.045,180);}
  else if(kind==="orb"){tone(680,0.14,"sine",0.2,0,420);tone(980,0.2,"sine",0.12,0.06,120);}
  else if(kind==="death"){stopGameMusic();tone(240,0.34,"sawtooth",0.2,0,-180);tone(110,0.3,"triangle",0.14,0.08,-55);}
  else if(kind==="coin"){tone(880,0.11,"sine",0.16,0,220);tone(1320,0.16,"sine",0.10,0.045);}
  else if(kind==="checkpoint"){tone(520,0.12,"sine",0.14);tone(780,0.16,"sine",0.13,0.09);}
  else if(kind==="complete"){stopGameMusic();[523,659,784,1047].forEach((n,i)=>tone(n,0.22,"triangle",0.15,i*0.12,35));}
  else if(kind==="start"){tone(330,0.1,"triangle",0.12);tone(495,0.14,"triangle",0.12,0.08);startGameMusic();}
  else if(kind==="pause"){pauseGameMusic();tone(420,0.08,"sine",0.08,0,-100);}
  else if(kind==="resume"){resumeGameMusic();tone(520,0.08,"sine",0.08,0,120);}
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import './pixel-world.css'

type Vec = { x: number; y: number }
type Quest = { id: string; title: string; detail: string; reward: string; status: string }
const TILE = 32
const WORLD_W = 96
const WORLD_H = 72
const clamp = (v:number,a:number,b:number) => Math.max(a,Math.min(b,v))
const quests: Quest[] = [
  {id:'explorer',title:'First Steps',detail:'Explore the island and discover the main road.',reward:'Explorer badge',status:'AVAILABLE'},
  {id:'collection',title:'The Next Collection',detail:'A new NFT collection quest will appear here when its campaign opens.',reward:'NFT whitelist / GTD access',status:'COMING SOON'},
  {id:'rover',title:'$ROVER Launch Mission',detail:'Token campaign missions and eligibility checks will be announced here.',reward:'$ROVER campaign rewards',status:'COMING SOON'},
]
const roads = new Set<string>()
for(let y=12;y<68;y++) roads.add(`${Math.round(45+Math.sin(y/8)*5)},${y}`)
for(let x=12;x<82;x++) roads.add(`${x},42`)
const roadAt=(x:number,y:number)=>roads.has(`${x},${y}`)
function seeded(n:number){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
const trees: Vec[] = []
const rocks: Vec[] = []
for(let i=0;i<470;i++){const x=2+seeded(i*2+1)*(WORLD_W-4),y=2+seeded(i*2+2)*(WORLD_H-4);if(!roadAt(Math.floor(x),Math.floor(y))&&Math.hypot(x-45,y-42)>5)trees.push({x,y})}
for(let i=0;i<95;i++){const x=3+seeded(i*5+9)*(WORLD_W-6),y=3+seeded(i*7+13)*(WORLD_H-6);if(!roadAt(Math.floor(x),Math.floor(y)))rocks.push({x,y})}
const obstacles=[...trees.map(p=>({x:p.x*TILE,y:p.y*TILE,r:11})),...rocks.map(p=>({x:p.x*TILE,y:p.y*TILE,r:8})),{x:39*TILE,y:39*TILE,r:30},{x:54*TILE,y:45*TILE,r:23}]
function drawTree(ctx:CanvasRenderingContext2D,x:number,y:number,s=1){ctx.fillStyle='#563a29';ctx.fillRect(x-3*s,y-3*s,6*s,17*s);ctx.fillStyle='#164b32';ctx.fillRect(x-13*s,y-17*s,26*s,20*s);ctx.fillStyle='#246a3c';ctx.fillRect(x-10*s,y-23*s,20*s,13*s);ctx.fillStyle='#39834a';ctx.fillRect(x-5*s,y-27*s,10*s,8*s);ctx.fillStyle='#65a95b';ctx.fillRect(x-9*s,y-14*s,5*s,4*s)}
function drawPerson(ctx:CanvasRenderingContext2D,x:number,y:number,shirt='#d89b54',skin='#f0c28a',scale=1,phase=0,animate=false){const swing=animate?Math.sin(phase)*3*scale:0;ctx.fillStyle='#1c3427';ctx.fillRect(x-7*scale,y-2*scale,14*scale,5*scale);ctx.fillStyle='#293f36';ctx.fillRect(x-5*scale-swing,y-12*scale,4*scale,12*scale);ctx.fillRect(x+1*scale+swing,y-12*scale,4*scale,12*scale);ctx.fillStyle=shirt;ctx.fillRect(x-7*scale,y-29*scale,14*scale,18*scale);ctx.fillStyle=skin;ctx.fillRect(x-10*scale,y-27*scale,3*scale,12*scale);ctx.fillRect(x+7*scale,y-27*scale,3*scale,12*scale);ctx.fillRect(x-6*scale,y-43*scale,12*scale,12*scale);ctx.fillStyle='#392b20';ctx.fillRect(x-7*scale,y-45*scale,14*scale,5*scale);ctx.fillRect(x-7*scale,y-40*scale,3*scale,4*scale);ctx.fillRect(x+4*scale,y-40*scale,3*scale,4*scale);ctx.fillStyle='#17271e';ctx.fillRect(x-3*scale,y-38*scale,2*scale,2*scale);ctx.fillRect(x+2*scale,y-38*scale,2*scale,2*scale)}
function drawHorse(ctx:CanvasRenderingContext2D,x:number,y:number){ctx.fillStyle='#35261e';ctx.fillRect(x-19,y-13,37,17);ctx.fillStyle='#9b6038';ctx.fillRect(x-17,y-16,32,14);ctx.fillRect(x+7,y-29,9,19);ctx.fillRect(x+9,y-34,11,9);ctx.fillStyle='#4b2c20';ctx.fillRect(x+10,y-37,10,4);ctx.fillRect(x-15,y+1,5,13);ctx.fillRect(x+8,y+1,5,13);ctx.fillRect(x-22,y-17,7,4);ctx.fillStyle='#f1d6aa';ctx.fillRect(x+16,y-31,2,2)}
function drawCar(ctx:CanvasRenderingContext2D,x:number,y:number){ctx.fillStyle='#27372e';ctx.fillRect(x-25,y-10,50,18);ctx.fillStyle='#d95743';ctx.fillRect(x-21,y-15,42,14);ctx.fillStyle='#a9d9d2';ctx.fillRect(x-12,y-22,24,9);ctx.fillStyle='#263a3b';ctx.fillRect(x-8,y-20,7,6);ctx.fillRect(x+2,y-20,7,6);ctx.fillStyle='#161e1b';ctx.fillRect(x-17,y+4,10,8);ctx.fillRect(x+9,y+4,10,8)}
export default function PixelWorld(){
 const canvasRef=useRef<HTMLCanvasElement>(null),frameRef=useRef(0),keys=useRef<Record<string,boolean>>({})
 const player=useRef({x:45*TILE,y:44*TILE,vx:0,vy:0,face:0,walk:0,jump:0,jumpV:0})
 const car=useRef({x:44*TILE,y:42*TILE,dir:1}),horse=useRef({x:59*TILE,y:46*TILE,phase:0})
 const [joystick,setJoystick]=useState({x:0,y:0}),[hud,setHud]=useState({x:45,y:44,region:'PINEWOOD VILLAGE',steps:0})
 const [panel,setPanel]=useState<'none'|'quests'|'horse'|'notice'>('none'),[message,setMessage]=useState('Welcome to the island. Explore freely!')
 const [activeQuest,setActiveQuest]=useState('explorer'),[visited,setVisited]=useState(false)
 const interact=useCallback(()=>{const p=player.current;const d=(x:number,y:number)=>Math.hypot(p.x-x,p.y-y);if(d(45*TILE,42*TILE)<95){setPanel('quests');return}if(d(horse.current.x,horse.current.y)<75){setPanel('horse');return}setMessage('Nothing nearby. Follow the stone road to find the village board.');setPanel('notice')},[])
 useEffect(()=>{const down=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.current[k]=true;if(k==='e')interact();if(k==='escape')setPanel('none')};const up=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[interact])
 useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;let raf=0,last=0,steps=0,lastHud=0
 const resize=()=>{const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)};resize();const ro=new ResizeObserver(resize);ro.observe(canvas)
 const loop=(time:number)=>{const dt=Math.min((time-last)/1000||0,.04);last=time;const p=player.current;let dx=(keys.current.d||keys.current.arrowright?1:0)-(keys.current.a||keys.current.arrowleft?1:0)+joystick.x,dy=(keys.current.s||keys.current.arrowdown?1:0)-(keys.current.w||keys.current.arrowup?1:0)+joystick.y;const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len}const sprint=keys.current.shift;const speed=sprint?190:126;const nx=p.x+dx*speed*dt,ny=p.y+dy*speed*dt
 const blocked=(x:number,y:number)=>obstacles.some(o=>Math.hypot(x-o.x,y-o.y)<o.r+8)||Math.hypot(x-car.current.x,y-car.current.y)<31||Math.hypot(x-horse.current.x,y-horse.current.y)<25
 if(!blocked(nx,p.y))p.x=clamp(nx,24,WORLD_W*TILE-24);if(!blocked(p.x,ny))p.y=clamp(ny,24,WORLD_H*TILE-24)
 if(dx||dy){p.walk+=dt*(sprint?17:11);p.face=Math.atan2(dy,dx);steps+=dt*(sprint?1.6:1)}
 if(keys.current[' ']&&p.jump===0){p.jumpV=310;p.jump=1}if(p.jump>0){p.jump+=p.jumpV*dt;p.jumpV-=850*dt;if(p.jump<0){p.jump=0;p.jumpV=0}}
 car.current.x+=car.current.dir*24*dt;if(car.current.x>56*TILE)car.current.dir=-1;if(car.current.x<37*TILE)car.current.dir=1
 horse.current.phase+=dt;horse.current.x=59*TILE+Math.sin(horse.current.phase*.45)*12
 const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,cx=p.x-w/2,cy=p.y-h/2
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#4f9652';ctx.fillRect(0,0,w,h)
 ctx.save();ctx.translate(-cx,-cy)
 // grass checker pattern
 const sx=Math.floor(cx/TILE)-1,ex=Math.ceil((cx+w)/TILE)+1,sy=Math.floor(cy/TILE)-1,ey=Math.ceil((cy+h)/TILE)+1
 for(let y=sy;y<=ey;y++)for(let x=sx;x<=ex;x++){ctx.fillStyle=((x*7+y*11)%5===0)?'#5aa457':((x+y)%2?'#559b51':'#51964e');ctx.fillRect(x*TILE,y*TILE,TILE,TILE);if((x*13+y*7)%9===0){ctx.fillStyle='#79b866';ctx.fillRect(x*TILE+7,y*TILE+8,2,3);ctx.fillRect(x*TILE+21,y*TILE+22,2,2)}}
 // paths
 ctx.fillStyle='#b69a69';for(let y=12;y<68;y++){const x=Math.round(45+Math.sin(y/8)*5);ctx.fillRect(x*TILE-11,y*TILE,22,TILE+1)}ctx.fillRect(12*TILE,42*TILE,70*TILE,TILE)
 ctx.fillStyle='#d0b486';for(let y=12;y<68;y++){const x=Math.round(45+Math.sin(y/8)*5);ctx.fillRect(x*TILE-2,y*TILE,4,TILE)}ctx.fillRect(12*TILE,42*TILE+13,70*TILE,4)
 // river and bridge
 ctx.fillStyle='#318f9a';ctx.fillRect(67*TILE,4*TILE,5*TILE,66*TILE);ctx.fillStyle='#63c3c0';for(let y=5;y<70;y+=3)ctx.fillRect(67*TILE+8,y*TILE,3,18)
 ctx.fillStyle='#795638';ctx.fillRect(66*TILE,27*TILE,7*TILE,TILE);ctx.fillStyle='#d4b77c';for(let x=66;x<73;x++)ctx.fillRect(x*TILE,27*TILE+5,20,3)
 // pond
 ctx.fillStyle='#358e98';ctx.fillRect(18*TILE,18*TILE,5*TILE,3*TILE);ctx.fillStyle='#72c9bd';ctx.fillRect(19*TILE,19*TILE,2*TILE,5)
 // buildings
 ctx.fillStyle='#60432d';ctx.fillRect(35*TILE,35*TILE,8*TILE,6*TILE);ctx.fillStyle='#d2a36b';ctx.fillRect(36*TILE,36*TILE,6*TILE,4*TILE);ctx.fillStyle='#7b3f32';ctx.fillRect(34*TILE,34*TILE,10*TILE,2*TILE);ctx.fillRect(36*TILE,32*TILE,6*TILE,3*TILE);ctx.fillStyle='#402d22';ctx.fillRect(38*TILE,38*TILE,2*TILE,3*TILE)
 // quest board
 ctx.fillStyle='#523821';ctx.fillRect(44*TILE,40*TILE,3,27);ctx.fillRect(43*TILE,39*TILE,26,18);ctx.fillStyle='#e5c987';ctx.fillRect(44*TILE+2,40*TILE+2,22,14);ctx.fillStyle='#6d4a2c';ctx.fillRect(44*TILE+5,40*TILE+5,13,2);ctx.fillRect(44*TILE+5,40*TILE+9,17,2);ctx.fillStyle='#f8e7a8';ctx.fillRect(44*TILE+21,40*TILE-5,5,5)
 // NPC, horse, car
 drawPerson(ctx,51*TILE,43*TILE,'#5485ad');drawHorse(ctx,horse.current.x,horse.current.y);drawCar(ctx,car.current.x,car.current.y)
 // rocks and trees
 for(const r of rocks){if(r.x*TILE<cx-40||r.x*TILE>cx+w+40||r.y*TILE<cy-40||r.y*TILE>cy+h+40)continue;ctx.fillStyle='#66756b';ctx.fillRect(r.x*TILE-7,r.y*TILE-5,15,10);ctx.fillStyle='#89978a';ctx.fillRect(r.x*TILE-5,r.y*TILE-5,6,3)}
 for(const t of trees){if(t.x*TILE<cx-60||t.x*TILE>cx+w+60||t.y*TILE<cy-70||t.y*TILE>cy+h+60)continue;drawTree(ctx,t.x*TILE,t.y*TILE,.8+seeded(Math.round(t.x*13+t.y*7))*.45)}
 // player shadow and sprite, jump offset
 ctx.fillStyle='#263d2a55';ctx.beginPath();ctx.ellipse(p.x,p.y+2,12,6,0,0,Math.PI*2);ctx.fill()
 const bob=(dx||dy)?Math.abs(Math.sin(p.walk))*2:0;ctx.save();ctx.translate(p.x,p.y-p.jump-bob);ctx.rotate(p.face+Math.PI/2);drawPerson(ctx,0,0,'#e3a34f','#f2c68f',1,p.walk,!!(dx||dy));ctx.restore()
 // nameplate and labels
 ctx.fillStyle='#183b29';ctx.fillRect(42*TILE,38*TILE-19,33,12);ctx.fillStyle='#f2e5b7';ctx.font='8px monospace';ctx.fillText('QUEST BOARD',42*TILE+2,38*TILE-10)
 ctx.restore()
 // HUD overlays
 ctx.fillStyle='#102719e8';ctx.fillRect(12,12,Math.min(w-24,250),60);ctx.strokeStyle='#a6d58c';ctx.strokeRect(12,12,Math.min(w-24,250),60);ctx.fillStyle='#b9f0a9';ctx.font='bold 11px monospace';ctx.fillText('PINEWOOD ISLAND',23,31);ctx.fillStyle='#e6f4db';ctx.font='10px monospace';ctx.fillText('WALK  ·  EXPLORE  ·  DISCOVER',23,49);ctx.fillStyle='#a9c8a0';ctx.fillText(`X ${Math.floor(p.x/TILE)}  Y ${Math.floor(p.y/TILE)}  ·  ${Math.floor(steps)} STEPS`,23,64)
 ctx.fillStyle='#102719e8';ctx.fillRect(w-133,12,121,35);ctx.strokeStyle='#a6d58c';ctx.strokeRect(w-133,12,121,35);ctx.fillStyle='#f3e5bd';ctx.font='10px monospace';ctx.fillText('E  INTERACT',w-121,34)
 if(Math.hypot(p.x-45*TILE,p.y-42*TILE)<105){ctx.fillStyle='#102719e8';ctx.fillRect(w/2-100,h-54,200,34);ctx.fillStyle='#f4edc9';ctx.font='bold 11px monospace';ctx.fillText('PRESS E  ·  QUEST BOARD',w/2-85,h-33)}
 if(time-lastHud>180){lastHud=time;setHud({x:Math.floor(p.x/TILE),y:Math.floor(p.y/TILE),region:p.x/TILE>66?'RIVER CROSSING':p.x/TILE<28?'OLD GROVE':'PINEWOOD VILLAGE',steps:Math.floor(steps)});if(steps>2&&!visited){setVisited(true);setMessage('You are on your first adventure! Find the Quest Board near the village.')}}raf=requestAnimationFrame(loop)}
 raf=requestAnimationFrame(loop);return()=>{cancelAnimationFrame(raf);ro.disconnect()}},[joystick,visited])
 const onStick=(e:PointerEvent<HTMLDivElement>)=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2),l=Math.max(1,Math.hypot(x,y));setJoystick({x:x/l,y:y/l})}
 const closePanel=()=>setPanel('none')
 return <div className="pixel-game">
  <header className="pg-header"><div className="pg-brand"><span className="pg-logo">✦</span><div><b>ROBINHOOD <i>JUNGLE</i></b><small>PIXEL ADVENTURE WORLD</small></div></div><div className="pg-header-right"><span className="pg-online"><i/> WORLD ONLINE</span><span className="pg-icon">FREE TO PLAY</span></div></header>
  <div className="pg-intro"><div><span className="pg-kicker">YOUR ADVENTURE STARTS HERE</span><h1>FIND YOUR <em>OWN PATH.</em></h1><p>Walk through the island, meet its inhabitants and discover what's waiting beyond the trees.</p></div><div className="pg-stats"><div><small>REGION</small><b>{hud.region}</b></div><div><small>STEPS TAKEN</small><b>{hud.steps}</b></div><div><small>LOCATION</small><b>{hud.x}, {hud.y}</b></div></div></div>
  <section className="pg-world"><div className="pg-world-top"><div><span className="pg-live-dot"/> PINEWOOD ISLAND <span className="pg-sep">/</span> OPEN WORLD</div><div className="pg-key-guide">WASD / ARROWS <span>MOVE</span> · SPACE <span>JUMP</span> · SHIFT <span>RUN</span> · E <span>INTERACT</span></div></div><div className="pg-canvas-wrap"><canvas ref={canvasRef} aria-label="Playable top down pixel adventure world"/><div className="pg-touch-controls"><div className="pg-stick" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);onStick(e)}} onPointerMove={e=>{if(e.buttons)onStick(e)}} onPointerUp={()=>setJoystick({x:0,y:0})} onPointerCancel={()=>setJoystick({x:0,y:0})}><span/></div><div className="pg-touch-buttons"><button onPointerDown={()=>{keys.current[' ']=true}} onPointerUp={()=>{keys.current[' ']=false}} onPointerLeave={()=>{keys.current[' ']=false}}>JUMP</button><button onPointerDown={()=>{keys.current.shift=true}} onPointerUp={()=>{keys.current.shift=false}} onPointerLeave={()=>{keys.current.shift=false}}>RUN</button><button onClick={interact}>USE</button></div></div><div className="pg-mobile-tip">Drag the joystick to move · Tap JUMP to hop</div></div><div className="pg-world-foot"><span>✦ A WORLD TO EXPLORE</span><button onClick={()=>{player.current.x=45*TILE;player.current.y=44*TILE;setPanel('none')}}>↺ RETURN TO VILLAGE</button></div></section>
  <section className="pg-lower"><div className="pg-quest-preview"><div className="pg-section-title"><div><span className="pg-kicker">DISCOVER WHAT'S NEXT</span><h2>THE <em>QUEST BOARD</em></h2></div><button onClick={()=>{setPanel('quests');setActiveQuest('explorer')}}>OPEN BOARD ↗</button></div><div className="pg-quest-cards">{quests.map(q=><button className="pg-quest-card" key={q.id} onClick={()=>{setActiveQuest(q.id);setPanel('quests')}}><span className="pg-quest-icon">{q.id==='explorer'?'✦':q.id==='collection'?'▣':'◈'}</span><span><b>{q.title}</b><small>{q.reward}</small></span><i>{q.status}</i></button>)}</div></div><aside className="pg-how"><span className="pg-kicker">HOW TO PLAY</span><h2>TAKE IT <em>EASY.</em></h2><p>There is no rush. Wander around, cross the bridge, visit the horse and stop by the village board.</p><div><kbd>W A S D</kbd> Move <kbd>SPACE</kbd> Jump <kbd>SHIFT</kbd> Run <kbd>E</kbd> Interact</div></aside></section>
  <footer className="pg-footer"><span>ROBINHOOD JUNGLE · COMMUNITY ADVENTURE</span><span>FREE TO PLAY · NO PAYMENT REQUIRED</span></footer>
  {panel!=='none'&&<div className="pg-modal-backdrop" onClick={closePanel}><div className="pg-modal" onClick={e=>e.stopPropagation()}><button className="pg-modal-close" onClick={closePanel}>×</button>
   {panel==='quests'&&<><span className="pg-kicker">PINEWOOD VILLAGE</span><h2>QUEST <em>BOARD</em></h2><div className="pg-quest-tabs">{quests.map(q=><button className={activeQuest===q.id?'active':''} key={q.id} onClick={()=>setActiveQuest(q.id)}>{q.title}</button>)}</div>{quests.filter(q=>q.id===activeQuest).map(q=><div className="pg-quest-detail" key={q.id}><span className="pg-quest-big">{q.id==='explorer'?'✦':q.id==='collection'?'▣':'◈'}</span><h3>{q.title}</h3><p>{q.detail}</p><div><small>POTENTIAL REWARD</small><b>{q.reward}</b></div><label>{q.status}</label><p className="pg-disclaimer">Campaign rewards are not active yet. No whitelist, GTD or tokens are granted by this demo. Eligibility will be verified server-side when campaigns launch.</p></div>)}</>}
   {panel==='horse'&&<><span className="pg-kicker">A FRIENDLY COMPANION</span><h2>THE <em>STABLE</em></h2><p className="pg-modal-copy">This horse is enjoying a quiet day in Pinewood. Horse riding will unlock in a future game update.</p><button className="pg-primary" onClick={closePanel}>BACK TO EXPLORING</button></>}
   {panel==='notice'&&<><span className="pg-kicker">ISLAND MESSAGE</span><h2>HEY, <em>EXPLORER.</em></h2><p className="pg-modal-copy">{message}</p><button className="pg-primary" onClick={closePanel}>GOT IT</button></>}
  </div></div>}
 </div>
}

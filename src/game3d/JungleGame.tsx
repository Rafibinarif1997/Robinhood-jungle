import { Canvas, useFrame } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import * as THREE from 'three'
import './jungle-game.css'

type V = [number, number, number]
type Input = { forward: number; side: number; jump: boolean; sprint: boolean }
const CHUNK = 36
const GRID = 3

function random(seed: number) {
  let n = seed | 0
  return () => {
    n = (n + 0x6D2B79F5) | 0
    let t = Math.imul(n ^ (n >>> 15), 1 | n)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function seedFor(x: number, z: number) { return Math.imul(x + 92821, 73856093) ^ Math.imul(z + 68917, 19349663) }

function PixelTree({ x, z, scale, tint }: { x: number; z: number; scale: number; tint: string }) {
  return <group position={[x, 0, z]} scale={scale}>
    <mesh position={[0, .85, 0]} castShadow><boxGeometry args={[.42, 1.7, .42]}/><meshStandardMaterial color="#65452d"/></mesh>
    <mesh position={[0, 2.05, 0]} castShadow><boxGeometry args={[1.85, 1.55, 1.85]}/><meshStandardMaterial color={tint}/></mesh>
    <mesh position={[0, 2.95, 0]} castShadow><boxGeometry args={[1.25, 1.1, 1.25]}/><meshStandardMaterial color={tint}/></mesh>
    <mesh position={[0, 3.55, 0]} castShadow><boxGeometry args={[.65, .7, .65]}/><meshStandardMaterial color={tint}/></mesh>
  </group>
}
function Chunk({ cx, cz }: { cx: number; cz: number }) {
  const data = useMemo(() => {
    const rand = random(seedFor(cx, cz))
    const trees: {x:number;z:number;s:number;c:string}[] = []
    const rocks: {x:number;z:number;s:number}[] = []
    for (let i=0;i<22;i++) {
      const x = -CHUNK/2 + 2 + rand()*(CHUNK-4)
      const z = -CHUNK/2 + 2 + rand()*(CHUNK-4)
      const wx = cx*CHUNK+x, wz=cz*CHUNK+z
      if (Math.hypot(wx,wz)<9) continue
      trees.push({x,z,s:.72+rand()*.72,c:['#205b37','#2c7544','#397f49','#174c32'][Math.floor(rand()*4)]})
    }
    for(let i=0;i<7;i++) rocks.push({x:-16+rand()*32,z:-16+rand()*32,s:.35+rand()*.8})
    return {trees,rocks,pond:rand()>.72?{x:-10+rand()*20,z:-10+rand()*20,r:2.5+rand()*3}:null,grass:rand()>.5?'#315f35':'#28552f'}
  },[cx,cz])
  return <group position={[cx*CHUNK,0,cz*CHUNK]}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.12,0]} receiveShadow><planeGeometry args={[CHUNK,CHUNK]}/><meshStandardMaterial color={data.grass}/></mesh>
    {data.trees.map((t,i)=><PixelTree key={i} x={t.x} z={t.z} scale={t.s} tint={t.c}/>)}
    {data.rocks.map((r,i)=><mesh key={i} position={[r.x,r.s*.35,r.z]} rotation={[0,i*.7,0]} castShadow><boxGeometry args={[r.s*1.6,r.s*.8,r.s*1.3]}/><meshStandardMaterial color="#68776a"/></mesh>)}
    {data.pond&&<group position={[data.pond.x,-.02,data.pond.z]}><mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[data.pond.r,12]}/><meshStandardMaterial color="#367f91" roughness={.28}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,0]}><ringGeometry args={[data.pond.r,data.pond.r+.35,12]}/><meshStandardMaterial color="#6d9a61"/></mesh></group>}
    {Array.from({length:9},(_,i)=><mesh key={'fern'+i} position={[-15+(i*7)%30,.16,-14+(i*11)%28]} rotation={[0,i*1.7,0]}><coneGeometry args={[.45,.7,4]}/><meshStandardMaterial color="#67a65a"/></mesh>)}
  </group>
}

function PixelExplorer({ input, onPosition }: { input: Input; onPosition:(p:V)=>void }) {
  const root=useRef<THREE.Group>(null), body=useRef<THREE.Group>(null), leftLeg=useRef<THREE.Group>(null), rightLeg=useRef<THREE.Group>(null), leftArm=useRef<THREE.Group>(null), rightArm=useRef<THREE.Group>(null)
  const velocity=useRef(0), grounded=useRef(true), jumpWas=useRef(false), elapsed=useRef(0)
  const dir=useMemo(()=>new THREE.Vector3(),[])
  const target=useMemo(()=>new THREE.Vector3(),[])
  useFrame((state,delta)=>{
    if(!root.current)return
    const dt=Math.min(delta,.04),p=root.current.position
    dir.set(input.side,0,input.forward)
    const moving=dir.lengthSq()>.01
    if(moving){
      dir.normalize()
      const speed=input.sprint?8.2:4.8
      p.x+=dir.x*speed*dt;p.z+=dir.z*speed*dt
      root.current.rotation.y=Math.atan2(dir.x,dir.z)
    }
    if(input.jump&&!jumpWas.current&&grounded.current){velocity.current=8;grounded.current=false}
    jumpWas.current=input.jump
    velocity.current-=19*dt;p.y+=velocity.current*dt
    if(p.y<=0){p.y=0;velocity.current=0;grounded.current=true}
    elapsed.current+=dt*(moving?(input.sprint?15:10):2)
    const swing=moving?Math.sin(elapsed.current)*.55:0
    if(leftLeg.current)leftLeg.current.rotation.x=swing
    if(rightLeg.current)rightLeg.current.rotation.x=-swing
    if(leftArm.current)leftArm.current.rotation.x=-swing*.7
    if(rightArm.current)rightArm.current.rotation.x=swing*.7
    if(body.current)body.current.position.y=moving?Math.abs(Math.sin(elapsed.current*2))*.045:0
    target.set(p.x,p.y+1.1,p.z)
    state.camera.position.lerp(new THREE.Vector3(p.x+dir.x*1.2,p.y+6.2,p.z+10),1-Math.exp(-3.5*dt))
    state.camera.lookAt(target)
    onPosition([p.x,p.y,p.z])
  })
  return <group ref={root}>
    <group ref={body}>
      <mesh position={[0,1.18,0]} castShadow><boxGeometry args={[.68,.78,.42]}/><meshStandardMaterial color="#e6a34f"/></mesh>
      <mesh position={[0,1.22,.225]}><boxGeometry args={[.42,.48,.035]}/><meshStandardMaterial color="#2878a8"/></mesh>
      <mesh position={[0,1.88,0]} castShadow><boxGeometry args={[.62,.58,.58]}/><meshStandardMaterial color="#e8b879"/></mesh>
      <mesh position={[0,2.19,0]} castShadow><boxGeometry args={[.68,.19,.66]}/><meshStandardMaterial color="#3b2920"/></mesh>
      <mesh position={[0,2.08,.3]}><boxGeometry args={[.46,.1,.035]}/><meshStandardMaterial color="#30251e"/></mesh>
      {[-.13,.13].map(x=><mesh key={x} position={[x,1.91,.3]}><boxGeometry args={[.07,.07,.04]}/><meshStandardMaterial color="#17251c"/></mesh>)}
      <group ref={leftArm} position={[-.42,1.42,0]}><mesh position={[0,-.23,0]} castShadow><boxGeometry args={[.22,.52,.24]}/><meshStandardMaterial color="#e6a34f"/></mesh></group>
      <group ref={rightArm} position={[.42,1.42,0]}><mesh position={[0,-.23,0]} castShadow><boxGeometry args={[.22,.52,.24]}/><meshStandardMaterial color="#e6a34f"/></mesh></group>
      <group ref={leftLeg} position={[-.19,.78,0]}><mesh position={[0,-.25,0]} castShadow><boxGeometry args={[.24,.55,.28]}/><meshStandardMaterial color="#354c37"/></mesh><mesh position={[0,-.52,.08]}><boxGeometry args={[.3,.16,.42]}/><meshStandardMaterial color="#382b22"/></mesh></group>
      <group ref={rightLeg} position={[.19,.78,0]}><mesh position={[0,-.25,0]} castShadow><boxGeometry args={[.24,.55,.28]}/><meshStandardMaterial color="#354c37"/></mesh><mesh position={[0,-.52,.08]}><boxGeometry args={[.3,.16,.42]}/><meshStandardMaterial color="#382b22"/></mesh></group>
    </group>
  </group>
}

function World({ input, onPosition, position }: { input:Input; onPosition:(p:V)=>void; position:V }) {
  const cx=Math.floor(position[0]/CHUNK),cz=Math.floor(position[2]/CHUNK)
  const chunks=useMemo(()=>{const list=[];for(let x=-GRID;x<=GRID;x++)for(let z=-GRID;z<=GRID;z++)list.push([cx+x,cz+z] as const);return list},[cx,cz])
  return <>
    <Sky sunPosition={[80,35,25]} turbidity={7}/>
    <ambientLight intensity={.75} color="#c7e2b5"/>
    <directionalLight position={[35,45,20]} intensity={1.55} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}/>
    <fog attach="fog" args={['#a6c59a',34,112]}/>
    {chunks.map(([x,z])=><Chunk key={x+':'+z} cx={x} cz={z}/>)}
    <PixelExplorer input={input} onPosition={onPosition}/>
  </>
}

export default function JungleGame(){
  const [input,setInput]=useState<Input>({forward:0,side:0,jump:false,sprint:false})
  const [position,setPosition]=useState<V>([0,0,0])
  const [joystick,setJoystick]=useState({x:0,y:0})
  const [mobileSprint,setMobileSprint]=useState(false)
  const keys=useRef<Record<string,boolean>>({})
  const distance=Math.floor(Math.hypot(position[0],position[2]))
  const region=useMemo(()=>{const names=['Emerald Canopy','Mosswood','Fern Valley','Ancient Wilds','Misty Grove','Deepwood'];return names[(Math.floor(position[0]/CHUNK)+Math.floor(position[2]/CHUNK)*3+600)%names.length]},[position])
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.current[e.key.toLowerCase()]=true}
    const up=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false}
    const timer=window.setInterval(()=>setInput({forward:(keys.current.w||keys.current.arrowup?-1:0)+(keys.current.s||keys.current.arrowdown?1:0)-joystick.y,side:(keys.current.d||keys.current.arrowright?1:0)-(keys.current.a||keys.current.arrowleft?1:0)+joystick.x,jump:!!keys.current[' '],sprint:!!keys.current.shift||mobileSprint}),35)
    window.addEventListener('keydown',down);window.addEventListener('keyup',up)
    return()=>{clearInterval(timer);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}
  },[joystick,mobileSprint])
  const stick=(e:PointerEvent<HTMLDivElement>)=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2),l=Math.max(1,Math.hypot(x,y));setJoystick({x:x/l,y:y/l})}
  return <section className="jungle3d-wrap">
    <div className="jungle3d-head"><div><span className="j3d-eyebrow">OPEN WORLD PIXEL ADVENTURE</span><h2>ETH <span>JUNGLE</span></h2><p>Walk beyond the edge. The jungle keeps growing.</p></div><div className="j3d-coords">X {Math.round(position[0])} · Z {Math.round(position[2])}</div></div>
    <div className="j3d-gamebar"><div><small>REGION</small><strong>{region}</strong></div><div><small>DISTANCE</small><strong>{distance} m</strong></div><div><small>WORLD</small><strong>ENDLESS</strong></div></div>
    <div className="jungle3d-stage"><Canvas shadows camera={{position:[0,6,10],fov:52}} dpr={[1,1.5]}><color attach="background" args={['#a6c59a']}/><World input={input} position={position} onPosition={setPosition}/></Canvas>
      <div className="j3d-hud"><span>WASD / ARROWS MOVE</span><span>SPACE JUMP · SHIFT RUN</span></div>
      <div className="j3d-objective"><strong>EXPLORE THE WILD</strong><span>Keep walking. New forest areas appear around you.</span></div>
      <div className="j3d-mobile-controls"><div className="j3d-joystick" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);stick(e)}} onPointerMove={e=>{if(e.buttons)stick(e)}} onPointerUp={()=>setJoystick({x:0,y:0})} onPointerCancel={()=>setJoystick({x:0,y:0})}><span/></div><div className="j3d-mobile-actions"><button className="j3d-jump" onPointerDown={()=>setInput(v=>({...v,jump:true}))} onPointerUp={()=>setInput(v=>({...v,jump:false}))} onPointerLeave={()=>setInput(v=>({...v,jump:false}))}>JUMP</button><button className="j3d-action" onPointerDown={()=>setMobileSprint(true)} onPointerUp={()=>setMobileSprint(false)} onPointerLeave={()=>setMobileSprint(false)}>RUN</button></div></div>
    </div>
    <div className="j3d-bottomline"><span>Explore freely · No borders · New areas load as you travel</span><button onClick={()=>{setPosition([0,0,0]);keys.current={};setJoystick({x:0,y:0})}}>RETURN HOME</button></div>
    <p className="j3d-note">Exploration prototype. No wallet transaction, entry fee, or ETH payout is enabled.</p>
  </section>
}

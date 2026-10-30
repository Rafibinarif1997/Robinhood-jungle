import { Canvas, useFrame } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import * as THREE from 'three'
import './jungle-game.css'

type Input = { forward: number; side: number; jump: boolean; interact: boolean }
const pointsOfInterest = [{ id: 'ruins', name: 'Ancient Ruins', position: [-10, 0, -10] as [number, number, number] }, { id: 'cave', name: 'Hidden Cave', position: [13, 0, 8] as [number, number, number] }]

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 2.5, 7]} />
        <meshStandardMaterial color="#60452b" roughness={1} />
      </mesh>
      {[0, 1, 2].map((n) => (
        <mesh key={n} position={[0, 2.1 + n * 0.48, 0]} castShadow>
          <coneGeometry args={[1.05 - n * 0.19, 1.65, 7]} />
          <meshStandardMaterial color={n === 0 ? '#174d2b' : n === 1 ? '#216238' : '#347b43'} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function Explorer({ input, setPosition, setNearby, onFound, found, obstacles }: { input: Input; setPosition: (p: [number, number, number]) => void; setNearby: (name: string) => void; onFound: (id: string) => void; found: string[]; obstacles: [number, number, number][] }) {
  const root = useRef<THREE.Group>(null)
  const velocity = useRef(0)
  const cameraTarget = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const cameraOffset = useMemo(() => new THREE.Vector3(0, 4.1, 7.5), [])
  const uiClock = useRef(0)
  const wasJumping = useRef(false)
  const wasInteracting = useRef(false)

  useFrame((state, delta) => {
    if (!root.current) return
    const move = Math.min(delta, 0.04)
    const moving = input.forward !== 0 || input.side !== 0
    const speed = 4.2
    direction.set(input.side, 0, input.forward).normalize()
    if (moving) {
      const nextX = root.current.position.x + direction.x * speed * move
      const nextZ = root.current.position.z + direction.z * speed * move
      const blocked = obstacles.some(([ox, , oz]) => Math.hypot(nextX - ox, nextZ - oz) < 0.9)
      if (!blocked) {
        root.current.position.x = nextX
        root.current.position.z = nextZ
      }
      root.current.rotation.y = Math.atan2(direction.x, direction.z)
    }
    root.current.position.x = THREE.MathUtils.clamp(root.current.position.x, -23, 23)
    root.current.position.z = THREE.MathUtils.clamp(root.current.position.z, -23, 23)
    if (input.jump && !wasJumping.current && root.current.position.y <= 0.02) velocity.current = 6
    wasJumping.current = input.jump
    velocity.current -= 16 * move
    root.current.position.y = Math.max(0, root.current.position.y + velocity.current * move)
    if (root.current.position.y === 0) velocity.current = 0
    cameraTarget.copy(root.current.position)
    const desired = cameraTarget.clone().add(cameraOffset)
    state.camera.position.lerp(desired, 1 - Math.exp(-5 * move))
    state.camera.lookAt(cameraTarget.x, cameraTarget.y + 1.25, cameraTarget.z)
    const nearby = pointsOfInterest.find(point => !found.includes(point.id) && Math.hypot(root.current!.position.x - point.position[0], root.current!.position.z - point.position[2]) < 2.8)
    setNearby(nearby?.name ?? '')
    if (input.interact && !wasInteracting.current && nearby) onFound(nearby.id)
    wasInteracting.current = input.interact
    uiClock.current += move
    if (uiClock.current > 0.15) {
      uiClock.current = 0
      setPosition([root.current.position.x, root.current.position.y, root.current.position.z])
    }
  })

  return (
    <group ref={root}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.38, 0.85, 5, 8]} />
        <meshStandardMaterial color="#c68b52" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.31, 16, 12]} />
        <meshStandardMaterial color="#d9a16b" />
      </mesh>
      <mesh position={[0, 1.12, -0.38]} castShadow>
        <boxGeometry args={[0.48, 0.58, 0.2]} />
        <meshStandardMaterial color="#a34e26" />
      </mesh>
      <mesh position={[-0.17, 0.35, 0]} castShadow><boxGeometry args={[0.18, 0.55, 0.2]} /><meshStandardMaterial color="#293c2e" /></mesh>
      <mesh position={[0.17, 0.35, 0]} castShadow><boxGeometry args={[0.18, 0.55, 0.2]} /><meshStandardMaterial color="#293c2e" /></mesh>
    </group>
  )
}

function World({ input, setPosition, setNearby, onFound, found }: { input: Input; setPosition: (p: [number, number, number]) => void; setNearby: (name: string) => void; onFound: (id: string) => void; found: string[] }) {
  const trees = useMemo(() => Array.from({ length: 95 }, (_, i) => {
    const angle = i * 2.399
    const radius = 7 + (i % 9) * 1.8
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number]
  }), [])
  return (
    <>
      <Sky sunPosition={[80, 25, 40]} turbidity={9} rayleigh={2} />
      <ambientLight intensity={0.7} color="#b6d7ad" />
      <directionalLight position={[12, 18, 8]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#244b2b" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]}>
        <circleGeometry args={[4.5, 48]} />
        <meshStandardMaterial color="#9b8051" roughness={1} />
      </mesh>
      {trees.map((p, i) => <Tree key={i} position={p} scale={0.8 + (i % 4) * 0.16} />)}
      <group position={[-10, 0, -10]}>
        <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[2.2, 1.1, 1.8]} /><meshStandardMaterial color="#777d68" roughness={1} /></mesh>
        <mesh position={[0, 1.2, 0]}><octahedronGeometry args={[0.48, 0]} /><meshStandardMaterial color={found.includes('ruins') ? '#a9ffc4' : '#4be58a'} emissive="#1a9b50" emissiveIntensity={1.2} /></mesh>
        <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[1.5, 1.7, 0.16, 8]} /><meshStandardMaterial color="#424d3e" /></mesh>
      </group>
      <group position={[13, 0, 8]}>
        <mesh position={[-1, 1.2, 0]}><cylinderGeometry args={[0.35, 0.5, 2.4, 8]} /><meshStandardMaterial color="#5c6758" /></mesh>
        <mesh position={[1, 1.2, 0]}><cylinderGeometry args={[0.35, 0.5, 2.4, 8]} /><meshStandardMaterial color="#5c6758" /></mesh>
        <mesh position={[0, 2.35, 0]}><boxGeometry args={[2.4, 0.45, 0.65]} /><meshStandardMaterial color="#65705c" /></mesh>
        <mesh position={[0, 0.1, -0.05]}><circleGeometry args={[1.1, 24]} /><meshBasicMaterial color="#09150e" /></mesh>
        <pointLight position={[0, 1, 1]} color="#64e89b" intensity={found.includes('cave') ? 1.4 : 0.5} distance={5} />
      </group>
      <group position={[8, 0, -8]}>
        <mesh position={[0, 0.3, 0]} castShadow><dodecahedronGeometry args={[1.1, 0]} /><meshStandardMaterial color="#68766a" roughness={1} /></mesh>
        <mesh position={[2, 0.22, -1.3]} castShadow><dodecahedronGeometry args={[0.8, 0]} /><meshStandardMaterial color="#526653" roughness={1} /></mesh>
      </group>
      <Explorer input={input} setPosition={setPosition} setNearby={setNearby} onFound={onFound} found={found} obstacles={[...trees, [8, 0, -8], [10, 0, -9.3], [-10, 0, -10], [13, 0, 8]]} />
    </>
  )
}

export default function JungleGame() {
  const [input, setInput] = useState<Input>({ forward: 0, side: 0, jump: false, interact: false })
  const [nearby, setNearby] = useState('')
  const [found, setFound] = useState<string[]>([])
  const [message, setMessage] = useState('Explore the jungle and look for glowing landmarks.')
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0])
  const [joystick, setJoystick] = useState({ x: 0, y: 0 })
  const keys = useRef<Record<string, boolean>>({})
  const joystickRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
      keys.current[e.key.toLowerCase()] = true
    }
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }
    const tick = () => setInput(v => ({
      ...v,
      forward: (keys.current.w || keys.current.arrowup ? -1 : 0) + (keys.current.s || keys.current.arrowdown ? 1 : 0) - joystick.y,
      side: (keys.current.d || keys.current.arrowright ? 1 : 0) - (keys.current.a || keys.current.arrowleft ? 1 : 0) + joystick.x,
      jump: !!keys.current[' '],
      interact: !!keys.current.e,
    }))
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    const timer = window.setInterval(tick, 40)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.clearInterval(timer) }
  }, [joystick])

  const moveStick = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    const length = Math.max(1, Math.hypot(dx, dy))
    setJoystick({ x: dx / length, y: dy / length })
  }

  return (
    <section className="jungle3d-wrap">
      <div className="jungle3d-head">
        <div><span className="j3d-eyebrow">LIVE 3D PROTOTYPE</span><h2>THE EMERALD <span>WILDS</span></h2><p>Explore the jungle. Find the hidden ruins.</p></div>
        <div className="j3d-coords">X {position[0].toFixed(1)} · Z {position[2].toFixed(1)}</div>
      </div>
      <div className="jungle3d-stage">
        <Canvas shadows camera={{ position: [0, 4, 8], fov: 55 }} dpr={[1, 1.5]}>
          <color attach="background" args={['#9ab89a']} />
          <fog attach="fog" args={['#9ab89a', 18, 58]} />
          <World input={input} setPosition={setPosition} setNearby={setNearby} onFound={id => { setFound(prev => prev.includes(id) ? prev : [...prev, id]); setMessage(id === 'ruins' ? 'Ancient Ruins discovered! A glowing relic has been recorded.' : 'Hidden Cave discovered! You found an old jungle passage.') }} found={found} />
        </Canvas>
        <div className="j3d-hud"><span>WASD / ARROWS TO MOVE</span><span>SPACE TO JUMP · E TO SEARCH</span></div>
        <div className="j3d-objective"><strong>{nearby ? nearby.toUpperCase() : "JUNGLE EXPEDITION"}</strong><span>{nearby ? "Press E or SEARCH to investigate" : found.length + "/2 discoveries found"}</span>{nearby && <button onPointerDown={() => { keys.current.e = true }} onPointerUp={() => { keys.current.e = false }} onPointerLeave={() => { keys.current.e = false }}>SEARCH</button>}</div>
        <div className="j3d-mobile-controls">
          <div ref={joystickRef} className="j3d-joystick" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); moveStick(e) }} onPointerMove={e => { if (e.buttons) moveStick(e) }} onPointerUp={() => setJoystick({ x: 0, y: 0 })} onPointerCancel={() => setJoystick({ x: 0, y: 0 })}><span /></div>
          <button className="j3d-jump" onPointerDown={() => setInput(v => ({ ...v, jump: true }))} onPointerUp={() => setInput(v => ({ ...v, jump: false }))} onPointerLeave={() => setInput(v => ({ ...v, jump: false }))}>JUMP</button>
        </div>
      </div>
      <p className="j3d-note">{message} · {found.length}/2 discovered · No wallet transaction or prize claim is enabled.</p>
    </section>
  )
}

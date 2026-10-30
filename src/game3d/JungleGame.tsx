import { Canvas, useFrame } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import './jungle-game.css'

type Input = { forward: number; side: number; jump: boolean }

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

function Explorer({ input, setPosition }: { input: Input; setPosition: (p: [number, number, number]) => void }) {
  const root = useRef<THREE.Group>(null)
  const velocity = useRef(0)
  const cameraTarget = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const cameraOffset = useMemo(() => new THREE.Vector3(0, 4.1, 7.5), [])
  const uiClock = useRef(0)

  useFrame((state, delta) => {
    if (!root.current) return
    const move = Math.min(delta, 0.04)
    const moving = input.forward !== 0 || input.side !== 0
    const speed = 4.2
    direction.set(input.side, 0, input.forward).normalize()
    if (moving) {
      root.current.position.x += direction.x * speed * move
      root.current.position.z += direction.z * speed * move
      root.current.rotation.y = Math.atan2(direction.x, direction.z)
    }
    root.current.position.x = THREE.MathUtils.clamp(root.current.position.x, -23, 23)
    root.current.position.z = THREE.MathUtils.clamp(root.current.position.z, -23, 23)
    if (input.jump && root.current.position.y <= 0.02) velocity.current = 6
    velocity.current -= 16 * move
    root.current.position.y = Math.max(0, root.current.position.y + velocity.current * move)
    if (root.current.position.y === 0) velocity.current = 0
    cameraTarget.copy(root.current.position)
    const desired = cameraTarget.clone().add(cameraOffset)
    state.camera.position.lerp(desired, 1 - Math.exp(-5 * move))
    state.camera.lookAt(cameraTarget.x, cameraTarget.y + 1.25, cameraTarget.z)
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

function World({ input, setPosition }: { input: Input; setPosition: (p: [number, number, number]) => void }) {
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
      <group position={[8, 0, -8]}>
        <mesh position={[0, 0.3, 0]} castShadow><dodecahedronGeometry args={[1.1, 0]} /><meshStandardMaterial color="#68766a" roughness={1} /></mesh>
        <mesh position={[2, 0.22, -1.3]} castShadow><dodecahedronGeometry args={[0.8, 0]} /><meshStandardMaterial color="#526653" roughness={1} /></mesh>
      </group>
      <Explorer input={input} setPosition={setPosition} />
    </>
  )
}

export default function JungleGame() {
  const [input, setInput] = useState<Input>({ forward: 0, side: 0, jump: false })
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
    }))
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    const timer = window.setInterval(tick, 40)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.clearInterval(timer) }
  }, [joystick])

  const moveStick = (e: React.PointerEvent<HTMLDivElement>) => {
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
          <World input={input} setPosition={setPosition} />
        </Canvas>
        <div className="j3d-hud"><span>WASD / ARROWS TO MOVE</span><span>SPACE TO JUMP</span></div>
        <div className="j3d-mobile-controls">
          <div ref={joystickRef} className="j3d-joystick" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); moveStick(e) }} onPointerMove={e => { if (e.buttons) moveStick(e) }} onPointerUp={() => setJoystick({ x: 0, y: 0 })} onPointerCancel={() => setJoystick({ x: 0, y: 0 })}><span /></div>
          <button className="j3d-jump" onPointerDown={() => setInput(v => ({ ...v, jump: true }))} onPointerUp={() => setInput(v => ({ ...v, jump: false }))} onPointerLeave={() => setInput(v => ({ ...v, jump: false }))}>JUMP</button>
        </div>
      </div>
      <p className="j3d-note">Prototype build · No wallet transaction or prize claim is enabled.</p>
    </section>
  )
}

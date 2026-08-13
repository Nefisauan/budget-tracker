import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { ExtrudeGeometry, Shape, type Group, type Mesh } from 'three'
import type { Persona } from '../types.ts'

function OrbitRing({
  radius,
  color,
  tilt,
  speed,
}: {
  radius: number
  color: string
  tilt: [number, number, number]
  speed: number
}) {
  const ref = useRef<Mesh>(null)
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.z += d * speed
  })
  return (
    <mesh ref={ref} rotation={tilt}>
      <torusGeometry args={[radius, 0.018, 16, 128]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} metalness={0.7} roughness={0.25} />
    </mesh>
  )
}

function Core({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <Float speed={2} rotationIntensity={0.35} floatIntensity={0.6}>
      <mesh scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          distort={0.38}
          speed={1.6}
          roughness={0.18}
          metalness={0.42}
          emissive={color}
          emissiveIntensity={0.22}
        />
      </mesh>
    </Float>
  )
}

function DualOrbits() {
  const group = useRef<Group>(null)
  useFrame((_, d) => {
    if (group.current) group.current.rotation.y += d * 0.12
  })
  return (
    <group ref={group}>
      <group position={[-2.2, 0.2, 0]}>
        <Core color="#f0b7c8" scale={0.92} />
      </group>
      <group position={[2.2, -0.15, 0.3]}>
        <Core color="#7ee7d6" scale={0.92} />
      </group>
      <OrbitRing radius={3.4} color="#e4c37a" tilt={[0.6, 0.2, 0.1]} speed={0.18} />
      <OrbitRing radius={4.15} color="#f0b7c8" tilt={[1.1, -0.3, 0.4]} speed={-0.12} />
      <OrbitRing radius={4.8} color="#7ee7d6" tilt={[0.2, 0.8, -0.2]} speed={0.09} />
      <Sparkles count={60} scale={12} size={2.5} speed={0.4} color="#e4c37a" />
    </group>
  )
}

function ObservatoryCore({ persona }: { persona: Persona }) {
  const color = persona === 'kaylie' ? '#f0b7c8' : persona === 'nefi' ? '#7ee7d6' : '#e4c37a'
  const group = useRef<Group>(null)
  useFrame((_, d) => {
    if (group.current) group.current.rotation.y += d * 0.15
  })
  return (
    <group ref={group}>
      <Core color={color} scale={1.05} />
      <OrbitRing radius={2.1} color={color} tilt={[0.7, 0.15, 0]} speed={0.2} />
      <OrbitRing radius={2.7} color="#e4c37a" tilt={[1.2, -0.4, 0.2]} speed={-0.1} />
      <Sparkles count={40} scale={8} size={2} speed={0.35} color={color} />
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[5, 4, 4]} intensity={40} color="#e4c37a" distance={18} />
      <pointLight position={[-5, -2, 3]} intensity={28} color="#7ee7d6" distance={16} />
      <pointLight position={[0, 3, -4]} intensity={22} color="#f0b7c8" distance={16} />
    </>
  )
}

export function PortalCanvas() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 11], fov: 42 }} dpr={[1, 1.7]}>
        <color attach="background" args={['#07070c']} />
        <Stars radius={80} depth={40} count={1800} factor={3} saturation={0} fade speed={0.6} />
        <Lights />
        <DualOrbits />
      </Canvas>
    </div>
  )
}

export function ObservatoryCanvas({ persona }: { persona: Persona }) {
  return (
    <Canvas camera={{ position: [0, 0, 7.2], fov: 42 }} dpr={[1, 1.6]}>
      <Stars radius={60} depth={30} count={900} factor={2.4} saturation={0} fade speed={0.5} />
      <Lights />
      <ObservatoryCore persona={persona} />
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  )
}

export function Donut3D({
  slices,
}: {
  slices: { key: string; label: string; value: number; color: string }[]
}) {
  const total = slices.reduce((n, s) => n + s.value, 0)
  const geos = useMemo(() => {
    if (total <= 0) return []
    let angle = -Math.PI / 2
    const live = slices.filter((s) => s.value > 0)
    const gap = 0.045
    return live.map((s) => {
      const portion = (s.value / total) * (Math.PI * 2 - gap * live.length)
      const start = angle
      angle += portion + gap
      return { ...s, start, portion }
    })
  }, [slices, total])

  return (
    <Canvas camera={{ position: [0, 1.4, 5.4], fov: 40 }} dpr={[1, 1.6]}>
      <Lights />
      <group rotation={[-0.45, 0.2, 0]}>
        <DonutBody slices={geos} />
      </group>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={1.1} />
    </Canvas>
  )
}

function DonutBody({
  slices,
}: {
  slices: { key: string; color: string; start: number; portion: number }[]
}) {
  const group = useRef<Group>(null)
  useFrame((_, d) => {
    if (group.current) group.current.rotation.z += d * 0.08
  })

  if (slices.length === 0) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.42, 24, 80]} />
        <meshStandardMaterial color="#2a2934" metalness={0.4} roughness={0.4} />
      </mesh>
    )
  }

  return (
    <group ref={group}>
      {slices.map((s) => (
        <Slice key={s.key} start={s.start} portion={s.portion} color={s.color} />
      ))}
    </group>
  )
}

function sliceShape(start: number, portion: number, inner: number, outer: number): Shape {
  const s = new Shape()
  const steps = Math.max(10, Math.ceil(portion * 28))
  for (let i = 0; i <= steps; i++) {
    const a = start + (portion * i) / steps
    const x = Math.cos(a) * outer
    const y = Math.sin(a) * outer
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  for (let i = steps; i >= 0; i--) {
    const a = start + (portion * i) / steps
    s.lineTo(Math.cos(a) * inner, Math.sin(a) * inner)
  }
  s.closePath()
  return s
}

function Slice({ start, portion, color }: { start: number; portion: number; color: string }) {
  const geom = useMemo(() => {
    const shape = sliceShape(start, portion, 1.15, 2.05)
    const g = new ExtrudeGeometry(shape, {
      depth: 0.48,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.03,
      bevelSegments: 2,
    })
    g.computeVertexNormals()
    return g
  }, [start, portion])

  const mid = start + portion / 2
  const explode = 0.08

  return (
    <mesh
      geometry={geom}
      position={[Math.cos(mid) * explode, Math.sin(mid) * explode, -0.22]}
    >
      <meshStandardMaterial
        color={color}
        metalness={0.5}
        roughness={0.22}
        emissive={color}
        emissiveIntensity={0.18}
      />
    </mesh>
  )
}

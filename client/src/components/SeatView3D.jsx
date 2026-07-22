import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

// The "view from your seat" renderer that lives ON the map canvas. The scene is
// built once per venue type; the camera then flies (damped lerp) to whichever
// seat/section vantage is passed in, so hopping between seats feels like moving
// through the building instead of reloading a preview.
//
// `vantage` comes from seatVantage(): { angle, dist, height } — angle is the
// polar angle around the venue focus (π/2 = front/bottom of the 2D map).
// Scene flavours:
//   stadium -> floodlit pitch + wrap-around bowl
//   arena   -> court + bowl + jumbotron glow
//   theater -> stage, truss, light wash
//   cinema  -> glowing screen + raked auditorium

const sceneKindFor = (venueType) => {
  if (venueType === 'stadium' || venueType === 'arena') return 'arena'
  if (venueType === 'cinema') return 'cinema'
  return 'concert'
}

// Vantage → camera position/look-at in scene units.
const cameraFor = (venueType, vantage) => {
  const kind = sceneKindFor(venueType)
  const { angle = Math.PI / 2, dist = 0.6, height = 0.5 } = vantage || {}
  const R = 24 + dist * 50
  const h = 4 + height * 36
  if (kind === 'arena') {
    // full 360° bowl: place the camera at the seat's true polar angle
    return {
      pos: new THREE.Vector3(Math.cos(angle) * R, h, Math.sin(angle) * R),
      look: new THREE.Vector3(0, 2, 0),
    }
  }
  // screen/stage venues: front hemisphere only, angle becomes lateral offset
  const side = Math.max(-1, Math.min(1, Math.cos(angle) * 1.4))
  return {
    pos: new THREE.Vector3(side * (12 + dist * 26), h, R),
    look: new THREE.Vector3(0, kind === 'cinema' ? 7 : 2.5, 0),
  }
}

const SeatView3D = ({ venueType, tint = '#8B5CF6', vantage }) => {
  const mountRef = useRef(null)
  const targetRef = useRef(cameraFor(venueType, vantage))

  // Fly the camera when the vantage changes — no scene rebuild.
  useEffect(() => {
    targetRef.current = cameraFor(venueType, vantage)
  }, [venueType, vantage])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const kind = sceneKindFor(venueType)
    const accent = new THREE.Color(tint)

    const width = mount.clientWidth || 460
    const height = mount.clientHeight || 240
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x0b0b12, 1)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x0b0b12, 30, 150)

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 320)
    camera.position.copy(targetRef.current.pos)
    const lookAt = targetRef.current.look.clone()
    camera.lookAt(lookAt)

    scene.add(new THREE.AmbientLight(0x99aacc, 0.95))
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(20, 40, 20)
    scene.add(key)
    const fill = new THREE.PointLight(0xfff4d6, 0.9, 120)
    fill.position.set(0, 30, 0)
    scene.add(fill)

    const disposables = []
    const track = (obj) => {
      disposables.push(obj)
      return obj
    }
    const addBox = (w, h, d, color, x, y, z, opts = {}) => {
      const geo = track(new THREE.BoxGeometry(w, h, d))
      const mat = track(
        new THREE.MeshStandardMaterial({
          color,
          roughness: opts.rough ?? 0.9,
          metalness: opts.metal ?? 0,
          emissive: opts.emissive ?? 0x000000,
          emissiveIntensity: opts.emissiveIntensity ?? 1,
        })
      )
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z)
      scene.add(mesh)
      return mesh
    }

    // Curved tier of instanced seat blocks around the focus.
    const buildStand = (radius, rows, seatsPerRow, baseY, rise, arc, color, arcOffset = 0) => {
      const geo = track(new THREE.BoxGeometry(1.1, 0.7, 1.1))
      const mat = track(new THREE.MeshStandardMaterial({ color, roughness: 0.95 }))
      const inst = new THREE.InstancedMesh(geo, mat, rows * seatsPerRow)
      const m = new THREE.Matrix4()
      let i = 0
      for (let r = 0; r < rows; r++) {
        const rr = radius + r * 1.6
        const yy = baseY + r * rise
        for (let s = 0; s < seatsPerRow; s++) {
          const a = arcOffset - arc / 2 + (arc * s) / (seatsPerRow - 1)
          m.makeTranslation(Math.cos(a) * rr, yy, Math.sin(a) * rr)
          inst.setMatrixAt(i++, m)
        }
      }
      inst.instanceMatrix.needsUpdate = true
      track(inst.geometry)
      track(inst.material)
      scene.add(inst)
    }

    if (kind === 'arena') {
      const isStadium = venueType === 'stadium'
      // pitch / court
      const floor = new THREE.Mesh(
        track(new THREE.CircleGeometry(22, 48)),
        track(new THREE.MeshStandardMaterial({ color: isStadium ? 0x2a9152 : 0xc08a45, roughness: 0.9 }))
      )
      floor.rotation.x = -Math.PI / 2
      scene.add(floor)
      addBox(44, 0.05, 0.4, 0xffffff, 0, 0.03, 0)
      // boundary ring so the playing surface reads at a glance
      const ringLine = new THREE.Mesh(
        track(new THREE.RingGeometry(16.4, 17, 48)),
        track(new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }))
      )
      ringLine.rotation.x = -Math.PI / 2
      ringLine.position.y = 0.02
      scene.add(ringLine)
      // full wrap-around bowl (two decks)
      buildStand(26, 8, 64, 1, 1.1, Math.PI * 2, 0x2b3550)
      buildStand(40, 7, 72, 11, 1.2, Math.PI * 2, 0x223047)
      if (isStadium) {
        // floodlight masts
        for (const a of [0.6, 2.2, 4.0, 5.6]) {
          const x = Math.cos(a) * 58
          const z = Math.sin(a) * 58
          addBox(0.7, 34, 0.7, 0x444a55, x, 17, z, { metal: 0.6, rough: 0.4 })
          addBox(7, 2.4, 1, 0xffffff, x, 35, z, { emissive: 0xfff2c0, emissiveIntensity: 1.5 })
        }
      } else {
        // jumbotron above centre court
        const cube = addBox(8, 5, 8, 0x0a0a0f, 0, 20, 0, { emissive: accent.getHex(), emissiveIntensity: 0.7 })
        cube.material.emissive = accent
      }
    } else if (kind === 'cinema') {
      const screen = addBox(40, 20, 0.6, 0x0a0a0a, 0, 11, -2, { emissive: accent.getHex(), emissiveIntensity: 0.55, rough: 0.3 })
      screen.material.emissive = accent
      addBox(42, 22, 0.4, 0x111111, 0, 11, -2.4)
      const geo = track(new THREE.BoxGeometry(1.4, 0.9, 1.2))
      const mat = track(new THREE.MeshStandardMaterial({ color: 0x2a2030, roughness: 0.95 }))
      const rows = 9
      const perRow = 16
      const inst = new THREE.InstancedMesh(geo, mat, rows * perRow)
      const m = new THREE.Matrix4()
      let i = 0
      for (let r = 0; r < rows; r++) {
        for (let s = 0; s < perRow; s++) {
          m.makeTranslation((s - perRow / 2) * 1.7, 0.5 + r * 0.9, 6 + r * 2.1)
          inst.setMatrixAt(i++, m)
        }
      }
      inst.instanceMatrix.needsUpdate = true
      track(inst.geometry)
      track(inst.material)
      scene.add(inst)
      const floor = new THREE.Mesh(
        track(new THREE.PlaneGeometry(70, 70)),
        track(new THREE.MeshStandardMaterial({ color: 0x0e0e14, roughness: 1 }))
      )
      floor.rotation.x = -Math.PI / 2
      scene.add(floor)
    } else {
      // theater / concert: lit stage + backdrop + truss + crowd
      addBox(34, 1.6, 16, 0x161018, 0, 0.8, -2)
      addBox(36, 20, 0.6, 0x0d0a12, 0, 10, -10)
      for (let k = -2; k <= 2; k++) {
        const strip = addBox(2.4, 12, 0.3, 0x000000, k * 7, 8, -9.4, { emissive: accent.getHex(), emissiveIntensity: 0.9 })
        strip.material.emissive = accent
      }
      addBox(36, 0.6, 0.6, 0x2a2a2a, 0, 20, -4, { metal: 0.7, rough: 0.4 })
      for (let k = -4; k <= 4; k++) {
        addBox(0.8, 0.8, 0.8, 0xffffff, k * 4, 19.4, -4, { emissive: 0xffe08a, emissiveIntensity: 1.2 })
      }
      buildStand(22, 9, 34, 1, 1.15, Math.PI * 1.2, 0x201a2c, Math.PI / 2)
    }

    // ── loop: damp camera toward the current vantage target ──
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    let raf = 0
    let last = performance.now()
    const render = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = targetRef.current
      const damp = 1 - Math.exp(-3.2 * dt)
      camera.position.lerp(t.pos, reduce ? 1 : damp)
      lookAt.lerp(t.look, reduce ? 1 : damp)
      if (!reduce) {
        const sway = Math.sin(now / 2600) * 0.35
        camera.lookAt(lookAt.x + sway, lookAt.y, lookAt.z)
      } else {
        camera.lookAt(lookAt)
      }
      renderer.render(scene, camera)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    // ── resize with the container (inset ⇄ expanded) ──
    const onResize = () => {
      const w = mount.clientWidth || width
      const h = mount.clientHeight || height
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      disposables.forEach((d) => d.dispose?.())
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueType, tint])

  return <div ref={mountRef} className='w-full h-full' />
}

export default SeatView3D

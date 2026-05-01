import { useEffect, useRef } from 'react'
import anime from 'animejs'

export function Hero3D() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const cubesRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    // Animate cubes floating with anime.js
    cubesRef.current.forEach((el, i) => {
      if (!el) return
      anime({
        targets: el,
        translateY: [-20, 20],
        rotateX: [0, 360],
        rotateY: [0, 360],
        duration: 8000 + i * 2000,
        easing: 'easeInOutSine',
        direction: 'alternate',
        loop: true,
        delay: i * 400,
      })
    })

    // Mouse parallax
    const scene = sceneRef.current
    if (!scene) return
    const handleMove = (e: MouseEvent) => {
      const rx = ((e.clientY / window.innerHeight) - 0.5) * 12
      const ry = ((e.clientX / window.innerWidth) - 0.5) * -12
      anime({
        targets: scene,
        rotateX: rx,
        rotateY: ry,
        duration: 400,
        easing: 'easeOutQuad',
      })
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  const cubes = [
    { x: '12%', y: '22%', size: 55, color: '#3B8BD4' },
    { x: '78%', y: '18%', size: 40, color: '#7F77DD' },
    { x: '88%', y: '55%', size: 32, color: '#1D9E75' },
    { x: '8%', y: '62%', size: 48, color: '#EF9F27' },
    { x: '58%', y: '72%', size: 28, color: '#D85A30' },
    { x: '38%', y: '12%', size: 22, color: '#3B8BD4' },
    { x: '65%', y: '35%', size: 35, color: '#7F77DD' },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ perspective: '1200px' }}>
      <div ref={sceneRef} className="w-full h-full relative" style={{ transformStyle: 'preserve-3d' }}>
        {/* Grid floor */}
        <div className="absolute left-1/2 top-[60%] -translate-x-1/2" style={{
          width: '1600px', height: '900px',
          transform: 'rotateX(70deg) translateZ(-250px)',
          backgroundImage: 'linear-gradient(rgba(59,139,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,139,212,0.06) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 65%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 65%)',
        }} />

        {/* 3D cubes */}
        {cubes.map((cube, i) => (
          <div key={i} ref={el => { if (el) cubesRef.current[i] = el }}
            className="absolute" style={{ left: cube.x, top: cube.y, transformStyle: 'preserve-3d' }}>
            <div style={{ width: cube.size, height: cube.size, transformStyle: 'preserve-3d' }}>
              {[
                `rotateY(0deg) translateZ(${cube.size/2}px)`,
                `rotateY(180deg) translateZ(${cube.size/2}px)`,
                `rotateY(90deg) translateZ(${cube.size/2}px)`,
                `rotateY(-90deg) translateZ(${cube.size/2}px)`,
                `rotateX(90deg) translateZ(${cube.size/2}px)`,
                `rotateX(-90deg) translateZ(${cube.size/2}px)`,
              ].map((t, j) => (
                <div key={j} className="absolute inset-0" style={{
                  transform: t,
                  background: `${cube.color}12`,
                  border: `1px solid ${cube.color}35`,
                  backdropFilter: 'blur(1px)',
                }} />
              ))}
            </div>
          </div>
        ))}

        {/* Glow */}
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,139,212,0.1) 0%, transparent 60%)' }} />
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
import { Lock, Shield, Zap, Globe } from 'lucide-react'

const features = [
  { icon: Lock, title: 'ZKP Identity', color: '#7F77DD', desc: 'Groth16 proof on Circom — contractors prove KYC without exposing Aadhaar on-chain.', tag: 'Privacy' },
  { icon: Shield, title: '3-of-5 Multi-Sig', color: '#3B8BD4', desc: 'Fund release requires govt, auditor, and a randomly-selected bounty hunter to co-sign.', tag: 'Security' },
  { icon: Zap, title: "Dead Man's Switch", color: '#D85A30', desc: 'If milestones are ghosted, escrow auto-redistributes. Silence has consequences.', tag: 'Enforcement' },
  { icon: Globe, title: 'Polygon Mumbai', color: '#1D9E75', desc: 'Every state transition is permanently on-chain. Tamper-evident, forever auditable.', tag: 'Immutable' },
]

function Card3D({ f, i }: { f: typeof features[0]; i: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState({})
  const [glare, setGlare] = useState({})

  const handleMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setStyle({ transform: `perspective(800px) rotateY(${x * 20}deg) rotateX(${-y * 20}deg) scale3d(1.03,1.03,1.03)` })
    setGlare({ background: `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.08) 0%, transparent 60%)` })
  }
  const handleLeave = () => {
    setStyle({ transform: 'perspective(800px) rotateY(0) rotateX(0) scale3d(1,1,1)' })
    setGlare({})
  }

  return (
    <div ref={cardRef} onMouseMove={handleMove} onMouseLeave={handleLeave}
      className="relative p-6 rounded-2xl border border-[#1E2530] bg-[rgba(15,19,24,0.8)] cursor-default group"
      style={{ ...style, transition: 'transform 0.2s ease-out', transformStyle: 'preserve-3d' }}>
      {/* Glare overlay */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ ...glare, transition: 'background 0.15s' }} />
      {/* Glow border on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ boxShadow: `0 0 30px ${f.color}15, inset 0 0 30px ${f.color}08` }} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
            <f.icon size={22} style={{ color: f.color }} />
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded-full border" style={{ color: f.color, borderColor: `${f.color}30`, background: `${f.color}10` }}>{f.tag}</span>
        </div>
        <h3 className="text-lg font-bold text-[#E8EDF5] mb-2">{f.title}</h3>
        <p className="text-sm text-[#8B95A8] leading-relaxed">{f.desc}</p>
        {/* Decorative code snippet */}
        <div className="mt-4 bg-[#0A0C10] border border-[#1E2530] rounded-lg p-3 font-mono text-xs text-[#4A5568]">
          <span style={{ color: f.color }}>contract</span> {f.title.replace(/[^a-zA-Z]/g, '')} {'{'}<br />
          &nbsp;&nbsp;<span className="text-[#8B95A8]">verified</span>: <span className="text-[#1D9E75]">true</span><br />
          {'}'}
        </div>
      </div>
    </div>
  )
}

export function FeatureShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {features.map((f, i) => <Card3D key={f.title} f={f} i={i} />)}
    </div>
  )
}

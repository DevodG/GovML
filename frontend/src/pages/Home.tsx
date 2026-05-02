import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useDemoStore, type Role } from '../store/demoStore'
import { Building2, HardHat, Users, Shield, ArrowRight, ChevronRight, Wallet, Zap, Lock, Eye, ShieldCheck, Blocks } from 'lucide-react'

const portals = [
  { role: 'gov' as Role, label: 'Government Authority', icon: Building2, color: 'var(--gov)', desc: 'Post tenders, review ML-scored bids, approve milestones and release funds on-chain.', path: '/gov' },
  { role: 'contractor' as Role, label: 'Contractor', icon: HardHat, color: 'var(--contractor)', desc: 'ZKP-verify identity, submit bids with ETH stake, track milestones.', path: '/contractor' },
  { role: 'public' as Role, label: 'Public / Citizen', icon: Users, color: 'var(--public)', desc: 'Explore live tenders, fund flows, become a bounty hunter and earn ETH.', path: '/public' },
  { role: 'auditor' as Role, label: 'Independent Auditor', icon: Shield, color: 'var(--auditor)', desc: 'Full audit access, AI-narrated anomaly reports, oracle signing.', path: '/auditor' },
]

const features = [
  { icon: Lock, title: 'Commit-Reveal Bids', desc: 'Bid amounts are hashed before submission. No front-running possible.', color: 'var(--gov)' },
  { icon: ShieldCheck, title: 'ZKP Identity', desc: 'Aadhaar + GST verified with Groth16 proofs. Data never leaves the browser.', color: 'var(--contractor)' },
  { icon: Eye, title: '3-of-5 Multi-Sig', desc: 'Funds release requires govt, contractor, auditor, and bounty hunter approval.', color: 'var(--auditor)' },
  { icon: Zap, title: 'Dead Man\'s Switch', desc: 'If contractor ghosts, escrow auto-redistributes after 30 days.', color: 'var(--danger)' },
  { icon: Blocks, title: 'ML + Blockchain', desc: 'Scores computed off-chain by ML, verified on-chain via ZKP.', color: 'var(--public)' },
  { icon: Wallet, title: 'ETH Staking', desc: 'Contractors stake ETH when bidding. Losers get instant refunds.', color: 'var(--success)' },
]

function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [started, setStarted] = useState(false)
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        setStarted(true)
        obs.disconnect()
      }
    }, { threshold: 0.3 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    let frame: number
    const duration = 1500
    const startTime = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(eased * end))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [started, end])

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

export default function Home() {
  const navigate = useNavigate()
  const { isConnected } = useAccount()
  const { connect } = useConnect()
  const { isDemoMode, enableDemo, setDemoRole } = useDemoStore()

  const handlePortalClick = (portal: typeof portals[0]) => {
    // Always enable demo mode and set role when clicking a portal
    enableDemo()
    setDemoRole(portal.role)
    navigate(portal.path)
  }

  const handleWalletConnect = () => {
    connect({ connector: injected() })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      {/* Nav */}
      <nav className="glass" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, borderBottom: '1px solid var(--border)', height: 60 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'var(--gov)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={15} color="#fff" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}><span style={{ color: 'var(--gov)' }}>Gov</span>Chain</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#features" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>Features</a>
            <a href="#portals" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>Portals</a>
            {isConnected ? (
              <a href="#portals" className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>
                <Wallet size={14} /> Connected <ChevronRight size={14} />
              </a>
            ) : (
              <button onClick={handleWalletConnect} className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>
                <Wallet size={14} /> Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px 40px', position: 'relative' }}>
        {/* Gradient orbs */}
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,139,212,0.08) 0%, transparent 70%)', top: '10%', left: '10%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,119,221,0.06) 0%, transparent 70%)', bottom: '15%', right: '10%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }} className="animate-fade-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(29,158,117,0.3)', background: 'rgba(29,158,117,0.08)', fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse-glow 2s infinite' }} />
            Live on Sepolia Testnet
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 20 }}>
            The only tender platform<br />where corruption is<br /><span style={{ color: 'var(--gov)' }}>mathematically impossible.</span>
          </h1>

          <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.65, marginBottom: 36 }}>
            ZKP-verified bids. 3-of-5 multi-sig fund release. Dead man's switch escrow. Every rupee tracked on-chain.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            {isConnected ? (
              <a href="#portals" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 'var(--radius-lg)' }}>
                Choose Portal <ArrowRight size={18} />
              </a>
            ) : (
              <button onClick={handleWalletConnect} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 'var(--radius-lg)', animation: 'pulse-glow 3s ease-in-out infinite' }}>
                <Wallet size={18} /> Connect Wallet
              </button>
            )}
            <a href="#features" className="btn btn-ghost" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 'var(--radius-lg)' }}>
              Learn More
            </a>
          </div>

          {!isConnected && (
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              No wallet? <button onClick={() => { enableDemo(); }} style={{ background: 'none', border: 'none', color: 'var(--warning)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', fontFamily: 'var(--font-sans)', fontSize: 12 }}>Enter Demo Mode</button> to explore.
            </p>
          )}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--auditor)', textTransform: 'uppercase' as const }}>Technology</span>
            <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 8 }}>Built different, at every layer.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {features.map(f => (
              <div key={f.title} className="card" style={{ padding: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${f.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${f.color} 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portals */}
      <section id="portals" style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--gov)', textTransform: 'uppercase' as const }}>Choose Your Portal</span>
            <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 8 }}>
              Pick a portal to demo
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 10, fontSize: 14 }}>Each stakeholder has a dedicated dashboard — same blockchain, different lens.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {portals.map(p => (
              <button
                key={p.role}
                onClick={() => handlePortalClick(p)}
                className="card"
                style={{
                  padding: 24, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14,
                  transition: 'all var(--duration-normal) var(--ease-out)', border: '1px solid var(--border)', background: 'var(--bg-card)',
                  fontFamily: 'var(--font-sans)',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.borderColor = `${p.color}40` }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${p.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${p.color} 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <p.icon size={20} style={{ color: p.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</h3>
                    <ArrowRight size={15} style={{ color: p.color }} />
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--success)', textTransform: 'uppercase' as const }}>Impact</span>
            <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 8 }}>Numbers that matter.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center' }}>
            {[{ end: 142, suffix: '', label: 'Tenders Posted' }, { end: 84, suffix: ' Cr', label: 'Escrow Locked (₹)' }, { end: 97, suffix: '%', label: 'Anomaly Accuracy' }, { end: 340, suffix: '+', label: 'Bounty Reviews' }].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}><Counter end={s.end} suffix={s.suffix} /></div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--gov)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={12} color="#fff" /></div>
            <span style={{ fontSize: 13, fontWeight: 700 }}><span style={{ color: 'var(--gov)' }}>Gov</span>Chain</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— ZKP-Verified Tender Protocol</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hackathon — Track 3: Cybersecurity & Blockchain</p>
        </div>
      </footer>
    </div>
  )
}

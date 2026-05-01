import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAccount, useConnect, useSignMessage, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { isDemoMode } from '../config/contracts'
import { Hero3D } from '../components/home/Hero3D'
import { FeatureShowcase } from '../components/home/FeatureShowcase'
import anime from 'animejs'
import '../styles/home-animations.css'
import { Building2, HardHat, Users, Shield, X, ArrowRight, ChevronRight, Wallet, Loader2 } from 'lucide-react'

const portals = [
  { role: 'government' as const, label: 'Government Authority', icon: Building2, color: '#3B8BD4', desc: 'Post tenders, review ML-scored bids, approve milestones and release funds on-chain.', path: '/gov' },
  { role: 'contractor' as const, label: 'Contractor', icon: HardHat, color: '#1D9E75', desc: 'ZKP-verify identity, submit bids with ETH stake, track milestones.', path: '/contractor' },
  { role: 'public' as const, label: 'Public / Citizen', icon: Users, color: '#EF9F27', desc: 'Explore live tenders, fund flows, become a bounty hunter and earn ETH.', path: '/public' },
  { role: 'auditor' as const, label: 'Independent Auditor', icon: Shield, color: '#7F77DD', desc: 'Full audit access, AI-narrated anomaly reports, oracle signing.', path: '/auditor' },
]

/* ── Scroll reveal with anime.js ── */
function useAnimeReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        anime({ targets: el, opacity: [0, 1], translateY: [50, 0], duration: 800, easing: 'easeOutCubic' })
        // Stagger children
        anime({ targets: el.querySelectorAll('.stagger-child'), opacity: [0, 1], translateY: [40, 0], delay: anime.stagger(100, { start: 200 }), duration: 600, easing: 'easeOutCubic' })
        obs.disconnect()
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

/* ── Counter ── */
function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        const obj = { val: 0 }
        anime({ targets: obj, val: end, round: 1, duration: 1500, easing: 'easeOutExpo', update: () => { el.textContent = obj.val.toLocaleString() + suffix } })
        obs.disconnect()
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [end, suffix])
  return <span ref={ref}>0{suffix}</span>
}

/* ── Connect Modal (replaces LoginModal) ── */
function ConnectModal({ portal, onClose, onSuccess }: { portal: typeof portals[0]; onClose: () => void; onSuccess: () => void }) {
  const [err, setErr] = useState('')
  const [step, setStep] = useState<'idle' | 'connecting' | 'signing' | 'done'>('idle')
  const modalRef = useRef<HTMLDivElement>(null)
  const { address, isConnected } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { signMessageAsync } = useSignMessage()
  const { authenticateWithWallet, demoLogin } = useAuthStore()
  const demo = isDemoMode()

  useEffect(() => {
    if (modalRef.current) anime({ targets: modalRef.current, scale: [0.9, 1], opacity: [0, 1], duration: 300, easing: 'easeOutCubic' })
  }, [])

  // Auto-trigger SIWE after wallet connects
  useEffect(() => {
    if (isConnected && address && step === 'connecting') {
      handleSIWE()
    }
  }, [isConnected, address, step])

  const handleConnect = async () => {
    setErr('')
    if (demo) {
      // Demo mode — skip wallet, use mock auth
      setStep('connecting')
      demoLogin(portal.role)
      setTimeout(() => onSuccess(), 500)
      return
    }

    if (isConnected && address) {
      // Already connected — go straight to SIWE
      setStep('signing')
      handleSIWE()
    } else {
      setStep('connecting')
      try {
        connect({ connector: injected() })
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to connect wallet')
        setStep('idle')
      }
    }
  }

  const handleSIWE = async () => {
    if (!address) return
    setStep('signing')
    try {
      await authenticateWithWallet(address, signMessageAsync)
      setStep('done')
      onSuccess()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Signature verification failed')
      setStep('idle')
    }
  }

  const loading = step === 'connecting' || step === 'signing' || isConnecting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
      <div ref={modalRef} className="bg-[#0F1318] border border-[#1E2530] rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Portal badge header */}
        <div className="p-6 border-b border-[#1E2530]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${portal.color}18`, border: `1px solid ${portal.color}30` }}>
              <portal.icon size={20} style={{ color: portal.color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#E8EDF5]">{portal.label}</h2>
              <p className="text-xs text-[#8B95A8]">{demo ? 'Demo mode — no wallet required' : 'Connect wallet to access this portal'}</p>
            </div>
            <button onClick={onClose} className="ml-auto"><X size={18} className="text-[#8B95A8] hover:text-[#E8EDF5]" /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {isConnected && address && !demo && (
            <div className="flex items-center gap-2 bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />
              <span className="text-xs font-mono text-[#E8EDF5]">{address.slice(0, 6)}...{address.slice(-4)}</span>
              <span className="text-xs text-[#4A5568] ml-auto">Sepolia</span>
            </div>
          )}
          {err && <p className="text-xs text-[#D85A30]">{err}</p>}
          <button onClick={handleConnect} disabled={loading}
            className="w-full text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
            style={{ background: portal.color }}>
            {loading
              ? <><Loader2 size={18} className="animate-spin" />{step === 'signing' ? 'Confirming signature...' : 'Connecting wallet...'}</>
              : <><Wallet size={18} />{demo ? `Enter ${portal.label.split(' ')[0]} Portal` : 'Connect Wallet'}</>}
          </button>
          {demo && <p className="text-xs text-center text-[#4A5568]">Demo mode — contracts not configured</p>}
        </div>
      </div>
    </div>
  )
}

/* ── Main Home ── */
export default function Home() {
  const [selectedPortal, setSelectedPortal] = useState<typeof portals[0] | null>(null)
  const navigate = useNavigate()
  const aboutRef = useAnimeReveal()
  const featRef = useAnimeReveal()
  const statsRef = useAnimeReveal()
  const portalRef = useAnimeReveal()

  // Hero entry animation
  useEffect(() => {
    anime({ targets: '.hero-text', opacity: [0, 1], translateY: [60, 0], delay: anime.stagger(120), duration: 1000, easing: 'easeOutCubic' })
  }, [])

  const handleSuccess = () => {
    if (!selectedPortal) return
    setSelectedPortal(null)
    navigate(selectedPortal.path)
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#E8EDF5] overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-[#1E2530]/50" style={{ background: 'rgba(10,12,16,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-[#3B8BD4] flex items-center justify-center"><Shield size={14} className="text-white" /></div>
            <span className="text-lg font-bold tracking-tight"><span className="text-[#3B8BD4]">Gov</span>Chain</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#about" className="text-[#8B95A8] hover:text-[#E8EDF5] transition-colors">About</a>
            <a href="#features" className="text-[#8B95A8] hover:text-[#E8EDF5] transition-colors">Features</a>
            <a href="#portals" className="text-[#8B95A8] hover:text-[#E8EDF5] transition-colors">Portals</a>
            <a href="#stats" className="text-[#8B95A8] hover:text-[#E8EDF5] transition-colors">Impact</a>
          </div>
          <a href="#portals" className="bg-[#3B8BD4] hover:bg-[#2A75BB] text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
            Enter Portal<ChevronRight size={14} /></a>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center text-center px-6 pt-16">
        <Hero3D />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="hero-text inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1D9E75]/30 bg-[#1D9E75]/10 text-xs text-[#1D9E75] font-semibold mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />Live on Ethereum Sepolia Testnet
          </div>
          <h1 className="hero-text text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6" style={{ letterSpacing: '-0.03em' }}>
            The only tender platform<br />where corruption is<br /><span className="text-[#3B8BD4]">mathematically impossible.</span>
          </h1>
          <p className="hero-text text-lg text-[#8B95A8] max-w-2xl mx-auto leading-relaxed mb-10">
            ZKP-verified bids. 3-of-5 multi-sig fund release. Dead man's switch escrow. Every rupee tracked on-chain.
          </p>
          <div className="hero-text flex items-center justify-center gap-4 flex-wrap">
            <a href="#portals" className="bg-[#3B8BD4] hover:bg-[#2A75BB] text-white font-semibold px-8 py-3.5 rounded-xl flex items-center gap-2 transition-all hover:scale-105 text-base"
              style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}>Choose Portal <ArrowRight size={18} /></a>
            <a href="#about" className="border border-[#1E2530] hover:border-[rgba(255,255,255,0.15)] text-[#8B95A8] hover:text-[#E8EDF5] font-semibold px-8 py-3.5 rounded-xl transition-all">Learn More</a>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ animation: 'bounce 2s infinite' }}>
          <span className="text-xs text-[#4A5568]">scroll</span><div className="w-px h-8 bg-gradient-to-b from-[#4A5568] to-transparent" /></div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 px-6 border-t border-[#1E2530]">
        <div ref={aboutRef} className="max-w-5xl mx-auto opacity-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="stagger-child text-xs font-semibold tracking-widest text-[#3B8BD4] uppercase">About GovChain</span>
              <h2 className="stagger-child text-3xl font-bold text-[#E8EDF5] mt-3 mb-5 tracking-tight leading-tight">We didn't just digitise corruption — we eliminated the attack vectors.</h2>
              <p className="stagger-child text-[#8B95A8] text-sm leading-relaxed mb-4">Traditional e-procurement digitises the same broken process. GovChain rebuilds trust from the cryptographic foundation up.</p>
              <p className="stagger-child text-[#8B95A8] text-sm leading-relaxed">If a contractor ghosts, escrow auto-redistributes. The bid score is ZKP-verified. Fund release requires a randomly-selected public bounty hunter.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[{ label: 'Smart Contracts', value: '8', sub: 'Deployed on Sepolia' },
                { label: 'Market Size', value: '₹8.4L Cr', sub: 'India Procurement' },
                { label: 'Attack Vectors', value: '0', sub: 'Eliminated' },
                { label: 'Transparency', value: '100%', sub: 'All state on-chain' },
              ].map(s => (
                <div key={s.label} className="stagger-child bg-[rgba(255,255,255,0.02)] border border-[#1E2530] rounded-xl p-4 hover:border-[rgba(255,255,255,0.08)] transition-colors">
                  <div className="text-2xl font-bold text-[#3B8BD4] tracking-tight">{s.value}</div>
                  <div className="text-xs font-semibold text-[#E8EDF5] mt-1">{s.label}</div>
                  <div className="text-xs text-[#4A5568] mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — 3D tilt cards */}
      <section id="features" className="py-24 px-6 border-t border-[#1E2530]">
        <div ref={featRef} className="max-w-5xl mx-auto opacity-0">
          <div className="text-center mb-14">
            <span className="stagger-child text-xs font-semibold tracking-widest text-[#7F77DD] uppercase">Technology</span>
            <h2 className="stagger-child text-3xl font-bold text-[#E8EDF5] mt-2 tracking-tight">Built different, at every layer.</h2>
          </div>
          <div className="stagger-child"><FeatureShowcase /></div>
        </div>
      </section>

      {/* PORTAL CARDS — shown always, click opens connect */}
      <section id="portals" className="py-24 px-6 border-t border-[#1E2530]">
        <div ref={portalRef} className="max-w-5xl mx-auto opacity-0">
          <div className="text-center mb-14">
            <span className="stagger-child text-xs font-semibold tracking-widest text-[#3B8BD4] uppercase">Choose Your Portal</span>
            <h2 className="stagger-child text-3xl font-bold text-[#E8EDF5] mt-2 tracking-tight">Connect your wallet to enter</h2>
            <p className="stagger-child text-[#8B95A8] mt-3 text-sm">Each stakeholder has a dedicated dashboard — same blockchain, different lens.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {portals.map(p => (
              <button key={p.role} onClick={() => setSelectedPortal(p)}
                className="stagger-child group text-left p-6 rounded-2xl border border-[#1E2530] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300 flex items-start gap-4 hover:scale-[1.02]"
                style={{ transformStyle: 'preserve-3d' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                  <p.icon size={22} style={{ color: p.color }} /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#E8EDF5] group-hover:text-white">{p.label}</h3>
                    <ArrowRight size={16} className="text-[#4A5568] group-hover:translate-x-1 transition-all" style={{ color: p.color }} /></div>
                  <p className="text-sm text-[#8B95A8] mt-1 leading-relaxed">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="stats" className="py-24 px-6 border-t border-[#1E2530]">
        <div ref={statsRef} className="max-w-5xl mx-auto opacity-0">
          <div className="text-center mb-14">
            <span className="stagger-child text-xs font-semibold tracking-widest text-[#1D9E75] uppercase">Impact</span>
            <h2 className="stagger-child text-3xl font-bold text-[#E8EDF5] mt-2 tracking-tight">Numbers that matter.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[{ end: 142, suffix: '', label: 'Tenders Posted' }, { end: 84, suffix: ' Cr', label: 'Escrow Locked (₹)' },
              { end: 97, suffix: '%', label: 'Anomaly Accuracy' }, { end: 340, suffix: '+', label: 'Bounty Reviews' },
            ].map(s => (
              <div key={s.label} className="stagger-child"><div className="text-4xl font-bold text-[#E8EDF5] tracking-tight"><Counter end={s.end} suffix={s.suffix} /></div>
                <div className="text-sm text-[#8B95A8] mt-2">{s.label}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E2530] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#3B8BD4] flex items-center justify-center"><Shield size={12} className="text-white" /></div>
            <span className="text-sm font-bold"><span className="text-[#3B8BD4]">Gov</span>Chain</span>
            <span className="text-xs text-[#4A5568]">— ZKP-Verified Tender Protocol</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#4A5568]"><div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />Ethereum Sepolia • <span className="font-mono">0x7f3a...9f21</span></div>
          <p className="text-xs text-[#4A5568]">Hackathon — Track 3: Cybersecurity & Blockchain</p>
        </div>
      </footer>

      {/* Connect Modal — appears after selecting a portal */}
      {selectedPortal && <ConnectModal portal={selectedPortal} onClose={() => setSelectedPortal(null)} onSuccess={handleSuccess} />}
    </div>
  )
}

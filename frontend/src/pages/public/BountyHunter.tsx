import { useState } from 'react'
import { Card } from '../../components/ui'
import { Shield, Loader2, CheckCircle, Eye, EyeOff, Lock, Unlock } from 'lucide-react'

type Phase = 'idle' | 'committed' | 'reveal_window' | 'revealed'

const assignments = [
  { id: 'BA-001', tender: 'NH-48 Road Repair', milestone: 'Foundation Work', contractor: 'BuildRight Infra', deadline: '2024-04-02', reward: '0.5 MATIC', phase: 'committed' as Phase },
  { id: 'BA-002', tender: 'Solar Grid - Karnataka', milestone: 'Panel Procurement', contractor: 'SunBuild Renewable', deadline: '2024-04-15', reward: '0.8 MATIC', phase: 'reveal_window' as Phase },
]

const phaseConfig: Record<Phase, { label: string; color: string; icon: any }> = {
  idle:          { label: 'Not Started',    color: 'text-[#4A5568]',  icon: Lock },
  committed:     { label: 'Committed',      color: 'text-[#EF9F27]',  icon: Lock },
  reveal_window: { label: 'Reveal Window',  color: 'text-[#3B8BD4]',  icon: Unlock },
  revealed:      { label: 'Revealed',       color: 'text-[#1D9E75]',  icon: CheckCircle },
}

function AssignmentCard({ a }: { a: typeof assignments[0] }) {
  const [phase, setPhase] = useState<Phase>(a.phase)
  const [loading, setLoading] = useState(false)
  const [rating, setRating] = useState(4)
  const cfg = phaseConfig[phase]

  const advance = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setPhase(phase === 'idle' ? 'committed' : phase === 'committed' ? 'reveal_window' : phase === 'reveal_window' ? 'revealed' : 'revealed')
    }, 2000)
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-mono text-[#4A5568]">{a.id}</span>
          <h3 className="font-semibold text-[#E8EDF5] mt-0.5">{a.tender} — {a.milestone}</h3>
          <p className="text-sm text-[#8B95A8]">{a.contractor}</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
          phase === 'committed' ? 'bg-[#EF9F27]/10 border-[#EF9F27]/20 text-[#EF9F27]' :
          phase === 'reveal_window' ? 'bg-[#3B8BD4]/10 border-[#3B8BD4]/20 text-[#3B8BD4]' :
          phase === 'revealed' ? 'bg-[#1D9E75]/10 border-[#1D9E75]/20 text-[#1D9E75]' :
          'bg-[#4A5568]/10 border-[#4A5568]/20 text-[#4A5568]'}`}>
          <cfg.icon size={12} />
          {cfg.label}
        </div>
      </div>

      {/* Phase timeline */}
      <div className="flex items-center gap-1">
        {(['idle','committed','reveal_window','revealed'] as Phase[]).map((p, i, arr) => {
          const done = arr.indexOf(phase) >= i
          return (
            <div key={p} className="flex items-center flex-1">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${done ? 'border-[#3B8BD4] bg-[#3B8BD4]' : 'border-[#1E2530]'}`}>
                {done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              {i < arr.length - 1 && <div className={`flex-1 h-0.5 ${done && arr.indexOf(phase) > i ? 'bg-[#3B8BD4]' : 'bg-[#1E2530]'}`} />}
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-[#4A5568] -mt-2">
        <span>Start</span><span>Commit</span><span>Reveal</span><span>Done</span>
      </div>

      {phase === 'reveal_window' && (
        <div className="space-y-2">
          <label className="text-xs text-[#8B95A8]">Your Rating (1-5)</label>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)}
                className={`w-9 h-9 rounded-lg border font-bold text-sm transition-all ${rating >= n ? 'bg-[#EF9F27] border-[#EF9F27] text-white' : 'bg-[#151A22] border-[#1E2530] text-[#4A5568]'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase !== 'revealed' && (
        <button onClick={advance} disabled={loading}
          className={`w-full font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-all ${
            phase === 'idle' ? 'bg-[#EF9F27] hover:bg-[#d4891e] text-white' :
            phase === 'committed' ? 'bg-[#151A22] border border-[#1E2530] text-[#8B95A8] hover:text-[#E8EDF5]' :
            'bg-[#3B8BD4] hover:bg-[#2A75BB] text-white'}`}>
          {loading ? <><Loader2 size={16} className="animate-spin" />Submitting...</>
            : phase === 'idle' ? <><Lock size={16} />Commit Hash</>
            : phase === 'committed' ? <span className="text-xs">⏳ Waiting for reveal window...</span>
            : <><Eye size={16} />Reveal Rating</>}
        </button>
      )}

      <div className="flex justify-between text-xs pt-1 border-t border-[#1E2530]">
        <span className="text-[#4A5568]">Reward</span>
        <span className="font-mono text-[#EF9F27]">{a.reward}</span>
      </div>
    </Card>
  )
}

export default function BountyHunter() {
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Bounty Hunter Market</h1>
          <p className="text-sm text-[#8B95A8] mt-1">Stake MATIC, review milestone evidence, earn rewards for honest evaluations</p>
        </div>
        {!registered && (
          <button onClick={() => { setRegistering(true); setTimeout(() => { setRegistering(false); setRegistered(true) }, 2000) }}
            disabled={registering}
            className="bg-[#EF9F27] hover:bg-[#d4891e] text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all">
            {registering ? <><Loader2 size={16} className="animate-spin" />Staking...</> : <><Shield size={16} />Register + Stake 1 MATIC</>}
          </button>
        )}
        {registered && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-xl text-sm text-[#1D9E75] font-semibold">
            <CheckCircle size={16} />Active Hunter
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-[#E8EDF5] mb-4">Your Assignments</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {assignments.map(a => <AssignmentCard key={a.id} a={a} />)}
        </div>
      </div>
    </div>
  )
}

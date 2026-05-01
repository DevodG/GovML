import { useState } from 'react'
import { Card } from '../../components/ui'
import { Upload, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react'

const steps = ['Basic Info', 'Budget & Timeline', 'Milestones', 'Publish']

export default function CreateTender() {
  const [step, setStep] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [done, setDone] = useState(false)
  const [milestones, setMilestones] = useState([
    { name: 'Foundation work', pct: 30, days: 45 },
    { name: 'Main construction', pct: 50, days: 90 },
    { name: 'Final inspection', pct: 20, days: 120 },
  ])

  const addMilestone = () => setMilestones([...milestones, { name: '', pct: 0, days: 0 }])
  const removeMilestone = (i: number) => setMilestones(milestones.filter((_, idx) => idx !== i))

  const handlePublish = () => {
    setPublishing(true)
    setTimeout(() => { setPublishing(false); setDone(true) }, 3000)
  }

  if (done) return (
    <div className="max-w-xl mx-auto">
      <Card className="text-center py-14 space-y-4">
        <div className="w-20 h-20 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center mx-auto">
          <CheckCircle size={40} className="text-[#1D9E75]" />
        </div>
        <h2 className="text-2xl font-bold text-[#E8EDF5]">Tender Published On-Chain</h2>
        <p className="text-sm text-[#8B95A8]">Tender ID: <span className="font-mono text-[#E8EDF5]">T-2024-00399</span></p>
        <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-3 text-xs font-mono text-left space-y-1">
          <div><span className="text-[#4A5568]">tx_hash: </span><span className="text-[#3B8BD4]">0x8a3d21...4f92</span></div>
          <div><span className="text-[#4A5568]">ipfs_doc: </span><span className="text-[#7F77DD]">QmTender1a2b...c3d4</span></div>
          <div><span className="text-[#4A5568]">contract: </span><span className="text-[#1D9E75]">TenderRegistry.sol ✓</span></div>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Create Tender</h1>
        <p className="text-sm text-[#8B95A8] mt-1">New government procurement — published to blockchain on final step</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 cursor-pointer`} onClick={() => i < step + 1 && setStep(i)}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i <= step ? 'bg-[#3B8BD4] text-white' : 'bg-[#151A22] border border-[#1E2530] text-[#4A5568]'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-sm font-medium ${i === step ? 'text-[#E8EDF5]' : i < step ? 'text-[#8B95A8]' : 'text-[#4A5568]'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-[#3B8BD4]' : 'bg-[#1E2530]'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0 */}
      {step === 0 && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-[#E8EDF5]">Basic Information</h2>
          {[
            { label: 'Tender Title', placeholder: 'NH-48 Road Repair — Pune to Mumbai Section 3' },
            { label: 'Department / Ministry', placeholder: 'Ministry of Road Transport' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs text-[#8B95A8] mb-1.5">{f.label}</label>
              <input placeholder={f.placeholder} className="w-full bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] placeholder-[#4A5568] outline-none focus:border-[#3B8BD4] transition-colors" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-[#8B95A8] mb-1.5">Category</label>
            <select className="w-full bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#3B8BD4] transition-colors">
              {['Infrastructure', 'Energy', 'Healthcare', 'Smart City', 'Education', 'Water'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </Card>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-[#E8EDF5]">Budget & Timeline</h2>
          <div>
            <label className="block text-xs text-[#8B95A8] mb-1.5">Total Budget (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A8] font-semibold">₹</span>
              <input type="number" defaultValue={42000000} className="w-full bg-[#151A22] border border-[#1E2530] rounded-lg pl-7 pr-3 py-2.5 text-[#E8EDF5] font-mono text-lg outline-none focus:border-[#3B8BD4] transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#8B95A8] mb-1.5">Bidding Deadline</label>
            <input type="date" className="w-full bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#3B8BD4] transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-[#8B95A8] mb-1.5">State / Region</label>
            <select className="w-full bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#3B8BD4] transition-colors">
              {['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Rajasthan', 'Telangana', 'Gujarat', 'Uttar Pradesh'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-[#E8EDF5]">Milestone Schedule</h2>
            <button onClick={addMilestone} className="flex items-center gap-1.5 text-xs text-[#3B8BD4] hover:text-[#2A75BB]">
              <Plus size={14} />Add milestone
            </button>
          </div>
          {milestones.map((m, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-center">
              <input value={m.name} onChange={e => setMilestones(milestones.map((x, j) => j===i ? {...x, name: e.target.value} : x))}
                placeholder="Milestone name" className="col-span-2 bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] placeholder-[#4A5568] outline-none focus:border-[#3B8BD4] transition-colors" />
              <input type="number" value={m.pct} onChange={e => setMilestones(milestones.map((x, j) => j===i ? {...x, pct: Number(e.target.value)} : x))}
                placeholder="%" className="bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#3B8BD4] transition-colors" />
              <input type="number" value={m.days} onChange={e => setMilestones(milestones.map((x, j) => j===i ? {...x, days: Number(e.target.value)} : x))}
                placeholder="days" className="bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#3B8BD4] transition-colors" />
              <button onClick={() => removeMilestone(i)} className="flex justify-center text-[#D85A30] hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card className="space-y-5">
          <h2 className="font-semibold text-[#E8EDF5]">Upload & Publish</h2>
          <div className="border-2 border-dashed border-[#1E2530] rounded-xl p-8 text-center hover:border-[#3B8BD4]/40 transition-colors cursor-pointer">
            <Upload size={28} className="text-[#4A5568] mx-auto mb-3" />
            <p className="text-sm text-[#8B95A8]">Upload <span className="text-[#3B8BD4]">tender specification PDF</span></p>
            <p className="text-xs text-[#4A5568] mt-1">Will be pinned to IPFS — hash stored on-chain</p>
          </div>
          <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-[#4A5568]">Registry Contract</span><span className="font-mono text-[#E8EDF5]">TenderRegistry.sol</span></div>
            <div className="flex justify-between"><span className="text-[#4A5568]">Network</span><span className="text-[#1D9E75]">Polygon Mumbai Testnet</span></div>
            <div className="flex justify-between"><span className="text-[#4A5568]">Est. Gas</span><span className="font-mono text-[#EF9F27]">~0.003 MATIC</span></div>
          </div>
          <button onClick={handlePublish} disabled={publishing}
            className="w-full bg-[#3B8BD4] hover:bg-[#2A75BB] disabled:opacity-50 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all text-base">
            {publishing ? <><Loader2 size={20} className="animate-spin" />Awaiting MetaMask...</> : <>Publish Tender On-Chain</>}
          </button>
        </Card>
      )}

      <div className="flex justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="px-4 py-2 border border-[#1E2530] rounded-lg text-sm text-[#8B95A8] hover:text-[#E8EDF5] disabled:opacity-30 transition-colors">
          ← Back
        </button>
        {step < steps.length - 1 && (
          <button onClick={() => setStep(step + 1)}
            className="px-6 py-2 bg-[#3B8BD4] hover:bg-[#2A75BB] text-white rounded-lg text-sm font-semibold transition-colors">
            Next →
          </button>
        )}
      </div>
    </div>
  )
}

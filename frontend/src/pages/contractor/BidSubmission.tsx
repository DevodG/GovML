import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { formatINR } from '../../lib/format'
import { Wallet, Loader2, ExternalLink, ShieldCheck } from 'lucide-react'
import { useCommitBid, computeBidCommitHash, generateSalt } from '../../hooks/useContractWrite'
import { useKYCStatus } from '../../hooks/useContractData'
import { useAccount } from 'wagmi'

export default function BidSubmission() {
  const [amount, setAmount] = useState(41000000)
  const [stakePercent, setStakePercent] = useState(5)
  const [step, setStep] = useState<'form' | 'pending' | 'done'>('form')

  const { address } = useAccount()
  const commitBid = useCommitBid()
  const { data: isKYCVerified } = useKYCStatus(address as `0x${string}` | undefined)

  const stakeAmount = (amount * stakePercent) / 100
  const stakeETH = (stakeAmount / 350000000).toFixed(6) // simplified conversion

  // Watch for tx success
  useEffect(() => {
    if (commitBid.isSuccess) {
      setStep('done')
    }
  }, [commitBid.isSuccess])

  const handleSubmit = () => {
    setStep('pending')
    // Commit-reveal Phase 1: generate salt, hash, and commit on-chain
    const salt = generateSalt()
    const amountWei = BigInt(amount) * BigInt(1e12) // scale to wei
    const commitHash = computeBidCommitHash(amountWei, salt)
    // Store salt for Phase 2 reveal
    localStorage.setItem(`bid-salt-${1}`, salt)
    localStorage.setItem(`bid-amount-${1}`, amountWei.toString())
    // Call BidEscrow.commitBid() with ETH stake
    commitBid.write(BigInt(1), commitHash, stakeETH)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Submit Bid</h1>
        <p className="text-sm text-[#8B95A8] mt-1">NH-48 Road Repair — Pune to Mumbai Section 3</p>
      </div>

      {/* Tender Summary */}
      <Card className="bg-[#0A0C10]">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><div className="text-xs text-[#4A5568] mb-1">Budget</div><div className="font-semibold text-[#1D9E75]">{formatINR(42000000)}</div></div>
          <div><div className="text-xs text-[#4A5568] mb-1">Deadline</div><div className="font-semibold text-[#E8EDF5]">Mar 15, 2024</div></div>
          <div><div className="text-xs text-[#4A5568] mb-1">Category</div><div className="font-semibold text-[#E8EDF5]">Infrastructure</div></div>
        </div>
      </Card>

      {step === 'done' ? (
        <Card className="text-center py-12 space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center mx-auto">
            <ShieldCheck size={40} className="text-[#1D9E75]" />
          </div>
          <h2 className="text-xl font-bold text-[#E8EDF5]">Bid Submitted On-Chain</h2>
          <p className="text-sm text-[#8B95A8]">Your bid of {formatINR(amount)} with {stakeETH} ETH stake is locked in escrow.</p>
          <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-3 text-xs font-mono text-left space-y-1">
            <div className="text-[#4A5568]">tx_hash:</div>
            <div className="text-[#3B8BD4]">0x7f3a21bc4e8d...9f21</div>
          </div>
          <a href="#" className="inline-flex items-center gap-1.5 text-sm text-[#3B8BD4] hover:text-[#2A75BB]">
            <ExternalLink size={14} />View on Polygonscan
          </a>
        </Card>
      ) : (
        <Card className="space-y-5">
          <div>
            <label className="block text-xs text-[#8B95A8] mb-1.5">Your Bid Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A8] font-semibold">₹</span>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-[#151A22] border border-[#1E2530] rounded-lg pl-7 pr-3 py-2.5 text-[#E8EDF5] font-mono text-lg outline-none focus:border-[#3B8BD4] transition-colors" />
            </div>
            <p className="text-xs text-[#4A5568] mt-1">Budget ceiling: {formatINR(42000000)}</p>
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs text-[#8B95A8]">Stake Percentage</label>
              <span className="text-xs font-mono text-[#EF9F27]">{stakePercent}% = {stakeETH} ETH</span>
            </div>
            <input type="range" min={3} max={15} value={stakePercent} onChange={e => setStakePercent(Number(e.target.value))}
              className="w-full accent-[#EF9F27]" />
            <div className="flex justify-between text-xs text-[#4A5568] mt-1"><span>3% min</span><span>15% max</span></div>
          </div>

          <div className="bg-[#151A22] border border-[#1E2530] rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8B95A8]">Bid Amount</span>
              <span className="font-semibold text-[#E8EDF5]">{formatINR(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B95A8]">Required Stake</span>
              <span className="font-mono text-[#EF9F27]">{stakeETH} ETH</span>
            </div>
            <div className="flex justify-between border-t border-[#1E2530] pt-2">
              <span className="text-[#8B95A8]">ZKP Status</span>
              <span className="text-[#7F77DD] flex items-center gap-1"><ShieldCheck size={13} />Verified</span>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={step === 'pending'}
            className="w-full bg-[#3B8BD4] hover:bg-[#2A75BB] disabled:opacity-50 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all text-base">
            {step === 'pending'
              ? <><Loader2 size={20} className="animate-spin" />Awaiting MetaMask...</>
              : <><Wallet size={20} />Submit Bid + Lock {stakeETH} ETH</>}
          </button>
          <p className="text-xs text-center text-[#4A5568]">This will open MetaMask to confirm the on-chain transaction</p>
        </Card>
      )}
    </div>
  )
}

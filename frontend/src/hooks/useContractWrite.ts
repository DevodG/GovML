import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, keccak256, encodePacked } from 'viem'
import { useState, useCallback } from 'react'
import {
  contractAddresses, isDemoMode,
  TenderRegistryABI, BidEscrowABI, MilestoneEscrowABI,
  ZKPControllerABI, AnomalyOracleABI, BountyHunterABI,
} from '../config/contracts'

// ─── Generic write wrapper with demo fallback ────────────────────────────

interface WriteResult {
  write: (...args: any[]) => void
  isLoading: boolean
  isSuccess: boolean
  txHash: `0x${string}` | undefined
  error: Error | null
  reset: () => void
}

function useDemoWrite(): WriteResult {
  const [state, setState] = useState<{ isLoading: boolean; isSuccess: boolean; error: Error | null }>({
    isLoading: false, isSuccess: false, error: null
  })

  const write = useCallback(() => {
    setState({ isLoading: true, isSuccess: false, error: null })
    setTimeout(() => {
      setState({ isLoading: false, isSuccess: true, error: null })
    }, 2500)
  }, [])

  const reset = useCallback(() => {
    setState({ isLoading: false, isSuccess: false, error: null })
  }, [])

  return {
    write,
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    txHash: state.isSuccess ? '0xdemo000000000000000000000000000000000000000000000000000000000001' as `0x${string}` : undefined,
    error: state.error,
    reset,
  }
}

// ─── Tender Registry ─────────────────────────────────────────────────────

export function usePostTender() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (ipfsHash: `0x${string}`, budget: bigint, deadline: bigint, milestoneCount: number) => {
      writeContract({
        address: contractAddresses.tenderRegistry,
        abi: TenderRegistryABI,
        functionName: 'postTender',
        args: [ipfsHash, budget, deadline, milestoneCount],
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

export function useCloseBidding() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (tenderId: bigint) => {
      writeContract({
        address: contractAddresses.tenderRegistry,
        abi: TenderRegistryABI,
        functionName: 'closeBidding',
        args: [tenderId],
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

// ─── Bid Escrow (Commit-Reveal) ──────────────────────────────────────────

export function useCommitBid() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (tenderId: bigint, commitHash: `0x${string}`, stakeEth: string) => {
      writeContract({
        address: contractAddresses.bidEscrow,
        abi: BidEscrowABI,
        functionName: 'commitBid',
        args: [tenderId, commitHash],
        value: parseEther(stakeEth),
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

export function useRevealBid() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (tenderId: bigint, amount: bigint, salt: `0x${string}`) => {
      writeContract({
        address: contractAddresses.bidEscrow,
        abi: BidEscrowABI,
        functionName: 'submitBid',
        args: [tenderId, amount, salt],
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

// ─── Milestone Escrow ────────────────────────────────────────────────────

export function useSubmitMilestone() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (tenderId: bigint, milestoneIndex: bigint, ipfsHash: `0x${string}`, gpsHash: `0x${string}`) => {
      writeContract({
        address: contractAddresses.milestoneEscrow,
        abi: MilestoneEscrowABI,
        functionName: 'submitMilestoneProof',
        args: [tenderId, milestoneIndex, ipfsHash, gpsHash],
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

export function useSignMilestone() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (milestoneId: bigint) => {
      writeContract({
        address: contractAddresses.milestoneEscrow,
        abi: MilestoneEscrowABI,
        functionName: 'signMilestone',
        args: [milestoneId],
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

// ─── ZKP Controller ─────────────────────────────────────────────────────

export function useVerifyKYC() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (
      contractor: `0x${string}`,
      proofA: readonly [bigint, bigint],
      proofB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]],
      proofC: readonly [bigint, bigint],
      publicInputs: readonly bigint[]
    ) => {
      writeContract({
        address: contractAddresses.zkpController,
        abi: ZKPControllerABI,
        functionName: 'verifyKYC',
        args: [contractor, proofA, proofB, proofC, [...publicInputs]],
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

// ─── Anomaly Oracle ──────────────────────────────────────────────────────

export function useReviewAndRelease() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (flagId: bigint) => {
      writeContract({
        address: contractAddresses.anomalyOracle,
        abi: AnomalyOracleABI,
        functionName: 'reviewAndRelease',
        args: [flagId],
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

export function useReviewAndSlash() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (flagId: bigint) => {
      writeContract({
        address: contractAddresses.anomalyOracle,
        abi: AnomalyOracleABI,
        functionName: 'reviewAndSlash',
        args: [flagId],
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

// ─── Bounty Hunter ───────────────────────────────────────────────────────

export function useRegisterBountyHunter() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (stakeEth: string) => {
      writeContract({
        address: contractAddresses.bountyHunter,
        abi: BountyHunterABI,
        functionName: 'register',
        value: parseEther(stakeEth),
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

export function useCommitReview() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (assignmentId: bigint, commitHash: `0x${string}`) => {
      writeContract({
        address: contractAddresses.bountyHunter,
        abi: BountyHunterABI,
        functionName: 'commitReview',
        args: [assignmentId, commitHash],
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

export function useRevealReview() {
  const demo = isDemoMode()
  const demoResult = useDemoWrite()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (demo) return demoResult

  return {
    write: (assignmentId: bigint, rating: number, salt: `0x${string}`) => {
      writeContract({
        address: contractAddresses.bountyHunter,
        abi: BountyHunterABI,
        functionName: 'revealReview',
        args: [assignmentId, rating, salt],
      })
    },
    isLoading: isPending,
    isSuccess,
    txHash: hash,
    error: error as Error | null,
    reset,
  }
}

// ─── Utility: Compute commit hash for bid commit-reveal ──────────────────

export function computeBidCommitHash(amount: bigint, salt: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(['uint256', 'bytes32'], [amount, salt]))
}

export function computeReviewCommitHash(rating: number, salt: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(['uint8', 'bytes32'], [rating, salt]))
}

/** Generate a random 32-byte salt for commit-reveal */
export function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return ('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`
}

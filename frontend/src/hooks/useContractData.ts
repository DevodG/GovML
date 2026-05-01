import { useReadContract, useAccount } from 'wagmi'
import {
  contractAddresses, isDemoMode,
  TenderRegistryABI, BidEscrowABI, MilestoneEscrowABI,
  ZKPControllerABI, RatingLedgerABI, BountyHunterABI,
} from '../config/contracts'
import { MOCK_TENDERS, MOCK_BIDS, MOCK_MILESTONES } from '../lib/mockData'

// ─── Tender ──────────────────────────────────────────────────────────────

export function useTenderOnChain(tenderId: bigint | undefined) {
  const demo = isDemoMode()
  const result = useReadContract({
    address: contractAddresses.tenderRegistry,
    abi: TenderRegistryABI,
    functionName: 'getTender',
    args: tenderId !== undefined ? [tenderId] : undefined,
    query: { enabled: !demo && tenderId !== undefined },
  })
  if (demo) {
    const mock = MOCK_TENDERS[0]
    return { data: mock, isLoading: false, isError: false, refetch: () => {} }
  }
  return result
}

export function useTenderCount() {
  const demo = isDemoMode()
  const result = useReadContract({
    address: contractAddresses.tenderRegistry,
    abi: TenderRegistryABI,
    functionName: 'getTenderCount',
    query: { enabled: !demo },
  })
  if (demo) {
    return { data: BigInt(MOCK_TENDERS.length), isLoading: false, isError: false }
  }
  return result
}

// ─── Bids ────────────────────────────────────────────────────────────────

export function useBidsByTender(tenderId: bigint | undefined) {
  const demo = isDemoMode()
  const result = useReadContract({
    address: contractAddresses.bidEscrow,
    abi: BidEscrowABI,
    functionName: 'getBidsByTender',
    args: tenderId !== undefined ? [tenderId] : undefined,
    query: { enabled: !demo && tenderId !== undefined },
  })
  if (demo) {
    const mockIds = MOCK_BIDS.map((_, i) => BigInt(i + 1))
    return { data: mockIds, isLoading: false, isError: false }
  }
  return result
}

export function useBidOnChain(bidId: bigint | undefined) {
  const demo = isDemoMode()
  const result = useReadContract({
    address: contractAddresses.bidEscrow,
    abi: BidEscrowABI,
    functionName: 'getBid',
    args: bidId !== undefined ? [bidId] : undefined,
    query: { enabled: !demo && bidId !== undefined },
  })
  if (demo) {
    return { data: MOCK_BIDS[0], isLoading: false, isError: false }
  }
  return result
}

// ─── Milestones ──────────────────────────────────────────────────────────

export function useMilestoneOnChain(milestoneId: bigint | undefined) {
  const demo = isDemoMode()
  const result = useReadContract({
    address: contractAddresses.milestoneEscrow,
    abi: MilestoneEscrowABI,
    functionName: 'getMilestone',
    args: milestoneId !== undefined ? [milestoneId] : undefined,
    query: { enabled: !demo && milestoneId !== undefined },
  })
  if (demo) {
    return { data: MOCK_MILESTONES[0], isLoading: false, isError: false }
  }
  return result
}

export function useMilestoneHasSigned(milestoneId: bigint | undefined) {
  const { address } = useAccount()
  const demo = isDemoMode()
  const result = useReadContract({
    address: contractAddresses.milestoneEscrow,
    abi: MilestoneEscrowABI,
    functionName: 'hasSigned',
    args: milestoneId !== undefined && address ? [milestoneId, address] : undefined,
    query: { enabled: !demo && milestoneId !== undefined && !!address },
  })
  if (demo) {
    return { data: false, isLoading: false, isError: false }
  }
  return result
}

// ─── KYC / ZKP ───────────────────────────────────────────────────────────

export function useKYCStatus(contractorAddress?: `0x${string}`) {
  const demo = isDemoMode()
  const result = useReadContract({
    address: contractAddresses.zkpController,
    abi: ZKPControllerABI,
    functionName: 'isKYCVerified',
    args: contractorAddress ? [contractorAddress] : undefined,
    query: { enabled: !demo && !!contractorAddress },
  })
  if (demo) {
    return { data: false, isLoading: false, isError: false }
  }
  return result
}

// ─── Contractor Profile ──────────────────────────────────────────────────

export function useContractorProfile(contractorAddress?: `0x${string}`) {
  const demo = isDemoMode()
  const result = useReadContract({
    address: contractAddresses.ratingLedger,
    abi: RatingLedgerABI,
    functionName: 'getRating',
    args: contractorAddress ? [contractorAddress] : undefined,
    query: { enabled: !demo && !!contractorAddress },
  })
  if (demo) {
    return {
      data: {
        contractor_address: contractorAddress || '0x0',
        is_frozen: false,
        zkp_verified: false,
        rating: BigInt(60_000_000),
        completion_rate: BigInt(8500),
        tender_count: BigInt(3),
      },
      isLoading: false,
      isError: false,
    }
  }
  return result
}

// ─── Bounty Hunter ───────────────────────────────────────────────────────

export function useBountyAssignment(assignmentId: bigint | undefined) {
  const demo = isDemoMode()
  const result = useReadContract({
    address: contractAddresses.bountyHunter,
    abi: BountyHunterABI,
    functionName: 'getAssignment',
    args: assignmentId !== undefined ? [assignmentId] : undefined,
    query: { enabled: !demo && assignmentId !== undefined },
  })
  if (demo) {
    return { data: null, isLoading: false, isError: false }
  }
  return result
}

export function useIsHunterRegistered(hunterAddress?: `0x${string}`) {
  const demo = isDemoMode()
  const result = useReadContract({
    address: contractAddresses.bountyHunter,
    abi: BountyHunterABI,
    functionName: 'isRegistered',
    args: hunterAddress ? [hunterAddress] : undefined,
    query: { enabled: !demo && !!hunterAddress },
  })
  if (demo) {
    return { data: false, isLoading: false, isError: false }
  }
  return result
}

import { type Abi } from 'viem'

// ─── Contract Addresses (from env) ────────────────────────────────────────
export const contractAddresses = {
  tenderRegistry:  (import.meta.env.VITE_CONTRACT_TENDER_REGISTRY  || '') as `0x${string}`,
  bidEscrow:       (import.meta.env.VITE_CONTRACT_BID_ESCROW       || '') as `0x${string}`,
  milestoneEscrow: (import.meta.env.VITE_CONTRACT_MILESTONE_ESCROW || '') as `0x${string}`,
  zkpController:   (import.meta.env.VITE_CONTRACT_ZKP_CONTROLLER   || '') as `0x${string}`,
  scoringOracle:   (import.meta.env.VITE_CONTRACT_SCORING_ORACLE   || '') as `0x${string}`,
  anomalyOracle:   (import.meta.env.VITE_CONTRACT_ANOMALY_ORACLE   || '') as `0x${string}`,
  bountyHunter:    (import.meta.env.VITE_CONTRACT_BOUNTY_HUNTER    || '') as `0x${string}`,
  ratingLedger:    (import.meta.env.VITE_CONTRACT_RATING_LEDGER    || '') as `0x${string}`,
} as const

/** Returns true when contract addresses are not configured — pages fall back to mock data */
export function isDemoMode(): boolean {
  return !contractAddresses.tenderRegistry || contractAddresses.tenderRegistry.length < 10
}

// ─── Role Constants (must match Types.sol) ────────────────────────────────
// keccak256("GOVT_ROLE"), keccak256("AUDITOR_ROLE"), etc.
export const ROLE_HASHES = {
  GOVT_ROLE:           '0x8502233096d909befbda0999bb8ea2f3a6be3c138b9fbf003752a4c8bce86f6c' as `0x${string}`,
  CONTRACTOR_ROLE:     '0x92b4e0d1e1d27fc00e7506e5f2bc5e38f9c6e3e1c7e3d9c7f3c7e3d9c7f3c7e3' as `0x${string}`,
  AUDITOR_ROLE:        '0xbf233dd2aafeb4d50879c4aa5c81e96d92f6e19c84cd98c4edd3a3e8a1bcb7f2' as `0x${string}`,
  BOUNTY_HUNTER_ROLE:  '0x6e8d4c2e3f5a7b9d1c3e5f7a9b1d3e5f7a9b1d3e5f7a9b1d3e5f7a9b1d3e5f7a' as `0x${string}`,
  ORACLE_ROLE:         '0x68e79a7bf1e0bc45d0a330c573bc367f9cf464fd326078812f301165fbda4ef1' as `0x${string}`,
} as const

// ─── ABI Fragments (minimal — only functions called from frontend) ────────
// Extracted from contract interfaces (contracts/src/interfaces/)

export const TenderRegistryABI = [
  { type: 'function', name: 'postTender', inputs: [{ name: 'ipfs_hash', type: 'bytes32' }, { name: 'budget', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'milestone_count', type: 'uint8' }], outputs: [{ name: 'tender_id', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'closeBidding', inputs: [{ name: 'tender_id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getTender', inputs: [{ name: 'tender_id', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'uint256' }, { name: 'govt_address', type: 'address' }, { name: 'status', type: 'uint8' }, { name: 'milestone_count', type: 'uint8' }, { name: 'ipfs_hash', type: 'bytes32' }, { name: 'budget', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'created_at', type: 'uint256' }] }], stateMutability: 'view' },
  { type: 'function', name: 'getWinner', inputs: [{ name: 'tender_id', type: 'uint256' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getTenderCount', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'hasRole', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const satisfies Abi

export const BidEscrowABI = [
  { type: 'function', name: 'commitBid', inputs: [{ name: 'tender_id', type: 'uint256' }, { name: 'commit_hash', type: 'bytes32' }], outputs: [], stateMutability: 'payable' },
  { type: 'function', name: 'submitBid', inputs: [{ name: 'tender_id', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'salt', type: 'bytes32' }], outputs: [{ name: 'bid_id', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'withdrawBid', inputs: [{ name: 'bid_id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'claimRefund', inputs: [{ name: 'bid_id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getBid', inputs: [{ name: 'bid_id', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'uint256' }, { name: 'tender_id', type: 'uint256' }, { name: 'contractor', type: 'address' }, { name: 'status', type: 'uint8' }, { name: 'amount', type: 'uint256' }, { name: 'stake', type: 'uint256' }, { name: 'score_commitment', type: 'bytes32' }, { name: 'submitted_at', type: 'uint256' }] }], stateMutability: 'view' },
  { type: 'function', name: 'getBidsByTender', inputs: [{ name: 'tender_id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256[]' }], stateMutability: 'view' },
] as const satisfies Abi

export const MilestoneEscrowABI = [
  { type: 'function', name: 'submitMilestoneProof', inputs: [{ name: 'tender_id', type: 'uint256' }, { name: 'milestone_index', type: 'uint256' }, { name: 'ipfs_hash', type: 'bytes32' }, { name: 'gps_hash', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'signMilestone', inputs: [{ name: 'milestone_id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'checkDeadManSwitch', inputs: [{ name: 'milestone_id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getMilestone', inputs: [{ name: 'milestone_id', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'uint256' }, { name: 'tender_id', type: 'uint256' }, { name: 'index', type: 'uint8' }, { name: 'status', type: 'uint8' }, { name: 'sig_count', type: 'uint8' }, { name: 'ipfs_hash', type: 'bytes32' }, { name: 'gps_hash', type: 'bytes32' }, { name: 'submit_time', type: 'uint256' }, { name: 'proof_window', type: 'uint256' }, { name: 'fund_amount', type: 'uint256' }] }], stateMutability: 'view' },
  { type: 'function', name: 'hasSigned', inputs: [{ name: 'milestone_id', type: 'uint256' }, { name: 'signer', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const satisfies Abi

export const ZKPControllerABI = [
  { type: 'function', name: 'verifyKYC', inputs: [{ name: 'contractor', type: 'address' }, { name: 'proof_a', type: 'uint256[2]' }, { name: 'proof_b', type: 'uint256[2][2]' }, { name: 'proof_c', type: 'uint256[2]' }, { name: 'public_inputs', type: 'uint256[]' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'isKYCVerified', inputs: [{ name: 'contractor', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'isNullifierUsed', inputs: [{ name: 'nullifier_hash', type: 'bytes32' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const satisfies Abi

export const ScoringOracleABI = [
  { type: 'function', name: 'getMultiSigStatus', inputs: [{ name: 'milestone_id', type: 'uint256' }], outputs: [{ name: 'sig_count', type: 'uint8' }, { name: 'threshold', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getScore', inputs: [{ name: 'bid_id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const satisfies Abi

export const AnomalyOracleABI = [
  { type: 'function', name: 'reviewAndRelease', inputs: [{ name: 'flag_id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'reviewAndSlash', inputs: [{ name: 'flag_id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getFlag', inputs: [{ name: 'flag_id', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'uint256' }, { name: 'tender_id', type: 'uint256' }, { name: 'bid_id', type: 'uint256' }, { name: 'reason_hash', type: 'bytes32' }, { name: 'flagged_by', type: 'address' }, { name: 'flagged_at', type: 'uint256' }, { name: 'freeze_until', type: 'uint256' }, { name: 'resolved', type: 'bool' }, { name: 'slashed', type: 'bool' }] }], stateMutability: 'view' },
  { type: 'function', name: 'hasRole', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const satisfies Abi

export const BountyHunterABI = [
  { type: 'function', name: 'register', inputs: [], outputs: [], stateMutability: 'payable' },
  { type: 'function', name: 'commitReview', inputs: [{ name: 'assignment_id', type: 'uint256' }, { name: 'commit_hash', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'revealReview', inputs: [{ name: 'assignment_id', type: 'uint256' }, { name: 'rating', type: 'uint8' }, { name: 'salt', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getAssignment', inputs: [{ name: 'assignment_id', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'uint256' }, { name: 'milestone_id', type: 'uint256' }, { name: 'phase', type: 'uint8' }, { name: 'hunters', type: 'address[2]' }, { name: 'commit_hashes', type: 'bytes32[2]' }, { name: 'ratings', type: 'uint8[2]' }] }], stateMutability: 'view' },
  { type: 'function', name: 'isRegistered', inputs: [{ name: 'hunter', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const satisfies Abi

export const RatingLedgerABI = [
  { type: 'function', name: 'getRating', inputs: [{ name: 'contractor', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'contractor_address', type: 'address' }, { name: 'is_frozen', type: 'bool' }, { name: 'zkp_verified', type: 'bool' }, { name: 'rating', type: 'uint256' }, { name: 'completion_rate', type: 'uint256' }, { name: 'tender_count', type: 'uint256' }] }], stateMutability: 'view' },
  { type: 'function', name: 'isFrozen', inputs: [{ name: 'contractor', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const satisfies Abi

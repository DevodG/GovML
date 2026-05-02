import { ethers } from 'ethers'
import { toast } from 'sonner'
import { CONTRACTS } from '../config/contracts'

// Contract ABIs - These would be imported from the actual contract artifacts
// For now, we'll use placeholder ABIs that will be replaced with real ones

const TENDER_REGISTRY_ABI = [
  'function createTender(string title, string category, uint256 budget, uint256 deadline, string ipfsDocHash, tuple(string name, uint256 percentage, uint256 daysToComplete)[] milestones) external returns (uint256)',
  'function updateTender(uint256 tenderId, string ipfsDocHash) external',
  'function closeBidding(uint256 tenderId) external',
  'function allotWinner(uint256 tenderId, address winner) external',
  'function updateTenderStatus(uint256 tenderId, uint8 newStatus) external',
  'function addGovernmentAuthority(address authority) external',
  'function removeGovernmentAuthority(address authority) external',
  'function pause() external',
  'function unpause() external',
  'function getTender(uint256 tenderId) external view returns (string title, string category, uint256 budget, uint256 deadline, string ipfsDocHash, uint8 status, address winner, uint256 createdAt, uint256 biddingClosedAt)',
  'function getMilestones(uint256 tenderId) external view returns (tuple(string name, uint256 percentage, uint256 daysToComplete, bool completed, uint256 completedAt)[])',
  'function getTenderCount() external view returns (uint256)',
  'function isGovernmentAuthority(address authority) external view returns (bool)',
  'event TenderCreated(uint256 indexed tenderId, string title, string category, uint256 budget, uint256 deadline, string ipfsDocHash, address indexed createdBy)',
  'event TenderUpdated(uint256 indexed tenderId, string ipfsDocHash)',
  'event BiddingClosed(uint256 indexed tenderId, uint256 closedAt)',
  'event WinnerAllotted(uint256 indexed tenderId, address indexed winner, uint256 allottedAt)',
  'event TenderStatusChanged(uint256 indexed tenderId, uint8 oldStatus, uint8 newStatus)',
  'event GovernmentAuthorityAdded(address indexed authority)',
  'event GovernmentAuthorityRemoved(address indexed authority)',
] as const

const BID_ESCROW_ABI = [
  'function commitBid(uint256 tenderId, bytes32 commitHash) external payable',
  'function submitBid(uint256 tenderId, uint256 amount, bytes32 salt) external returns (uint256)',
  'function withdrawBid(uint256 bidId) external',
  'function claimRefund(uint256 bidId) external',
  'function lockWinnerStake(uint256 tenderId, address winner) external',
  'function markLosers(uint256 tenderId, address winner) external',
  'function setMinBidStake(uint256 _minStake) external',
  'function setTenderRegistryAddress(address _tenderRegistry) external',
  'function pause() external',
  'function unpause() external',
  'function getBid(uint256 bidId) external view returns (uint256 id, uint256 tenderId, address contractor, uint8 status, uint256 amount, uint256 stake, bytes32 scoreCommitment, uint256 submittedAt)',
  'function getBidsByTender(uint256 tenderId) external view returns (uint256[])',
  'function getBidCount() external view returns (uint256)',
  'function isRefundClaimed(uint256 bidId) external view returns (bool)',
  'function getCommitHash(uint256 tenderId, address contractor) external view returns (bytes32)',
  'function getCommitBlock(uint256 tenderId, address contractor) external view returns (uint256)',
  'event BidCommitted(uint256 indexed tenderId, address indexed contractor, bytes32 commitHash, uint256 blockNumber)',
  'event BidSubmitted(uint256 indexed tenderId, address indexed contractor, uint256 bidId, uint256 amount, uint256 stake, uint256 timestamp)',
  'event BidWithdrawn(uint256 indexed bidId, address indexed contractor, uint256 refundAmount)',
  'event BidRefunded(uint256 indexed bidId, address indexed contractor, uint256 refundAmount)',
  'event StakeLocked(uint256 indexed tenderId, address indexed winner, uint256 stake)',
] as const

const MILESTONE_ESCROW_ABI = [
  'function initializeMilestones(uint256 tenderId, tuple(string name, uint256 percentage, uint256 daysToComplete)[] milestones) external',
  'function submitMilestone(uint256 tenderId, uint256 milestoneIndex, bytes32 ipfsHash, bytes32 gpsHash, string[] evidence) external',
  'function signMilestone(uint256 milestoneId) external',
  'function claimMilestoneFunds(uint256 milestoneId) external',
  'function triggerDeadMansSwitch(uint256 milestoneId) external',
  'function extendProofWindow(uint256 milestoneId, uint256 extensionDays) external',
  'function pause() external',
  'function unpause() external',
  'function getMilestone(uint256 milestoneId) external view returns (uint256 id, uint256 tenderId, uint8 index, uint8 status, uint8 sigCount, bytes32 ipfsHash, bytes32 gpsHash, uint256 submitTime, uint256 proofWindow, uint256 fundAmount)',
  'function getMilestonesByTender(uint256 tenderId) external view returns (uint256[])',
  'function getMultiSigStatus(uint256 milestoneId) external view returns (uint8 sigCount, uint8 threshold)',
  'event MilestoneInitialized(uint256 indexed tenderId, uint256[] milestoneIds)',
  'event MilestoneSubmitted(uint256 indexed milestoneId, address indexed contractor, bytes32 ipfsHash, bytes32 gpsHash)',
  'event MilestoneSigned(uint256 indexed milestoneId, address indexed signer, uint8 sigCount)',
  'event MilestoneApproved(uint256 indexed milestoneId, uint256 fundAmount)',
  'event DeadMansTriggered(uint256 indexed milestoneId)',
] as const

const BOUNTY_HUNTER_ABI = [
  'function register() external payable',
  'function requestHunterAssignment(uint256 milestoneId) external',
  'function commitReview(uint256 assignmentId, bytes32 commitHash) external',
  'function revealReview(uint256 assignmentId, uint8 rating, bytes32 salt) external',
  'function forceAdvanceToReveal(uint256 assignmentId) external',
  'function slash(address hunter) external',
  'function setMilestoneEscrowAddress(address _milestoneEscrow) external',
  'function setVRFConfig(uint64 subscriptionId, bytes32 keyHash, uint16 requestConfirmations, uint32 callbackGasLimit) external',
  'function pause() external',
  'function unpause() external',
  'function getAssignment(uint256 assignmentId) external view returns (uint256 id, uint256 milestoneId, uint8 phase, address[2] hunters, bytes32[2] commitHashes, uint8[2] ratings)',
  'function isRegistered(address hunter) external view returns (bool)',
  'function getHunterStake(address hunter) external view returns (uint256)',
  'function getHunterPoolSize() external view returns (uint256)',
  'function getActiveHunterCount() external view returns (uint256)',
  'function getAssignmentByMilestone(uint256 milestoneId) external view returns (uint256)',
  'event HunterRegistered(address indexed hunter, uint256 stake)',
  'event VRFRequested(uint256 indexed milestoneId, uint256 requestId)',
  'event HuntersAssigned(uint256 indexed milestoneId, uint256 assignmentId, address hunter1, address hunter2)',
  'event ReviewCommitted(uint256 indexed assignmentId, address indexed hunter, bytes32 commitHash)',
  'event ReviewRevealed(uint256 indexed assignmentId, address indexed hunter, uint8 rating)',
  'event HunterSlashed(address indexed hunter, uint256 amount, string reason)',
] as const

const SCORING_ORACLE_ABI = [
  'function recordScore(uint256 tenderId, uint256 bidId, uint256 score, bytes proof, uint256[] publicInputs) external',
  'function setZKPControllerAddress(address _zkpController) external',
  'function setTenderRegistryAddress(address _tenderRegistry) external',
  'function setBidEscrowAddress(address _bidEscrow) external',
  'function pause() external',
  'function unpause() external',
  'function getScore(uint256 bidId) external view returns (uint256)',
  'function isScored(uint256 bidId) external view returns (bool)',
  'function getMultiSigStatus(uint256 milestoneId) external pure returns (uint8 sigCount, uint8 threshold)',
  'event ScoreRecorded(uint256 indexed tenderId, uint256 indexed bidId, uint256 score, uint256 timestamp)',
] as const

const ANOMALY_ORACLE_ABI = [
  'function flagAnomaly(uint256 tenderId, uint256 bidId, bytes32 reasonHash) external',
  'function reviewAndRelease(uint256 flagId) external',
  'function reviewAndSlash(uint256 flagId) external',
  'function unfreezeContractor(address contractor) external',
  'function setBidEscrowAddress(address _bidEscrow) external',
  'function setTenderRegistryAddress(address _tenderRegistry) external',
  'function pause() external',
  'function unpause() external',
  'function getFlag(uint256 flagId) external view returns (uint256 id, uint256 tenderId, uint256 bidId, bytes32 reasonHash, address flaggedBy, uint256 flaggedAt, uint256 freezeUntil, bool resolved, bool slashed)',
  'function getFlagCount() external view returns (uint256)',
  'function getFlagsByTender(uint256 tenderId) external view returns (uint256[])',
  'function isContractorFrozen(address contractor) external view returns (bool)',
  'function getSlashTotal(address contractor) external view returns (uint256)',
  'event AnomalyFlagged(uint256 indexed tenderId, uint256 indexed bidId, uint256 flagId, bytes32 reasonHash, uint256 freezeUntil)',
  'event FundsFrozen(uint256 indexed flagId, uint256 indexed tenderId, uint256 amount)',
  'event FundsReleasedAfterReview(uint256 indexed flagId, address indexed reviewer)',
  'event ContractorSlashed(uint256 indexed flagId, address indexed contractor, uint256 amount)',
] as const

const RATING_LEDGER_ABI = [
  'function updateRating(address contractor, uint256 rating, uint256 completionRate) external',
  'function freezeProfile(address contractor) external',
  'function unfreezeProfile(address contractor) external',
  'function pause() external',
  'function unpause() external',
  'function getProfile(address contractor) external view returns (address contractorAddress, bool isFrozen, bool zkpVerified, uint256 rating, uint256 completionRate, uint256 tenderCount)',
  'function isProfileFrozen(address contractor) external view returns (bool)',
  'event RatingUpdated(address indexed contractor, uint256 rating, uint256 completionRate)',
  'event ProfileFrozen(address indexed contractor)',
  'event ProfileUnfrozen(address indexed contractor)',
] as const

const ZKP_CONTROLLER_ABI = [
  'function verifyKYC(address contractor, uint256[2] proofA, uint256[2][2] proofB, uint256[2] proofC, uint256[] publicInputs) external',
  'function verifyScoreProof(uint256 tenderId, uint256 bidId, bytes proof, uint256[] publicInputs) external returns (bool)',
  'function verifyNullifier(uint256 milestoneId, uint256[2] proofA, uint256[2][2] proofB, uint256[2] proofC, uint256[] publicInputs) external',
  'function setVerifier(address _verifier) external',
  'function pause() external',
  'function unpause() external',
  'function isKYCVerified(address contractor) external view returns (bool)',
  'function getKYCHash(address contractor) external view returns (bytes32)',
  'function isNullifierUsed(bytes32 nullifierHash) external view returns (bool)',
  'function getScoreCommitment(uint256 bidId) external view returns (bytes32)',
  'function getProof(uint256 proofId) external view returns (uint256 id, uint8 proofType, address prover, bytes32 publicHash, uint256 verifiedAt, bool isValid)',
  'function getProofCount() external view returns (uint256)',
  'event ProofVerified(uint256 indexed proofId, uint8 proofType, address indexed prover, bytes32 publicHash, uint256 timestamp)',
  'event KYCVerified(address indexed contractor, bytes32 identityHash)',
  'event ScoreProofVerified(uint256 indexed tenderId, uint256 indexed bidId, bytes32 scoreCommitment)',
  'event NullifierUsed(bytes32 indexed nullifierHash, uint256 milestoneId)',
] as const

// Contract name type
export type ContractName =
  | 'TENDER_REGISTRY'
  | 'BID_ESCROW'
  | 'MILESTONE_ESCROW'
  | 'SCORING_ORACLE'
  | 'ANOMALY_ORACLE'
  | 'BOUNTY_HUNTER'
  | 'RATING_LEDGER'
  | 'ZKP_CONTROLLER'

// Contract address mapping
const CONTRACT_ADDRESSES: Record<ContractName, string> = {
  TENDER_REGISTRY: CONTRACTS.TENDER_REGISTRY,
  BID_ESCROW: CONTRACTS.BID_ESCROW,
  MILESTONE_ESCROW: CONTRACTS.MILESTONE_ESCROW,
  SCORING_ORACLE: CONTRACTS.SCORING_ORACLE,
  ANOMALY_ORACLE: CONTRACTS.ANOMALY_ORACLE,
  BOUNTY_HUNTER: CONTRACTS.BOUNTY_HUNTER,
  RATING_LEDGER: CONTRACTS.RATING_LEDGER,
  ZKP_CONTROLLER: CONTRACTS.ZKP_CONTROLLER,
}

// Contract ABI mapping
const CONTRACT_ABIS: Record<ContractName, readonly any[]> = {
  TENDER_REGISTRY: TENDER_REGISTRY_ABI,
  BID_ESCROW: BID_ESCROW_ABI,
  MILESTONE_ESCROW: MILESTONE_ESCROW_ABI,
  SCORING_ORACLE: SCORING_ORACLE_ABI,
  ANOMALY_ORACLE: ANOMALY_ORACLE_ABI,
  BOUNTY_HUNTER: BOUNTY_HUNTER_ABI,
  RATING_LEDGER: RATING_LEDGER_ABI,
  ZKP_CONTROLLER: ZKP_CONTROLLER_ABI,
}

// Transaction status type
export type TransactionStatus = 'idle' | 'pending' | 'confirmed' | 'failed'

// Transaction result type
export interface TransactionResult {
  hash: string
  status: TransactionStatus
  blockNumber?: number
  error?: string
}

// Get contract instance
export function getContract(name: ContractName) {
  const address = CONTRACT_ADDRESSES[name]
  const abi = CONTRACT_ABIS[name]

  if (!address || address === '0x0000000000000000000000000000000000000000') {
    console.warn(`Contract ${name} not deployed or address not set`)
    return null
  }

  return { address, abi }
}

// Send transaction with error handling
export async function sendTransaction(
  name: ContractName,
  method: string,
  args: any[] = [],
  value?: bigint
): Promise<TransactionResult> {
  const contract = getContract(name)

  if (!contract) {
    return {
      hash: '',
      status: 'failed',
      error: `Contract ${name} not available`,
    }
  }

  try {
    const { address, abi } = contract

    // Check if wallet is connected
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      return {
        hash: '',
        status: 'failed',
        error: 'Wallet not connected. Please connect your wallet.',
      }
    }

    const provider = new ethers.BrowserProvider((window as any).ethereum)
    const signer = await provider.getSigner()
    const contractInstance = new ethers.Contract(address, abi, signer)

    // Build transaction
    const tx = await contractInstance[method](...args, { value })

    toast.loading('Transaction pending...', { id: tx.hash })

    // Wait for confirmation
    const receipt = await tx.wait()

    toast.success('Transaction confirmed!', { id: tx.hash })

    return {
      hash: tx.hash,
      status: 'confirmed',
      blockNumber: receipt?.blockNumber,
    }
  } catch (error: any) {
    console.error('Transaction failed:', error)

    let errorMessage = 'Transaction failed'

    if (error.code === 'ACTION_REJECTED') {
      errorMessage = 'Transaction rejected by user'
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient funds for transaction'
    } else if (error.message) {
      errorMessage = error.message
    }

    toast.error(errorMessage)

    return {
      hash: '',
      status: 'failed',
      error: errorMessage,
    }
  }
}

// Call contract (read-only)
export async function callContract(
  name: ContractName,
  method: string,
  args: any[] = []
): Promise<any> {
  const contract = getContract(name)

  if (!contract) {
    throw new Error(`Contract ${name} not available`)
  }

  try {
    const { address, abi } = contract

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('Wallet not connected')
    }

    const provider = new ethers.BrowserProvider((window as any).ethereum)
    const contractInstance = new ethers.Contract(address, abi, provider)

    const result = await contractInstance[method](...args)
    return result
  } catch (error: any) {
    console.error('Contract call failed:', error)
    throw error
  }
}

// Watch contract event
export function watchContractEvent(
  name: ContractName,
  event: string,
  callback: (...args: any[]) => void
): () => void {
  const contract = getContract(name)

  if (!contract) {
    console.warn(`Contract ${name} not available for event watching`)
    return () => {}
  }

  try {
    const { address, abi } = contract

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      return () => {}
    }

    const provider = new ethers.BrowserProvider((window as any).ethereum)
    const contractInstance = new ethers.Contract(address, abi, provider)

    contractInstance.on(event, callback)

    // Return cleanup function
    return () => {
      contractInstance.off(event, callback)
    }
  } catch (error) {
    console.error('Failed to watch event:', error)
    return () => {}
  }
}

// Helper to format transaction hash for block explorer
export function getBlockExplorerUrl(hash: string, chainId?: number): string {
  // Default to Sepolia testnet
  const network = chainId || 11155111
  const baseUrl = network === 11155111
    ? 'https://sepolia.etherscan.io/tx'
    : network === 1
    ? 'https://etherscan.io/tx'
    : 'https://sepolia.etherscan.io/tx'

  return `${baseUrl}/${hash}`
}

// Check if contract is deployed
export function isContractDeployed(name: ContractName): boolean {
  const address = CONTRACT_ADDRESSES[name]
  return address !== '0x0000000000000000000000000000000000000000' && address !== ''
}

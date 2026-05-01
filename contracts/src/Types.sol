// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Types — GovChain Shared Type Definitions
/// @notice Central library containing all structs, enums, custom errors, role constants,
///         and system-wide constants used across GovChain contracts.
/// @dev    All contracts MUST import from this file. Never define structs inline.
/// @author GovChain Team

// =============================================================================
// ACCESS CONTROL ROLE CONSTANTS
// =============================================================================

/// @dev Role for government administrators — can post tenders, close bidding, sign milestones
bytes32 constant GOVT_ROLE = keccak256("GOVT_ROLE");

/// @dev Role for verified contractors — can submit bids, submit milestone proofs, sign milestones
bytes32 constant CONTRACTOR_ROLE = keccak256("CONTRACTOR_ROLE");

/// @dev Role for independent auditors — can review anomalies, sign milestones
bytes32 constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

/// @dev Role for bounty hunters — can commit/reveal reviews, sign milestones
bytes32 constant BOUNTY_HUNTER_ROLE = keccak256("BOUNTY_HUNTER_ROLE");

/// @dev Role for the backend oracle relay — can record scores, flag anomalies, record audit reports
bytes32 constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

// =============================================================================
// SYSTEM CONSTANTS
// =============================================================================

/// @dev Maximum number of days for a milestone proof window before dead man's switch activates
uint256 constant MAX_MILESTONE_DAYS = 90;

/// @dev Default proof window in seconds (30 days)
uint256 constant DEFAULT_PROOF_WINDOW = 30 days;

/// @dev Anomaly freeze duration — 72 hours
uint256 constant ANOMALY_FREEZE_DURATION = 72 hours;

/// @dev Multi-sig threshold: 3-of-5 required to release milestone funds
uint256 constant MULTISIG_THRESHOLD = 3;

/// @dev Total multi-sig parties per milestone
uint256 constant MULTISIG_TOTAL = 5;

/// @dev Number of bounty hunters assigned per milestone via VRF
uint256 constant BOUNTY_HUNTERS_PER_MILESTONE = 2;

/// @dev Minimum stake required for bounty hunter registration (0.01 ETH)
uint256 constant MIN_BOUNTY_HUNTER_STAKE = 0.01 ether;

/// @dev Fixed-point scaling factor for ZKP circuit arithmetic (1e6)
uint256 constant ZKP_SCALING_FACTOR = 1_000_000;

// =============================================================================
// ENUMS — State machines for all lifecycle entities
// =============================================================================

/// @notice Lifecycle states of a tender
enum TenderStatus {
    DRAFT,      // Created but not yet open for bidding
    OPEN,       // Actively accepting bids
    CLOSED,     // Bidding closed, awaiting ML scoring + allotment
    ALLOTTED,   // Winner selected and verified via ZKP
    COMPLETED,  // All milestones delivered and funds released
    DISPUTED    // Under investigation due to anomaly flag
}

/// @notice Lifecycle states of a bid
enum BidStatus {
    PENDING,    // Submitted, awaiting tender closure
    WON,        // Selected as winner after ZKP-verified scoring
    LOST,       // Not selected — stake refundable
    WITHDRAWN,  // Contractor withdrew bid before deadline
    FLAGGED     // Flagged by anomaly oracle — under review
}

/// @notice Lifecycle states of a milestone deliverable
enum MilestoneStatus {
    PENDING,        // Awaiting contractor submission
    SUBMITTED,      // Proof submitted, awaiting multi-sig approval
    APPROVED,       // 3-of-5 signatures collected — funds released
    DISPUTED,       // Under dispute / anomaly review
    REDISTRIBUTED   // Dead man's switch triggered — funds redistributed
}

/// @notice Phases of the bounty hunter commit-reveal scheme
enum BountyPhase {
    UNASSIGNED, // No hunters assigned yet
    COMMITTED,  // Hunters have submitted commit hashes
    REVEALED,   // Hunters have revealed their ratings
    COMPLETED   // Review cycle complete, ratings recorded
}

// =============================================================================
// STRUCTS — Slot-packed for gas efficiency
// =============================================================================

/// @notice Represents a government tender posted on-chain
/// @dev Slot layout:
///   Slot 0: id (uint256)
///   Slot 1: govt_address (address, 20 bytes) + status (uint8, 1 byte) + milestone_count (uint8, 1 byte)
///   Slot 2: ipfs_hash (bytes32)
///   Slot 3: budget (uint256)
///   Slot 4: deadline (uint256)
///   Slot 5: created_at (uint256)
struct Tender {
    uint256 id;                 // Unique tender identifier
    address govt_address;       // Government wallet that posted the tender
    TenderStatus status;        // Current lifecycle state
    uint8 milestone_count;      // Number of milestones required for this tender
    bytes32 ipfs_hash;          // IPFS hash of tender document (full spec off-chain)
    uint256 budget;             // Total budget in wei (ETH)
    uint256 deadline;           // Unix timestamp — bidding closes at this time
    uint256 created_at;         // Unix timestamp — when tender was posted
}

/// @notice Represents a contractor's bid on a tender
/// @dev Slot layout:
///   Slot 0: id (uint256)
///   Slot 1: tender_id (uint256)
///   Slot 2: contractor (address, 20 bytes) + status (uint8, 1 byte)
///   Slot 3: amount (uint256)
///   Slot 4: stake (uint256)
///   Slot 5: score_commitment (bytes32)
///   Slot 6: submitted_at (uint256)
struct Bid {
    uint256 id;                 // Unique bid identifier
    uint256 tender_id;          // ID of the tender this bid is for
    address contractor;         // Contractor wallet address
    BidStatus status;           // Current lifecycle state
    uint256 amount;             // Proposed project cost in wei
    uint256 stake;              // ETH staked as collateral (msg.value)
    bytes32 score_commitment;   // ZKP commitment of ML-computed score
    uint256 submitted_at;       // Unix timestamp — when bid was submitted
}

/// @notice Represents a milestone deliverable within a tender
/// @dev Slot layout:
///   Slot 0: id (uint256)
///   Slot 1: tender_id (uint256)
///   Slot 2: index (uint8) + status (uint8) + sig_count (uint8) — packed in slot with next address
///   Slot 3: ipfs_hash (bytes32)
///   Slot 4: gps_hash (bytes32)
///   Slot 5: submit_time (uint256)
///   Slot 6: proof_window (uint256)
///   Slot 7: fund_amount (uint256)
struct Milestone {
    uint256 id;                 // Unique milestone identifier
    uint256 tender_id;          // ID of the parent tender
    uint8 index;                // Milestone index within the tender (0-based)
    MilestoneStatus status;     // Current lifecycle state
    uint8 sig_count;            // Number of multi-sig approvals collected (max 5)
    bytes32 ipfs_hash;          // IPFS hash of deliverable proof
    bytes32 gps_hash;           // GPS location hash for physical verification
    uint256 submit_time;        // Unix timestamp — when proof was submitted
    uint256 proof_window;       // Deadline timestamp — dead man's switch triggers after this
    uint256 fund_amount;        // ETH amount allocated to this milestone
}

/// @notice Represents a bounty hunter assignment for milestone review
/// @dev Slot layout:
///   Slot 0: id (uint256)
///   Slot 1: milestone_id (uint256)
///   Slot 2: phase (uint8) — packed
///   Slot 3-4: hunters[0], hunters[1] (address[2])
///   Slot 5-6: commit_hashes[0], commit_hashes[1] (bytes32[2])
///   Slot 7-8: ratings[0], ratings[1] (uint8[2]) — packed
struct BountyAssignment {
    uint256 id;                 // Unique assignment identifier
    uint256 milestone_id;       // ID of the milestone being reviewed
    BountyPhase phase;          // Current phase of the commit-reveal scheme
    address[2] hunters;         // Two bounty hunters assigned via VRF
    bytes32[2] commit_hashes;   // Commit hashes from each hunter (phase 1)
    uint8[2] ratings;           // Revealed ratings from each hunter (phase 2, 1-10 scale)
}

/// @notice Represents a contractor's on-chain reputation profile
/// @dev Slot layout:
///   Slot 0: contractor_address (address, 20 bytes) + is_frozen (bool, 1 byte) + zkp_verified (bool, 1 byte)
///   Slot 1: rating (uint256)
///   Slot 2: completion_rate (uint256)
///   Slot 3: tender_count (uint256)
struct ContractorProfile {
    address contractor_address; // Contractor wallet address
    bool is_frozen;             // True if frozen by AnomalyOracle (proven fraud)
    bool zkp_verified;          // True if KYC ZKP proof verified
    uint256 rating;             // Cumulative rating score (scaled by ZKP_SCALING_FACTOR)
    uint256 completion_rate;    // Percentage of milestones completed on time (scaled by 1e4 = 100.00%)
    uint256 tender_count;       // Total number of tenders participated in
}

/// @notice Represents an anomaly flag raised by the ML service
/// @dev Used by AnomalyOracle for tracking freeze/review state
struct AnomalyFlag {
    uint256 id;                 // Unique flag identifier
    uint256 tender_id;          // Flagged tender
    uint256 bid_id;             // Flagged bid
    bytes32 reason_hash;        // IPFS hash of the anomaly explanation
    address flagged_by;         // Backend oracle address that raised the flag
    uint256 flagged_at;         // Unix timestamp — when the anomaly was flagged
    uint256 freeze_until;       // Unix timestamp — 72h after flagging
    bool resolved;              // True once auditor has reviewed
    bool slashed;               // True if auditor confirmed fraud (funds slashed)
}

// =============================================================================
// CUSTOM ERRORS — Descriptive revert reasons with parameters
// =============================================================================

/// @dev Caller does not have the required role
error UnauthorisedCaller(address caller, bytes32 required_role);

/// @dev Tender is not in the expected status for this operation
error TenderNotOpen(uint256 tender_id, TenderStatus current_status);

/// @dev Tender does not exist
error TenderNotFound(uint256 tender_id);

/// @dev Bid does not exist
error BidNotFound(uint256 bid_id);

/// @dev Milestone proof window has expired — dead man's switch eligible
error ProofWindowExpired(uint256 milestone_id, uint256 expired_at);

/// @dev Dead man's switch window has not yet expired
error DeadManWindowNotExpired(uint256 milestone_id, uint256 window_closes_at);

/// @dev Staked ETH is below the minimum requirement
error InsufficientStake(uint256 provided, uint256 required);

/// @dev ZKP proof verification failed
error InvalidZKProof(uint256 bid_id);

/// @dev Invoice nullifier hash has already been used — duplicate submission
error NullifierAlreadyUsed(bytes32 nullifier_hash);

/// @dev Bidding deadline has passed
error BiddingDeadlinePassed(uint256 tender_id, uint256 deadline);

/// @dev Bidding deadline has not yet passed (cannot close early)
error BiddingDeadlineNotPassed(uint256 tender_id, uint256 deadline);

/// @dev Bid has already been submitted by this contractor for this tender
error DuplicateBid(uint256 tender_id, address contractor);

/// @dev Milestone is not in the expected status
error InvalidMilestoneStatus(uint256 milestone_id, MilestoneStatus current_status);

/// @dev Caller has already signed this milestone
error DuplicateSignature(uint256 milestone_id, address signer);

/// @dev Caller is not authorized to sign this milestone
error UnauthorisedSigner(uint256 milestone_id, address signer);

/// @dev Contractor is frozen due to proven fraud
error ContractorIsFrozen(address contractor);

/// @dev Anomaly flag review window has not expired yet
error FreezeWindowActive(uint256 flag_id, uint256 freeze_until);

/// @dev Anomaly flag has already been resolved
error FlagAlreadyResolved(uint256 flag_id);

/// @dev Invalid milestone index for the tender
error InvalidMilestoneIndex(uint256 tender_id, uint256 index, uint256 max_index);

/// @dev Cannot withdraw bid after bidding has closed
error BidWithdrawalNotAllowed(uint256 bid_id, BidStatus current_status);

/// @dev Zero address provided where a valid address is required
error ZeroAddressNotAllowed();

/// @dev Refund has already been claimed
error RefundAlreadyClaimed(uint256 bid_id);

/// @dev No funds available for withdrawal
error NoFundsAvailable(address caller);

/// @dev Transfer of ETH failed
error TransferFailed(address to, uint256 amount);

/// @dev Milestones have already been initialized for this tender
error MilestonesAlreadyInitialized(uint256 tender_id);

/// @dev Tender is not in ALLOTTED status (required for milestone initialization)
error TenderNotAllotted(uint256 tender_id, TenderStatus current_status);

/// @dev Milestone proof window has not expired yet (dead man's switch not eligible)
error ProofWindowNotExpired(uint256 milestone_id, uint256 window_closes_at);

/// @dev Submitted ETH does not match the tender budget
error IncorrectFundingAmount(uint256 provided, uint256 required);

/// @dev Milestone does not exist
error MilestoneNotFound(uint256 milestone_id);

/// @dev Score has already been recorded for this bid
error ScoreAlreadyRecorded(uint256 bid_id);

/// @dev Anomaly flag does not exist
error FlagNotFound(uint256 flag_id);

/// @dev Tender is not in CLOSED status (required for scoring)
error TenderNotClosed(uint256 tender_id, TenderStatus current_status);

/// @dev Hunter is already registered
error HunterAlreadyRegistered(address hunter);

/// @dev Hunter is not registered
error HunterNotRegistered(address hunter);

/// @dev Assignment does not exist
error AssignmentNotFound(uint256 assignment_id);

/// @dev Caller is not an assigned hunter for this assignment
error NotAssignedHunter(uint256 assignment_id, address caller);

/// @dev Assignment is not in the expected phase
error InvalidBountyPhase(uint256 assignment_id, BountyPhase current_phase);

/// @dev Commit-reveal hash mismatch
error CommitRevealMismatch(uint256 assignment_id, address hunter);

/// @dev Rating out of valid range (must be 1-10)
error InvalidRating(uint8 rating);

/// @dev Not enough registered hunters for VRF assignment
error InsufficientHunterPool(uint256 available, uint256 required);

/// @dev Contractor profile does not exist
error ProfileNotFound(address contractor);

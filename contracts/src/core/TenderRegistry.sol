// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {
    Tender,
    TenderStatus,
    Bid,
    BidStatus,
    GOVT_ROLE,
    ORACLE_ROLE,
    CONTRACTOR_ROLE,
    ZKP_SCALING_FACTOR
} from "../Types.sol";
import {
    TenderNotFound,
    TenderNotOpen,
    BiddingDeadlinePassed,
    BiddingDeadlineNotPassed,
    ZeroAddressNotAllowed,
    InvalidZKProof,
    InvalidWinner,
    ScoreMismatch
} from "../Types.sol";
import {ITenderRegistry} from "../interfaces/ITenderRegistry.sol";
import {IBidEscrow} from "../interfaces/IBidEscrow.sol";
import {IScoringOracle} from "../interfaces/IScoringOracle.sol";
import {IZKPController} from "../interfaces/IZKPController.sol";

/// @title TenderRegistry — Government Tender Lifecycle Management
/// @notice Manages the full lifecycle of government tenders: posting, bid closure,
///         and ZKP-verified winner allotment. This is the entry point for the GovChain
///         pre-award procurement flow.
/// @dev    Upgradeable via TransparentUpgradeableProxy. Uses AccessControl for role-based
///         permissions, Pausable for emergency stops, and ReentrancyGuard for safety.
///         This contract does NOT hold funds — BidEscrow handles all ETH.
/// @author GovChain Team
contract TenderRegistry is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    ITenderRegistry
{
    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice Auto-incrementing counter for tender IDs (starts at 1)
    uint256 private _tender_count;

    /// @notice Mapping from tender ID to Tender struct
    /// @dev mapping_tenders[tender_id] => Tender
    mapping(uint256 => Tender) private mapping_tenders;

    /// @notice Address of the BidEscrow contract for cross-contract calls
    address public bid_escrow_address;

    /// @notice Address of the ZKPController contract for proof verification
    /// @dev Set to address(0) until Phase 6 — allotWinner will skip ZKP check if not set
    address public zkp_controller_address;

    /// @notice Address of the ScoringOracle contract for score validation
    address public scoring_oracle_address;

    /// @notice Mapping from tender_id to the winning bid_id (set after allotment)
    mapping(uint256 => uint256) public mapping_winning_bids;

    /// @notice Mapping from tender_id to the winning contractor address
    mapping(uint256 => address) public mapping_winners;

    /// @notice Maximum allowed score (prevents score inflation)
    uint256 public constant MAX_SCORE = 100 * ZKP_SCALING_FACTOR;

    /// @notice Minimum allowed score (prevents score manipulation)
    uint256 public constant MIN_SCORE = 1 * ZKP_SCALING_FACTOR;

    /// @notice Score consistency tolerance (5%)
    uint256 public constant SCORE_TOLERANCE = 5 * ZKP_SCALING_FACTOR / 100;

    // =========================================================================
    // STORAGE GAP — Reserve slots for future upgrades (ERC-7201 pattern)
    // =========================================================================

    /// @dev Reserved storage gap for future variable additions without breaking layout
    uint256[44] private __gap;

    // =========================================================================
    // INITIALIZER (replaces constructor for upgradeable contracts)
    // =========================================================================

    /// @notice Initialize the TenderRegistry contract
    /// @dev Called once via proxy during deployment. Sets up roles and admin.
    /// @param admin Address of the default admin (can grant/revoke all roles)
    /// @param govt Address of the initial government admin
    function initialize(address admin, address govt) external initializer {
        if (admin == address(0) || govt == address(0)) revert ZeroAddressNotAllowed();

        __AccessControl_init();
        __Pausable_init();

        // Admin can manage all roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // Government can post tenders and close bidding
        _grantRole(GOVT_ROLE, govt);
    }

    // =========================================================================
    // ADMIN CONFIGURATION
    // =========================================================================

    /// @notice Set the BidEscrow contract address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Must be set before allotment works.
    /// @param _bid_escrow Address of the deployed BidEscrow contract
    function setBidEscrowAddress(address _bid_escrow) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_bid_escrow == address(0)) revert ZeroAddressNotAllowed();
        bid_escrow_address = _bid_escrow;
    }

    /// @notice Set the ZKPController contract address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Optional — if not set, ZKP check is skipped.
    /// @param _zkp_controller Address of the deployed ZKPController contract
    function setZKPControllerAddress(address _zkp_controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_zkp_controller == address(0)) revert ZeroAddressNotAllowed();
        zkp_controller_address = _zkp_controller;
    }

    /// @notice Set the ScoringOracle contract address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Required for winner validation.
    /// @param _scoring_oracle Address of the deployed ScoringOracle contract
    function setScoringOracleAddress(address _scoring_oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_scoring_oracle == address(0)) revert ZeroAddressNotAllowed();
        scoring_oracle_address = _scoring_oracle;
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Post a new tender on-chain
    /// @dev Only callable by GOVT_ROLE. Creates a tender in OPEN status.
    ///      The budget is denominated in wei (ETH). Deadline must be in the future.
    /// @param ipfs_hash IPFS hash of the full tender document
    /// @param budget Total budget in wei (ETH)
    /// @param deadline Unix timestamp when bidding closes
    /// @param milestone_count Number of milestones required for this tender
    /// @return tender_id The ID of the newly created tender
    // @integration FRONTEND — called via ethers.js
    function postTender(
        bytes32 ipfs_hash,
        uint256 budget,
        uint256 deadline,
        uint8 milestone_count
    )
        external
        override
        onlyRole(GOVT_ROLE)
        whenNotPaused
        returns (uint256 tender_id)
    {
        // Validate inputs
        require(ipfs_hash != bytes32(0), "Empty IPFS hash");
        require(budget > 0, "Budget must be > 0");
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(milestone_count > 0, "At least one milestone required");

        // Increment counter (1-indexed IDs)
        _tender_count++;
        tender_id = _tender_count;

        // Store the tender
        mapping_tenders[tender_id] = Tender({
            id: tender_id,
            govt_address: msg.sender,
            status: TenderStatus.OPEN,
            milestone_count: milestone_count,
            ipfs_hash: ipfs_hash,
            budget: budget,
            deadline: deadline,
            created_at: block.timestamp
        });

        emit TenderPosted(tender_id, msg.sender, ipfs_hash, budget, deadline, milestone_count);
    }

    /// @notice Close bidding for a tender — triggers ML scoring pipeline
    /// @dev Only callable by GOVT_ROLE. Tender must be OPEN and past deadline.
    ///      After closing, the backend listens for BiddingClosed and initiates ML scoring.
    /// @param tender_id ID of the tender to close
    // @integration FRONTEND — called via ethers.js
    function closeBidding(uint256 tender_id)
        external
        override
        onlyRole(GOVT_ROLE)
        whenNotPaused
    {
        Tender storage tender = _getTenderStorage(tender_id);

        // Tender must be OPEN
        if (tender.status != TenderStatus.OPEN) {
            revert TenderNotOpen(tender_id, tender.status);
        }

        // Deadline must have passed — cannot close bidding early
        if (block.timestamp < tender.deadline) {
            revert BiddingDeadlineNotPassed(tender_id, tender.deadline);
        }

        // Checks-effects: update status before any external calls
        tender.status = TenderStatus.CLOSED;

        emit BiddingClosed(tender_id, block.timestamp);
    }

    /// @notice Allot winner after ZKP-verified ML scoring
    /// @dev SECURITY: Verifies ZKP proof BEFORE any state changes or fund locking.
    ///      Validates that the proposed winner has the highest score among all bids.
    ///      Only callable by ORACLE_ROLE (ML relay).
    ///      If ZKPController is not set, ZKP verification is skipped (dev mode).
    /// @param tender_id ID of the tender
    /// @param winner Address of the winning contractor
    /// @param zkp_proof Serialized Groth16 proof from snarkjs
    /// @param public_inputs Public inputs for ZKP verification [tender_id, bid_id, declared_score, ...]
    // @integration ML_SERVICE — triggered via backend after ML scoring
    function allotWinner(
        uint256 tender_id,
        address winner,
        bytes calldata zkp_proof,
        uint256[] calldata public_inputs
    )
        external
        override
        onlyRole(ORACLE_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (winner == address(0)) revert ZeroAddressNotAllowed();

        // SECURITY FIX 0: Fail-fast if BidEscrow is not configured
        require(bid_escrow_address != address(0), "BidEscrow not configured");

        Tender storage tender = _getTenderStorage(tender_id);

        // SECURITY FIX 1: Validate tender is CLOSED (bidding ended, scoring complete)
        if (tender.status != TenderStatus.CLOSED) {
            revert TenderNotOpen(tender_id, tender.status);
        }

        // SECURITY FIX 1b: Validate ALL bids have been scored before allotment
        // Prevents partial-scoring attacks where an adversary triggers allotment
        // before all bids are evaluated, potentially excluding the real winner.
        _requireAllBidsScored(tender_id);

        // SECURITY FIX 2: Verify ZKP proof BEFORE any state changes
        // CRITICAL: Uses typed interface call (NOT staticcall) because verifyScoreProof
        // modifies state (nullifier tracking in Groth16Verifier). staticcall would
        // silently fail on any state modification, breaking ZKP verification entirely.
        if (zkp_controller_address != address(0)) {
            require(public_inputs.length >= 3, "Insufficient public inputs");

            uint256 winning_bid_id = public_inputs[1]; // bid_id from public inputs
            uint256 declared_score = public_inputs[2]; // declared_score from public inputs

            // Typed interface call — NOT staticcall. verifyScoreProof writes nullifiers.
            bool zkp_valid = IZKPController(zkp_controller_address).verifyScoreProof(
                tender_id,
                winning_bid_id,
                zkp_proof,
                public_inputs
            );
            if (!zkp_valid) revert InvalidZKProof(winning_bid_id);

            // SECURITY FIX 3: Validate winner has highest score among all bids
            address actual_winner = _validateHighestScore(tender_id, winning_bid_id, declared_score);
            if (actual_winner != winner) {
                revert InvalidWinner(winner, actual_winner);
            }

            // Store the winning bid_id for reference
            mapping_winning_bids[tender_id] = winning_bid_id;
        } else {
            // Dev mode: skip ZKP verification but still validate winner has highest score
            if (scoring_oracle_address != address(0)) {
                address actual_winner = _validateHighestScoreByOracle(tender_id);
                if (actual_winner != winner) {
                    revert InvalidWinner(winner, actual_winner);
                }
            }
        }

        // SECURITY FIX 4: Only NOW update state after all validations pass
        // Follows Checks-Effects-Interactions pattern strictly.
        tender.status = TenderStatus.ALLOTTED;
        mapping_winners[tender_id] = winner;

        // SECURITY FIX 5: Lock winner's stake and mark losers AFTER validation
        // Interactions phase: external calls only after all state changes.
        IBidEscrow(bid_escrow_address).lockWinnerStake(tender_id, winner);
        IBidEscrow(bid_escrow_address).markLosers(tender_id, winner);

        emit WinnerAllotted(tender_id, winner, mapping_winning_bids[tender_id]);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get tender details by ID
    /// @param tender_id ID of the tender
    /// @return The Tender struct
    // @integration FRONTEND — called via ethers.js
    function getTender(uint256 tender_id) external view override returns (Tender memory) {
        _requireTenderExists(tender_id);
        return mapping_tenders[tender_id];
    }

    /// @notice Get the total number of tenders posted
    /// @return The current tender count
    function getTenderCount() external view override returns (uint256) {
        return _tender_count;
    }

    /// @notice Get the winning contractor address for a tender
    /// @param tender_id ID of the tender
    /// @return The winner's address (address(0) if not yet allotted)
    function getWinner(uint256 tender_id) external view returns (address) {
        return mapping_winners[tender_id];
    }

    /// @notice Get the tender status
    /// @param tender_id ID of the tender
    /// @return The current TenderStatus
    function getTenderStatus(uint256 tender_id) external view returns (TenderStatus) {
        _requireTenderExists(tender_id);
        return mapping_tenders[tender_id].status;
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    /// @notice Emergency pause — halts all state-changing operations
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause — resumes normal operations
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /// @dev Returns a storage pointer to a tender, reverting if it doesn't exist
    function _getTenderStorage(uint256 tender_id) internal view returns (Tender storage) {
        _requireTenderExists(tender_id);
        return mapping_tenders[tender_id];
    }

    /// @dev Reverts if tender_id doesn't correspond to an existing tender
    function _requireTenderExists(uint256 tender_id) internal view {
        if (tender_id == 0 || tender_id > _tender_count) {
            revert TenderNotFound(tender_id);
        }
    }

    /// @dev Validates that the specified bid has the highest score for the tender
    /// @param tender_id ID of the tender
    /// @param winning_bid_id ID of the proposed winning bid
    /// @param declared_score The score declared in the ZKP public inputs
    /// @return The address of the actual highest-scoring contractor
    function _validateHighestScore(
        uint256 tender_id,
        uint256 winning_bid_id,
        uint256 declared_score
    ) internal view returns (address) {
        if (bid_escrow_address == address(0)) {
            revert ZeroAddressNotAllowed();
        }

        uint256[] memory bid_ids = IBidEscrow(bid_escrow_address).getBidsByTender(tender_id);
        uint256 highest_score = 0;
        address highest_scorer = address(0);

        // Iterate through all bids to find the highest score
        for (uint256 i = 0; i < bid_ids.length; i++) {
            uint256 bid_id = bid_ids[i];
            Bid memory bid = IBidEscrow(bid_escrow_address).getBid(bid_id);

            // Skip bids that are not in PENDING status
            if (bid.status != BidStatus.PENDING) continue;

            uint256 score = 0;
            if (scoring_oracle_address != address(0)) {
                score = IScoringOracle(scoring_oracle_address).getScore(bid_id);
            }

            if (score > highest_score) {
                highest_score = score;
                highest_scorer = bid.contractor;
            }
        }

        // Validate that the declared score matches the recorded score
        uint256 recorded_score = 0;
        if (scoring_oracle_address != address(0)) {
            recorded_score = IScoringOracle(scoring_oracle_address).getScore(winning_bid_id);
        }

        if (recorded_score != declared_score) {
            revert ScoreMismatch(recorded_score, declared_score);
        }

        // Verify the winning bid belongs to the highest scorer
        Bid memory winning_bid = IBidEscrow(bid_escrow_address).getBid(winning_bid_id);
        if (winning_bid.contractor != highest_scorer) {
            revert InvalidWinner(winning_bid.contractor, highest_scorer);
        }

        return highest_scorer;
    }

    /// @dev Validates that the winner has the highest score using ScoringOracle
    /// @param tender_id ID of the tender
    /// @return The address of the actual highest-scoring contractor
    function _validateHighestScoreByOracle(uint256 tender_id) internal view returns (address) {
        if (bid_escrow_address == address(0) || scoring_oracle_address == address(0)) {
            revert ZeroAddressNotAllowed();
        }

        uint256[] memory bid_ids = IBidEscrow(bid_escrow_address).getBidsByTender(tender_id);
        uint256 highest_score = 0;
        address highest_scorer = address(0);

        // Iterate through all bids to find the highest score
        for (uint256 i = 0; i < bid_ids.length; i++) {
            uint256 bid_id = bid_ids[i];
            Bid memory bid = IBidEscrow(bid_escrow_address).getBid(bid_id);

            // Skip bids that are not in PENDING status
            if (bid.status != BidStatus.PENDING) continue;

            uint256 score = IScoringOracle(scoring_oracle_address).getScore(bid_id);

            if (score > highest_score) {
                highest_score = score;
                highest_scorer = bid.contractor;
            }
        }

        return highest_scorer;
    }

    /// @dev Validates that ALL bids for a tender have been scored
    /// @param tender_id ID of the tender
    function _requireAllBidsScored(uint256 tender_id) internal view {
        if (scoring_oracle_address == address(0)) return; // Skip in dev mode

        uint256[] memory bid_ids = IBidEscrow(bid_escrow_address).getBidsByTender(tender_id);
        uint256 len = bid_ids.length;
        for (uint256 i = 0; i < len;) {
            uint256 bid_id = bid_ids[i];
            Bid memory bid = IBidEscrow(bid_escrow_address).getBid(bid_id);

            // Only check PENDING bids (withdrawn bids don't need scores)
            if (bid.status == BidStatus.PENDING) {
                uint256 score = IScoringOracle(scoring_oracle_address).getScore(bid_id);
                require(score > 0, "Not all bids scored yet");
            }

            unchecked { ++i; }
        }
    }
}

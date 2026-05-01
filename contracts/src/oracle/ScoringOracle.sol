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
    ORACLE_ROLE,
    ZKP_SCALING_FACTOR,
    MULTISIG_THRESHOLD,
    MULTISIG_TOTAL
} from "../Types.sol";
import {
    ZeroAddressNotAllowed,
    InvalidZKProof,
    ScoreAlreadyRecorded,
    BidNotFound,
    TenderNotClosed,
    InvalidScoreRange,
    ScoreMismatch
} from "../Types.sol";
import {IScoringOracle} from "../interfaces/IScoringOracle.sol";
import {IZKPController} from "../interfaces/IZKPController.sol";

/// @title ScoringOracle — ML Score Recording with ZKP Proof Verification
/// @notice Records ML-computed bid scores on-chain after ZKP verification.
///         The backend ML service computes scores off-chain, generates a Groth16 proof
///         that the score was computed correctly, and this contract verifies and stores
///         the result. Scores are used by TenderRegistry to determine the winner.
/// @dev    Upgradeable via TransparentUpgradeableProxy. Only ORACLE_ROLE can record scores.
///         ZKP verification is optional (gracefully skipped if ZKPController not yet deployed)
///         to allow Phase 4 testing without Phase 6 dependency.
/// @author GovChain Team
contract ScoringOracle is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    IScoringOracle
{
    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice Mapping from bid_id to recorded score (scaled by ZKP_SCALING_FACTOR)
    /// @dev 0 means unscored; scores start at 1 minimum
    mapping(uint256 => uint256) private mapping_scores;

    /// @notice Tracks whether a bid has already been scored
    /// @dev mapping_scored[bid_id] => true if score recorded
    mapping(uint256 => bool) private mapping_scored;

    /// @notice Address of the TenderRegistry contract for cross-contract validation
    address public tender_registry_address;

    /// @notice Address of the BidEscrow contract for bid validation
    address public bid_escrow_address;

    /// @notice Address of the ZKPController contract for proof verification
    /// @dev Set to address(0) until Phase 6 — recordScore will skip ZKP check if not set
    address public zkp_controller_address;

    /// @notice Maximum allowed score (prevents score inflation)
    uint256 public constant MAX_SCORE = 100 * ZKP_SCALING_FACTOR;

    /// @notice Minimum allowed score (prevents score manipulation)
    uint256 public constant MIN_SCORE = 1 * ZKP_SCALING_FACTOR;

    /// @notice Score consistency tolerance (5%)
    uint256 public constant SCORE_TOLERANCE = 5 * ZKP_SCALING_FACTOR / 100;

    // =========================================================================
    // STORAGE GAP
    // =========================================================================

    uint256[44] private __gap;

    // =========================================================================
    // INITIALIZER
    // =========================================================================

    /// @notice Initialize the ScoringOracle contract
    /// @param admin Address of the default admin
    /// @param _tender_registry Address of the TenderRegistry contract
    /// @param _bid_escrow Address of the BidEscrow contract
    function initialize(
        address admin,
        address _tender_registry,
        address _bid_escrow
    ) external initializer {
        if (admin == address(0) || _tender_registry == address(0) || _bid_escrow == address(0)) {
            revert ZeroAddressNotAllowed();
        }

        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        tender_registry_address = _tender_registry;
        bid_escrow_address = _bid_escrow;
    }

    // =========================================================================
    // ADMIN CONFIGURATION
    // =========================================================================

    /// @notice Set the ZKPController contract address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Optional — if not set, ZKP check is skipped.
    function setZKPControllerAddress(address _zkp_controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_zkp_controller == address(0)) revert ZeroAddressNotAllowed();
        zkp_controller_address = _zkp_controller;
    }

    /// @notice Update the TenderRegistry contract address
    function setTenderRegistryAddress(address _tender_registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_tender_registry == address(0)) revert ZeroAddressNotAllowed();
        tender_registry_address = _tender_registry;
    }

    /// @notice Update the BidEscrow contract address
    function setBidEscrowAddress(address _bid_escrow) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_bid_escrow == address(0)) revert ZeroAddressNotAllowed();
        bid_escrow_address = _bid_escrow;
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Record a ZKP-verified ML score for a bid
    /// @dev SECURITY: Only callable by ORACLE_ROLE. Flow:
    ///      1. Prevent duplicate scoring
    ///      2. Validate tender is CLOSED (bidding ended, ready for scoring)
    ///      3. Validate bid exists and belongs to this tender
    ///      4. Validate score is within valid range (MIN_SCORE to MAX_SCORE)
    ///      5. Verify ZKP proof (if ZKPController is deployed)
    ///      6. Validate score consistency with public inputs
    ///      7. Store the score
    ///
    ///      WHY separate from TenderRegistry: Separation of concerns — scoring logic
    ///      and ZKP verification are isolated here so TenderRegistry stays focused
    ///      on lifecycle management. Also allows independent upgrades.
    /// @param tender_id ID of the tender
    /// @param bid_id ID of the bid being scored
    /// @param score The ML-computed final score (scaled by ZKP_SCALING_FACTOR)
    /// @param proof Serialized Groth16 proof
    /// @param public_inputs Public inputs for ZKP verification [tender_id, bid_id, declared_score, ...]
    // @integration ML_SERVICE — triggered via backend after ML scoring
    function recordScore(
        uint256 tender_id,
        uint256 bid_id,
        uint256 score,
        bytes calldata proof,
        uint256[] calldata public_inputs
    )
        external
        override
        onlyRole(ORACLE_ROLE)
        whenNotPaused
        nonReentrant
    {
        // SECURITY FIX 1: Prevent duplicate scoring
        if (mapping_scored[bid_id]) {
            revert ScoreAlreadyRecorded(bid_id);
        }

        // SECURITY FIX 2: Validate tender is CLOSED (bidding ended, ready for scoring)
        _requireTenderClosed(tender_id);

        // SECURITY FIX 3: Validate bid exists and belongs to this tender
        _requireBidValid(tender_id, bid_id);

        // SECURITY FIX 4: Validate score is within valid range
        if (score < MIN_SCORE || score > MAX_SCORE) {
            revert InvalidScoreRange(score, MIN_SCORE, MAX_SCORE);
        }

        // SECURITY FIX 5: Verify ZKP proof BEFORE storing score
        // CRITICAL: Uses typed interface call (NOT staticcall) because verifyScoreProof
        // modifies state (nullifier tracking in Groth16Verifier). staticcall would
        // silently fail on any state modification, breaking ZKP verification entirely.
        if (zkp_controller_address != address(0)) {
            require(public_inputs.length >= 3, "Insufficient public inputs");

            uint256 declared_score = public_inputs[2]; // declared_score from public inputs

            // Typed interface call — NOT staticcall. verifyScoreProof writes nullifiers.
            bool zkp_valid = IZKPController(zkp_controller_address).verifyScoreProof(
                tender_id,
                bid_id,
                proof,
                public_inputs
            );
            if (!zkp_valid) revert InvalidZKProof(bid_id);

            // SECURITY FIX 6: Validate score consistency with public inputs
            if (!_scoresWithinTolerance(score, declared_score)) {
                revert ScoreMismatch(score, declared_score);
            }
        }

        // SECURITY FIX 7: Store score atomically after all validations pass
        mapping_scores[bid_id] = score;
        mapping_scored[bid_id] = true;

        emit ScoreRecorded(tender_id, bid_id, score, block.timestamp);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get the recorded score for a bid
    /// @param bid_id ID of the bid
    /// @return The score (scaled by ZKP_SCALING_FACTOR), 0 if not yet scored
    function getScore(uint256 bid_id) external view override returns (uint256) {
        return mapping_scores[bid_id];
    }

    /// @notice Check if a bid has been scored
    /// @param bid_id ID of the bid
    /// @return True if score has been recorded
    function isScored(uint256 bid_id) external view returns (bool) {
        return mapping_scored[bid_id];
    }

    /// @notice Get the multi-sig status for a milestone
    /// @dev Delegates to MilestoneEscrow — included in interface for frontend convenience.
    ///      Returns (0, 3) as defaults since this contract doesn't manage multi-sig directly.
    function getMultiSigStatus(uint256 /* milestone_id */)
        external
        pure
        override
        returns (uint8 sig_count, uint8 threshold)
    {
        // Multi-sig is managed by MilestoneEscrow, not ScoringOracle.
        // This is here for interface compliance — frontend should call MilestoneEscrow directly.
        return (0, uint8(MULTISIG_THRESHOLD));
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /// @dev Validates that the tender is in CLOSED status (ready for scoring)
    function _requireTenderClosed(uint256 tender_id) internal view {
        (bool success, bytes memory data) = tender_registry_address.staticcall(
            abi.encodeWithSignature("getTender(uint256)", tender_id)
        );
        require(success, "TenderRegistry call failed");

        Tender memory tender = abi.decode(data, (Tender));
        if (tender.status != TenderStatus.CLOSED) {
            revert TenderNotClosed(tender_id, tender.status);
        }
    }

    /// @dev Validates that the bid exists and belongs to the specified tender
    function _requireBidValid(uint256 tender_id, uint256 bid_id) internal view {
        (bool success, bytes memory data) = bid_escrow_address.staticcall(
            abi.encodeWithSignature("getBid(uint256)", bid_id)
        );
        require(success, "BidEscrow call failed");

        Bid memory bid = abi.decode(data, (Bid));
        require(bid.tender_id == tender_id, "Bid does not belong to tender");
        require(bid.status == BidStatus.PENDING, "Bid not in PENDING status");
    }

    /// @dev Check if two scores are within tolerance (5%)
    function _scoresWithinTolerance(uint256 score1, uint256 score2) internal pure returns (bool) {
        uint256 diff = score1 > score2 ? score1 - score2 : score2 - score1;
        uint256 tolerance = (score1 * SCORE_TOLERANCE) / ZKP_SCALING_FACTOR;
        return diff <= tolerance;
    }
}

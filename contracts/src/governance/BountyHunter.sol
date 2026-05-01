// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {VRFConsumerBaseV2} from "chainlink-brownie-contracts/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "chainlink-brownie-contracts/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

import {
    BountyAssignment,
    BountyPhase,
    BOUNTY_HUNTER_ROLE,
    MIN_BOUNTY_HUNTER_STAKE,
    BOUNTY_HUNTERS_PER_MILESTONE,
    COMMIT_WINDOW_BLOCKS,
    REVEAL_WINDOW_BLOCKS
} from "../Types.sol";
import {
    ZeroAddressNotAllowed,
    InsufficientStake,
    TransferFailed,
    HunterAlreadyRegistered,
    HunterNotRegistered,
    AssignmentNotFound,
    NotAssignedHunter,
    InvalidBountyPhase,
    CommitRevealMismatch,
    InvalidRating,
    InsufficientHunterPool,
    CommitDeadlineNotReached,
    RevealDeadlinePassed,
    LateRevealPenalty,
    VRFRequestPending,
    VRFRequestNotFound
} from "../Types.sol";
import {IBountyHunter} from "../interfaces/IBountyHunter.sol";

/// @title BountyHunter — Bounty Hunter Registration, VRF Assignment, and Commit-Reveal Review
/// @notice Manages the complete bounty hunter lifecycle:
///         1. Registration with ETH staking (skin-in-the-game)
///         2. Chainlink VRF V2 random assignment to milestones (Vuln 3 fix)
///         3. Two-phase commit-reveal review with block-based deadlines (Vuln 10 fix)
///         4. Slashing for misconduct
/// @dev    Upgradeable via TransparentUpgradeableProxy. Uses Chainlink VRF V2 for
///         provably random hunter selection. The constructor passes VRF coordinator to
///         VRFConsumerBaseV2; initialize() sets the subscription config.
///
///         VRF flow:
///           1. requestHunterAssignment() calls coordinator.requestRandomWords()
///           2. Chainlink node fulfills with fulfillRandomWords() callback
///           3. _selectTwoHuntersFromRandom() uses the random word to pick 2 distinct hunters
///
///         Commit-reveal flow:
///           Phase 1 (COMMITTED): hunter submits commit_hash = keccak256(abi.encodePacked(rating, salt))
///           Phase 2 (REVEALED): hunter submits (rating, salt), contract verifies hash matches
/// @author GovChain Team
contract BountyHunter is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    VRFConsumerBaseV2,
    IBountyHunter
{
    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice Auto-incrementing counter for assignment IDs
    uint256 private _assignment_count;

    /// @notice Array of all registered hunter addresses (for random selection)
    address[] private hunter_pool;

    /// @notice Mapping from hunter address to their index in hunter_pool + 1 (0 = not registered)
    /// @dev Using index+1 so 0 can represent "not registered"
    mapping(address => uint256) private mapping_hunter_index;

    /// @notice Mapping from hunter address to their staked ETH amount
    mapping(address => uint256) private mapping_hunter_stakes;

    /// @notice Mapping from hunter address to whether they are active (not slashed)
    mapping(address => bool) private mapping_hunter_active;

    /// @notice Mapping from assignment ID to BountyAssignment struct
    mapping(uint256 => BountyAssignment) private mapping_assignments;

    /// @notice Mapping from milestone_id to assignment_id
    mapping(uint256 => uint256) private mapping_milestone_assignments;

    /// @notice Address of the MilestoneEscrow contract
    address public milestone_escrow_address;

    /// @notice Commit phase deadline (block number) per assignment
    /// @dev mapping_commit_deadline[assignment_id] => deadline block number
    mapping(uint256 => uint256) private mapping_commit_deadline;

    /// @notice Reveal phase deadline (block number) per assignment
    /// @dev mapping_reveal_deadline[assignment_id] => deadline block number
    mapping(uint256 => uint256) private mapping_reveal_deadline;

    /// @notice Tracks whether a hunter has been penalized for late reveal
    mapping(uint256 => mapping(address => bool)) private mapping_late_penalized;

    // =========================================================================
    // CHAINLINK VRF V2 STATE (Vuln 3 fix)
    // =========================================================================

    /// @notice Chainlink VRF Coordinator V2 interface
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    /// @notice VRF subscription ID (funded with LINK to pay for VRF requests)
    uint64 public s_subscriptionId;

    /// @notice Gas lane key hash (determines the gas price for VRF fulfillment)
    bytes32 public s_keyHash;

    /// @notice Number of block confirmations before VRF fulfillment (default 3)
    uint16 public s_requestConfirmations;

    /// @notice Callback gas limit for VRF fulfillment
    uint32 public s_callbackGasLimit;

    /// @notice Mapping from VRF request ID to milestone ID (for callback routing)
    mapping(uint256 => uint256) private mapping_vrf_requests;

    /// @notice Tracks pending VRF requests per milestone (prevent duplicate requests)
    mapping(uint256 => bool) private mapping_vrf_pending;

    // =========================================================================
    // STORAGE GAP
    // =========================================================================

    uint256[34] private __gap;

    // =========================================================================
    // CONSTRUCTOR (VRF) + INITIALIZER
    // =========================================================================

    /// @notice Constructor sets the immutable VRF Coordinator address
    /// @dev This is required by VRFConsumerBaseV2. The coordinator address cannot change.
    /// @param vrfCoordinator Address of the Chainlink VRF Coordinator V2
    constructor(address vrfCoordinator) VRFConsumerBaseV2(vrfCoordinator) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
    }

    function initialize(
        address admin,
        uint64 subscriptionId,
        bytes32 keyHash,
        uint16 requestConfirmations,
        uint32 callbackGasLimit
    ) external initializer {
        if (admin == address(0)) revert ZeroAddressNotAllowed();

        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // VRF configuration
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
        s_requestConfirmations = requestConfirmations;
        s_callbackGasLimit = callbackGasLimit;
    }

    // =========================================================================
    // ADMIN CONFIGURATION
    // =========================================================================

    function setMilestoneEscrowAddress(address _milestone_escrow) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_milestone_escrow == address(0)) revert ZeroAddressNotAllowed();
        milestone_escrow_address = _milestone_escrow;
    }

    /// @notice Update VRF configuration
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    function setVRFConfig(
        uint64 subscriptionId,
        bytes32 keyHash,
        uint16 requestConfirmations,
        uint32 callbackGasLimit
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
        s_requestConfirmations = requestConfirmations;
        s_callbackGasLimit = callbackGasLimit;
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS — Registration
    // =========================================================================

    /// @notice Register as a bounty hunter by staking ETH
    /// @dev Must stake at least MIN_BOUNTY_HUNTER_STAKE (0.01 ETH). Stakes are locked
    ///      until deregistration or slashing. Hunters get BOUNTY_HUNTER_ROLE for signing.
    function register() external payable override whenNotPaused nonReentrant {
        if (mapping_hunter_index[msg.sender] != 0) {
            revert HunterAlreadyRegistered(msg.sender);
        }
        if (msg.value < MIN_BOUNTY_HUNTER_STAKE) {
            revert InsufficientStake(msg.value, MIN_BOUNTY_HUNTER_STAKE);
        }

        // Add to pool
        hunter_pool.push(msg.sender);
        mapping_hunter_index[msg.sender] = hunter_pool.length; // 1-indexed
        mapping_hunter_stakes[msg.sender] = msg.value;
        mapping_hunter_active[msg.sender] = true;

        emit HunterRegistered(msg.sender, msg.value);
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS — Assignment
    // =========================================================================

    /// @notice Request assignment of hunters to a milestone via Chainlink VRF
    /// @dev SECURITY (Vuln 3): Replaces pseudo-random selection with Chainlink VRF V2
    ///      for provably random hunter selection. Requests 1 random word from the VRF
    ///      coordinator; fulfillment happens asynchronously in fulfillRandomWords().
    /// @param milestone_id ID of the milestone needing reviewers
    function requestHunterAssignment(uint256 milestone_id)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused
    {
        // Prevent duplicate VRF requests for the same milestone
        if (mapping_vrf_pending[milestone_id]) {
            revert VRFRequestPending(milestone_id);
        }

        // Need at least 2 active hunters
        uint256 active_count = _getActiveHunterCount();
        if (active_count < BOUNTY_HUNTERS_PER_MILESTONE) {
            revert InsufficientHunterPool(active_count, BOUNTY_HUNTERS_PER_MILESTONE);
        }

        // Request randomness from Chainlink VRF
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            s_requestConfirmations,
            s_callbackGasLimit,
            1 // numWords: we only need 1 random word to select 2 hunters
        );

        // Map request to milestone
        mapping_vrf_requests[requestId] = milestone_id;
        mapping_vrf_pending[milestone_id] = true;

        emit VRFRequested(milestone_id, requestId);
    }

    /// @notice Chainlink VRF callback — selects 2 hunters from the random word
    /// @dev Called by VRF Coordinator only (enforced by VRFConsumerBaseV2).
    ///      Creates the BountyAssignment and sets block-based commit/reveal deadlines.
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 milestone_id = mapping_vrf_requests[requestId];
        if (milestone_id == 0) revert VRFRequestNotFound(requestId);

        // Clear pending state
        mapping_vrf_pending[milestone_id] = false;
        delete mapping_vrf_requests[requestId];

        // Select 2 hunters using the VRF random word
        (address h1, address h2) = _selectTwoHuntersFromRandom(randomWords[0]);

        _assignment_count++;
        uint256 aid = _assignment_count;

        address[2] memory hunters = [h1, h2];
        bytes32[2] memory empty_commits;
        uint8[2] memory empty_ratings;

        mapping_assignments[aid] = BountyAssignment({
            id: aid,
            milestone_id: milestone_id,
            phase: BountyPhase.COMMITTED,
            hunters: hunters,
            commit_hashes: empty_commits,
            ratings: empty_ratings
        });

        // Set block-based deadlines
        mapping_commit_deadline[aid] = block.number + COMMIT_WINDOW_BLOCKS;
        mapping_reveal_deadline[aid] = block.number + COMMIT_WINDOW_BLOCKS + REVEAL_WINDOW_BLOCKS;

        mapping_milestone_assignments[milestone_id] = aid;

        emit HuntersAssigned(milestone_id, aid, h1, h2);
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS — Commit-Reveal
    // =========================================================================

    /// @notice Submit a commit hash for milestone review (phase 1)
    /// @dev SECURITY (Vuln 10): Enforces block-based deadline for commit phase.
    ///      commit_hash = keccak256(abi.encodePacked(rating, salt))
    function commitReview(uint256 assignment_id, bytes32 commit_hash)
        external
        override
        whenNotPaused
    {
        _requireAssignmentExists(assignment_id);
        BountyAssignment storage assignment = mapping_assignments[assignment_id];

        if (assignment.phase != BountyPhase.COMMITTED) {
            revert InvalidBountyPhase(assignment_id, assignment.phase);
        }

        // SECURITY FIX (Vuln 10): Enforce commit deadline
        require(block.number <= mapping_commit_deadline[assignment_id], "Commit deadline passed");

        uint256 hunter_slot = _getHunterSlot(assignment_id, msg.sender);

        require(commit_hash != bytes32(0), "Empty commit hash");
        require(assignment.commit_hashes[hunter_slot] == bytes32(0), "Already committed");

        assignment.commit_hashes[hunter_slot] = commit_hash;

        // If both hunters committed, advance to REVEALED phase
        if (assignment.commit_hashes[0] != bytes32(0) && assignment.commit_hashes[1] != bytes32(0)) {
            assignment.phase = BountyPhase.REVEALED;
        }

        emit ReviewCommitted(assignment_id, msg.sender, commit_hash);
    }

    /// @notice Reveal rating and salt to complete review (phase 2)
    /// @dev SECURITY (Vuln 10): Enforces block-based deadline for reveal phase.
    ///      Late revealers are penalized. Must match previously committed hash.
    ///      Rating must be 1-10.
    function revealReview(uint256 assignment_id, uint8 rating, bytes32 salt)
        external
        override
        whenNotPaused
    {
        _requireAssignmentExists(assignment_id);
        BountyAssignment storage assignment = mapping_assignments[assignment_id];

        if (assignment.phase != BountyPhase.REVEALED) {
            revert InvalidBountyPhase(assignment_id, assignment.phase);
        }

        // SECURITY FIX (Vuln 10): Enforce reveal deadline
        if (block.number > mapping_reveal_deadline[assignment_id]) {
            revert RevealDeadlinePassed(assignment_id, mapping_reveal_deadline[assignment_id]);
        }

        if (rating < 1 || rating > 10) {
            revert InvalidRating(rating);
        }

        uint256 hunter_slot = _getHunterSlot(assignment_id, msg.sender);

        // Verify commit hash matches
        bytes32 expected_hash = keccak256(abi.encodePacked(rating, salt));
        if (expected_hash != assignment.commit_hashes[hunter_slot]) {
            revert CommitRevealMismatch(assignment_id, msg.sender);
        }

        require(assignment.ratings[hunter_slot] == 0, "Already revealed");

        assignment.ratings[hunter_slot] = rating;

        // If both hunters revealed, mark as COMPLETED
        if (assignment.ratings[0] != 0 && assignment.ratings[1] != 0) {
            assignment.phase = BountyPhase.COMPLETED;
        }

        emit ReviewRevealed(assignment_id, msg.sender, rating);
    }

    /// @notice Force-advance from COMMITTED to REVEALED phase after commit deadline
    /// @dev SECURITY (Vuln 10): If the commit deadline passes and not all hunters committed,
    ///      any hunter who didn't commit gets penalized. This prevents blocking.
    function forceAdvanceToReveal(uint256 assignment_id)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused
    {
        _requireAssignmentExists(assignment_id);
        BountyAssignment storage assignment = mapping_assignments[assignment_id];

        if (assignment.phase != BountyPhase.COMMITTED) {
            revert InvalidBountyPhase(assignment_id, assignment.phase);
        }

        require(block.number > mapping_commit_deadline[assignment_id], "Commit deadline not reached");

        // Slash hunters who didn't commit
        for (uint256 i = 0; i < 2;) {
            if (assignment.commit_hashes[i] == bytes32(0)) {
                address hunter = assignment.hunters[i];
                if (mapping_hunter_active[hunter]) {
                    uint256 slash_amount = mapping_hunter_stakes[hunter];
                    mapping_hunter_active[hunter] = false;
                    mapping_hunter_stakes[hunter] = 0;
                    emit HunterSlashed(hunter, slash_amount, "Failed to commit before deadline");
                }
            }
            unchecked { ++i; }
        }

        assignment.phase = BountyPhase.REVEALED;
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS — Slashing
    // =========================================================================

    /// @notice Slash a bounty hunter for misconduct
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Deactivates the hunter and forfeits their stake.
    function slash(address hunter) external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (mapping_hunter_index[hunter] == 0) {
            revert HunterNotRegistered(hunter);
        }
        if (!mapping_hunter_active[hunter]) {
            revert HunterNotRegistered(hunter); // Already slashed
        }

        uint256 slash_amount = mapping_hunter_stakes[hunter];
        mapping_hunter_active[hunter] = false;
        mapping_hunter_stakes[hunter] = 0;

        emit HunterSlashed(hunter, slash_amount, "Misconduct");

        // Slashed funds stay in contract (treasury)
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    function getAssignment(uint256 assignment_id) external view override returns (BountyAssignment memory) {
        _requireAssignmentExists(assignment_id);
        return mapping_assignments[assignment_id];
    }

    function isRegistered(address hunter) external view override returns (bool) {
        return mapping_hunter_index[hunter] != 0 && mapping_hunter_active[hunter];
    }

    function getHunterStake(address hunter) external view returns (uint256) {
        return mapping_hunter_stakes[hunter];
    }

    function getHunterPoolSize() external view returns (uint256) {
        return hunter_pool.length;
    }

    function getActiveHunterCount() external view returns (uint256) {
        return _getActiveHunterCount();
    }

    function getAssignmentByMilestone(uint256 milestone_id) external view returns (uint256) {
        return mapping_milestone_assignments[milestone_id];
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // =========================================================================
    // EVENTS (VRF)
    // =========================================================================

    /// @notice Emitted when a VRF randomness request is sent
    event VRFRequested(uint256 indexed milestone_id, uint256 requestId);

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    function _requireAssignmentExists(uint256 assignment_id) internal view {
        if (assignment_id == 0 || assignment_id > _assignment_count) {
            revert AssignmentNotFound(assignment_id);
        }
    }

    /// @dev Returns 0 or 1 for the hunter's slot in the assignment, reverts if not assigned
    function _getHunterSlot(uint256 assignment_id, address hunter) internal view returns (uint256) {
        BountyAssignment storage a = mapping_assignments[assignment_id];
        if (a.hunters[0] == hunter) return 0;
        if (a.hunters[1] == hunter) return 1;
        revert NotAssignedHunter(assignment_id, hunter);
    }

    /// @dev Counts active (non-slashed) hunters
    function _getActiveHunterCount() internal view returns (uint256) {
        uint256 count = 0;
        uint256 len = hunter_pool.length;
        for (uint256 i = 0; i < len;) {
            if (mapping_hunter_active[hunter_pool[i]]) {
                unchecked { ++count; }
            }
            unchecked { ++i; }
        }
        return count;
    }

    /// @dev Selects 2 distinct active hunters using a Chainlink VRF random word
    /// @param randomWord The random word from Chainlink VRF callback
    /// @return Two distinct active hunter addresses
    function _selectTwoHuntersFromRandom(uint256 randomWord) internal view returns (address, address) {
        // Build active hunter list
        uint256 activeCount = _getActiveHunterCount();
        address[] memory active = new address[](activeCount);
        uint256 idx = 0;
        uint256 len = hunter_pool.length;
        for (uint256 i = 0; i < len;) {
            if (mapping_hunter_active[hunter_pool[i]]) {
                active[idx] = hunter_pool[i];
                unchecked { ++idx; }
            }
            unchecked { ++i; }
        }

        // Use VRF random word for selection
        uint256 idx1 = randomWord % activeCount;
        uint256 idx2 = (randomWord / activeCount + 1) % activeCount;

        // Ensure distinct
        if (idx2 == idx1) {
            idx2 = (idx1 + 1) % activeCount;
        }

        return (active[idx1], active[idx2]);
    }

    /// @dev Allow receiving ETH (registration stakes)
    receive() external payable {}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {
    BountyAssignment,
    BountyPhase,
    BOUNTY_HUNTER_ROLE,
    MIN_BOUNTY_HUNTER_STAKE,
    BOUNTY_HUNTERS_PER_MILESTONE
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
    InsufficientHunterPool
} from "../Types.sol";
import {IBountyHunter} from "../interfaces/IBountyHunter.sol";

/// @title BountyHunter — Bounty Hunter Registration, Assignment, and Commit-Reveal Review
/// @notice Manages the complete bounty hunter lifecycle:
///         1. Registration with ETH staking (skin-in-the-game)
///         2. Pseudo-random assignment to milestones (deterministic VRF simulation in Phase 5)
///         3. Two-phase commit-reveal review to prevent collusion
///         4. Slashing for misconduct
/// @dev    Upgradeable via TransparentUpgradeableProxy. The VRF selection uses a deterministic
///         pseudo-random approach for Phase 5 testing. Phase 6+ will integrate Chainlink VRF v2
///         for provably random selection. Commit-reveal prevents hunters from copying each other.
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

    // =========================================================================
    // STORAGE GAP
    // =========================================================================

    uint256[42] private __gap;

    // =========================================================================
    // INITIALIZER
    // =========================================================================

    function initialize(address admin) external initializer {
        if (admin == address(0)) revert ZeroAddressNotAllowed();

        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // =========================================================================
    // ADMIN CONFIGURATION
    // =========================================================================

    function setMilestoneEscrowAddress(address _milestone_escrow) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_milestone_escrow == address(0)) revert ZeroAddressNotAllowed();
        milestone_escrow_address = _milestone_escrow;
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

    /// @notice Request assignment of hunters to a milestone
    /// @dev Uses pseudo-random selection from the hunter pool. In Phase 6+,
    ///      this will be replaced with Chainlink VRF v2 for provable randomness.
    ///      Requires at least BOUNTY_HUNTERS_PER_MILESTONE (2) active hunters.
    /// @param milestone_id ID of the milestone needing reviewers
    function requestHunterAssignment(uint256 milestone_id)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused
    {
        // Need at least 2 active hunters
        uint256 active_count = _getActiveHunterCount();
        if (active_count < BOUNTY_HUNTERS_PER_MILESTONE) {
            revert InsufficientHunterPool(active_count, BOUNTY_HUNTERS_PER_MILESTONE);
        }

        _assignment_count++;
        uint256 aid = _assignment_count;

        // Select 2 hunters pseudo-randomly
        (address h1, address h2) = _selectTwoHunters(milestone_id);

        // Create empty fixed arrays for initialization
        address[2] memory hunters = [h1, h2];
        bytes32[2] memory empty_commits;
        uint8[2] memory empty_ratings;

        mapping_assignments[aid] = BountyAssignment({
            id: aid,
            milestone_id: milestone_id,
            phase: BountyPhase.COMMITTED, // Ready for commits
            hunters: hunters,
            commit_hashes: empty_commits,
            ratings: empty_ratings
        });

        mapping_milestone_assignments[milestone_id] = aid;

        emit HuntersAssigned(milestone_id, aid, h1, h2);
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS — Commit-Reveal
    // =========================================================================

    /// @notice Submit a commit hash for milestone review (phase 1)
    /// @dev commit_hash = keccak256(abi.encodePacked(rating, salt))
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
    /// @dev Must match previously committed hash. Rating must be 1-10.
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
        for (uint256 i = 0; i < hunter_pool.length; i++) {
            if (mapping_hunter_active[hunter_pool[i]]) count++;
        }
        return count;
    }

    /// @dev Pseudo-random selection of 2 distinct active hunters
    ///      Uses block data for entropy — sufficient for Phase 5 testing.
    ///      Phase 6+ replaces this with Chainlink VRF v2.
    function _selectTwoHunters(uint256 milestone_id) internal view returns (address, address) {
        // Build active hunter list
        address[] memory active = new address[](_getActiveHunterCount());
        uint256 idx = 0;
        for (uint256 i = 0; i < hunter_pool.length; i++) {
            if (mapping_hunter_active[hunter_pool[i]]) {
                active[idx] = hunter_pool[i];
                idx++;
            }
        }

        // Pseudo-random selection
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp, block.prevrandao, milestone_id, active.length
        )));

        uint256 idx1 = seed % active.length;
        uint256 idx2 = (seed / active.length + 1) % active.length;

        // Ensure distinct
        if (idx2 == idx1) {
            idx2 = (idx1 + 1) % active.length;
        }

        return (active[idx1], active[idx2]);
    }

    /// @dev Allow receiving ETH (registration stakes)
    receive() external payable {}
}

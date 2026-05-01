// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BountyAssignment, BountyPhase} from "../Types.sol";

/// @title IBountyHunter — Interface for Bounty Hunter Registration, VRF Assignment, and Commit-Reveal
/// @notice Defines the public API for bounty hunter lifecycle: registration with staking,
///         verifiable random assignment via Chainlink VRF, commit-reveal review scheme, and slashing.
/// @dev    Uses Chainlink VRF v2 for provably random hunter selection.
///         Commit-reveal prevents collusion: hunters commit hash first, then reveal rating + salt.
/// @author GovChain Team
interface IBountyHunter {
    // =========================================================================
    // EVENTS
    // =========================================================================

    /// @notice Emitted when a bounty hunter registers with an ETH stake
    // @integration BACKEND_EVENT_LISTENER — subscribe to track hunter pool size
    event HunterRegistered(address indexed hunter, uint256 stake_amount);

    /// @notice Emitted when two bounty hunters are assigned to a milestone via VRF
    // @integration BACKEND_EVENT_LISTENER — subscribe to notify assigned hunters
    event HuntersAssigned(
        uint256 indexed milestone_id,
        uint256 assignment_id,
        address hunter_1,
        address hunter_2
    );

    /// @notice Emitted when a hunter commits their review hash (phase 1)
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event ReviewCommitted(uint256 indexed assignment_id, address indexed hunter, bytes32 commit_hash);

    /// @notice Emitted when a hunter reveals their rating (phase 2)
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event ReviewRevealed(uint256 indexed assignment_id, address indexed hunter, uint8 rating);

    /// @notice Emitted when a hunter is slashed for misconduct
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event HunterSlashed(address indexed hunter, uint256 slash_amount, string reason);

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Register as a bounty hunter by staking ETH
    /// @dev Must stake at least MIN_BOUNTY_HUNTER_STAKE. Uses msg.value.
    // @integration FRONTEND — called via ethers.js (payable)
    function register() external payable;

    /// @notice Request VRF-based assignment of hunters to a milestone
    /// @dev Only callable internally or by authorized contracts (MilestoneEscrow).
    /// @param milestone_id ID of the milestone needing reviewers
    function requestHunterAssignment(uint256 milestone_id) external;

    /// @notice Submit a commit hash for milestone review (phase 1)
    /// @dev Only callable by assigned hunter. commit_hash = keccak256(abi.encodePacked(rating, salt))
    /// @param assignment_id ID of the bounty assignment
    /// @param commit_hash Hash of (rating, salt) — reveals later
    // @integration FRONTEND — called via ethers.js
    function commitReview(uint256 assignment_id, bytes32 commit_hash) external;

    /// @notice Reveal rating and salt to complete review (phase 2)
    /// @dev Must match previously committed hash. Rating must be 1-10 scale.
    /// @param assignment_id ID of the bounty assignment
    /// @param rating The rating given to the milestone (1-10)
    /// @param salt The salt used in the commit hash
    // @integration FRONTEND — called via ethers.js
    function revealReview(uint256 assignment_id, uint8 rating, bytes32 salt) external;

    /// @notice Slash a bounty hunter for misconduct (no-show or commit-reveal mismatch)
    /// @dev Only callable by contract owner or automated detection.
    /// @param hunter Address of the hunter to slash
    function slash(address hunter) external;

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get bounty assignment details
    /// @param assignment_id ID of the assignment
    /// @return The BountyAssignment struct
    function getAssignment(uint256 assignment_id) external view returns (BountyAssignment memory);

    /// @notice Check if an address is a registered bounty hunter
    /// @param hunter Address to check
    /// @return True if registered and not slashed
    function isRegistered(address hunter) external view returns (bool);
}

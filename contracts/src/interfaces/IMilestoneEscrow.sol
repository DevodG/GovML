// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Milestone, MilestoneStatus} from "../Types.sol";

/// @title IMilestoneEscrow — Interface for Milestone Proof Submission and Fund Release
/// @notice Defines the public API for milestone proof submission, 3-of-5 multi-sig approval,
///         dead man's switch, and fund release/redistribution.
/// @dev    The most complex contract in GovChain. Handles proof windows, multi-sig,
///         and automatic fund redistribution on contractor non-compliance.
/// @author GovChain Team
interface IMilestoneEscrow {
    // =========================================================================
    // EVENTS
    // =========================================================================

    /// @notice Emitted when a contractor submits proof for a milestone
    /// @dev Backend should notify multi-sig parties to begin review
    // @integration BACKEND_EVENT_LISTENER — subscribe to trigger bounty hunter assignment
    event MilestoneSubmitted(
        uint256 indexed tender_id,
        uint256 indexed milestone_id,
        uint256 milestone_index,
        bytes32 ipfs_hash,
        bytes32 gps_hash,
        uint256 timestamp
    );

    /// @notice Emitted when a multi-sig party signs off on a milestone
    /// @dev Frontend should update signature count display
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event MilestoneSigned(
        uint256 indexed milestone_id,
        address indexed signer,
        uint8 current_sig_count
    );

    /// @notice Emitted when 3-of-5 multi-sig threshold is reached — funds released
    /// @dev Backend should update project status and notify contractor
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event FundsReleased(
        uint256 indexed milestone_id,
        uint256 indexed tender_id,
        uint256 amount,
        address recipient
    );

    /// @notice Emitted when funds are redistributed due to dead man's switch
    /// @dev Backend should notify all parties of fund redistribution
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event FundsRedistributed(
        uint256 indexed milestone_id,
        uint256 indexed tender_id,
        uint256 amount,
        address recovery_address
    );

    /// @notice Emitted when dead man's switch is triggered (no proof within window)
    /// @dev Backend should log this as a compliance failure
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event DeadManTriggered(
        uint256 indexed milestone_id,
        uint256 expired_at,
        address triggered_by
    );

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Submit proof for a milestone deliverable
    /// @dev Only callable by the winning contractor. Milestone must be PENDING.
    /// @param tender_id ID of the parent tender
    /// @param milestone_index Index of the milestone within the tender (0-based)
    /// @param ipfs_hash IPFS hash of the deliverable proof document
    /// @param gps_hash GPS location hash for physical verification
    // @integration FRONTEND — called via ethers.js
    function submitMilestoneProof(
        uint256 tender_id,
        uint256 milestone_index,
        bytes32 ipfs_hash,
        bytes32 gps_hash
    ) external;

    /// @notice Sign off on a milestone as one of the 5 multi-sig parties
    /// @dev Caller must be an authorized signer (Govt, Winner, Auditor, or assigned Bounty Hunter).
    ///      When sig_count reaches MULTISIG_THRESHOLD (3), releaseFunds is triggered internally.
    /// @param milestone_id ID of the milestone to sign
    // @integration FRONTEND — called via ethers.js
    function signMilestone(uint256 milestone_id) external;

    /// @notice Trigger dead man's switch if proof window has expired
    /// @dev Callable by anyone. If no proof submitted within window, funds are redistributed.
    /// @param milestone_id ID of the milestone to check
    // @integration FRONTEND — called via ethers.js (callable by anyone)
    function checkDeadManSwitch(uint256 milestone_id) external;

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get milestone details by ID
    /// @param milestone_id ID of the milestone
    /// @return The Milestone struct
    // @integration FRONTEND — called via ethers.js
    function getMilestone(uint256 milestone_id) external view returns (Milestone memory);

    /// @notice Check if a specific address has signed a milestone
    /// @param milestone_id ID of the milestone
    /// @param signer Address to check
    /// @return True if the address has signed
    function hasSigned(uint256 milestone_id, address signer) external view returns (bool);
}

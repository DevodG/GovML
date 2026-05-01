// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Tender, TenderStatus} from "../Types.sol";

/// @title ITenderRegistry — Interface for Tender Lifecycle Management
/// @notice Defines the public API for posting tenders, closing bidding, and allotting winners.
/// @dev    Implementations must enforce role-based access control via OpenZeppelin AccessControl.
/// @author GovChain Team
interface ITenderRegistry {
    // =========================================================================
    // EVENTS
    // =========================================================================

    /// @notice Emitted when a government admin posts a new tender
    /// @dev Listener should index the tender for frontend display and notify contractors
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event TenderPosted(
        uint256 indexed tender_id,
        address indexed govt_address,
        bytes32 ipfs_hash,
        uint256 budget,
        uint256 deadline,
        uint8 milestone_count
    );

    /// @notice Emitted when bidding is closed for a tender — triggers ML scoring pipeline
    /// @dev Backend must listen for this to initiate the ML scoring + ZKP proof generation flow
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    // @integration ML_SERVICE — triggered after this event fires
    event BiddingClosed(uint256 indexed tender_id, uint256 timestamp);

    /// @notice Emitted when a winner is allotted after ZKP-verified scoring
    /// @dev Frontend should update tender display; backend should set up milestone escrow
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event WinnerAllotted(
        uint256 indexed tender_id,
        address indexed winner,
        uint256 winning_bid_id
    );

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Post a new tender on-chain
    /// @dev Only callable by GOVT_ROLE. Creates a tender in OPEN status.
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
    ) external returns (uint256 tender_id);

    /// @notice Close bidding for a tender — triggers ML scoring pipeline
    /// @dev Only callable by GOVT_ROLE. Tender must be OPEN and past deadline.
    /// @param tender_id ID of the tender to close
    // @integration FRONTEND — called via ethers.js
    function closeBidding(uint256 tender_id) external;

    /// @notice Allot winner after ZKP-verified ML scoring
    /// @dev Verifies ZKP proof before allotting. Only callable by ORACLE_ROLE (ML relay).
    /// @param tender_id ID of the tender
    /// @param winner Address of the winning contractor
    /// @param zkp_proof Serialized Groth16 proof from snarkjs
    /// @param public_inputs Public inputs for ZKP verification
    // @integration ML_SERVICE — triggered via backend after ML scoring
    function allotWinner(
        uint256 tender_id,
        address winner,
        bytes calldata zkp_proof,
        uint256[] calldata public_inputs
    ) external;

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get tender details by ID
    /// @param tender_id ID of the tender
    /// @return The Tender struct
    // @integration FRONTEND — called via ethers.js
    function getTender(uint256 tender_id) external view returns (Tender memory);

    /// @notice Get the winning contractor address for a tender
    /// @param tender_id ID of the tender
    /// @return The winner's address
    function getWinner(uint256 tender_id) external view returns (address);

    /// @notice Get the total number of tenders posted
    /// @return The current tender count
    function getTenderCount() external view returns (uint256);
}

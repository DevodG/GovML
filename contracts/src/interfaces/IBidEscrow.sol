// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Bid, BidStatus} from "../Types.sol";

/// @title IBidEscrow — Interface for Bid Staking and Escrow Management
/// @notice Defines the public API for submitting bids with ETH stakes, withdrawing bids,
///         refunding losers (pull pattern), and locking winner stakes.
/// @dev    Implementations must use ReentrancyGuard and pull-over-push for all fund flows.
/// @author GovChain Team
interface IBidEscrow {
    // =========================================================================
    // EVENTS
    // =========================================================================

    /// @notice Emitted when a contractor submits a bid with an ETH stake
    /// @dev Backend should index bids per tender for the ML scoring pipeline
    // @integration BACKEND_EVENT_LISTENER — index by tender_id and contractor for bid tracking
    event BidSubmitted(
        uint256 indexed tender_id,
        address indexed contractor,
        uint256 bid_id,
        uint256 bid_amount,
        uint256 stake_amount,
        uint256 timestamp
    );

    /// @notice Emitted when a contractor withdraws their bid before the deadline
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event BidWithdrawn(uint256 indexed bid_id, address indexed contractor, uint256 refund_amount);

    /// @notice Emitted when a losing bid's stake is refunded (pull pattern)
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event BidRefunded(uint256 indexed bid_id, address indexed contractor, uint256 refund_amount);

    /// @notice Emitted when the winner's stake is locked in escrow until project completion
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event StakeLocked(uint256 indexed tender_id, address indexed winner, uint256 stake_amount);

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Submit a bid on a tender with ETH stake
    /// @dev Contractor must send ETH as stake via msg.value. Tender must be OPEN.
    /// @param tender_id ID of the tender to bid on
    /// @param amount Proposed project cost in wei
    /// @return bid_id The ID of the newly created bid
    // @integration FRONTEND — called via ethers.js (payable)
    function submitBid(uint256 tender_id, uint256 amount) external payable returns (uint256 bid_id);

    /// @notice Withdraw a bid before the bidding deadline
    /// @dev Refunds the staked ETH immediately. Bid must be PENDING and tender OPEN.
    /// @param bid_id ID of the bid to withdraw
    // @integration FRONTEND — called via ethers.js
    function withdrawBid(uint256 bid_id) external;

    /// @notice Claim refund for a losing bid (pull pattern)
    /// @dev Only callable by the bid's contractor. Bid must have LOST status.
    /// @param bid_id ID of the losing bid
    // @integration FRONTEND — called via ethers.js
    function claimRefund(uint256 bid_id) external;

    /// @notice Lock the winner's stake until project completion
    /// @dev Called internally after allotment. Marks bid as WON.
    /// @param tender_id ID of the allotted tender
    /// @param winner Address of the winning contractor
    function lockWinnerStake(uint256 tender_id, address winner) external;

    /// @notice Mark all non-winning bids as LOST for a tender (enabling refunds)
    /// @dev Called after allotment. Sets all non-winner bids to LOST status.
    /// @param tender_id ID of the allotted tender
    /// @param winner Address of the winning contractor
    function markLosers(uint256 tender_id, address winner) external;

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get bid details by ID
    /// @param bid_id ID of the bid
    /// @return The Bid struct
    // @integration FRONTEND — called via ethers.js
    function getBid(uint256 bid_id) external view returns (Bid memory);

    /// @notice Get all bid IDs for a specific tender
    /// @param tender_id ID of the tender
    /// @return Array of bid IDs
    function getBidsByTender(uint256 tender_id) external view returns (uint256[] memory);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractorProfile} from "../Types.sol";

/// @title IRatingLedger — Interface for Immutable On-chain Contractor Reputation
/// @notice Defines the public API for updating contractor ratings, freezing fraudulent contractors,
///         and querying reputation data. Ratings are immutable records used by the ML service.
/// @dev    Only ScoringOracle can update ratings. Only AnomalyOracle can freeze contractors.
/// @author GovChain Team
interface IRatingLedger {
    // =========================================================================
    // EVENTS
    // =========================================================================

    /// @notice Emitted when a contractor's rating is updated after a project milestone
    /// @dev ML service should listen to recalibrate scoring models
    // @integration BACKEND_EVENT_LISTENER — subscribe for ML model retraining triggers
    event RatingUpdated(
        address indexed contractor,
        uint256 new_rating,
        uint256 completion_delta,
        uint256 timestamp
    );

    /// @notice Emitted when a contractor is frozen due to proven fraud
    /// @dev Backend should block this contractor from all future operations
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event ContractorFrozen(address indexed contractor, uint256 timestamp);

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Update a contractor's rating and completion rate
    /// @dev Only callable by the ScoringOracle contract (ORACLE_ROLE).
    /// @param contractor Address of the contractor
    /// @param new_rating Updated cumulative rating (scaled by ZKP_SCALING_FACTOR)
    /// @param completion_delta Delta to add to completion_rate (scaled by 1e4)
    // @integration ML_SERVICE — triggered via backend after milestone completion
    function updateRating(address contractor, uint256 new_rating, uint256 completion_delta) external;

    /// @notice Freeze a contractor due to proven fraud
    /// @dev Only callable by AnomalyOracle. Permanently blocks contractor from future tenders.
    /// @param contractor Address of the contractor to freeze
    function freezeContractor(address contractor) external;

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get a contractor's full reputation profile
    /// @param contractor Address of the contractor
    /// @return The ContractorProfile struct
    // @integration FRONTEND — called via ethers.js
    // @integration ML_SERVICE — called by ML service for scoring input
    function getRating(address contractor) external view returns (ContractorProfile memory);

    /// @notice Check if a contractor is frozen
    /// @param contractor Address to check
    /// @return True if the contractor is frozen
    function isFrozen(address contractor) external view returns (bool);
}

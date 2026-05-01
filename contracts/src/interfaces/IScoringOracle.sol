// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IScoringOracle — Interface for ML Score Recording with ZKP Verification
/// @notice Defines the public API for recording ML-computed scores with ZKP proof integrity
///         and coordinating multi-sig signature collection.
/// @dev    Only the ORACLE_ROLE (backend relay) can record scores.
///         Score recording requires successful ZKP verification via ZKPController.
/// @author GovChain Team
interface IScoringOracle {
    // =========================================================================
    // EVENTS
    // =========================================================================

    /// @notice Emitted when a score is recorded after ZKP verification
    /// @dev Backend should proceed with winner allotment after all bids are scored
    // @integration BACKEND_EVENT_LISTENER — subscribe to track scoring progress
    event ScoreRecorded(
        uint256 indexed tender_id,
        uint256 indexed bid_id,
        uint256 score,
        uint256 timestamp
    );

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Record a ZKP-verified ML score for a bid
    /// @dev Only callable by ORACLE_ROLE. Verifies proof via ZKPController before storing.
    /// @param tender_id ID of the tender
    /// @param bid_id ID of the bid being scored
    /// @param score The ML-computed final score (scaled by ZKP_SCALING_FACTOR)
    /// @param proof Serialized Groth16 proof
    /// @param public_inputs Public inputs for ZKP verification
    // @integration ML_SERVICE — triggered via backend after ML scoring
    function recordScore(
        uint256 tender_id,
        uint256 bid_id,
        uint256 score,
        bytes calldata proof,
        uint256[] calldata public_inputs
    ) external;

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get the multi-sig status for a milestone
    /// @param milestone_id ID of the milestone
    /// @return sig_count Current number of signatures collected
    /// @return threshold Required number of signatures
    // @integration FRONTEND — called via ethers.js
    function getMultiSigStatus(uint256 milestone_id)
        external
        view
        returns (uint8 sig_count, uint8 threshold);

    /// @notice Get the recorded score for a bid
    /// @param bid_id ID of the bid
    /// @return The score (scaled by ZKP_SCALING_FACTOR), 0 if not yet scored
    function getScore(uint256 bid_id) external view returns (uint256);
}

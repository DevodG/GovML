// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AnomalyFlag} from "../Types.sol";

/// @title IAnomalyOracle — Interface for ML-driven Anomaly Detection and Fund Freezing
/// @notice Defines the public API for flagging anomalies, auto-freezing funds for 72h,
///         and auditor-driven review (release or slash).
/// @dev    Anomaly flags trigger automatic fund freezes. Auditor reviews after 72h window.
/// @author GovChain Team
interface IAnomalyOracle {
    // =========================================================================
    // EVENTS
    // =========================================================================

    /// @notice Emitted when the ML service flags a suspicious transaction
    /// @dev Backend should notify auditor and relevant parties
    // @integration BACKEND_EVENT_LISTENER — subscribe for anomaly alerts
    event AnomalyFlagged(
        uint256 indexed tender_id,
        uint256 indexed bid_id,
        uint256 flag_id,
        bytes32 reason_hash,
        uint256 freeze_until
    );

    /// @notice Emitted when funds are frozen due to an anomaly flag
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event FundsFrozen(uint256 indexed flag_id, uint256 indexed tender_id, uint256 amount);

    /// @notice Emitted when an auditor releases funds after review (false positive)
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event FundsReleasedAfterReview(uint256 indexed flag_id, address indexed auditor);

    /// @notice Emitted when an auditor confirms fraud — contractor slashed
    // @integration BACKEND_EVENT_LISTENER — subscribe to this event
    event ContractorSlashed(
        uint256 indexed flag_id,
        address indexed contractor,
        uint256 slash_amount
    );

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Flag an anomaly detected by the ML service
    /// @dev Only callable by ORACLE_ROLE. Auto-freezes funds for 72 hours.
    /// @param tender_id ID of the flagged tender
    /// @param bid_id ID of the flagged bid
    /// @param reason_hash IPFS hash of the anomaly explanation
    // @integration ML_SERVICE — triggered via backend after anomaly detection
    function flagAnomaly(uint256 tender_id, uint256 bid_id, bytes32 reason_hash) external;

    /// @notice Release funds after auditor review (false positive)
    /// @dev Only callable by AUDITOR_ROLE. Must wait until freeze window expires (72h).
    /// @param flag_id ID of the anomaly flag to resolve
    // @integration FRONTEND — called via ethers.js (auditor only)
    function reviewAndRelease(uint256 flag_id) external;

    /// @notice Slash contractor after auditor confirms fraud
    /// @dev Only callable by AUDITOR_ROLE. Freezes contractor and deducts from locked stake.
    /// @param flag_id ID of the anomaly flag
    // @integration FRONTEND — called via ethers.js (auditor only)
    function reviewAndSlash(uint256 flag_id) external;

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get anomaly flag details by ID
    /// @param flag_id ID of the anomaly flag
    /// @return The AnomalyFlag struct
    function getFlag(uint256 flag_id) external view returns (AnomalyFlag memory);
}

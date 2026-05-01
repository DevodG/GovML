// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {
    AnomalyFlag,
    Bid,
    BidStatus,
    ContractorProfile,
    ORACLE_ROLE,
    AUDITOR_ROLE,
    ANOMALY_FREEZE_DURATION
} from "../Types.sol";
import {
    ZeroAddressNotAllowed,
    FlagNotFound,
    FlagAlreadyResolved,
    FreezeWindowActive,
    ContractorIsFrozen,
    TransferFailed
} from "../Types.sol";
import {IAnomalyOracle} from "../interfaces/IAnomalyOracle.sol";

/// @title AnomalyOracle — ML-driven Anomaly Detection and Fund Freezing
/// @notice Manages the full lifecycle of anomaly flags: flagging by the ML service,
///         automatic 72-hour fund freeze, and auditor-driven resolution (release or slash).
/// @dev    Upgradeable via TransparentUpgradeableProxy. Two-phase resolution model:
///         1. ORACLE_ROLE flags anomaly → auto-freezes for 72h
///         2. AUDITOR_ROLE reviews after freeze → releases (false positive) or slashes (confirmed fraud)
///
///         Slashing freezes the contractor profile in RatingLedger (Phase 5) and
///         can deduct from their locked stake in BidEscrow. Currently, the slash
///         amount is tracked but the actual stake deduction is deferred to integration.
/// @author GovChain Team
contract AnomalyOracle is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    IAnomalyOracle
{
    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice Auto-incrementing counter for flag IDs (starts at 1)
    uint256 private _flag_count;

    /// @notice Mapping from flag ID to AnomalyFlag struct
    mapping(uint256 => AnomalyFlag) private mapping_flags;

    /// @notice Mapping from tender_id to array of flag IDs for that tender
    mapping(uint256 => uint256[]) private mapping_tender_flags;

    /// @notice Tracks frozen contractor addresses
    /// @dev mapping_frozen[contractor] => true if currently frozen
    mapping(address => bool) private mapping_frozen;

    /// @notice Tracks total slashed amount per contractor
    mapping(address => uint256) private mapping_slash_totals;

    /// @notice Address of the BidEscrow contract for bid data lookups
    address public bid_escrow_address;

    /// @notice Address of the TenderRegistry contract
    address public tender_registry_address;

    // =========================================================================
    // STORAGE GAP
    // =========================================================================

    uint256[43] private __gap;

    // =========================================================================
    // INITIALIZER
    // =========================================================================

    /// @notice Initialize the AnomalyOracle contract
    /// @param admin Address of the default admin
    /// @param _bid_escrow Address of the BidEscrow contract
    /// @param _tender_registry Address of the TenderRegistry contract
    function initialize(
        address admin,
        address _bid_escrow,
        address _tender_registry
    ) external initializer {
        if (admin == address(0) || _bid_escrow == address(0) || _tender_registry == address(0)) {
            revert ZeroAddressNotAllowed();
        }

        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        bid_escrow_address = _bid_escrow;
        tender_registry_address = _tender_registry;
    }

    // =========================================================================
    // ADMIN CONFIGURATION
    // =========================================================================

    /// @notice Update the BidEscrow contract address
    function setBidEscrowAddress(address _bid_escrow) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_bid_escrow == address(0)) revert ZeroAddressNotAllowed();
        bid_escrow_address = _bid_escrow;
    }

    /// @notice Update the TenderRegistry contract address
    function setTenderRegistryAddress(address _tender_registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_tender_registry == address(0)) revert ZeroAddressNotAllowed();
        tender_registry_address = _tender_registry;
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Flag an anomaly detected by the ML service
    /// @dev Only callable by ORACLE_ROLE. Creates an AnomalyFlag with a 72-hour freeze window.
    ///      The contractor's bid is implicitly frozen — no fund release or withdrawal
    ///      is possible while an active (unresolved) flag exists.
    ///
    ///      WHY 72h freeze: Gives auditors time to review without rushing. The ML model
    ///      may have false positives, so we don't auto-slash — human review is required.
    /// @param tender_id ID of the flagged tender
    /// @param bid_id ID of the flagged bid
    /// @param reason_hash IPFS hash of the anomaly explanation (full report off-chain)
    // @integration ML_SERVICE — triggered via backend after anomaly detection
    function flagAnomaly(
        uint256 tender_id,
        uint256 bid_id,
        bytes32 reason_hash
    )
        external
        override
        onlyRole(ORACLE_ROLE)
        whenNotPaused
    {
        require(reason_hash != bytes32(0), "Empty reason hash");

        // Validate bid exists via BidEscrow
        _requireBidExists(bid_id);

        _flag_count++;
        uint256 flag_id = _flag_count;

        uint256 freeze_until = block.timestamp + ANOMALY_FREEZE_DURATION;

        mapping_flags[flag_id] = AnomalyFlag({
            id: flag_id,
            tender_id: tender_id,
            bid_id: bid_id,
            reason_hash: reason_hash,
            flagged_by: msg.sender,
            flagged_at: block.timestamp,
            freeze_until: freeze_until,
            resolved: false,
            slashed: false
        });

        mapping_tender_flags[tender_id].push(flag_id);

        emit AnomalyFlagged(tender_id, bid_id, flag_id, reason_hash, freeze_until);

        // Emit FundsFrozen — the bid's stake is implicitly frozen
        // WHY: We don't actually move funds or lock anything new. The presence of
        // an unresolved flag prevents BidEscrow from releasing the contractor's stake.
        // The "amount" is informational — fetched from bid data for event consumers.
        uint256 stake_amount = _getBidStake(bid_id);
        emit FundsFrozen(flag_id, tender_id, stake_amount);
    }

    /// @notice Release funds after auditor review (false positive)
    /// @dev Only callable by AUDITOR_ROLE. The 72h freeze window must have expired.
    ///      Marks the flag as resolved without slashing. The contractor's funds remain intact.
    ///
    ///      WHY wait for freeze: Even if the auditor determines it's a false positive early,
    ///      the mandatory cool-down period prevents hasty resolutions and allows other
    ///      stakeholders to raise concerns.
    /// @param flag_id ID of the anomaly flag to resolve
    // @integration FRONTEND — called via ethers.js (auditor only)
    function reviewAndRelease(uint256 flag_id)
        external
        override
        onlyRole(AUDITOR_ROLE)
        whenNotPaused
    {
        AnomalyFlag storage flag = _getFlagStorage(flag_id);

        // Cannot resolve twice
        if (flag.resolved) {
            revert FlagAlreadyResolved(flag_id);
        }

        // Freeze window must have expired
        if (block.timestamp < flag.freeze_until) {
            revert FreezeWindowActive(flag_id, flag.freeze_until);
        }

        // Mark as resolved (no slashing)
        flag.resolved = true;

        emit FundsReleasedAfterReview(flag_id, msg.sender);
    }

    /// @notice Slash contractor after auditor confirms fraud
    /// @dev Only callable by AUDITOR_ROLE. Freeze window must have expired.
    ///      Marks the contractor as frozen and records the slash amount.
    ///      The actual stake deduction from BidEscrow is handled during integration (Phase 7).
    ///
    ///      WHY separate slash recording: In the current architecture, slashing the
    ///      contractor's BidEscrow stake requires cross-contract state changes that
    ///      are better handled in the integration layer. This contract records the
    ///      intent and freezes the contractor.
    /// @param flag_id ID of the anomaly flag
    // @integration FRONTEND — called via ethers.js (auditor only)
    function reviewAndSlash(uint256 flag_id)
        external
        override
        onlyRole(AUDITOR_ROLE)
        whenNotPaused
    {
        AnomalyFlag storage flag = _getFlagStorage(flag_id);

        if (flag.resolved) {
            revert FlagAlreadyResolved(flag_id);
        }

        if (block.timestamp < flag.freeze_until) {
            revert FreezeWindowActive(flag_id, flag.freeze_until);
        }

        // Get contractor address from bid
        address contractor = _getBidContractor(flag.bid_id);
        uint256 slash_amount = _getBidStake(flag.bid_id);

        // Mark flag as resolved + slashed
        flag.resolved = true;
        flag.slashed = true;

        // Freeze the contractor
        mapping_frozen[contractor] = true;
        mapping_slash_totals[contractor] += slash_amount;

        emit ContractorSlashed(flag_id, contractor, slash_amount);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get anomaly flag details by ID
    /// @param flag_id ID of the anomaly flag
    /// @return The AnomalyFlag struct
    function getFlag(uint256 flag_id) external view override returns (AnomalyFlag memory) {
        _requireFlagExists(flag_id);
        return mapping_flags[flag_id];
    }

    /// @notice Get the total number of anomaly flags
    function getFlagCount() external view returns (uint256) {
        return _flag_count;
    }

    /// @notice Get all flag IDs for a tender
    function getFlagsByTender(uint256 tender_id) external view returns (uint256[] memory) {
        return mapping_tender_flags[tender_id];
    }

    /// @notice Check if a contractor is currently frozen
    function isContractorFrozen(address contractor) external view returns (bool) {
        return mapping_frozen[contractor];
    }

    /// @notice Get the total slashed amount for a contractor
    function getSlashTotal(address contractor) external view returns (uint256) {
        return mapping_slash_totals[contractor];
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    /// @notice Manually unfreeze a contractor (e.g., after appeals process)
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. This is a safety valve for edge cases.
    function unfreezeContractor(address contractor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        mapping_frozen[contractor] = false;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /// @dev Returns a storage pointer to a flag, reverting if it doesn't exist
    function _getFlagStorage(uint256 flag_id) internal view returns (AnomalyFlag storage) {
        _requireFlagExists(flag_id);
        return mapping_flags[flag_id];
    }

    /// @dev Reverts if flag_id doesn't correspond to an existing flag
    function _requireFlagExists(uint256 flag_id) internal view {
        if (flag_id == 0 || flag_id > _flag_count) {
            revert FlagNotFound(flag_id);
        }
    }

    /// @dev Validates that a bid exists by calling BidEscrow
    function _requireBidExists(uint256 bid_id) internal view {
        (bool success,) = bid_escrow_address.staticcall(
            abi.encodeWithSignature("getBid(uint256)", bid_id)
        );
        require(success, "BidEscrow call failed");
    }

    /// @dev Gets the contractor address from a bid via BidEscrow
    function _getBidContractor(uint256 bid_id) internal view returns (address) {
        (bool success, bytes memory data) = bid_escrow_address.staticcall(
            abi.encodeWithSignature("getBid(uint256)", bid_id)
        );
        require(success, "BidEscrow call failed");
        Bid memory bid = abi.decode(data, (Bid));
        return bid.contractor;
    }

    /// @dev Gets the stake amount from a bid via BidEscrow
    function _getBidStake(uint256 bid_id) internal view returns (uint256) {
        (bool success, bytes memory data) = bid_escrow_address.staticcall(
            abi.encodeWithSignature("getBid(uint256)", bid_id)
        );
        require(success, "BidEscrow call failed");
        Bid memory bid = abi.decode(data, (Bid));
        return bid.stake;
    }
}

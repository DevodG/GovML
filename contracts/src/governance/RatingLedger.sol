// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {
    ContractorProfile,
    ORACLE_ROLE,
    AUDITOR_ROLE,
    ZKP_SCALING_FACTOR
} from "../Types.sol";
import {
    ZeroAddressNotAllowed,
    ContractorIsFrozen,
    ProfileNotFound
} from "../Types.sol";
import {IRatingLedger} from "../interfaces/IRatingLedger.sol";

/// @title RatingLedger — Immutable On-chain Contractor Reputation System
/// @notice Stores and manages contractor reputation profiles as immutable on-chain records.
///         Ratings are updated after milestone completions and used by the ML scoring model
///         as input features for bid evaluation.
/// @dev    Upgradeable via TransparentUpgradeableProxy. Write access is strictly partitioned:
///         - ORACLE_ROLE: can update ratings (triggered by backend after milestone completion)
///         - AUDITOR_ROLE: can freeze contractors (triggered by AnomalyOracle on confirmed fraud)
///         - DEFAULT_ADMIN_ROLE: can initialize profiles and manage ZKP verification status
///
///         Rating values are scaled by ZKP_SCALING_FACTOR (1e6) for fixed-point precision.
///         Completion rate is scaled by 1e4 (100.00% = 10000).
/// @author GovChain Team
contract RatingLedger is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    IRatingLedger
{
    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice Mapping from contractor address to their profile
    mapping(address => ContractorProfile) private mapping_profiles;

    /// @notice Tracks whether a profile has been initialized for an address
    mapping(address => bool) private mapping_profile_exists;

    /// @notice Total number of registered contractor profiles
    uint256 private _profile_count;

    // =========================================================================
    // STORAGE GAP
    // =========================================================================

    uint256[46] private __gap;

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
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Initialize a contractor profile (first time)
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Creates the profile with default values.
    ///      Must be called before any rating updates. Can be triggered by backend
    ///      when a contractor first submits a bid.
    function initializeProfile(address contractor) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        if (contractor == address(0)) revert ZeroAddressNotAllowed();
        require(!mapping_profile_exists[contractor], "Profile already exists");

        mapping_profiles[contractor] = ContractorProfile({
            contractor_address: contractor,
            is_frozen: false,
            zkp_verified: false,
            rating: 0,
            completion_rate: 0,
            tender_count: 0
        });

        mapping_profile_exists[contractor] = true;
        _profile_count++;
    }

    /// @notice Update a contractor's rating and completion rate after milestone completion
    /// @dev Only callable by ORACLE_ROLE. Increments tender_count automatically.
    ///      Reverts if contractor is frozen (no further updates allowed post-fraud).
    /// @param contractor Address of the contractor
    /// @param new_rating Updated cumulative rating (scaled by ZKP_SCALING_FACTOR)
    /// @param completion_delta Delta to add to completion_rate (scaled by 1e4)
    function updateRating(
        address contractor,
        uint256 new_rating,
        uint256 completion_delta
    )
        external
        override
        onlyRole(ORACLE_ROLE)
        whenNotPaused
    {
        _requireProfileExists(contractor);

        ContractorProfile storage profile = mapping_profiles[contractor];

        if (profile.is_frozen) {
            revert ContractorIsFrozen(contractor);
        }

        profile.rating = new_rating;
        profile.completion_rate += completion_delta;
        profile.tender_count++;

        emit RatingUpdated(contractor, new_rating, completion_delta, block.timestamp);
    }

    /// @notice Freeze a contractor due to proven fraud
    /// @dev Only callable by AUDITOR_ROLE. Permanently blocks the contractor from
    ///      receiving further rating updates. Does not delete existing data (immutable record).
    function freezeContractor(address contractor)
        external
        override
        onlyRole(AUDITOR_ROLE)
        whenNotPaused
    {
        _requireProfileExists(contractor);

        ContractorProfile storage profile = mapping_profiles[contractor];
        require(!profile.is_frozen, "Already frozen");

        profile.is_frozen = true;

        emit ContractorFrozen(contractor, block.timestamp);
    }

    /// @notice Mark a contractor's KYC as ZKP-verified
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. In Phase 6+, this will be triggered
    ///      automatically by ZKPController after successful KYC proof verification.
    function setZKPVerified(address contractor) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        _requireProfileExists(contractor);
        mapping_profiles[contractor].zkp_verified = true;
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get a contractor's full reputation profile
    function getRating(address contractor) external view override returns (ContractorProfile memory) {
        _requireProfileExists(contractor);
        return mapping_profiles[contractor];
    }

    /// @notice Check if a contractor is frozen
    function isFrozen(address contractor) external view override returns (bool) {
        if (!mapping_profile_exists[contractor]) return false;
        return mapping_profiles[contractor].is_frozen;
    }

    /// @notice Check if a contractor profile exists
    function profileExists(address contractor) external view returns (bool) {
        return mapping_profile_exists[contractor];
    }

    /// @notice Get total number of registered profiles
    function getProfileCount() external view returns (uint256) {
        return _profile_count;
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

    function _requireProfileExists(address contractor) internal view {
        if (!mapping_profile_exists[contractor]) {
            revert ProfileNotFound(contractor);
        }
    }
}

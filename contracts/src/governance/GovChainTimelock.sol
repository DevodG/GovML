// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title GovChainTimelock — Time-Locked Admin Operations (Vuln 9 fix)
/// @notice Wraps OpenZeppelin's TimelockController to enforce mandatory delays on
///         critical admin operations. This prevents single-key admin attacks by requiring
///         all privileged operations to go through a time-delayed queue.
///
/// @dev    SECURITY (Vuln 9 — Admin Centralization):
///         Instead of admin keys executing changes instantly, all critical operations
///         are routed through this timelock with a configurable delay (default: 24h).
///
///         Integration pattern:
///           1. Deploy GovChainTimelock with desired min_delay and proposers/executors
///           2. Set GovChainTimelock as the DEFAULT_ADMIN_ROLE in all contracts
///           3. Admin proposes operations → waits min_delay → executes
///
///         The timelock itself can be governed by:
///           - A multi-sig wallet (e.g., Gnosis Safe) as PROPOSER_ROLE
///           - A separate executor address or the same multi-sig as EXECUTOR_ROLE
///           - The timelock itself as ADMIN for self-governance
///
///         Example critical operations that should go through timelock:
///           - Changing contract addresses (TenderRegistry, BidEscrow, etc.)
///           - Granting/revoking roles
///           - Pausing/unpausing contracts
///           - Modifying milestone parameters
///
/// @author GovChain Team
contract GovChainTimelock is TimelockController {
    /// @notice Deploy the timelock with governance parameters
    /// @param min_delay Minimum delay (in seconds) before queued operations execute.
    ///                  Recommended: 86400 (24 hours) for production, 300 (5 min) for testnet.
    /// @param proposers Array of addresses authorized to propose operations.
    ///                  Typically a multi-sig wallet (e.g., Gnosis Safe).
    /// @param executors Array of addresses authorized to execute ready operations.
    ///                  Can include address(0) for permissionless execution after delay.
    /// @param admin Address of the initial admin. Set to address(0) to make the timelock
    ///              self-governed (no external admin can bypass the delay).
    constructor(
        uint256 min_delay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(min_delay, proposers, executors, admin) {}
}

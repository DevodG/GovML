// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {
    Milestone,
    MilestoneStatus,
    Tender,
    TenderStatus,
    GOVT_ROLE,
    ORACLE_ROLE,
    CONTRACTOR_ROLE,
    AUDITOR_ROLE,
    BOUNTY_HUNTER_ROLE,
    MULTISIG_THRESHOLD,
    MULTISIG_TOTAL,
    DEFAULT_PROOF_WINDOW
} from "../Types.sol";
import {
    TenderNotFound,
    TenderNotOpen,
    ZeroAddressNotAllowed,
    TransferFailed,
    InvalidMilestoneStatus,
    InvalidMilestoneIndex,
    DuplicateSignature,
    UnauthorisedSigner,
    ProofWindowExpired,
    DeadManWindowNotExpired,
    MilestonesAlreadyInitialized,
    TenderNotAllotted,
    ProofWindowNotExpired,
    IncorrectFundingAmount,
    MilestoneNotFound
} from "../Types.sol";
import {IMilestoneEscrow} from "../interfaces/IMilestoneEscrow.sol";

/// @title MilestoneEscrow — Post-Award Fund Accountability via Multi-Sig and Dead Man's Switch
/// @notice Manages the full lifecycle of tender milestones after winner allotment:
///         milestone initialization with budget escrow, contractor proof submission,
///         3-of-5 multi-sig approval for fund release, and automatic fund redistribution
///         if the contractor fails to deliver within the proof window.
/// @dev    Upgradeable via TransparentUpgradeableProxy. The most complex contract in GovChain.
///         Uses AccessControl for role-based permissions, Pausable for emergency stops,
///         and ReentrancyGuard on all ETH-moving functions. This contract holds all
///         milestone-related ETH until released or redistributed.
///
///         Multi-sig parties (5 per milestone):
///           1. Government admin (GOVT_ROLE)
///           2. Winning contractor
///           3. Auditor (AUDITOR_ROLE)
///           4-5. Two bounty hunters (assigned via addAuthorizedSigner in Phase 5)
///
///         Key invariant: total ETH held == sum of all PENDING + SUBMITTED milestone fund_amounts.
/// @author GovChain Team
contract MilestoneEscrow is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    IMilestoneEscrow
{
    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice Auto-incrementing counter for milestone IDs (starts at 1)
    uint256 private _milestone_count;

    /// @notice Mapping from milestone ID to Milestone struct
    /// @dev mapping_milestones[milestone_id] => Milestone
    mapping(uint256 => Milestone) private mapping_milestones;

    /// @notice Mapping from tender_id to array of milestone IDs
    /// @dev Used to look up all milestones for a tender
    mapping(uint256 => uint256[]) private mapping_tender_milestones;

    /// @notice Tracks whether milestones have been initialized for a tender
    /// @dev mapping_initialized[tender_id] => true if milestones already created
    mapping(uint256 => bool) private mapping_initialized;

    /// @notice Tracks which addresses have signed a specific milestone
    /// @dev mapping_has_signed[milestone_id][signer] => true if already signed
    mapping(uint256 => mapping(address => bool)) private mapping_has_signed;

    /// @notice Tracks authorized signers per milestone (for flexible multi-sig)
    /// @dev mapping_authorized_signers[milestone_id][signer] => true if authorized
    ///      This allows Phase 5 BountyHunter to register VRF-assigned hunters
    mapping(uint256 => mapping(address => bool)) private mapping_authorized_signers;

    /// @notice Address of the TenderRegistry contract for cross-contract calls
    address public tender_registry_address;

    /// @notice Pending withdrawals for fund recipients (pull pattern for release)
    /// @dev mapping_pending_withdrawals[address] => amount available to withdraw
    mapping(address => uint256) private mapping_pending_withdrawals;

    // =========================================================================
    // STORAGE GAP — Reserve slots for future upgrades (ERC-7201 pattern)
    // =========================================================================

    /// @dev Reserved storage gap for future variable additions without breaking layout
    uint256[42] private __gap;

    // =========================================================================
    // INITIALIZER (replaces constructor for upgradeable contracts)
    // =========================================================================

    /// @notice Initialize the MilestoneEscrow contract
    /// @dev Called once via proxy during deployment. Sets up roles and cross-contract refs.
    /// @param admin Address of the default admin (can grant/revoke all roles)
    /// @param _tender_registry Address of the deployed TenderRegistry contract
    function initialize(address admin, address _tender_registry) external initializer {
        if (admin == address(0) || _tender_registry == address(0)) revert ZeroAddressNotAllowed();

        __AccessControl_init();
        __Pausable_init();

        // Admin can manage all roles and configure the contract
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        tender_registry_address = _tender_registry;
    }

    // =========================================================================
    // ADMIN CONFIGURATION
    // =========================================================================

    /// @notice Update the TenderRegistry contract address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    /// @param _tender_registry New TenderRegistry address
    function setTenderRegistryAddress(address _tender_registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_tender_registry == address(0)) revert ZeroAddressNotAllowed();
        tender_registry_address = _tender_registry;
    }

    /// @notice Add an authorized signer for a specific milestone
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Used to register bounty hunters (Phase 5)
    ///      or any additional authorized signers for the multi-sig.
    /// @param milestone_id ID of the milestone
    /// @param signer Address to authorize
    function addAuthorizedSigner(uint256 milestone_id, address signer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (signer == address(0)) revert ZeroAddressNotAllowed();
        _requireMilestoneExists(milestone_id);
        mapping_authorized_signers[milestone_id][signer] = true;
    }

    /// @notice Remove an authorized signer for a specific milestone
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    /// @param milestone_id ID of the milestone
    /// @param signer Address to de-authorize
    function removeAuthorizedSigner(uint256 milestone_id, address signer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _requireMilestoneExists(milestone_id);
        mapping_authorized_signers[milestone_id][signer] = false;
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Initialize milestones for an allotted tender and escrow the budget
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Tender must be ALLOTTED.
    ///      The caller must send ETH equal to the tender budget via msg.value.
    ///      Budget is split equally across milestones; remainder goes to the last one.
    ///      Each milestone gets a proof_window of DEFAULT_PROOF_WINDOW (30 days) from now.
    ///
    ///      WHY payable: The spec says "Winner's funds locked in milestone escrow" — the
    ///      government deposits the full tender budget at milestone initialization time.
    ///      This ensures funds are cryptographically locked before any work begins.
    /// @param tender_id ID of the allotted tender
    // @integration FRONTEND — called via ethers.js (payable, sends tender.budget)
    function initializeMilestones(uint256 tender_id)
        external
        payable
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused
        nonReentrant
    {
        // Prevent double initialization
        if (mapping_initialized[tender_id]) {
            revert MilestonesAlreadyInitialized(tender_id);
        }

        // Fetch tender data from TenderRegistry
        Tender memory tender = _getTenderFromRegistry(tender_id);

        // Tender must be ALLOTTED (winner selected)
        if (tender.status != TenderStatus.ALLOTTED) {
            revert TenderNotAllotted(tender_id, tender.status);
        }

        // Validate funding amount matches tender budget
        if (msg.value != tender.budget) {
            revert IncorrectFundingAmount(msg.value, tender.budget);
        }

        // WHY: Equal split keeps initialization simple. Any remainder from integer
        // division goes to the last milestone to ensure no dust is lost.
        uint256 amount_per_milestone = tender.budget / tender.milestone_count;
        uint256 remainder = tender.budget - (amount_per_milestone * tender.milestone_count);

        // Mark as initialized before creating milestones (checks-effects)
        mapping_initialized[tender_id] = true;

        // Get winner address for auto-authorizing as signer
        address winner = _getWinnerFromRegistry(tender_id);

        // Create milestones
        for (uint256 i = 0; i < tender.milestone_count; i++) {
            _milestone_count++;
            uint256 milestone_id = _milestone_count;

            // Last milestone gets any remainder from integer division
            uint256 fund_amount = amount_per_milestone;
            if (i == tender.milestone_count - 1) {
                fund_amount += remainder;
            }

            mapping_milestones[milestone_id] = Milestone({
                id: milestone_id,
                tender_id: tender_id,
                index: uint8(i),
                status: MilestoneStatus.PENDING,
                sig_count: 0,
                ipfs_hash: bytes32(0),
                gps_hash: bytes32(0),
                submit_time: 0,
                proof_window: block.timestamp + DEFAULT_PROOF_WINDOW,
                fund_amount: fund_amount
            });

            mapping_tender_milestones[tender_id].push(milestone_id);

            // WHY: Auto-authorize the govt admin and winner as signers for every milestone.
            // Auditor and bounty hunters are added separately (auditor via admin, hunters via Phase 5).
            mapping_authorized_signers[milestone_id][tender.govt_address] = true;
            mapping_authorized_signers[milestone_id][winner] = true;
        }
    }

    /// @notice Submit proof for a milestone deliverable
    /// @dev Only callable by the winning contractor for this tender. Milestone must be PENDING.
    ///      Sets IPFS hash and GPS hash, transitions to SUBMITTED status, and resets the
    ///      proof window to give signers DEFAULT_PROOF_WINDOW to review and approve.
    ///
    ///      WHY reset proof_window: After submission, the multi-sig parties need time to
    ///      review the deliverable. The new window starts from submission time.
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
    )
        external
        override
        whenNotPaused
        nonReentrant
    {
        // Validate caller is the winning contractor for this tender
        address winner = _getWinnerFromRegistry(tender_id);
        require(msg.sender == winner, "Not winning contractor");

        // Look up milestone by tender_id and index
        uint256 milestone_id = _getMilestoneIdByIndex(tender_id, milestone_index);
        Milestone storage milestone = mapping_milestones[milestone_id];

        // Milestone must be PENDING (not yet submitted or already approved)
        if (milestone.status != MilestoneStatus.PENDING) {
            revert InvalidMilestoneStatus(milestone_id, milestone.status);
        }

        // Proof window must not have expired (if expired, dead man's switch path)
        if (block.timestamp > milestone.proof_window) {
            revert ProofWindowExpired(milestone_id, milestone.proof_window);
        }

        // Validate non-empty hashes
        require(ipfs_hash != bytes32(0), "Empty IPFS hash");
        require(gps_hash != bytes32(0), "Empty GPS hash");

        // Checks-effects: update state before any potential external interactions
        milestone.ipfs_hash = ipfs_hash;
        milestone.gps_hash = gps_hash;
        milestone.submit_time = block.timestamp;
        milestone.status = MilestoneStatus.SUBMITTED;

        // Reset proof window — signers get DEFAULT_PROOF_WINDOW from submission to review
        milestone.proof_window = block.timestamp + DEFAULT_PROOF_WINDOW;

        emit MilestoneSubmitted(
            tender_id,
            milestone_id,
            milestone_index,
            ipfs_hash,
            gps_hash,
            block.timestamp
        );
    }

    /// @notice Sign off on a milestone as one of the multi-sig parties
    /// @dev Caller must be an authorized signer for this milestone. Each signer can only
    ///      sign once. When sig_count reaches MULTISIG_THRESHOLD (3), _releaseFunds is
    ///      triggered internally to send funds to the winning contractor.
    ///
    ///      Authorized signers: Govt admin, Winning contractor, Auditor, 2 Bounty hunters.
    ///      The first three are auto-authorized at initialization; bounty hunters are added
    ///      by admin (or BountyHunter contract in Phase 5).
    /// @param milestone_id ID of the milestone to sign
    // @integration FRONTEND — called via ethers.js
    function signMilestone(uint256 milestone_id)
        external
        override
        whenNotPaused
        nonReentrant
    {
        _requireMilestoneExists(milestone_id);
        Milestone storage milestone = mapping_milestones[milestone_id];

        // Milestone must be SUBMITTED (proof received, awaiting approval)
        if (milestone.status != MilestoneStatus.SUBMITTED) {
            revert InvalidMilestoneStatus(milestone_id, milestone.status);
        }

        // Caller must be an authorized signer for this milestone
        if (!mapping_authorized_signers[milestone_id][msg.sender]) {
            revert UnauthorisedSigner(milestone_id, msg.sender);
        }

        // Each signer can only sign once
        if (mapping_has_signed[milestone_id][msg.sender]) {
            revert DuplicateSignature(milestone_id, msg.sender);
        }

        // Checks-effects: update state before potential fund release
        mapping_has_signed[milestone_id][msg.sender] = true;
        milestone.sig_count++;

        emit MilestoneSigned(milestone_id, msg.sender, milestone.sig_count);

        // WHY: When threshold is reached, release funds immediately. This ensures
        // funds are available as soon as consensus is achieved, without requiring
        // a separate transaction. The _releaseFunds function uses CEI pattern internally.
        if (milestone.sig_count >= MULTISIG_THRESHOLD) {
            _releaseFunds(milestone_id);
        }
    }

    /// @notice Trigger dead man's switch if proof window has expired without proof
    /// @dev Callable by ANYONE (public good — incentivizes monitoring). If the milestone
    ///      is still PENDING and the proof window has passed, funds are redistributed to
    ///      the government address as the recovery recipient.
    ///
    ///      WHY callable by anyone: This is a permissionless safety mechanism. Any
    ///      watchdog, auditor, or concerned citizen can trigger it. The contract enforces
    ///      the time check — there's no trust assumption on the caller.
    /// @param milestone_id ID of the milestone to check
    // @integration FRONTEND — called via ethers.js (callable by anyone)
    function checkDeadManSwitch(uint256 milestone_id)
        external
        override
        whenNotPaused
        nonReentrant
    {
        _requireMilestoneExists(milestone_id);
        Milestone storage milestone = mapping_milestones[milestone_id];

        // Dead man's switch only applies to PENDING milestones (no proof submitted)
        if (milestone.status != MilestoneStatus.PENDING) {
            revert InvalidMilestoneStatus(milestone_id, milestone.status);
        }

        // Proof window must have expired
        if (block.timestamp <= milestone.proof_window) {
            revert ProofWindowNotExpired(milestone_id, milestone.proof_window);
        }

        // Trigger redistribution
        emit DeadManTriggered(milestone_id, milestone.proof_window, msg.sender);

        _redistributeFunds(milestone_id);
    }

    /// @notice Withdraw pending funds (pull pattern for released milestone payments)
    /// @dev Contractors call this to collect approved milestone payments. Uses pull-over-push
    ///      to prevent reentrancy and griefing attacks on the release flow.
    // @integration FRONTEND — called via ethers.js
    function withdrawFunds() external whenNotPaused nonReentrant {
        uint256 amount = mapping_pending_withdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");

        // Checks-effects: zero out before transfer
        mapping_pending_withdrawals[msg.sender] = 0;

        // Interactions: transfer ETH
        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed(msg.sender, amount);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get milestone details by ID
    /// @param milestone_id ID of the milestone
    /// @return The Milestone struct
    // @integration FRONTEND — called via ethers.js
    function getMilestone(uint256 milestone_id) external view override returns (Milestone memory) {
        _requireMilestoneExists(milestone_id);
        return mapping_milestones[milestone_id];
    }

    /// @notice Check if a specific address has signed a milestone
    /// @param milestone_id ID of the milestone
    /// @param signer Address to check
    /// @return True if the address has signed
    function hasSigned(uint256 milestone_id, address signer) external view override returns (bool) {
        return mapping_has_signed[milestone_id][signer];
    }

    /// @notice Get all milestone IDs for a specific tender
    /// @param tender_id ID of the tender
    /// @return Array of milestone IDs
    function getMilestonesByTender(uint256 tender_id) external view returns (uint256[] memory) {
        return mapping_tender_milestones[tender_id];
    }

    /// @notice Get the total number of milestones created across all tenders
    /// @return The current milestone count
    function getMilestoneCount() external view returns (uint256) {
        return _milestone_count;
    }

    /// @notice Check whether milestones have been initialized for a tender
    /// @param tender_id ID of the tender
    /// @return True if milestones are initialized
    function isInitialized(uint256 tender_id) external view returns (bool) {
        return mapping_initialized[tender_id];
    }

    /// @notice Check if an address is an authorized signer for a milestone
    /// @param milestone_id ID of the milestone
    /// @param signer Address to check
    /// @return True if the address is authorized to sign
    function isAuthorizedSigner(uint256 milestone_id, address signer) external view returns (bool) {
        return mapping_authorized_signers[milestone_id][signer];
    }

    /// @notice Get pending withdrawal balance for an address
    /// @param account Address to check
    /// @return Amount available for withdrawal in wei
    function getPendingWithdrawal(address account) external view returns (uint256) {
        return mapping_pending_withdrawals[account];
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    /// @notice Emergency pause — halts all state-changing operations
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause — resumes normal operations
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // =========================================================================
    // INTERNAL FUNCTIONS
    // =========================================================================

    /// @dev Release milestone funds to the winning contractor via pull pattern.
    ///      Called internally when 3-of-5 multi-sig threshold is reached.
    ///      Credits the contractor's pending withdrawal balance instead of pushing
    ///      funds directly, ensuring the signing transaction cannot be griefed
    ///      by a contractor with a reverting receive function.
    /// @param milestone_id ID of the approved milestone
    function _releaseFunds(uint256 milestone_id) internal {
        Milestone storage milestone = mapping_milestones[milestone_id];

        uint256 amount = milestone.fund_amount;
        address winner = _getWinnerFromRegistry(milestone.tender_id);

        // Checks-effects: update status and zero out fund_amount before crediting
        milestone.status = MilestoneStatus.APPROVED;
        milestone.fund_amount = 0;

        // Credit to pull-pattern withdrawal balance
        mapping_pending_withdrawals[winner] += amount;

        emit FundsReleased(milestone_id, milestone.tender_id, amount, winner);
    }

    /// @dev Redistribute milestone funds to the government address.
    ///      Called internally when the dead man's switch triggers (proof window expired
    ///      without contractor submission). Funds go to the govt address that posted
    ///      the original tender as a recovery mechanism.
    /// @param milestone_id ID of the expired milestone
    function _redistributeFunds(uint256 milestone_id) internal {
        Milestone storage milestone = mapping_milestones[milestone_id];

        uint256 amount = milestone.fund_amount;

        // Fetch the government address (recovery recipient) from TenderRegistry
        Tender memory tender = _getTenderFromRegistry(milestone.tender_id);
        address recovery_address = tender.govt_address;

        // Checks-effects: update status and zero out fund_amount before crediting
        milestone.status = MilestoneStatus.REDISTRIBUTED;
        milestone.fund_amount = 0;

        // Credit to pull-pattern withdrawal balance
        mapping_pending_withdrawals[recovery_address] += amount;

        emit FundsRedistributed(milestone_id, milestone.tender_id, amount, recovery_address);
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /// @dev Fetches tender data from TenderRegistry via cross-contract staticcall
    function _getTenderFromRegistry(uint256 tender_id) internal view returns (Tender memory) {
        (bool success, bytes memory data) = tender_registry_address.staticcall(
            abi.encodeWithSignature("getTender(uint256)", tender_id)
        );
        require(success, "TenderRegistry call failed");
        return abi.decode(data, (Tender));
    }

    /// @dev Fetches the winning contractor address from TenderRegistry
    function _getWinnerFromRegistry(uint256 tender_id) internal view returns (address) {
        (bool success, bytes memory data) = tender_registry_address.staticcall(
            abi.encodeWithSignature("getWinner(uint256)", tender_id)
        );
        require(success, "TenderRegistry getWinner failed");
        address winner = abi.decode(data, (address));
        require(winner != address(0), "No winner allotted");
        return winner;
    }

    /// @dev Look up milestone ID by tender_id and milestone index
    ///      Reverts if the index is out of bounds for this tender.
    function _getMilestoneIdByIndex(uint256 tender_id, uint256 milestone_index) internal view returns (uint256) {
        uint256[] storage milestone_ids = mapping_tender_milestones[tender_id];
        if (milestone_index >= milestone_ids.length) {
            revert InvalidMilestoneIndex(tender_id, milestone_index, milestone_ids.length);
        }
        return milestone_ids[milestone_index];
    }

    /// @dev Reverts if milestone_id doesn't correspond to an existing milestone
    function _requireMilestoneExists(uint256 milestone_id) internal view {
        if (milestone_id == 0 || milestone_id > _milestone_count) {
            revert MilestoneNotFound(milestone_id);
        }
    }

    /// @dev Allow the contract to receive ETH (for milestone escrow funding)
    receive() external payable {}
}

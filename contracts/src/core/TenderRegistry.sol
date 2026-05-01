// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {
    Tender,
    TenderStatus,
    BidStatus,
    GOVT_ROLE,
    ORACLE_ROLE,
    CONTRACTOR_ROLE
} from "../Types.sol";
import {
    TenderNotFound,
    TenderNotOpen,
    BiddingDeadlinePassed,
    BiddingDeadlineNotPassed,
    ZeroAddressNotAllowed,
    InvalidZKProof
} from "../Types.sol";
import {ITenderRegistry} from "../interfaces/ITenderRegistry.sol";

/// @title TenderRegistry — Government Tender Lifecycle Management
/// @notice Manages the full lifecycle of government tenders: posting, bid closure,
///         and ZKP-verified winner allotment. This is the entry point for the GovChain
///         pre-award procurement flow.
/// @dev    Upgradeable via TransparentUpgradeableProxy. Uses AccessControl for role-based
///         permissions, Pausable for emergency stops, and ReentrancyGuard for safety.
///         This contract does NOT hold funds — BidEscrow handles all ETH.
/// @author GovChain Team
contract TenderRegistry is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    ITenderRegistry
{
    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice Auto-incrementing counter for tender IDs (starts at 1)
    uint256 private _tender_count;

    /// @notice Mapping from tender ID to Tender struct
    /// @dev mapping_tenders[tender_id] => Tender
    mapping(uint256 => Tender) private mapping_tenders;

    /// @notice Address of the BidEscrow contract for cross-contract calls
    address public bid_escrow_address;

    /// @notice Address of the ZKPController contract for proof verification
    /// @dev Set to address(0) until Phase 6 — allotWinner will skip ZKP check if not set
    address public zkp_controller_address;

    /// @notice Mapping from tender_id to the winning bid_id (set after allotment)
    mapping(uint256 => uint256) public mapping_winning_bids;

    /// @notice Mapping from tender_id to the winning contractor address
    mapping(uint256 => address) public mapping_winners;

    // =========================================================================
    // STORAGE GAP — Reserve slots for future upgrades (ERC-7201 pattern)
    // =========================================================================

    /// @dev Reserved storage gap for future variable additions without breaking layout
    uint256[44] private __gap;

    // =========================================================================
    // INITIALIZER (replaces constructor for upgradeable contracts)
    // =========================================================================

    /// @notice Initialize the TenderRegistry contract
    /// @dev Called once via proxy during deployment. Sets up roles and admin.
    /// @param admin Address of the default admin (can grant/revoke all roles)
    /// @param govt Address of the initial government admin
    function initialize(address admin, address govt) external initializer {
        if (admin == address(0) || govt == address(0)) revert ZeroAddressNotAllowed();

        __AccessControl_init();
        __Pausable_init();

        // Admin can manage all roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // Government can post tenders and close bidding
        _grantRole(GOVT_ROLE, govt);
    }

    // =========================================================================
    // ADMIN CONFIGURATION
    // =========================================================================

    /// @notice Set the BidEscrow contract address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Must be set before allotment works.
    /// @param _bid_escrow Address of the deployed BidEscrow contract
    function setBidEscrowAddress(address _bid_escrow) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_bid_escrow == address(0)) revert ZeroAddressNotAllowed();
        bid_escrow_address = _bid_escrow;
    }

    /// @notice Set the ZKPController contract address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE. Optional — if not set, ZKP check is skipped.
    /// @param _zkp_controller Address of the deployed ZKPController contract
    function setZKPControllerAddress(address _zkp_controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_zkp_controller == address(0)) revert ZeroAddressNotAllowed();
        zkp_controller_address = _zkp_controller;
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Post a new tender on-chain
    /// @dev Only callable by GOVT_ROLE. Creates a tender in OPEN status.
    ///      The budget is denominated in wei (ETH). Deadline must be in the future.
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
    )
        external
        override
        onlyRole(GOVT_ROLE)
        whenNotPaused
        returns (uint256 tender_id)
    {
        // Validate inputs
        require(ipfs_hash != bytes32(0), "Empty IPFS hash");
        require(budget > 0, "Budget must be > 0");
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(milestone_count > 0, "At least one milestone required");

        // Increment counter (1-indexed IDs)
        _tender_count++;
        tender_id = _tender_count;

        // Store the tender
        mapping_tenders[tender_id] = Tender({
            id: tender_id,
            govt_address: msg.sender,
            status: TenderStatus.OPEN,
            milestone_count: milestone_count,
            ipfs_hash: ipfs_hash,
            budget: budget,
            deadline: deadline,
            created_at: block.timestamp
        });

        emit TenderPosted(tender_id, msg.sender, ipfs_hash, budget, deadline, milestone_count);
    }

    /// @notice Close bidding for a tender — triggers ML scoring pipeline
    /// @dev Only callable by GOVT_ROLE. Tender must be OPEN and past deadline.
    ///      After closing, the backend listens for BiddingClosed and initiates ML scoring.
    /// @param tender_id ID of the tender to close
    // @integration FRONTEND — called via ethers.js
    function closeBidding(uint256 tender_id)
        external
        override
        onlyRole(GOVT_ROLE)
        whenNotPaused
    {
        Tender storage tender = _getTenderStorage(tender_id);

        // Tender must be OPEN
        if (tender.status != TenderStatus.OPEN) {
            revert TenderNotOpen(tender_id, tender.status);
        }

        // Deadline must have passed — cannot close bidding early
        if (block.timestamp < tender.deadline) {
            revert BiddingDeadlineNotPassed(tender_id, tender.deadline);
        }

        // Checks-effects: update status before any external calls
        tender.status = TenderStatus.CLOSED;

        emit BiddingClosed(tender_id, block.timestamp);
    }

    /// @notice Allot winner after ZKP-verified ML scoring
    /// @dev Verifies ZKP proof before allotting. Only callable by ORACLE_ROLE (ML relay).
    ///      If ZKPController is not set, ZKP verification is skipped (dev mode).
    ///      After allotment, BidEscrow should be called to lock winner stake and mark losers.
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
    )
        external
        override
        onlyRole(ORACLE_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (winner == address(0)) revert ZeroAddressNotAllowed();

        Tender storage tender = _getTenderStorage(tender_id);

        // Tender must be CLOSED (bidding ended, scoring complete)
        if (tender.status != TenderStatus.CLOSED) {
            revert TenderNotOpen(tender_id, tender.status);
        }

        // WHY: ZKP verification ensures the ML scoring was done correctly
        // and the declared winner actually had the highest legitimate score.
        // If ZKPController is not deployed yet (Phase 1-5), we skip verification.
        if (zkp_controller_address != address(0)) {
            // Call ZKPController to verify the score integrity proof
            // The proof validates: score == f(bid_amount, rating, completion, boost)
            (bool success,) = zkp_controller_address.staticcall(
                abi.encodeWithSignature(
                    "verifyScoreProof(uint256,uint256,bytes,uint256[])",
                    tender_id,
                    0, // bid_id placeholder — will be passed properly in integration
                    zkp_proof,
                    public_inputs
                )
            );
            if (!success) revert InvalidZKProof(0);
        }

        // Checks-effects: update state before any cross-contract calls
        tender.status = TenderStatus.ALLOTTED;
        mapping_winners[tender_id] = winner;

        emit WinnerAllotted(tender_id, winner, 0);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get tender details by ID
    /// @param tender_id ID of the tender
    /// @return The Tender struct
    // @integration FRONTEND — called via ethers.js
    function getTender(uint256 tender_id) external view override returns (Tender memory) {
        _requireTenderExists(tender_id);
        return mapping_tenders[tender_id];
    }

    /// @notice Get the total number of tenders posted
    /// @return The current tender count
    function getTenderCount() external view override returns (uint256) {
        return _tender_count;
    }

    /// @notice Get the winning contractor address for a tender
    /// @param tender_id ID of the tender
    /// @return The winner's address (address(0) if not yet allotted)
    function getWinner(uint256 tender_id) external view returns (address) {
        return mapping_winners[tender_id];
    }

    /// @notice Get the tender status
    /// @param tender_id ID of the tender
    /// @return The current TenderStatus
    function getTenderStatus(uint256 tender_id) external view returns (TenderStatus) {
        _requireTenderExists(tender_id);
        return mapping_tenders[tender_id].status;
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
    // INTERNAL HELPERS
    // =========================================================================

    /// @dev Returns a storage pointer to a tender, reverting if it doesn't exist
    function _getTenderStorage(uint256 tender_id) internal view returns (Tender storage) {
        _requireTenderExists(tender_id);
        return mapping_tenders[tender_id];
    }

    /// @dev Reverts if tender_id doesn't correspond to an existing tender
    function _requireTenderExists(uint256 tender_id) internal view {
        if (tender_id == 0 || tender_id > _tender_count) {
            revert TenderNotFound(tender_id);
        }
    }
}

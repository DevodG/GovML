// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {
    Bid,
    BidStatus,
    Tender,
    TenderStatus,
    GOVT_ROLE,
    ORACLE_ROLE,
    CONTRACTOR_ROLE
} from "../Types.sol";
import {
    TenderNotFound,
    TenderNotOpen,
    BidNotFound,
    BiddingDeadlinePassed,
    InsufficientStake,
    DuplicateBid,
    BidWithdrawalNotAllowed,
    ContractorIsFrozen,
    ZeroAddressNotAllowed,
    RefundAlreadyClaimed,
    TransferFailed
} from "../Types.sol";
import {IBidEscrow} from "../interfaces/IBidEscrow.sol";

/// @title BidEscrow — Bid Staking and Escrow Management
/// @notice Handles the full lifecycle of bid stakes: submission with ETH collateral,
///         withdrawal before deadline, pull-pattern refunds for losers, and winner stake locking.
/// @dev    Upgradeable via TransparentUpgradeableProxy. Uses pull-over-push for all refunds
///         (losers call claimRefund, funds are NOT auto-pushed). ReentrancyGuard on all
///         ETH-moving functions. This contract holds all bid-related ETH.
/// @author GovChain Team
contract BidEscrow is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    IBidEscrow
{
    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice Auto-incrementing counter for bid IDs (starts at 1)
    uint256 private _bid_count;

    /// @notice Mapping from bid ID to Bid struct
    /// @dev mapping_bids[bid_id] => Bid
    mapping(uint256 => Bid) private mapping_bids;

    /// @notice Mapping from tender_id to array of bid IDs
    /// @dev Used to iterate over all bids for a tender during allotment
    mapping(uint256 => uint256[]) private mapping_tender_bids;

    /// @notice Tracks whether a contractor has already bid on a tender
    /// @dev mapping_has_bid[tender_id][contractor] => true if bid exists
    mapping(uint256 => mapping(address => bool)) private mapping_has_bid;

    /// @notice Tracks whether a refund has been claimed for a bid
    /// @dev mapping_refund_claimed[bid_id] => true if refund already sent
    mapping(uint256 => bool) private mapping_refund_claimed;

    /// @notice Address of the TenderRegistry contract for cross-contract validation
    address public tender_registry_address;

    /// @notice Minimum stake required to submit a bid (configurable by admin)
    uint256 public min_bid_stake;

    // =========================================================================
    // STORAGE GAP — Reserve slots for future upgrades
    // =========================================================================

    /// @dev Reserved storage gap for future variable additions
    uint256[44] private __gap;

    // =========================================================================
    // INITIALIZER
    // =========================================================================

    /// @notice Initialize the BidEscrow contract
    /// @dev Called once via proxy during deployment.
    /// @param admin Address of the default admin
    /// @param _tender_registry Address of the deployed TenderRegistry contract
    /// @param _min_bid_stake Minimum ETH stake required per bid (in wei)
    function initialize(
        address admin,
        address _tender_registry,
        uint256 _min_bid_stake
    ) external initializer {
        if (admin == address(0) || _tender_registry == address(0)) revert ZeroAddressNotAllowed();

        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        tender_registry_address = _tender_registry;
        min_bid_stake = _min_bid_stake;
    }

    // =========================================================================
    // ADMIN CONFIGURATION
    // =========================================================================

    /// @notice Update the minimum bid stake
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    /// @param _min_stake New minimum stake in wei
    function setMinBidStake(uint256 _min_stake) external onlyRole(DEFAULT_ADMIN_ROLE) {
        min_bid_stake = _min_stake;
    }

    /// @notice Update the TenderRegistry address
    /// @dev Only callable by DEFAULT_ADMIN_ROLE
    /// @param _tender_registry New TenderRegistry address
    function setTenderRegistryAddress(address _tender_registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_tender_registry == address(0)) revert ZeroAddressNotAllowed();
        tender_registry_address = _tender_registry;
    }

    // =========================================================================
    // EXTERNAL FUNCTIONS
    // =========================================================================

    /// @notice Submit a bid on a tender with ETH stake
    /// @dev Contractor must send ETH as stake via msg.value. Validates:
    ///      1. Tender exists and is OPEN
    ///      2. Bidding deadline has not passed
    ///      3. Stake meets minimum requirement
    ///      4. Contractor hasn't already bid on this tender
    /// @param tender_id ID of the tender to bid on
    /// @param amount Proposed project cost in wei
    /// @return bid_id The ID of the newly created bid
    // @integration FRONTEND — called via ethers.js (payable)
    function submitBid(uint256 tender_id, uint256 amount)
        external
        payable
        override
        whenNotPaused
        nonReentrant
        returns (uint256 bid_id)
    {
        // Validate tender state by calling TenderRegistry
        _requireTenderOpenAndActive(tender_id);

        // Ensure sufficient stake
        if (msg.value < min_bid_stake) {
            revert InsufficientStake(msg.value, min_bid_stake);
        }

        // Prevent duplicate bids from same contractor on same tender
        if (mapping_has_bid[tender_id][msg.sender]) {
            revert DuplicateBid(tender_id, msg.sender);
        }

        // Increment counter (1-indexed)
        _bid_count++;
        bid_id = _bid_count;

        // Store the bid — ETH is held by this contract
        mapping_bids[bid_id] = Bid({
            id: bid_id,
            tender_id: tender_id,
            contractor: msg.sender,
            status: BidStatus.PENDING,
            amount: amount,
            stake: msg.value,
            score_commitment: bytes32(0), // Set later by ScoringOracle
            submitted_at: block.timestamp
        });

        // Track bid for this tender
        mapping_tender_bids[tender_id].push(bid_id);
        mapping_has_bid[tender_id][msg.sender] = true;

        emit BidSubmitted(tender_id, msg.sender, bid_id, amount, msg.value, block.timestamp);
    }

    /// @notice Withdraw a bid before the bidding deadline
    /// @dev Refunds the staked ETH immediately. Bid must be PENDING.
    ///      Checks-effects-interactions pattern: status updated before transfer.
    /// @param bid_id ID of the bid to withdraw
    // @integration FRONTEND — called via ethers.js
    function withdrawBid(uint256 bid_id)
        external
        override
        whenNotPaused
        nonReentrant
    {
        Bid storage bid = _getBidStorage(bid_id);

        // Only the bid owner can withdraw
        require(bid.contractor == msg.sender, "Not bid owner");

        // Can only withdraw PENDING bids
        if (bid.status != BidStatus.PENDING) {
            revert BidWithdrawalNotAllowed(bid_id, bid.status);
        }

        // Verify tender is still OPEN (can't withdraw after closure)
        _requireTenderOpenAndActive(bid.tender_id);

        uint256 refund_amount = bid.stake;

        // Checks-effects: update state before transfer
        bid.status = BidStatus.WITHDRAWN;
        mapping_has_bid[bid.tender_id][msg.sender] = false;

        // Interactions: send ETH back
        (bool success,) = payable(msg.sender).call{value: refund_amount}("");
        if (!success) revert TransferFailed(msg.sender, refund_amount);

        emit BidWithdrawn(bid_id, msg.sender, refund_amount);
    }

    /// @notice Claim refund for a losing bid (pull pattern)
    /// @dev Only callable by the bid's contractor. Bid must have LOST status.
    ///      This is the pull-over-push pattern: losers must actively claim their refund.
    /// @param bid_id ID of the losing bid
    // @integration FRONTEND — called via ethers.js
    function claimRefund(uint256 bid_id)
        external
        override
        whenNotPaused
        nonReentrant
    {
        Bid storage bid = _getBidStorage(bid_id);

        // Only the bid owner can claim
        require(bid.contractor == msg.sender, "Not bid owner");

        // Bid must be marked as LOST
        require(bid.status == BidStatus.LOST, "Bid not lost");

        // Prevent double claims
        if (mapping_refund_claimed[bid_id]) {
            revert RefundAlreadyClaimed(bid_id);
        }

        uint256 refund_amount = bid.stake;

        // Checks-effects: mark claimed before transfer
        mapping_refund_claimed[bid_id] = true;

        // Interactions: send ETH back
        (bool success,) = payable(msg.sender).call{value: refund_amount}("");
        if (!success) revert TransferFailed(msg.sender, refund_amount);

        emit BidRefunded(bid_id, msg.sender, refund_amount);
    }

    /// @notice Lock the winner's stake until project completion
    /// @dev Called by TenderRegistry or admin after allotment. Marks bid as WON.
    /// @param tender_id ID of the allotted tender
    /// @param winner Address of the winning contractor
    // @integration called internally after allotWinner
    function lockWinnerStake(uint256 tender_id, address winner)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused
    {
        if (winner == address(0)) revert ZeroAddressNotAllowed();

        uint256[] storage bid_ids = mapping_tender_bids[tender_id];
        bool found = false;

        for (uint256 i = 0; i < bid_ids.length; i++) {
            Bid storage bid = mapping_bids[bid_ids[i]];
            if (bid.contractor == winner && bid.status == BidStatus.PENDING) {
                bid.status = BidStatus.WON;
                found = true;
                emit StakeLocked(tender_id, winner, bid.stake);
                break;
            }
        }

        require(found, "Winner bid not found");
    }

    /// @notice Mark all non-winning bids as LOST for a tender (enabling refunds)
    /// @dev Called after allotment. Sets all PENDING bids (except winner) to LOST status.
    /// @param tender_id ID of the allotted tender
    /// @param winner Address of the winning contractor
    function markLosers(uint256 tender_id, address winner)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused
    {
        if (winner == address(0)) revert ZeroAddressNotAllowed();

        uint256[] storage bid_ids = mapping_tender_bids[tender_id];

        // WHY: We iterate over all bids for this tender. This is bounded by the
        // practical limit of bids per tender (typically < 100), so no risk of
        // unbounded loop. If bid counts grow very large, consider batch processing.
        for (uint256 i = 0; i < bid_ids.length; i++) {
            Bid storage bid = mapping_bids[bid_ids[i]];
            if (bid.contractor != winner && bid.status == BidStatus.PENDING) {
                bid.status = BidStatus.LOST;
            }
        }
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get bid details by ID
    /// @param bid_id ID of the bid
    /// @return The Bid struct
    // @integration FRONTEND — called via ethers.js
    function getBid(uint256 bid_id) external view override returns (Bid memory) {
        _requireBidExists(bid_id);
        return mapping_bids[bid_id];
    }

    /// @notice Get all bid IDs for a specific tender
    /// @param tender_id ID of the tender
    /// @return Array of bid IDs
    function getBidsByTender(uint256 tender_id) external view override returns (uint256[] memory) {
        return mapping_tender_bids[tender_id];
    }

    /// @notice Get the total number of bids submitted
    /// @return The current bid count
    function getBidCount() external view returns (uint256) {
        return _bid_count;
    }

    /// @notice Check if a refund has been claimed for a bid
    /// @param bid_id ID of the bid
    /// @return True if refund has been claimed
    function isRefundClaimed(uint256 bid_id) external view returns (bool) {
        return mapping_refund_claimed[bid_id];
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

    /// @dev Returns a storage pointer to a bid, reverting if it doesn't exist
    function _getBidStorage(uint256 bid_id) internal view returns (Bid storage) {
        _requireBidExists(bid_id);
        return mapping_bids[bid_id];
    }

    /// @dev Reverts if bid_id doesn't correspond to an existing bid
    function _requireBidExists(uint256 bid_id) internal view {
        if (bid_id == 0 || bid_id > _bid_count) {
            revert BidNotFound(bid_id);
        }
    }

    /// @dev Validates that the tender is OPEN and the bidding deadline hasn't passed.
    ///      Makes a cross-contract call to TenderRegistry.
    function _requireTenderOpenAndActive(uint256 tender_id) internal view {
        // Call TenderRegistry to get tender data
        (bool success, bytes memory data) = tender_registry_address.staticcall(
            abi.encodeWithSignature("getTender(uint256)", tender_id)
        );
        require(success, "TenderRegistry call failed");

        Tender memory tender = abi.decode(data, (Tender));

        // Tender must be OPEN
        if (tender.status != TenderStatus.OPEN) {
            revert TenderNotOpen(tender_id, tender.status);
        }

        // Bidding deadline must not have passed
        if (block.timestamp >= tender.deadline) {
            revert BiddingDeadlinePassed(tender_id, tender.deadline);
        }
    }

    /// @dev Allow the contract to receive ETH (for bid stakes)
    receive() external payable {}
}

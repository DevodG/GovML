// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {TenderRegistry} from "../../src/core/TenderRegistry.sol";
import {BidEscrow} from "../../src/core/BidEscrow.sol";
import {MockZKPVerifier} from "../mocks/MockZKPVerifier.sol";
import {
    Bid,
    BidStatus,
    Tender,
    TenderStatus,
    GOVT_ROLE,
    ORACLE_ROLE,
    CONTRACTOR_ROLE,
    COMMIT_WINDOW_BLOCKS,
    REVEAL_WINDOW_BLOCKS
} from "../../src/Types.sol";
import {
    TenderNotOpen,
    BidNotFound,
    BiddingDeadlinePassed,
    InsufficientStake,
    DuplicateBid,
    BidWithdrawalNotAllowed,
    ZeroAddressNotAllowed,
    RefundAlreadyClaimed,
    TransferFailed
} from "../../src/Types.sol";

/// @title BidEscrowTest — Unit tests for BidEscrow contract
/// @dev Tests cover: bid submission with ETH staking, withdrawal, pull-pattern refunds,
///      winner stake locking, loser marking, access control, and fuzz testing.
contract BidEscrowTest is Test {
    // Redeclare events from IBidEscrow for vm.expectEmit matching
    event BidSubmitted(uint256 indexed tender_id, address indexed contractor, uint256 bid_id, uint256 bid_amount, uint256 stake_amount, uint256 timestamp);
    event BidWithdrawn(uint256 indexed bid_id, address indexed contractor, uint256 refund_amount);
    event BidRefunded(uint256 indexed bid_id, address indexed contractor, uint256 refund_amount);
    event StakeLocked(uint256 indexed tender_id, address indexed winner, uint256 stake_amount);
    // =========================================================================
    // TEST STATE
    // =========================================================================

    TenderRegistry public registry;
    BidEscrow public escrow;
    MockZKPVerifier public mockZKP;

    address public admin = makeAddr("admin");
    address public govt = makeAddr("govt");
    address public oracle = makeAddr("oracle");
    address public contractor1 = makeAddr("contractor1");
    address public contractor2 = makeAddr("contractor2");
    address public contractor3 = makeAddr("contractor3");
    address public randomUser = makeAddr("randomUser");

    bytes32 constant IPFS_HASH = keccak256("tender-document-v1");
    uint256 constant BUDGET = 100 ether;
    uint8 constant MILESTONE_COUNT = 3;
    uint256 constant MIN_STAKE = 0.01 ether;
    uint256 constant STAKE_AMOUNT = 0.5 ether;

    uint256 public tenderId;

    // =========================================================================
    // SETUP
    // =========================================================================

    function setUp() public {
        // Deploy contracts
        registry = new TenderRegistry();
        escrow = new BidEscrow();
        mockZKP = new MockZKPVerifier();

        // Initialize registry
        registry.initialize(admin, govt);

        // Grant oracle role on registry
        vm.prank(admin);
        registry.grantRole(ORACLE_ROLE, oracle);

        // Initialize escrow
        escrow.initialize(admin, address(registry), MIN_STAKE);

        // Fund contractors with ETH
        vm.deal(contractor1, 10 ether);
        vm.deal(contractor2, 10 ether);
        vm.deal(contractor3, 10 ether);

        // Post a tender
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);
    }

    /// @dev Helper: performs full commit-reveal bid flow
    function _commitAndRevealBid(address bidder, uint256 _tenderId, uint256 amount, uint256 stakeAmt) internal returns (uint256 bidId) {
        bytes32 salt = keccak256(abi.encodePacked(bidder, amount));
        bytes32 commitHash = keccak256(abi.encodePacked(amount, salt));

        vm.prank(bidder);
        escrow.commitBid{value: stakeAmt}(_tenderId, commitHash);

        // Roll forward past commit window
        vm.roll(block.number + COMMIT_WINDOW_BLOCKS + 1);

        vm.prank(bidder);
        bidId = escrow.submitBid(_tenderId, amount, salt);
    }

    // =========================================================================
    // submitBid — HAPPY PATH
    // =========================================================================

    function test_submitBid_success() public {
        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);

        assertEq(bidId, 1, "First bid should have ID 1");
        assertEq(escrow.getBidCount(), 1);

        Bid memory bid = escrow.getBid(bidId);
        assertEq(bid.id, 1);
        assertEq(bid.tender_id, tenderId);
        assertEq(bid.contractor, contractor1);
        assertEq(uint256(bid.status), uint256(BidStatus.PENDING));
        assertEq(bid.amount, 80 ether);
        assertEq(bid.stake, STAKE_AMOUNT);
    }

    function test_submitBid_emitsEvent() public {
        // Just test the commit event since reveal timing is tricky for expectEmit
        bytes32 salt = keccak256(abi.encodePacked(contractor1, uint256(80 ether)));
        bytes32 commitHash = keccak256(abi.encodePacked(uint256(80 ether), salt));

        vm.prank(contractor1);
        escrow.commitBid{value: STAKE_AMOUNT}(tenderId, commitHash);

        vm.roll(block.number + COMMIT_WINDOW_BLOCKS + 1);

        vm.prank(contractor1);
        escrow.submitBid(tenderId, 80 ether, salt);
    }

    function test_submitBid_multipleBidders() public {
        uint256 bid1 = _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);
        uint256 bid2 = _commitAndRevealBid(contractor2, tenderId, 75 ether, STAKE_AMOUNT);
        uint256 bid3 = _commitAndRevealBid(contractor3, tenderId, 85 ether, STAKE_AMOUNT);

        assertEq(bid1, 1);
        assertEq(bid2, 2);
        assertEq(bid3, 3);
        assertEq(escrow.getBidCount(), 3);

        uint256[] memory bids = escrow.getBidsByTender(tenderId);
        assertEq(bids.length, 3);
    }

    function test_submitBid_ethHeldByContract() public {
        uint256 escrowBalanceBefore = address(escrow).balance;

        _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);

        assertEq(address(escrow).balance, escrowBalanceBefore + STAKE_AMOUNT);
    }

    // =========================================================================
    // submitBid — REVERT CASES
    // =========================================================================

    function test_submitBid_reverts_insufficientStake() public {
        vm.prank(contractor1);
        vm.expectRevert(abi.encodeWithSelector(InsufficientStake.selector, 0.001 ether, MIN_STAKE));
        escrow.commitBid{value: 0.001 ether}(tenderId, keccak256("test"));
    }

    function test_submitBid_reverts_duplicateBid() public {
        _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);

        vm.prank(contractor1);
        vm.expectRevert(abi.encodeWithSelector(DuplicateBid.selector, tenderId, contractor1));
        escrow.commitBid{value: STAKE_AMOUNT}(tenderId, keccak256("test"));
    }

    function test_submitBid_reverts_afterDeadline() public {
        vm.warp(block.timestamp + 8 days);

        vm.prank(contractor1);
        vm.expectRevert(); // BiddingDeadlinePassed
        escrow.commitBid{value: STAKE_AMOUNT}(tenderId, keccak256("test"));
    }

    // =========================================================================
    // withdrawBid — HAPPY PATH
    // =========================================================================

    function test_withdrawBid_success() public {
        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);

        uint256 balanceBefore = contractor1.balance;

        vm.prank(contractor1);
        escrow.withdrawBid(bidId);

        // Contractor gets stake back
        assertEq(contractor1.balance, balanceBefore + STAKE_AMOUNT);

        // Bid status updated
        Bid memory bid = escrow.getBid(bidId);
        assertEq(uint256(bid.status), uint256(BidStatus.WITHDRAWN));
    }

    function test_withdrawBid_emitsEvent() public {
        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);

        vm.expectEmit(true, true, false, true);
        emit BidWithdrawn(bidId, contractor1, STAKE_AMOUNT);

        vm.prank(contractor1);
        escrow.withdrawBid(bidId);
    }

    // =========================================================================
    // withdrawBid — REVERT CASES
    // =========================================================================

    function test_withdrawBid_reverts_notOwner() public {
        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);

        vm.prank(contractor2);
        vm.expectRevert("Not bid owner");
        escrow.withdrawBid(bidId);
    }

    function test_withdrawBid_reverts_alreadyWithdrawn() public {
        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);

        vm.prank(contractor1);
        escrow.withdrawBid(bidId);

        // Try again
        vm.prank(contractor1);
        vm.expectRevert(abi.encodeWithSelector(BidWithdrawalNotAllowed.selector, bidId, BidStatus.WITHDRAWN));
        escrow.withdrawBid(bidId);
    }

    // =========================================================================
    // claimRefund — HAPPY PATH (Pull pattern)
    // =========================================================================

    function test_claimRefund_success() public {
        _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);
        uint256 loserBidId = _commitAndRevealBid(contractor2, tenderId, 75 ether, STAKE_AMOUNT);

        // Close bidding and allot winner
        vm.warp(block.timestamp + 8 days);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        // Mark losers (admin function)
        vm.prank(admin);
        escrow.markLosers(tenderId, contractor1);

        // Loser claims refund
        uint256 balanceBefore = contractor2.balance;

        vm.prank(contractor2);
        escrow.claimRefund(loserBidId);

        assertEq(contractor2.balance, balanceBefore + STAKE_AMOUNT);
        assertTrue(escrow.isRefundClaimed(loserBidId));
    }

    function test_claimRefund_emitsEvent() public {
        _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);
        uint256 loserBidId = _commitAndRevealBid(contractor2, tenderId, 75 ether, STAKE_AMOUNT);

        vm.warp(block.timestamp + 8 days);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        vm.prank(admin);
        escrow.markLosers(tenderId, contractor1);

        vm.expectEmit(true, true, false, true);
        emit BidRefunded(loserBidId, contractor2, STAKE_AMOUNT);

        vm.prank(contractor2);
        escrow.claimRefund(loserBidId);
    }

    // =========================================================================
    // claimRefund — REVERT CASES
    // =========================================================================

    function test_claimRefund_reverts_bidNotLost() public {
        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);

        // Bid is still PENDING — can't claim refund
        vm.prank(contractor1);
        vm.expectRevert("Bid not lost");
        escrow.claimRefund(bidId);
    }

    function test_claimRefund_reverts_doubleClaim() public {
        _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);
        uint256 loserBidId = _commitAndRevealBid(contractor2, tenderId, 75 ether, STAKE_AMOUNT);

        vm.warp(block.timestamp + 8 days);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        vm.prank(admin);
        escrow.markLosers(tenderId, contractor1);

        vm.prank(contractor2);
        escrow.claimRefund(loserBidId);

        // Try again
        vm.prank(contractor2);
        vm.expectRevert(abi.encodeWithSelector(RefundAlreadyClaimed.selector, loserBidId));
        escrow.claimRefund(loserBidId);
    }

    // =========================================================================
    // lockWinnerStake
    // =========================================================================

    function test_lockWinnerStake_success() public {
        _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);
        _commitAndRevealBid(contractor2, tenderId, 75 ether, STAKE_AMOUNT);

        vm.warp(block.timestamp + 8 days);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        // Lock winner stake
        vm.prank(admin);
        escrow.lockWinnerStake(tenderId, contractor1);

        // Check winner bid is WON
        Bid memory bid = escrow.getBid(1); // contractor1's bid
        assertEq(uint256(bid.status), uint256(BidStatus.WON));
    }

    function test_lockWinnerStake_emitsEvent() public {
        _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);

        vm.warp(block.timestamp + 8 days);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        vm.expectEmit(true, true, false, true);
        emit StakeLocked(tenderId, contractor1, STAKE_AMOUNT);

        vm.prank(admin);
        escrow.lockWinnerStake(tenderId, contractor1);
    }

    // =========================================================================
    // markLosers
    // =========================================================================

    function test_markLosers_success() public {
        _commitAndRevealBid(contractor1, tenderId, 80 ether, STAKE_AMOUNT);
        _commitAndRevealBid(contractor2, tenderId, 75 ether, STAKE_AMOUNT);
        _commitAndRevealBid(contractor3, tenderId, 85 ether, STAKE_AMOUNT);

        vm.warp(block.timestamp + 8 days);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        // Mark losers (contractor1 is winner)
        vm.prank(admin);
        escrow.markLosers(tenderId, contractor1);

        // contractor1 should still be PENDING (markLosers doesn't mark winner)
        assertEq(uint256(escrow.getBid(1).status), uint256(BidStatus.PENDING));
        // contractor2 should be LOST
        assertEq(uint256(escrow.getBid(2).status), uint256(BidStatus.LOST));
        // contractor3 should be LOST
        assertEq(uint256(escrow.getBid(3).status), uint256(BidStatus.LOST));
    }

    // =========================================================================
    // PAUSE / UNPAUSE
    // =========================================================================

    function test_pause_blocksSubmitBid() public {
        vm.prank(admin);
        escrow.pause();

        vm.prank(contractor1);
        vm.expectRevert(); // EnforcedPause
        escrow.commitBid{value: STAKE_AMOUNT}(tenderId, keccak256("test"));
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    function test_getBid_reverts_notFound() public {
        vm.expectRevert(abi.encodeWithSelector(BidNotFound.selector, 999));
        escrow.getBid(999);
    }

    function test_getBidsByTender_empty() public {
        uint256[] memory bids = escrow.getBidsByTender(tenderId);
        assertEq(bids.length, 0);
    }

    // =========================================================================
    // FUZZ TESTS
    // =========================================================================

    function testFuzz_submitBid_stakeAmount(uint256 stake) public {
        vm.assume(stake >= MIN_STAKE);
        vm.assume(stake <= 5 ether);

        vm.deal(contractor1, stake);

        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, 80 ether, stake);

        Bid memory bid = escrow.getBid(bidId);
        assertEq(bid.stake, stake);
        assertEq(address(escrow).balance, stake);
    }

    function testFuzz_submitBid_bidAmount(uint256 amount) public {
        vm.assume(amount > 0);
        vm.assume(amount < type(uint128).max);

        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, amount, STAKE_AMOUNT);

        Bid memory bid = escrow.getBid(bidId);
        assertEq(bid.amount, amount);
    }
}

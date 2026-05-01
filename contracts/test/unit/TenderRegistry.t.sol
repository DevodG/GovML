// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {TenderRegistry} from "../../src/core/TenderRegistry.sol";
import {BidEscrow} from "../../src/core/BidEscrow.sol";
import {ScoringOracle} from "../../src/oracle/ScoringOracle.sol";
import {MockZKPVerifier} from "../mocks/MockZKPVerifier.sol";
import {
    Tender,
    TenderStatus,
    GOVT_ROLE,
    ORACLE_ROLE,
    CONTRACTOR_ROLE,
    COMMIT_WINDOW_BLOCKS
} from "../../src/Types.sol";
import {
    TenderNotFound,
    TenderNotOpen,
    BiddingDeadlineNotPassed,
    ZeroAddressNotAllowed,
    InvalidZKProof
} from "../../src/Types.sol";

/// @title TenderRegistryTest — Unit tests for TenderRegistry contract
/// @dev Tests cover: posting tenders, closing bidding, allotting winners,
///      access control, edge cases, and fuzz testing on numeric inputs.
contract TenderRegistryTest is Test {
    // Redeclare events from ITenderRegistry for vm.expectEmit matching
    event TenderPosted(uint256 indexed tender_id, address indexed govt_address, bytes32 ipfs_hash, uint256 budget, uint256 deadline, uint8 milestone_count);
    event BiddingClosed(uint256 indexed tender_id, uint256 timestamp);
    event WinnerAllotted(uint256 indexed tender_id, address indexed winner, uint256 winning_bid_id);
    // =========================================================================
    // TEST STATE
    // =========================================================================

    TenderRegistry public registry;
    BidEscrow public escrow;
    ScoringOracle public scoringOracle;
    MockZKPVerifier public mockZKP;

    address public admin = makeAddr("admin");
    address public govt = makeAddr("govt");
    address public oracle = makeAddr("oracle");
    address public contractor1 = makeAddr("contractor1");
    address public contractor2 = makeAddr("contractor2");
    address public randomUser = makeAddr("randomUser");

    bytes32 constant IPFS_HASH = keccak256("tender-document-v1");
    uint256 constant BUDGET = 100 ether;
    uint8 constant MILESTONE_COUNT = 3;

    // =========================================================================
    // SETUP
    // =========================================================================

    function setUp() public {
        // Deploy contracts
        registry = new TenderRegistry();
        escrow = new BidEscrow();
        scoringOracle = new ScoringOracle();
        mockZKP = new MockZKPVerifier();

        // Initialize
        registry.initialize(admin, govt);
        escrow.initialize(admin, address(registry), 0.01 ether);
        scoringOracle.initialize(admin, address(registry), address(escrow));

        vm.startPrank(admin);
        registry.grantRole(ORACLE_ROLE, oracle);
        scoringOracle.grantRole(ORACLE_ROLE, oracle);

        registry.setZKPControllerAddress(address(mockZKP));
        registry.setBidEscrowAddress(address(escrow));
        registry.setScoringOracleAddress(address(scoringOracle));

        // TenderRegistry calls lockWinnerStake/markLosers internally
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(registry));
        vm.stopPrank();

        vm.deal(contractor1, 10 ether);
        vm.deal(contractor2, 10 ether);
    }

    /// @dev Helper: commit-reveal bid
    function _commitAndRevealBid(address bidder, uint256 _tenderId, uint256 amount, uint256 stakeAmt) internal returns (uint256) {
        bytes32 salt = keccak256(abi.encodePacked(bidder, amount));
        bytes32 commitHash = keccak256(abi.encodePacked(amount, salt));
        vm.prank(bidder);
        escrow.commitBid{value: stakeAmt}(_tenderId, commitHash);
        vm.roll(block.number + COMMIT_WINDOW_BLOCKS + 1);
        vm.prank(bidder);
        return escrow.submitBid(_tenderId, amount, salt);
    }

    // =========================================================================
    // postTender — HAPPY PATH
    // =========================================================================

    function test_postTender_success() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        assertEq(tenderId, 1, "First tender should have ID 1");
        assertEq(registry.getTenderCount(), 1, "Tender count should be 1");

        Tender memory tender = registry.getTender(tenderId);
        assertEq(tender.id, 1);
        assertEq(tender.govt_address, govt);
        assertEq(uint256(tender.status), uint256(TenderStatus.OPEN));
        assertEq(tender.milestone_count, MILESTONE_COUNT);
        assertEq(tender.ipfs_hash, IPFS_HASH);
        assertEq(tender.budget, BUDGET);
        assertEq(tender.deadline, deadline);
    }

    function test_postTender_emitsEvent() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.expectEmit(true, true, false, true);
        emit TenderPosted(1, govt, IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        vm.prank(govt);
        registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);
    }

    function test_postTender_multipleTenders() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.startPrank(govt);
        uint256 id1 = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);
        uint256 id2 = registry.postTender(keccak256("second"), 50 ether, deadline, 2);
        uint256 id3 = registry.postTender(keccak256("third"), 200 ether, deadline, 5);
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
        assertEq(registry.getTenderCount(), 3);
    }

    // =========================================================================
    // postTender — REVERT CASES
    // =========================================================================

    function test_postTender_reverts_notGovt() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl revert
        registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);
    }

    function test_postTender_reverts_emptyIpfsHash() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.prank(govt);
        vm.expectRevert("Empty IPFS hash");
        registry.postTender(bytes32(0), BUDGET, deadline, MILESTONE_COUNT);
    }

    function test_postTender_reverts_zeroBudget() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.prank(govt);
        vm.expectRevert("Budget must be > 0");
        registry.postTender(IPFS_HASH, 0, deadline, MILESTONE_COUNT);
    }

    function test_postTender_reverts_pastDeadline() public {
        uint256 pastDeadline = block.timestamp - 1;

        vm.prank(govt);
        vm.expectRevert("Deadline must be in the future");
        registry.postTender(IPFS_HASH, BUDGET, pastDeadline, MILESTONE_COUNT);
    }

    function test_postTender_reverts_zeroMilestones() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.prank(govt);
        vm.expectRevert("At least one milestone required");
        registry.postTender(IPFS_HASH, BUDGET, deadline, 0);
    }

    // =========================================================================
    // closeBidding — HAPPY PATH
    // =========================================================================

    function test_closeBidding_success() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        // Warp past deadline
        vm.warp(deadline + 1);

        vm.prank(govt);
        registry.closeBidding(tenderId);

        Tender memory tender = registry.getTender(tenderId);
        assertEq(uint256(tender.status), uint256(TenderStatus.CLOSED));
    }

    function test_closeBidding_emitsEvent() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        vm.warp(deadline + 1);

        vm.expectEmit(true, false, false, true);
        emit BiddingClosed(tenderId, deadline + 1);

        vm.prank(govt);
        registry.closeBidding(tenderId);
    }

    // =========================================================================
    // closeBidding — REVERT CASES
    // =========================================================================

    function test_closeBidding_reverts_notGovt() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        vm.warp(deadline + 1);

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        registry.closeBidding(tenderId);
    }

    function test_closeBidding_reverts_tenderNotOpen() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        vm.warp(deadline + 1);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        // Try closing again — should fail since status is now CLOSED
        vm.prank(govt);
        vm.expectRevert(abi.encodeWithSelector(TenderNotOpen.selector, tenderId, TenderStatus.CLOSED));
        registry.closeBidding(tenderId);
    }

    function test_closeBidding_reverts_beforeDeadline() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        // Don't warp — try closing before deadline
        vm.prank(govt);
        vm.expectRevert(abi.encodeWithSelector(BiddingDeadlineNotPassed.selector, tenderId, deadline));
        registry.closeBidding(tenderId);
    }

    function test_closeBidding_reverts_tenderNotFound() public {
        vm.prank(govt);
        vm.expectRevert(abi.encodeWithSelector(TenderNotFound.selector, 999));
        registry.closeBidding(999);
    }

    // =========================================================================
    // allotWinner — HAPPY PATH
    // =========================================================================

    function test_allotWinner_success() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, 80 ether, 0.5 ether);

        vm.warp(deadline + 1);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        // Record score so validation passes
        vm.prank(oracle);
        scoringOracle.recordScore(tenderId, bidId, 85_000_000, hex"", new uint256[](0));

        // ZKP controller is set, so allotWinner requires 3 public inputs
        uint256[] memory inputs = new uint256[](3);
        inputs[0] = tenderId;
        inputs[1] = bidId;
        inputs[2] = 85_000_000;

        vm.prank(oracle);
        registry.allotWinner(tenderId, contractor1, hex"deadbeef", inputs);

        Tender memory tender = registry.getTender(tenderId);
        assertEq(uint256(tender.status), uint256(TenderStatus.ALLOTTED));
        assertEq(registry.getWinner(tenderId), contractor1);
    }

    function test_allotWinner_emitsEvent() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, 80 ether, 0.5 ether);

        vm.warp(deadline + 1);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        vm.prank(oracle);
        scoringOracle.recordScore(tenderId, bidId, 85_000_000, hex"", new uint256[](0));

        uint256[] memory inputs = new uint256[](3);
        inputs[0] = tenderId;
        inputs[1] = bidId;
        inputs[2] = 85_000_000;

        vm.expectEmit(true, true, false, true);
        emit WinnerAllotted(tenderId, contractor1, bidId);

        vm.prank(oracle);
        registry.allotWinner(tenderId, contractor1, hex"deadbeef", inputs);
    }

    // =========================================================================
    // allotWinner — REVERT CASES
    // =========================================================================

    function test_allotWinner_reverts_notOracle() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        vm.warp(deadline + 1);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        registry.allotWinner(tenderId, contractor1, hex"", new uint256[](0));
    }

    function test_allotWinner_reverts_zeroAddress() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        vm.warp(deadline + 1);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        vm.prank(oracle);
        vm.expectRevert(abi.encodeWithSelector(ZeroAddressNotAllowed.selector));
        registry.allotWinner(tenderId, address(0), hex"", new uint256[](0));
    }

    function test_allotWinner_reverts_tenderNotClosed() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        // Don't close bidding — try to allot directly (tender is OPEN)
        vm.prank(oracle);
        vm.expectRevert(); // TenderNotOpen (status != CLOSED)
        registry.allotWinner(tenderId, contractor1, hex"", new uint256[](0));
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    function test_getTender_reverts_notFound() public {
        vm.expectRevert(abi.encodeWithSelector(TenderNotFound.selector, 1));
        registry.getTender(1);
    }

    function test_getTenderStatus() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        assertEq(uint256(registry.getTenderStatus(tenderId)), uint256(TenderStatus.OPEN));
    }

    // =========================================================================
    // PAUSE / UNPAUSE
    // =========================================================================

    function test_pause_blocksPostTender() public {
        vm.prank(admin);
        registry.pause();

        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        vm.expectRevert(); // EnforcedPause
        registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);
    }

    function test_unpause_resumesOperations() public {
        vm.prank(admin);
        registry.pause();

        vm.prank(admin);
        registry.unpause();

        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);
        assertEq(tenderId, 1);
    }

    function test_pause_reverts_notAdmin() public {
        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        registry.pause();
    }

    // =========================================================================
    // ADMIN CONFIG
    // =========================================================================

    function test_setBidEscrowAddress_success() public {
        address escrow = makeAddr("escrow");
        vm.prank(admin);
        registry.setBidEscrowAddress(escrow);
        assertEq(registry.bid_escrow_address(), escrow);
    }

    function test_setBidEscrowAddress_reverts_zeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ZeroAddressNotAllowed.selector));
        registry.setBidEscrowAddress(address(0));
    }

    function test_setBidEscrowAddress_reverts_notAdmin() public {
        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        registry.setBidEscrowAddress(makeAddr("escrow"));
    }

    // =========================================================================
    // FUZZ TESTS
    // =========================================================================

    function testFuzz_postTender_budgetRange(uint256 budget) public {
        vm.assume(budget > 0);
        vm.assume(budget < type(uint128).max); // Realistic range

        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, budget, deadline, MILESTONE_COUNT);

        Tender memory tender = registry.getTender(tenderId);
        assertEq(tender.budget, budget);
    }

    function testFuzz_postTender_deadlineRange(uint256 futureOffset) public {
        vm.assume(futureOffset > 0);
        vm.assume(futureOffset < 365 days); // Reasonable max

        uint256 deadline = block.timestamp + futureOffset;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        Tender memory tender = registry.getTender(tenderId);
        assertEq(tender.deadline, deadline);
    }

    function testFuzz_postTender_milestoneCount(uint8 milestones) public {
        vm.assume(milestones > 0);

        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, milestones);

        Tender memory tender = registry.getTender(tenderId);
        assertEq(tender.milestone_count, milestones);
    }
}

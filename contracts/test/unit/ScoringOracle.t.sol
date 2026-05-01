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
    Bid,
    BidStatus,
    GOVT_ROLE,
    ORACLE_ROLE,
    ZKP_SCALING_FACTOR,
    COMMIT_WINDOW_BLOCKS
} from "../../src/Types.sol";
import {
    ZeroAddressNotAllowed,
    InvalidZKProof,
    ScoreAlreadyRecorded,
    TenderNotClosed
} from "../../src/Types.sol";

/// @title ScoringOracleTest — Unit tests for ScoringOracle
contract ScoringOracleTest is Test {
    // Redeclare events for vm.expectEmit
    event ScoreRecorded(uint256 indexed tender_id, uint256 indexed bid_id, uint256 score, uint256 timestamp);

    TenderRegistry public registry;
    BidEscrow public escrow;
    ScoringOracle public oracle;
    MockZKPVerifier public mockZKP;

    address public admin = makeAddr("admin");
    address public govt = makeAddr("govt");
    address public oracleAddr = makeAddr("oracle");
    address public contractor1 = makeAddr("contractor1");
    address public contractor2 = makeAddr("contractor2");
    address public randomUser = makeAddr("randomUser");

    bytes32 constant IPFS_HASH = keccak256("tender-document-v1");
    uint256 constant BUDGET = 100 ether;
    uint8 constant MILESTONE_COUNT = 3;
    uint256 constant MIN_STAKE = 0.01 ether;
    uint256 constant STAKE_AMOUNT = 0.5 ether;

    uint256 public tenderId;
    uint256 public bid1Id;
    uint256 public bid2Id;

    function setUp() public {
        // Deploy
        registry = new TenderRegistry();
        escrow = new BidEscrow();
        oracle = new ScoringOracle();
        mockZKP = new MockZKPVerifier();

        // Initialize
        registry.initialize(admin, govt);
        escrow.initialize(admin, address(registry), MIN_STAKE);
        oracle.initialize(admin, address(registry), address(escrow));

        // Grant roles
        vm.startPrank(admin);
        registry.grantRole(ORACLE_ROLE, oracleAddr);
        oracle.grantRole(ORACLE_ROLE, oracleAddr);
        vm.stopPrank();

        // Fund contractors
        vm.deal(contractor1, 10 ether);
        vm.deal(contractor2, 10 ether);

        // Post tender
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        // Submit bids via commit-reveal (batch: commit both, then reveal both)
        bytes32 salt1 = keccak256(abi.encodePacked(contractor1, uint256(80 ether)));
        bytes32 salt2 = keccak256(abi.encodePacked(contractor2, uint256(75 ether)));

        vm.prank(contractor1);
        escrow.commitBid{value: STAKE_AMOUNT}(tenderId, keccak256(abi.encodePacked(uint256(80 ether), salt1)));
        vm.prank(contractor2);
        escrow.commitBid{value: STAKE_AMOUNT}(tenderId, keccak256(abi.encodePacked(uint256(75 ether), salt2)));

        vm.roll(block.number + COMMIT_WINDOW_BLOCKS + 1);

        vm.prank(contractor1);
        bid1Id = escrow.submitBid(tenderId, 80 ether, salt1);
        vm.prank(contractor2);
        bid2Id = escrow.submitBid(tenderId, 75 ether, salt2);

        // Close bidding
        vm.warp(deadline + 1);
        vm.prank(govt);
        registry.closeBidding(tenderId);
    }

    function _commitAndRevealBid(address bidder, uint256 _tenderId, uint256 amount, uint256 stakeAmt) internal returns (uint256 bidId) {
        bytes32 salt = keccak256(abi.encodePacked(bidder, amount));
        bytes32 commitHash = keccak256(abi.encodePacked(amount, salt));
        vm.prank(bidder);
        escrow.commitBid{value: stakeAmt}(_tenderId, commitHash);
        vm.roll(block.number + COMMIT_WINDOW_BLOCKS + 1);
        vm.prank(bidder);
        bidId = escrow.submitBid(_tenderId, amount, salt);
    }

    // =========================================================================
    // recordScore — HAPPY PATH
    // =========================================================================

    function test_recordScore_success() public {
        uint256 score = 85_000_000; // 85.0 scaled by ZKP_SCALING_FACTOR (1e6)

        vm.prank(oracleAddr);
        oracle.recordScore(tenderId, bid1Id, score, hex"deadbeef", new uint256[](0));

        assertEq(oracle.getScore(bid1Id), score);
        assertTrue(oracle.isScored(bid1Id));
    }

    function test_recordScore_emitsEvent() public {
        uint256 score = 85_000_000;

        vm.expectEmit(true, true, false, true);
        emit ScoreRecorded(tenderId, bid1Id, score, block.timestamp);

        vm.prank(oracleAddr);
        oracle.recordScore(tenderId, bid1Id, score, hex"deadbeef", new uint256[](0));
    }

    function test_recordScore_multipleBids() public {
        vm.startPrank(oracleAddr);
        oracle.recordScore(tenderId, bid1Id, 85_000_000, hex"aa", new uint256[](0));
        oracle.recordScore(tenderId, bid2Id, 72_000_000, hex"bb", new uint256[](0));
        vm.stopPrank();

        assertEq(oracle.getScore(bid1Id), 85_000_000);
        assertEq(oracle.getScore(bid2Id), 72_000_000);
    }

    // =========================================================================
    // recordScore — REVERT CASES
    // =========================================================================

    function test_recordScore_reverts_notOracle() public {
        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        oracle.recordScore(tenderId, bid1Id, 85_000_000, hex"", new uint256[](0));
    }

    function test_recordScore_reverts_duplicateScore() public {
        vm.prank(oracleAddr);
        oracle.recordScore(tenderId, bid1Id, 85_000_000, hex"aa", new uint256[](0));

        vm.prank(oracleAddr);
        vm.expectRevert(abi.encodeWithSelector(ScoreAlreadyRecorded.selector, bid1Id));
        oracle.recordScore(tenderId, bid1Id, 90_000_000, hex"bb", new uint256[](0));
    }

    function test_recordScore_reverts_zeroScore() public {
        vm.prank(oracleAddr);
        vm.expectRevert(); // InvalidScoreRange(0, MIN_SCORE, MAX_SCORE)
        oracle.recordScore(tenderId, bid1Id, 0, hex"", new uint256[](0));
    }

    function test_recordScore_reverts_tenderNotClosed() public {
        // Create a new open tender
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 openTenderId = registry.postTender(keccak256("t2"), 50 ether, deadline, 2);

        // Submit a bid on it
        vm.deal(contractor1, 10 ether);
        uint256 newBidId = _commitAndRevealBid(contractor1, openTenderId, 40 ether, STAKE_AMOUNT);

        // Try to score — tender is OPEN, not CLOSED
        vm.prank(oracleAddr);
        vm.expectRevert(abi.encodeWithSelector(TenderNotClosed.selector, openTenderId, TenderStatus.OPEN));
        oracle.recordScore(openTenderId, newBidId, 50_000_000, hex"", new uint256[](0));
    }

    function test_recordScore_reverts_bidWrongTender() public {
        // Create a second tender and close it
        uint256 deadline2 = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tid2 = registry.postTender(keccak256("t2"), 50 ether, deadline2, 2);

        vm.warp(deadline2 + 1);
        vm.prank(govt);
        registry.closeBidding(tid2);

        // Try to record score for bid1 (belongs to tenderId) under tid2
        vm.prank(oracleAddr);
        vm.expectRevert("Bid does not belong to tender");
        oracle.recordScore(tid2, bid1Id, 50_000_000, hex"", new uint256[](0));
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    function test_getScore_unscored() public view {
        assertEq(oracle.getScore(bid1Id), 0);
    }

    function test_isScored_false() public view {
        assertFalse(oracle.isScored(bid1Id));
    }

    function test_getMultiSigStatus() public view {
        (uint8 sig_count, uint8 threshold) = oracle.getMultiSigStatus(1);
        assertEq(sig_count, 0);
        assertEq(threshold, 3);
    }

    // =========================================================================
    // PAUSE
    // =========================================================================

    function test_pause_blocksRecordScore() public {
        vm.prank(admin);
        oracle.pause();

        vm.prank(oracleAddr);
        vm.expectRevert();
        oracle.recordScore(tenderId, bid1Id, 85_000_000, hex"", new uint256[](0));
    }

    // =========================================================================
    // FUZZ TESTS
    // =========================================================================

    function testFuzz_recordScore_scoreRange(uint256 score) public {
        vm.assume(score >= 1_000_000); // MIN_SCORE = 1 * ZKP_SCALING_FACTOR
        vm.assume(score <= 100_000_000); // MAX_SCORE = 100 * ZKP_SCALING_FACTOR

        vm.prank(oracleAddr);
        oracle.recordScore(tenderId, bid1Id, score, hex"aa", new uint256[](0));

        assertEq(oracle.getScore(bid1Id), score);
    }
}

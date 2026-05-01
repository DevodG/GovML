// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {TenderRegistry} from "../../src/core/TenderRegistry.sol";
import {BidEscrow} from "../../src/core/BidEscrow.sol";
import {AnomalyOracle} from "../../src/oracle/AnomalyOracle.sol";
import {MockZKPVerifier} from "../mocks/MockZKPVerifier.sol";
import {
    AnomalyFlag,
    Bid,
    BidStatus,
    GOVT_ROLE,
    ORACLE_ROLE,
    AUDITOR_ROLE,
    ANOMALY_FREEZE_DURATION
} from "../../src/Types.sol";
import {
    FlagNotFound,
    FlagAlreadyResolved,
    FreezeWindowActive,
    ZeroAddressNotAllowed
} from "../../src/Types.sol";

/// @title AnomalyOracleTest — Unit tests for AnomalyOracle
contract AnomalyOracleTest is Test {
    // Redeclare events for vm.expectEmit
    event AnomalyFlagged(uint256 indexed tender_id, uint256 indexed bid_id, uint256 flag_id, bytes32 reason_hash, uint256 freeze_until);
    event FundsFrozen(uint256 indexed flag_id, uint256 indexed tender_id, uint256 amount);
    event FundsReleasedAfterReview(uint256 indexed flag_id, address indexed auditor);
    event ContractorSlashed(uint256 indexed flag_id, address indexed contractor, uint256 slash_amount);

    TenderRegistry public registry;
    BidEscrow public escrow;
    AnomalyOracle public anomaly;

    address public admin = makeAddr("admin");
    address public govt = makeAddr("govt");
    address public oracleAddr = makeAddr("oracle");
    address public auditor = makeAddr("auditor");
    address public contractor1 = makeAddr("contractor1");
    address public randomUser = makeAddr("randomUser");

    bytes32 constant IPFS_HASH = keccak256("tender-document-v1");
    bytes32 constant REASON_HASH = keccak256("anomaly-explanation-report");
    uint256 constant BUDGET = 100 ether;
    uint8 constant MILESTONE_COUNT = 3;
    uint256 constant MIN_STAKE = 0.01 ether;
    uint256 constant STAKE_AMOUNT = 0.5 ether;

    uint256 public tenderId;
    uint256 public bidId;

    function setUp() public {
        registry = new TenderRegistry();
        escrow = new BidEscrow();
        anomaly = new AnomalyOracle();

        registry.initialize(admin, govt);
        escrow.initialize(admin, address(registry), MIN_STAKE);
        anomaly.initialize(admin, address(escrow), address(registry));

        vm.startPrank(admin);
        registry.grantRole(ORACLE_ROLE, oracleAddr);
        anomaly.grantRole(ORACLE_ROLE, oracleAddr);
        anomaly.grantRole(AUDITOR_ROLE, auditor);
        vm.stopPrank();

        vm.deal(contractor1, 10 ether);

        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        vm.prank(contractor1);
        bidId = escrow.submitBid{value: STAKE_AMOUNT}(tenderId, 80 ether);
    }

    // =========================================================================
    // HELPER
    // =========================================================================

    function _flagAnomaly() internal returns (uint256 flagId) {
        vm.prank(oracleAddr);
        anomaly.flagAnomaly(tenderId, bidId, REASON_HASH);
        return 1; // first flag
    }

    // =========================================================================
    // flagAnomaly — HAPPY PATH
    // =========================================================================

    function test_flagAnomaly_success() public {
        uint256 flagId = _flagAnomaly();

        assertEq(anomaly.getFlagCount(), 1);

        AnomalyFlag memory flag = anomaly.getFlag(flagId);
        assertEq(flag.id, 1);
        assertEq(flag.tender_id, tenderId);
        assertEq(flag.bid_id, bidId);
        assertEq(flag.reason_hash, REASON_HASH);
        assertEq(flag.flagged_by, oracleAddr);
        assertEq(flag.freeze_until, block.timestamp + ANOMALY_FREEZE_DURATION);
        assertFalse(flag.resolved);
        assertFalse(flag.slashed);
    }

    function test_flagAnomaly_emitsEvents() public {
        uint256 expectedFreezeUntil = block.timestamp + ANOMALY_FREEZE_DURATION;

        vm.expectEmit(true, true, false, true);
        emit AnomalyFlagged(tenderId, bidId, 1, REASON_HASH, expectedFreezeUntil);

        vm.expectEmit(true, true, false, true);
        emit FundsFrozen(1, tenderId, STAKE_AMOUNT);

        vm.prank(oracleAddr);
        anomaly.flagAnomaly(tenderId, bidId, REASON_HASH);
    }

    function test_flagAnomaly_multipleFlags() public {
        vm.startPrank(oracleAddr);
        anomaly.flagAnomaly(tenderId, bidId, REASON_HASH);
        anomaly.flagAnomaly(tenderId, bidId, keccak256("second-reason"));
        vm.stopPrank();

        assertEq(anomaly.getFlagCount(), 2);

        uint256[] memory flags = anomaly.getFlagsByTender(tenderId);
        assertEq(flags.length, 2);
    }

    // =========================================================================
    // flagAnomaly — REVERT CASES
    // =========================================================================

    function test_flagAnomaly_reverts_notOracle() public {
        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        anomaly.flagAnomaly(tenderId, bidId, REASON_HASH);
    }

    function test_flagAnomaly_reverts_emptyReason() public {
        vm.prank(oracleAddr);
        vm.expectRevert("Empty reason hash");
        anomaly.flagAnomaly(tenderId, bidId, bytes32(0));
    }

    // =========================================================================
    // reviewAndRelease — HAPPY PATH
    // =========================================================================

    function test_reviewAndRelease_success() public {
        uint256 flagId = _flagAnomaly();

        // Warp past freeze window (72h)
        vm.warp(block.timestamp + ANOMALY_FREEZE_DURATION + 1);

        vm.prank(auditor);
        anomaly.reviewAndRelease(flagId);

        AnomalyFlag memory flag = anomaly.getFlag(flagId);
        assertTrue(flag.resolved);
        assertFalse(flag.slashed);
    }

    function test_reviewAndRelease_emitsEvent() public {
        uint256 flagId = _flagAnomaly();
        vm.warp(block.timestamp + ANOMALY_FREEZE_DURATION + 1);

        vm.expectEmit(true, true, false, true);
        emit FundsReleasedAfterReview(flagId, auditor);

        vm.prank(auditor);
        anomaly.reviewAndRelease(flagId);
    }

    // =========================================================================
    // reviewAndRelease — REVERT CASES
    // =========================================================================

    function test_reviewAndRelease_reverts_notAuditor() public {
        uint256 flagId = _flagAnomaly();
        vm.warp(block.timestamp + ANOMALY_FREEZE_DURATION + 1);

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        anomaly.reviewAndRelease(flagId);
    }

    function test_reviewAndRelease_reverts_freezeActive() public {
        uint256 flagId = _flagAnomaly();

        // Don't warp — freeze is still active
        AnomalyFlag memory flag = anomaly.getFlag(flagId);

        vm.prank(auditor);
        vm.expectRevert(abi.encodeWithSelector(FreezeWindowActive.selector, flagId, flag.freeze_until));
        anomaly.reviewAndRelease(flagId);
    }

    function test_reviewAndRelease_reverts_alreadyResolved() public {
        uint256 flagId = _flagAnomaly();
        vm.warp(block.timestamp + ANOMALY_FREEZE_DURATION + 1);

        vm.prank(auditor);
        anomaly.reviewAndRelease(flagId);

        // Try again
        vm.prank(auditor);
        vm.expectRevert(abi.encodeWithSelector(FlagAlreadyResolved.selector, flagId));
        anomaly.reviewAndRelease(flagId);
    }

    function test_reviewAndRelease_reverts_flagNotFound() public {
        vm.prank(auditor);
        vm.expectRevert(abi.encodeWithSelector(FlagNotFound.selector, 999));
        anomaly.reviewAndRelease(999);
    }

    // =========================================================================
    // reviewAndSlash — HAPPY PATH
    // =========================================================================

    function test_reviewAndSlash_success() public {
        uint256 flagId = _flagAnomaly();
        vm.warp(block.timestamp + ANOMALY_FREEZE_DURATION + 1);

        vm.prank(auditor);
        anomaly.reviewAndSlash(flagId);

        AnomalyFlag memory flag = anomaly.getFlag(flagId);
        assertTrue(flag.resolved);
        assertTrue(flag.slashed);

        // Contractor should be frozen
        assertTrue(anomaly.isContractorFrozen(contractor1));
        assertEq(anomaly.getSlashTotal(contractor1), STAKE_AMOUNT);
    }

    function test_reviewAndSlash_emitsEvent() public {
        uint256 flagId = _flagAnomaly();
        vm.warp(block.timestamp + ANOMALY_FREEZE_DURATION + 1);

        vm.expectEmit(true, true, false, true);
        emit ContractorSlashed(flagId, contractor1, STAKE_AMOUNT);

        vm.prank(auditor);
        anomaly.reviewAndSlash(flagId);
    }

    function test_reviewAndSlash_cumulativeSlash() public {
        // Flag twice, slash twice
        vm.prank(oracleAddr);
        anomaly.flagAnomaly(tenderId, bidId, REASON_HASH);

        vm.prank(oracleAddr);
        anomaly.flagAnomaly(tenderId, bidId, keccak256("second"));

        vm.warp(block.timestamp + ANOMALY_FREEZE_DURATION + 1);

        vm.startPrank(auditor);
        anomaly.reviewAndSlash(1);
        anomaly.reviewAndSlash(2);
        vm.stopPrank();

        // Slash total should be cumulative
        assertEq(anomaly.getSlashTotal(contractor1), STAKE_AMOUNT * 2);
    }

    // =========================================================================
    // reviewAndSlash — REVERT CASES
    // =========================================================================

    function test_reviewAndSlash_reverts_notAuditor() public {
        uint256 flagId = _flagAnomaly();
        vm.warp(block.timestamp + ANOMALY_FREEZE_DURATION + 1);

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        anomaly.reviewAndSlash(flagId);
    }

    function test_reviewAndSlash_reverts_freezeActive() public {
        uint256 flagId = _flagAnomaly();
        AnomalyFlag memory flag = anomaly.getFlag(flagId);

        vm.prank(auditor);
        vm.expectRevert(abi.encodeWithSelector(FreezeWindowActive.selector, flagId, flag.freeze_until));
        anomaly.reviewAndSlash(flagId);
    }

    function test_reviewAndSlash_reverts_alreadyResolved() public {
        uint256 flagId = _flagAnomaly();
        vm.warp(block.timestamp + ANOMALY_FREEZE_DURATION + 1);

        vm.prank(auditor);
        anomaly.reviewAndSlash(flagId);

        vm.prank(auditor);
        vm.expectRevert(abi.encodeWithSelector(FlagAlreadyResolved.selector, flagId));
        anomaly.reviewAndSlash(flagId);
    }

    // =========================================================================
    // ADMIN — unfreezeContractor
    // =========================================================================

    function test_unfreezeContractor_success() public {
        uint256 flagId = _flagAnomaly();
        vm.warp(block.timestamp + ANOMALY_FREEZE_DURATION + 1);

        vm.prank(auditor);
        anomaly.reviewAndSlash(flagId);
        assertTrue(anomaly.isContractorFrozen(contractor1));

        // Admin unfreezes
        vm.prank(admin);
        anomaly.unfreezeContractor(contractor1);
        assertFalse(anomaly.isContractorFrozen(contractor1));
    }

    function test_unfreezeContractor_reverts_notAdmin() public {
        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        anomaly.unfreezeContractor(contractor1);
    }

    // =========================================================================
    // PAUSE
    // =========================================================================

    function test_pause_blocksFlagAnomaly() public {
        vm.prank(admin);
        anomaly.pause();

        vm.prank(oracleAddr);
        vm.expectRevert(); // EnforcedPause
        anomaly.flagAnomaly(tenderId, bidId, REASON_HASH);
    }

    // =========================================================================
    // VIEW
    // =========================================================================

    function test_getFlag_reverts_notFound() public {
        vm.expectRevert(abi.encodeWithSelector(FlagNotFound.selector, 999));
        anomaly.getFlag(999);
    }

    function test_getFlagsByTender_empty() public view {
        uint256[] memory flags = anomaly.getFlagsByTender(tenderId);
        assertEq(flags.length, 0);
    }

    function test_isContractorFrozen_default() public view {
        assertFalse(anomaly.isContractorFrozen(contractor1));
    }

    // =========================================================================
    // FUZZ TESTS
    // =========================================================================

    function testFuzz_flagAnomaly_reasonHash(bytes32 reason) public {
        vm.assume(reason != bytes32(0));

        vm.prank(oracleAddr);
        anomaly.flagAnomaly(tenderId, bidId, reason);

        AnomalyFlag memory flag = anomaly.getFlag(1);
        assertEq(flag.reason_hash, reason);
    }
}

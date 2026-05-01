// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {TenderRegistry} from "../../src/core/TenderRegistry.sol";
import {BidEscrow} from "../../src/core/BidEscrow.sol";
import {MilestoneEscrow} from "../../src/core/MilestoneEscrow.sol";
import {MockZKPVerifier} from "../mocks/MockZKPVerifier.sol";
import {
    Milestone,
    MilestoneStatus,
    Tender,
    TenderStatus,
    GOVT_ROLE,
    ORACLE_ROLE,
    CONTRACTOR_ROLE,
    AUDITOR_ROLE,
    MULTISIG_THRESHOLD,
    DEFAULT_PROOF_WINDOW,
    COMMIT_WINDOW_BLOCKS,
    DEAD_MAN_GRACE_PERIOD
} from "../../src/Types.sol";
import {
    TenderNotFound,
    ZeroAddressNotAllowed,
    InvalidMilestoneStatus,
    InvalidMilestoneIndex,
    DuplicateSignature,
    UnauthorisedSigner,
    ProofWindowExpired,
    MilestonesAlreadyInitialized,
    TenderNotAllotted,
    ProofWindowNotExpired,
    IncorrectFundingAmount,
    MilestoneNotFound
} from "../../src/Types.sol";

/// @title MilestoneEscrowTest — Unit tests for MilestoneEscrow contract
/// @dev Tests cover: milestone initialization, proof submission, multi-sig signing,
///      dead man's switch, fund release/redistribution, access control, and fuzz tests.
contract MilestoneEscrowTest is Test {
    // Redeclare events for vm.expectEmit
    event MilestoneSubmitted(uint256 indexed tender_id, uint256 indexed milestone_id, uint256 milestone_index, bytes32 ipfs_hash, bytes32 gps_hash, uint256 timestamp);
    event MilestoneSigned(uint256 indexed milestone_id, address indexed signer, uint8 current_sig_count);
    event FundsReleased(uint256 indexed milestone_id, uint256 indexed tender_id, uint256 amount, address recipient);
    event FundsRedistributed(uint256 indexed milestone_id, uint256 indexed tender_id, uint256 amount, address recovery_address);
    event DeadManTriggered(uint256 indexed milestone_id, uint256 expired_at, address triggered_by);

    TenderRegistry public registry;
    BidEscrow public escrow;
    MilestoneEscrow public milestoneEscrow;
    MockZKPVerifier public mockZKP;

    address public admin = makeAddr("admin");
    address public govt = makeAddr("govt");
    address public oracle = makeAddr("oracle");
    address public auditor = makeAddr("auditor");
    address public contractor1 = makeAddr("contractor1");
    address public contractor2 = makeAddr("contractor2");
    address public hunter1 = makeAddr("hunter1");
    address public hunter2 = makeAddr("hunter2");
    address public randomUser = makeAddr("randomUser");

    bytes32 constant IPFS_HASH = keccak256("tender-document-v1");
    bytes32 constant PROOF_IPFS = keccak256("milestone-proof-v1");
    bytes32 constant GPS_HASH = keccak256("gps-location-data");
    uint256 constant BUDGET = 100 ether;
    uint8 constant MILESTONE_COUNT = 3;
    uint256 constant MIN_STAKE = 0.01 ether;

    uint256 public tenderId;

    function setUp() public {
        registry = new TenderRegistry();
        escrow = new BidEscrow();
        milestoneEscrow = new MilestoneEscrow();
        mockZKP = new MockZKPVerifier();

        registry.initialize(admin, govt);
        escrow.initialize(admin, address(registry), MIN_STAKE);
        milestoneEscrow.initialize(admin, address(registry));

        vm.startPrank(admin);
        registry.grantRole(ORACLE_ROLE, oracle);
        registry.setBidEscrowAddress(address(escrow));
        // TenderRegistry calls bidEscrow.lockWinnerStake() in allotWinner, needs admin role
        escrow.grantRole(escrow.DEFAULT_ADMIN_ROLE(), address(registry));
        vm.stopPrank();

        // Fund accounts
        vm.deal(contractor1, 10 ether);
        vm.deal(admin, 200 ether);
        vm.deal(govt, 200 ether);

        // Create and allot a tender
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        tenderId = registry.postTender(IPFS_HASH, BUDGET, deadline, MILESTONE_COUNT);

        _commitAndRevealBid(contractor1, tenderId, 80 ether, 0.5 ether);

        vm.warp(deadline + 1);
        vm.prank(govt);
        registry.closeBidding(tenderId);

        vm.prank(oracle);
        registry.allotWinner(tenderId, contractor1, hex"deadbeef", new uint256[](0));
    }

    function _commitAndRevealBid(address bidder, uint256 _tenderId, uint256 amount, uint256 stakeAmt) internal {
        bytes32 salt = keccak256(abi.encodePacked(bidder, amount));
        bytes32 commitHash = keccak256(abi.encodePacked(amount, salt));
        vm.prank(bidder);
        escrow.commitBid{value: stakeAmt}(_tenderId, commitHash);
        vm.roll(block.number + COMMIT_WINDOW_BLOCKS + 1);
        vm.prank(bidder);
        escrow.submitBid(_tenderId, amount, salt);
    }

    // =========================================================================
    // HELPER
    // =========================================================================

    function _initMilestones() internal {
        vm.prank(admin);
        milestoneEscrow.initializeMilestones{value: BUDGET}(tenderId);
    }

    function _initAndSubmitProof(uint256 milestoneIndex) internal {
        _initMilestones();
        vm.prank(contractor1);
        milestoneEscrow.submitMilestoneProof(tenderId, milestoneIndex, PROOF_IPFS, GPS_HASH);
    }

    function _setupSigners(uint256 milestoneId) internal {
        vm.startPrank(admin);
        milestoneEscrow.addAuthorizedSigner(milestoneId, auditor);
        milestoneEscrow.addAuthorizedSigner(milestoneId, hunter1);
        milestoneEscrow.addAuthorizedSigner(milestoneId, hunter2);
        vm.stopPrank();
    }

    // =========================================================================
    // initializeMilestones — HAPPY PATH
    // =========================================================================

    function test_initializeMilestones_success() public {
        _initMilestones();

        assertTrue(milestoneEscrow.isInitialized(tenderId));
        assertEq(milestoneEscrow.getMilestoneCount(), MILESTONE_COUNT);

        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        assertEq(ids.length, MILESTONE_COUNT);

        // Check budget split: 100 ether / 3 = 33.333... ether each, remainder to last
        uint256 expectedPerMilestone = BUDGET / MILESTONE_COUNT;
        uint256 remainder = BUDGET - (expectedPerMilestone * MILESTONE_COUNT);

        for (uint256 i = 0; i < MILESTONE_COUNT; i++) {
            Milestone memory m = milestoneEscrow.getMilestone(ids[i]);
            assertEq(m.tender_id, tenderId);
            assertEq(m.index, uint8(i));
            assertEq(uint256(m.status), uint256(MilestoneStatus.PENDING));
            assertEq(m.sig_count, 0);
            if (i == MILESTONE_COUNT - 1) {
                assertEq(m.fund_amount, expectedPerMilestone + remainder);
            } else {
                assertEq(m.fund_amount, expectedPerMilestone);
            }
        }

        assertEq(address(milestoneEscrow).balance, BUDGET);
    }

    function test_initializeMilestones_autoAuthorizesSigners() public {
        _initMilestones();
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);

        for (uint256 i = 0; i < ids.length; i++) {
            assertTrue(milestoneEscrow.isAuthorizedSigner(ids[i], govt));
            assertTrue(milestoneEscrow.isAuthorizedSigner(ids[i], contractor1));
        }
    }

    // =========================================================================
    // initializeMilestones — REVERT CASES
    // =========================================================================

    function test_initializeMilestones_reverts_doubleInit() public {
        _initMilestones();
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(MilestonesAlreadyInitialized.selector, tenderId));
        milestoneEscrow.initializeMilestones{value: BUDGET}(tenderId);
    }

    function test_initializeMilestones_reverts_tenderNotAllotted() public {
        // Create a new tender that is OPEN (not allotted)
        uint256 deadline2 = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tid2 = registry.postTender(keccak256("t2"), 50 ether, deadline2, 2);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(TenderNotAllotted.selector, tid2, TenderStatus.OPEN));
        milestoneEscrow.initializeMilestones{value: 50 ether}(tid2);
    }

    function test_initializeMilestones_reverts_wrongFunding() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IncorrectFundingAmount.selector, 50 ether, BUDGET));
        milestoneEscrow.initializeMilestones{value: 50 ether}(tenderId);
    }

    function test_initializeMilestones_reverts_notAdmin() public {
        vm.prank(randomUser);
        vm.expectRevert();
        milestoneEscrow.initializeMilestones{value: BUDGET}(tenderId);
    }

    // =========================================================================
    // submitMilestoneProof — HAPPY PATH
    // =========================================================================

    function test_submitMilestoneProof_success() public {
        _initMilestones();

        vm.prank(contractor1);
        milestoneEscrow.submitMilestoneProof(tenderId, 0, PROOF_IPFS, GPS_HASH);

        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        Milestone memory m = milestoneEscrow.getMilestone(ids[0]);

        assertEq(uint256(m.status), uint256(MilestoneStatus.SUBMITTED));
        assertEq(m.ipfs_hash, PROOF_IPFS);
        assertEq(m.gps_hash, GPS_HASH);
        assertEq(m.submit_time, block.timestamp);
    }

    function test_submitMilestoneProof_emitsEvent() public {
        _initMilestones();
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);

        vm.expectEmit(true, true, false, true);
        emit MilestoneSubmitted(tenderId, ids[0], 0, PROOF_IPFS, GPS_HASH, block.timestamp);

        vm.prank(contractor1);
        milestoneEscrow.submitMilestoneProof(tenderId, 0, PROOF_IPFS, GPS_HASH);
    }

    // =========================================================================
    // submitMilestoneProof — REVERT CASES
    // =========================================================================

    function test_submitMilestoneProof_reverts_notWinner() public {
        _initMilestones();
        vm.prank(contractor2);
        vm.expectRevert("Not winning contractor");
        milestoneEscrow.submitMilestoneProof(tenderId, 0, PROOF_IPFS, GPS_HASH);
    }

    function test_submitMilestoneProof_reverts_alreadySubmitted() public {
        _initAndSubmitProof(0);

        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        vm.expectRevert(abi.encodeWithSelector(InvalidMilestoneStatus.selector, ids[0], MilestoneStatus.SUBMITTED));
        vm.prank(contractor1);
        milestoneEscrow.submitMilestoneProof(tenderId, 0, PROOF_IPFS, GPS_HASH);
    }

    function test_submitMilestoneProof_reverts_expiredWindow() public {
        _initMilestones();
        vm.warp(block.timestamp + DEFAULT_PROOF_WINDOW + 1);

        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        Milestone memory m = milestoneEscrow.getMilestone(ids[0]);

        vm.prank(contractor1);
        vm.expectRevert(abi.encodeWithSelector(ProofWindowExpired.selector, ids[0], m.proof_window));
        milestoneEscrow.submitMilestoneProof(tenderId, 0, PROOF_IPFS, GPS_HASH);
    }

    function test_submitMilestoneProof_reverts_invalidIndex() public {
        _initMilestones();
        vm.prank(contractor1);
        vm.expectRevert(abi.encodeWithSelector(InvalidMilestoneIndex.selector, tenderId, 99, MILESTONE_COUNT));
        milestoneEscrow.submitMilestoneProof(tenderId, 99, PROOF_IPFS, GPS_HASH);
    }

    function test_submitMilestoneProof_reverts_emptyIpfs() public {
        _initMilestones();
        vm.prank(contractor1);
        vm.expectRevert(); // InvalidIPFSHash
        milestoneEscrow.submitMilestoneProof(tenderId, 0, bytes32(0), GPS_HASH);
    }

    // =========================================================================
    // signMilestone — HAPPY PATH
    // =========================================================================

    function test_signMilestone_success() public {
        _initAndSubmitProof(0);
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        uint256 mid = ids[0];

        vm.prank(govt);
        milestoneEscrow.signMilestone(mid);

        assertTrue(milestoneEscrow.hasSigned(mid, govt));
        Milestone memory m = milestoneEscrow.getMilestone(mid);
        assertEq(m.sig_count, 1);
    }

    function test_signMilestone_emitsEvent() public {
        _initAndSubmitProof(0);
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        uint256 mid = ids[0];

        vm.expectEmit(true, true, false, true);
        emit MilestoneSigned(mid, govt, 1);

        vm.prank(govt);
        milestoneEscrow.signMilestone(mid);
    }

    function test_signMilestone_thresholdReleasesFunds() public {
        _initAndSubmitProof(0);
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        uint256 mid = ids[0];
        _setupSigners(mid);

        // Sign 1: govt
        vm.prank(govt);
        milestoneEscrow.signMilestone(mid);

        // Sign 2: contractor
        vm.prank(contractor1);
        milestoneEscrow.signMilestone(mid);

        // Sign 3: auditor — should trigger release
        uint256 expectedAmount = BUDGET / MILESTONE_COUNT;

        vm.expectEmit(true, true, false, true);
        emit FundsReleased(mid, tenderId, expectedAmount, contractor1);

        vm.prank(auditor);
        milestoneEscrow.signMilestone(mid);

        Milestone memory m = milestoneEscrow.getMilestone(mid);
        assertEq(uint256(m.status), uint256(MilestoneStatus.APPROVED));
        assertEq(m.fund_amount, 0);
        assertEq(milestoneEscrow.getPendingWithdrawal(contractor1), expectedAmount);
    }

    function test_signMilestone_withdrawAfterRelease() public {
        _initAndSubmitProof(0);
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        uint256 mid = ids[0];
        _setupSigners(mid);

        vm.prank(govt);
        milestoneEscrow.signMilestone(mid);
        vm.prank(contractor1);
        milestoneEscrow.signMilestone(mid);
        vm.prank(auditor);
        milestoneEscrow.signMilestone(mid);

        uint256 expectedAmount = BUDGET / MILESTONE_COUNT;
        uint256 balBefore = contractor1.balance;

        vm.prank(contractor1);
        milestoneEscrow.withdrawFunds();

        assertEq(contractor1.balance, balBefore + expectedAmount);
        assertEq(milestoneEscrow.getPendingWithdrawal(contractor1), 0);
    }

    // =========================================================================
    // signMilestone — REVERT CASES
    // =========================================================================

    function test_signMilestone_reverts_notAuthorized() public {
        _initAndSubmitProof(0);
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);

        vm.prank(randomUser);
        vm.expectRevert(abi.encodeWithSelector(UnauthorisedSigner.selector, ids[0], randomUser));
        milestoneEscrow.signMilestone(ids[0]);
    }

    function test_signMilestone_reverts_duplicateSignature() public {
        _initAndSubmitProof(0);
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        uint256 mid = ids[0];

        vm.prank(govt);
        milestoneEscrow.signMilestone(mid);

        vm.prank(govt);
        vm.expectRevert(abi.encodeWithSelector(DuplicateSignature.selector, mid, govt));
        milestoneEscrow.signMilestone(mid);
    }

    function test_signMilestone_reverts_notSubmitted() public {
        _initMilestones();
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);

        vm.prank(govt);
        vm.expectRevert(abi.encodeWithSelector(InvalidMilestoneStatus.selector, ids[0], MilestoneStatus.PENDING));
        milestoneEscrow.signMilestone(ids[0]);
    }

    function test_signMilestone_reverts_milestoneNotFound() public {
        vm.prank(govt);
        vm.expectRevert(abi.encodeWithSelector(MilestoneNotFound.selector, 999));
        milestoneEscrow.signMilestone(999);
    }

    // =========================================================================
    // checkDeadManSwitch — HAPPY PATH
    // =========================================================================

    function test_checkDeadManSwitch_success() public {
        _initMilestones();
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        uint256 mid = ids[0];

        Milestone memory m = milestoneEscrow.getMilestone(mid);

        // Warp past proof window + grace period
        vm.warp(m.proof_window + DEAD_MAN_GRACE_PERIOD + 1);

        vm.expectEmit(true, false, false, true);
        emit DeadManTriggered(mid, m.proof_window, randomUser);

        vm.prank(randomUser);
        milestoneEscrow.checkDeadManSwitch(mid);

        Milestone memory mAfter = milestoneEscrow.getMilestone(mid);
        assertEq(uint256(mAfter.status), uint256(MilestoneStatus.REDISTRIBUTED));
        assertEq(mAfter.fund_amount, 0);

        // Govt should have pending withdrawal
        uint256 expectedAmount = BUDGET / MILESTONE_COUNT;
        assertEq(milestoneEscrow.getPendingWithdrawal(govt), expectedAmount);
    }

    function test_checkDeadManSwitch_emitsFundsRedistributed() public {
        _initMilestones();
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        uint256 mid = ids[0];
        uint256 expectedAmount = BUDGET / MILESTONE_COUNT;
        Milestone memory m = milestoneEscrow.getMilestone(mid);

        vm.warp(m.proof_window + DEAD_MAN_GRACE_PERIOD + 1);

        vm.expectEmit(true, true, false, true);
        emit FundsRedistributed(mid, tenderId, expectedAmount, govt);

        vm.prank(randomUser);
        milestoneEscrow.checkDeadManSwitch(mid);
    }

    function test_checkDeadManSwitch_govtCanWithdraw() public {
        _initMilestones();
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        Milestone memory m = milestoneEscrow.getMilestone(ids[0]);

        vm.warp(m.proof_window + DEAD_MAN_GRACE_PERIOD + 1);
        vm.prank(randomUser);
        milestoneEscrow.checkDeadManSwitch(ids[0]);

        uint256 expectedAmount = BUDGET / MILESTONE_COUNT;
        uint256 balBefore = govt.balance;

        vm.prank(govt);
        milestoneEscrow.withdrawFunds();

        assertEq(govt.balance, balBefore + expectedAmount);
    }

    // =========================================================================
    // checkDeadManSwitch — REVERT CASES
    // =========================================================================

    function test_checkDeadManSwitch_reverts_windowNotExpired() public {
        _initMilestones();
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);
        Milestone memory m = milestoneEscrow.getMilestone(ids[0]);

        vm.prank(randomUser);
        vm.expectRevert(abi.encodeWithSelector(ProofWindowNotExpired.selector, ids[0], m.proof_window));
        milestoneEscrow.checkDeadManSwitch(ids[0]);
    }

    function test_checkDeadManSwitch_reverts_alreadySubmitted() public {
        _initAndSubmitProof(0);
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);

        vm.warp(block.timestamp + DEFAULT_PROOF_WINDOW + 1);

        vm.prank(randomUser);
        vm.expectRevert(abi.encodeWithSelector(InvalidMilestoneStatus.selector, ids[0], MilestoneStatus.SUBMITTED));
        milestoneEscrow.checkDeadManSwitch(ids[0]);
    }

    // =========================================================================
    // PAUSE / UNPAUSE
    // =========================================================================

    function test_pause_blocksSubmitProof() public {
        _initMilestones();
        vm.prank(admin);
        milestoneEscrow.pause();

        vm.prank(contractor1);
        vm.expectRevert();
        milestoneEscrow.submitMilestoneProof(tenderId, 0, PROOF_IPFS, GPS_HASH);
    }

    function test_pause_blocksSignMilestone() public {
        _initAndSubmitProof(0);
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);

        vm.prank(admin);
        milestoneEscrow.pause();

        vm.prank(govt);
        vm.expectRevert();
        milestoneEscrow.signMilestone(ids[0]);
    }

    function test_pause_reverts_notAdmin() public {
        vm.prank(randomUser);
        vm.expectRevert();
        milestoneEscrow.pause();
    }

    // =========================================================================
    // ADMIN — addAuthorizedSigner / removeAuthorizedSigner
    // =========================================================================

    function test_addAuthorizedSigner_success() public {
        _initMilestones();
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);

        vm.prank(admin);
        milestoneEscrow.addAuthorizedSigner(ids[0], hunter1);

        assertTrue(milestoneEscrow.isAuthorizedSigner(ids[0], hunter1));
    }

    function test_removeAuthorizedSigner_success() public {
        _initMilestones();
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);

        vm.prank(admin);
        milestoneEscrow.addAuthorizedSigner(ids[0], hunter1);
        assertTrue(milestoneEscrow.isAuthorizedSigner(ids[0], hunter1));

        vm.prank(admin);
        milestoneEscrow.removeAuthorizedSigner(ids[0], hunter1);
        assertFalse(milestoneEscrow.isAuthorizedSigner(ids[0], hunter1));
    }

    function test_addAuthorizedSigner_reverts_notAdmin() public {
        _initMilestones();
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tenderId);

        vm.prank(randomUser);
        vm.expectRevert();
        milestoneEscrow.addAuthorizedSigner(ids[0], hunter1);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    function test_getMilestone_reverts_notFound() public {
        vm.expectRevert(abi.encodeWithSelector(MilestoneNotFound.selector, 999));
        milestoneEscrow.getMilestone(999);
    }

    function test_getMilestonesByTender_empty() public {
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(999);
        assertEq(ids.length, 0);
    }

    // =========================================================================
    // FUZZ TESTS
    // =========================================================================

    function testFuzz_initializeMilestones_budgetSplit(uint256 budget) public {
        vm.assume(budget > 0 && budget <= 1000 ether);
        uint8 mCount = 4;

        // Create new tender with fuzzed budget
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tid = registry.postTender(keccak256("fuzz"), budget, deadline, mCount);

        _commitAndRevealBid(contractor1, tid, budget, MIN_STAKE);

        vm.warp(deadline + 1);
        vm.prank(govt);
        registry.closeBidding(tid);

        vm.prank(oracle);
        registry.allotWinner(tid, contractor1, hex"aa", new uint256[](0));

        // Initialize milestones
        vm.deal(admin, budget);
        vm.prank(admin);
        milestoneEscrow.initializeMilestones{value: budget}(tid);

        // Verify total fund amounts equal budget
        uint256[] memory ids = milestoneEscrow.getMilestonesByTender(tid);
        uint256 totalFunds = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            totalFunds += milestoneEscrow.getMilestone(ids[i]).fund_amount;
        }
        assertEq(totalFunds, budget, "Total funds must equal budget");
    }
}

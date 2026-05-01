// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";

// Core
import {TenderRegistry} from "../../src/core/TenderRegistry.sol";
import {BidEscrow} from "../../src/core/BidEscrow.sol";
import {MilestoneEscrow} from "../../src/core/MilestoneEscrow.sol";

// Oracle
import {ScoringOracle} from "../../src/oracle/ScoringOracle.sol";
import {AnomalyOracle} from "../../src/oracle/AnomalyOracle.sol";

// Governance
import {BountyHunter} from "../../src/governance/BountyHunter.sol";
import {RatingLedger} from "../../src/governance/RatingLedger.sol";

// ZKP
import {ZKPController} from "../../src/zkp/ZKPController.sol";
import {Groth16Verifier} from "../../src/zkp/Groth16Verifier.sol";

// Mocks
import {MockVRFCoordinatorV2} from "../mocks/MockVRFCoordinatorV2.sol";

// Types
import {
    Tender, TenderStatus, Bid, BidStatus,
    Milestone, MilestoneStatus, BountyAssignment, BountyPhase,
    ContractorProfile, AnomalyFlag,
    GOVT_ROLE, ORACLE_ROLE, AUDITOR_ROLE, CONTRACTOR_ROLE, BOUNTY_HUNTER_ROLE,
    MULTISIG_THRESHOLD, MIN_BOUNTY_HUNTER_STAKE,
    COMMIT_WINDOW_BLOCKS, DEAD_MAN_GRACE_PERIOD
} from "../../src/Types.sol";

/// @title FullLifecycle — End-to-End Integration Test
/// @notice Tests the complete GovChain flow: tender → bid → score → allot → milestone → review → payout
/// @dev Deploys all 8 contracts, wires them together, and runs the full happy path
contract FullLifecycleTest is Test {

    // ─── Contracts ───────────────────────────────────────
    TenderRegistry public tenderRegistry;
    BidEscrow public bidEscrow;
    MilestoneEscrow public milestoneEscrow;
    ScoringOracle public scoringOracle;
    AnomalyOracle public anomalyOracle;
    BountyHunter public bountyHunter;
    RatingLedger public ratingLedger;
    ZKPController public zkpController;
    Groth16Verifier public verifier;
    MockVRFCoordinatorV2 public mockVRF;

    // ─── Actors ──────────────────────────────────────────
    address public admin = makeAddr("admin");
    address public govt = makeAddr("govt");
    address public oracle = makeAddr("oracle");
    address public auditor = makeAddr("auditor");
    address public contractor1 = makeAddr("contractor1");
    address public contractor2 = makeAddr("contractor2");
    address public hunter1 = makeAddr("hunter1");
    address public hunter2 = makeAddr("hunter2");
    address public hunter3 = makeAddr("hunter3");

    // ─── Test Constants ──────────────────────────────────
    bytes32 constant IPFS_HASH = keccak256("QmTenderDocument2026");
    uint256 constant BUDGET = 10 ether;
    uint256 constant BID_AMOUNT_1 = 8 ether;
    uint256 constant BID_AMOUNT_2 = 9 ether;
    uint256 constant STAKE = 0.5 ether;
    uint256 constant MIN_BID_STAKE = 0.1 ether;

    function setUp() public {
        vm.deal(contractor1, 100 ether);
        vm.deal(contractor2, 100 ether);
        vm.deal(hunter1, 10 ether);
        vm.deal(hunter2, 10 ether);
        vm.deal(hunter3, 10 ether);
        vm.deal(admin, 100 ether);
        vm.deal(govt, 100 ether);

        // ─── Deploy all contracts ────────────────────────
        mockVRF = new MockVRFCoordinatorV2();

        tenderRegistry = new TenderRegistry();
        tenderRegistry.initialize(admin, govt);

        bidEscrow = new BidEscrow();
        bidEscrow.initialize(admin, address(tenderRegistry), MIN_BID_STAKE);

        milestoneEscrow = new MilestoneEscrow();
        milestoneEscrow.initialize(admin, address(tenderRegistry));

        scoringOracle = new ScoringOracle();
        scoringOracle.initialize(admin, address(tenderRegistry), address(bidEscrow));

        anomalyOracle = new AnomalyOracle();
        anomalyOracle.initialize(admin, address(bidEscrow), address(tenderRegistry));

        bountyHunter = new BountyHunter(address(mockVRF));
        bountyHunter.initialize(admin, 1, bytes32(uint256(1)), 3, 500000);

        ratingLedger = new RatingLedger();
        ratingLedger.initialize(admin);

        verifier = new Groth16Verifier();
        zkpController = new ZKPController();
        zkpController.initialize(admin, address(verifier));

        // ─── Wire cross-contract references ──────────────
        vm.startPrank(admin);
        tenderRegistry.setBidEscrowAddress(address(bidEscrow));
        // TenderRegistry needs admin role on BidEscrow for lockWinnerStake in allotWinner
        bidEscrow.grantRole(bidEscrow.DEFAULT_ADMIN_ROLE(), address(tenderRegistry));

        // Grant roles
        tenderRegistry.grantRole(ORACLE_ROLE, oracle);
        bidEscrow.grantRole(ORACLE_ROLE, oracle);
        scoringOracle.grantRole(ORACLE_ROLE, oracle);
        anomalyOracle.grantRole(ORACLE_ROLE, oracle);
        anomalyOracle.grantRole(AUDITOR_ROLE, auditor);
        milestoneEscrow.grantRole(GOVT_ROLE, govt);
        ratingLedger.grantRole(ORACLE_ROLE, oracle);
        ratingLedger.grantRole(AUDITOR_ROLE, auditor);
        zkpController.grantRole(ORACLE_ROLE, oracle);

        // Initialize contractor profiles
        ratingLedger.initializeProfile(contractor1);
        ratingLedger.initializeProfile(contractor2);
        vm.stopPrank();
    }

    /// @dev Helper: commit-reveal bid flow
    function _commitAndRevealBid(address bidder, uint256 _tenderId, uint256 amount, uint256 stakeAmt) internal returns (uint256 bidId) {
        bytes32 salt = keccak256(abi.encodePacked(bidder, amount));
        bytes32 commitHash = keccak256(abi.encodePacked(amount, salt));
        vm.prank(bidder);
        bidEscrow.commitBid{value: stakeAmt}(_tenderId, commitHash);
        vm.roll(block.number + COMMIT_WINDOW_BLOCKS + 1);
        vm.prank(bidder);
        bidId = bidEscrow.submitBid(_tenderId, amount, salt);
    }

    // =========================================================================
    // FULL HAPPY PATH: Tender → Bid → Score → Allot → Milestone → Payout
    // =========================================================================

    function test_fullLifecycle_happyPath() public {
        // ─── Phase 1: Post Tender ────────────────────────
        uint256 deadline = block.timestamp + 7 days;

        vm.prank(govt);
        uint256 tenderId = tenderRegistry.postTender(IPFS_HASH, BUDGET, deadline, 2);

        assertEq(tenderId, 1);
        Tender memory tender = tenderRegistry.getTender(tenderId);
        assertEq(uint256(tender.status), uint256(TenderStatus.OPEN));

        // ─── Phase 2: Submit Bids (commit-reveal) ────────
        uint256 bidId1 = _commitAndRevealBid(contractor1, tenderId, BID_AMOUNT_1, STAKE);
        uint256 bidId2 = _commitAndRevealBid(contractor2, tenderId, BID_AMOUNT_2, STAKE);

        assertEq(bidId1, 1);
        assertEq(bidId2, 2);

        // ─── Phase 3: Close Bidding ──────────────────────
        vm.warp(deadline + 1);

        vm.prank(govt);
        tenderRegistry.closeBidding(tenderId);

        assertEq(uint256(tenderRegistry.getTenderStatus(tenderId)), uint256(TenderStatus.CLOSED));

        // ─── Phase 4: ML Scoring ─────────────────────────
        // Scores: scaled by ZKP_SCALING_FACTOR (1e6). Valid range: [1_000_000, 100_000_000]
        vm.startPrank(oracle);
        scoringOracle.recordScore(tenderId, bidId1, 85_000_000, "", new uint256[](0));
        scoringOracle.recordScore(tenderId, bidId2, 72_000_000, "", new uint256[](0));
        vm.stopPrank();

        assertEq(scoringOracle.getScore(bidId1), 85_000_000);
        assertEq(scoringOracle.getScore(bidId2), 72_000_000);

        // ─── Phase 5: Allot Winner ───────────────────────
        vm.prank(oracle);
        tenderRegistry.allotWinner(tenderId, contractor1, "", new uint256[](0));

        assertEq(tenderRegistry.getWinner(tenderId), contractor1);
        assertEq(uint256(tenderRegistry.getTenderStatus(tenderId)), uint256(TenderStatus.ALLOTTED));

        // lockWinnerStake and markLosers are now called internally by allotWinner

        Bid memory winBid = bidEscrow.getBid(bidId1);
        Bid memory loseBid = bidEscrow.getBid(bidId2);
        assertEq(uint256(winBid.status), uint256(BidStatus.WON));
        assertEq(uint256(loseBid.status), uint256(BidStatus.LOST));

        // ─── Phase 6: Loser Claims Refund ────────────────
        uint256 c2BalanceBefore = contractor2.balance;
        vm.prank(contractor2);
        bidEscrow.claimRefund(bidId2);
        assertEq(contractor2.balance, c2BalanceBefore + STAKE);

        // ─── Phase 7: Initialize Milestones ──────────────
        vm.prank(admin);
        milestoneEscrow.initializeMilestones{value: BUDGET}(tenderId);

        assertTrue(milestoneEscrow.isInitialized(tenderId));
        uint256[] memory msIds = milestoneEscrow.getMilestonesByTender(tenderId);
        assertEq(msIds.length, 2);

        // ─── Phase 8: Authorize Signers ──────────────────
        vm.startPrank(admin);
        milestoneEscrow.grantRole(CONTRACTOR_ROLE, contractor1);
        milestoneEscrow.grantRole(AUDITOR_ROLE, auditor);
        milestoneEscrow.grantRole(BOUNTY_HUNTER_ROLE, hunter1);
        milestoneEscrow.grantRole(BOUNTY_HUNTER_ROLE, hunter2);

        // Authorize all signers for milestone 1
        milestoneEscrow.addAuthorizedSigner(msIds[0], govt);
        milestoneEscrow.addAuthorizedSigner(msIds[0], contractor1);
        milestoneEscrow.addAuthorizedSigner(msIds[0], auditor);
        milestoneEscrow.addAuthorizedSigner(msIds[0], hunter1);
        milestoneEscrow.addAuthorizedSigner(msIds[0], hunter2);
        vm.stopPrank();

        // ─── Phase 9: Submit Milestone Proof ─────────────
        bytes32 proofHash = keccak256("QmDeliverableProof001");
        bytes32 gpsHash = keccak256("28.6139,77.2090");

        vm.prank(contractor1);
        milestoneEscrow.submitMilestoneProof(tenderId, 0, proofHash, gpsHash);

        Milestone memory ms = milestoneEscrow.getMilestone(msIds[0]);
        assertEq(uint256(ms.status), uint256(MilestoneStatus.SUBMITTED));

        // ─── Phase 10: Multi-sig Approval (3 of 5) ──────
        vm.prank(govt);
        milestoneEscrow.signMilestone(msIds[0]);

        vm.prank(auditor);
        milestoneEscrow.signMilestone(msIds[0]);

        vm.prank(hunter1);
        milestoneEscrow.signMilestone(msIds[0]);

        // 3/5 reached — funds should be credited to contractor
        ms = milestoneEscrow.getMilestone(msIds[0]);
        assertEq(uint256(ms.status), uint256(MilestoneStatus.APPROVED));

        // ─── Phase 11: Contractor Withdraws Funds ────────
        uint256 pendingAmount = milestoneEscrow.getPendingWithdrawal(contractor1);
        assertTrue(pendingAmount > 0, "Contractor should have pending withdrawal");

        uint256 c1BalanceBefore = contractor1.balance;
        vm.prank(contractor1);
        milestoneEscrow.withdrawFunds();
        assertEq(contractor1.balance, c1BalanceBefore + pendingAmount);

        // ─── Phase 12: Update Contractor Rating ──────────
        vm.prank(oracle);
        ratingLedger.updateRating(contractor1, 850_000, 5000);

        ContractorProfile memory profile = ratingLedger.getRating(contractor1);
        assertEq(profile.rating, 850_000);
        assertEq(profile.completion_rate, 5000);
        assertEq(profile.tender_count, 1);
    }

    // =========================================================================
    // ANOMALY FLOW: Bid → Flag → Freeze → Slash
    // =========================================================================

    function test_anomalyFlow_flagAndSlash() public {
        // Setup: post tender and submit bid
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = tenderRegistry.postTender(IPFS_HASH, BUDGET, deadline, 1);

        uint256 bidId = _commitAndRevealBid(contractor1, tenderId, BID_AMOUNT_1, STAKE);

        // Close bidding
        vm.warp(deadline + 1);
        vm.prank(govt);
        tenderRegistry.closeBidding(tenderId);

        // Flag anomaly
        bytes32 reasonHash = keccak256("Suspicious bid pattern detected");
        vm.prank(oracle);
        anomalyOracle.flagAnomaly(tenderId, bidId, reasonHash);

        AnomalyFlag memory flag = anomalyOracle.getFlag(1);
        assertEq(flag.tender_id, tenderId);
        assertFalse(flag.resolved);

        // Wait 72h and slash
        vm.warp(block.timestamp + 73 hours);

        vm.prank(auditor);
        anomalyOracle.reviewAndSlash(1);

        assertTrue(anomalyOracle.isContractorFrozen(contractor1));
        assertTrue(anomalyOracle.getFlag(1).slashed);

        // Freeze in RatingLedger
        vm.prank(auditor);
        ratingLedger.freezeContractor(contractor1);

        assertTrue(ratingLedger.isFrozen(contractor1));
    }

    // =========================================================================
    // BOUNTY HUNTER FLOW: Register → Assign → Commit → Reveal
    // =========================================================================

    function test_bountyHunterFlow_commitReveal() public {
        // Register hunters
        vm.prank(hunter1);
        bountyHunter.register{value: MIN_BOUNTY_HUNTER_STAKE}();

        vm.prank(hunter2);
        bountyHunter.register{value: MIN_BOUNTY_HUNTER_STAKE}();

        assertEq(bountyHunter.getActiveHunterCount(), 2);

        // Assign to milestone via VRF
        vm.prank(admin);
        bountyHunter.requestHunterAssignment(100);

        // Fulfill VRF
        uint256 reqId = mockVRF.getLastRequestId();
        uint256[] memory words = new uint256[](1);
        words[0] = uint256(keccak256(abi.encodePacked(uint256(100), "vrf_seed")));
        mockVRF.fulfillRandomWords(reqId, words);

        uint256 assignmentId = bountyHunter.getAssignmentByMilestone(100);
        BountyAssignment memory a = bountyHunter.getAssignment(assignmentId);
        assertEq(uint256(a.phase), uint256(BountyPhase.COMMITTED));

        // Commit reviews
        uint8 rating1 = 8;
        uint8 rating2 = 7;
        bytes32 salt1 = bytes32("hunter1_secret_salt");
        bytes32 salt2 = bytes32("hunter2_secret_salt");

        vm.prank(a.hunters[0]);
        bountyHunter.commitReview(assignmentId, keccak256(abi.encodePacked(rating1, salt1)));

        vm.prank(a.hunters[1]);
        bountyHunter.commitReview(assignmentId, keccak256(abi.encodePacked(rating2, salt2)));

        // Should advance to REVEALED
        assertEq(uint256(bountyHunter.getAssignment(assignmentId).phase), uint256(BountyPhase.REVEALED));

        // Reveal reviews
        vm.prank(a.hunters[0]);
        bountyHunter.revealReview(assignmentId, rating1, salt1);

        vm.prank(a.hunters[1]);
        bountyHunter.revealReview(assignmentId, rating2, salt2);

        // Should be COMPLETED with ratings recorded
        BountyAssignment memory finalA = bountyHunter.getAssignment(assignmentId);
        assertEq(uint256(finalA.phase), uint256(BountyPhase.COMPLETED));
        assertEq(finalA.ratings[0], rating1);
        assertEq(finalA.ratings[1], rating2);
    }

    // =========================================================================
    // ZKP FLOW: KYC Verify → Score Proof → Nullifier Check
    // =========================================================================

    function test_zkpFlow_fullVerification() public {
        /// @dev BN254 scalar field — public signals must be < this
        uint256 SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

        // KYC verification — use in-field values
        uint256[2] memory proofA = [uint256(100), uint256(200)];
        uint256[2][2] memory proofB = [[uint256(300), uint256(400)], [uint256(500), uint256(600)]];
        uint256[2] memory proofC = [uint256(700), uint256(800)];

        uint256 identityInField = uint256(keccak256("contractor1-kyc")) % SNARK_SCALAR_FIELD;
        uint256[] memory kycInputs = new uint256[](1);
        kycInputs[0] = identityInField;

        vm.prank(oracle);
        zkpController.verifyKYC(contractor1, proofA, proofB, proofC, kycInputs);
        assertTrue(zkpController.isKYCVerified(contractor1));

        // Score proof — must use encoded proof bytes (not empty)
        uint256[] memory scoreInputs = new uint256[](3);
        scoreInputs[0] = 1; // tender_id
        scoreInputs[1] = 1; // bid_id
        scoreInputs[2] = 850_000; // declared_score

        bytes memory encodedProof = abi.encode(proofA, proofB, proofC);
        vm.prank(oracle);
        bool valid = zkpController.verifyScoreProof(1, 1, encodedProof, scoreInputs);
        assertTrue(valid);

        // Nullifier (invoice) — use in-field values
        uint256 nullInField = uint256(keccak256("invoice-001")) % SNARK_SCALAR_FIELD;
        uint256 commitInField = uint256(keccak256("commitment-001")) % SNARK_SCALAR_FIELD;
        uint256[] memory nullInputs = new uint256[](2);
        nullInputs[0] = nullInField;
        nullInputs[1] = commitInField;

        vm.prank(oracle);
        zkpController.verifyNullifier(1, proofA, proofB, proofC, nullInputs);
        assertTrue(zkpController.isNullifierUsed(bytes32(nullInField)));

        // Double-submit should revert
        uint256[2] memory proofA2 = [uint256(101), uint256(201)];
        uint256[2][2] memory proofB2 = [[uint256(301), uint256(401)], [uint256(501), uint256(601)]];
        uint256[2] memory proofC2 = [uint256(701), uint256(801)];
        vm.prank(oracle);
        vm.expectRevert(); // NullifierAlreadyUsed
        zkpController.verifyNullifier(2, proofA2, proofB2, proofC2, nullInputs);
    }

    // =========================================================================
    // DEAD MAN'S SWITCH — Proof window expired
    // =========================================================================

    function test_deadManSwitch_redistributesFunds() public {
        // Setup: full flow up to milestone init
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = tenderRegistry.postTender(IPFS_HASH, BUDGET, deadline, 1);

        _commitAndRevealBid(contractor1, tenderId, BID_AMOUNT_1, STAKE);

        vm.warp(deadline + 1);
        vm.prank(govt);
        tenderRegistry.closeBidding(tenderId);

        vm.prank(oracle);
        tenderRegistry.allotWinner(tenderId, contractor1, "", new uint256[](0));

        vm.startPrank(admin);
        milestoneEscrow.initializeMilestones{value: BUDGET}(tenderId);
        vm.stopPrank();

        uint256[] memory msIds = milestoneEscrow.getMilestonesByTender(tenderId);

        // Skip past proof window + grace period
        vm.warp(block.timestamp + 31 days + DEAD_MAN_GRACE_PERIOD);

        // Anyone can trigger dead man's switch
        milestoneEscrow.checkDeadManSwitch(msIds[0]);

        Milestone memory ms = milestoneEscrow.getMilestone(msIds[0]);
        assertEq(uint256(ms.status), uint256(MilestoneStatus.REDISTRIBUTED));
    }

    // =========================================================================
    // CROSS-CONTRACT VALIDATION: Bid on non-OPEN tender reverts
    // =========================================================================

    function test_crossContract_bidOnClosedTenderReverts() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(govt);
        uint256 tenderId = tenderRegistry.postTender(IPFS_HASH, BUDGET, deadline, 1);

        // Close bidding
        vm.warp(deadline + 1);
        vm.prank(govt);
        tenderRegistry.closeBidding(tenderId);

        // Try to commit bid on closed tender
        vm.prank(contractor1);
        vm.expectRevert(); // TenderNotOpen
        bidEscrow.commitBid{value: STAKE}(tenderId, keccak256("test"));
    }
}

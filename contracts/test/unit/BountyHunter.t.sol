// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {BountyHunter} from "../../src/governance/BountyHunter.sol";
import {MockVRFCoordinatorV2} from "../mocks/MockVRFCoordinatorV2.sol";
import {
    BountyAssignment,
    BountyPhase,
    MIN_BOUNTY_HUNTER_STAKE,
    BOUNTY_HUNTERS_PER_MILESTONE
} from "../../src/Types.sol";
import {
    InsufficientStake,
    HunterAlreadyRegistered,
    HunterNotRegistered,
    AssignmentNotFound,
    NotAssignedHunter,
    InvalidBountyPhase,
    CommitRevealMismatch,
    InvalidRating,
    InsufficientHunterPool
} from "../../src/Types.sol";

/// @title BountyHunterTest — Unit tests for BountyHunter contract
contract BountyHunterTest is Test {
    // Redeclare events
    event HunterRegistered(address indexed hunter, uint256 stake_amount);
    event HuntersAssigned(uint256 indexed milestone_id, uint256 assignment_id, address hunter_1, address hunter_2);
    event ReviewCommitted(uint256 indexed assignment_id, address indexed hunter, bytes32 commit_hash);
    event ReviewRevealed(uint256 indexed assignment_id, address indexed hunter, uint8 rating);
    event HunterSlashed(address indexed hunter, uint256 slash_amount, string reason);

    BountyHunter public bounty;
    MockVRFCoordinatorV2 public mockVRF;

    address public admin = makeAddr("admin");
    address public hunter1 = makeAddr("hunter1");
    address public hunter2 = makeAddr("hunter2");
    address public hunter3 = makeAddr("hunter3");
    address public randomUser = makeAddr("randomUser");

    // VRF config for tests
    uint64 constant SUB_ID = 1;
    bytes32 constant KEY_HASH = bytes32(uint256(1));
    uint16 constant CONFIRMATIONS = 3;
    uint32 constant CALLBACK_GAS = 500000;

    function setUp() public {
        mockVRF = new MockVRFCoordinatorV2();
        bounty = new BountyHunter(address(mockVRF));
        bounty.initialize(admin, SUB_ID, KEY_HASH, CONFIRMATIONS, CALLBACK_GAS);

        vm.deal(hunter1, 10 ether);
        vm.deal(hunter2, 10 ether);
        vm.deal(hunter3, 10 ether);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    function _registerHunter(address h, uint256 stake) internal {
        vm.prank(h);
        bounty.register{value: stake}();
    }

    function _registerTwoHunters() internal {
        _registerHunter(hunter1, MIN_BOUNTY_HUNTER_STAKE);
        _registerHunter(hunter2, MIN_BOUNTY_HUNTER_STAKE);
    }

    function _assignAndGetId(uint256 milestone_id) internal returns (uint256) {
        vm.prank(admin);
        bounty.requestHunterAssignment(milestone_id);

        // Fulfill VRF with a deterministic random word
        uint256 reqId = mockVRF.getLastRequestId();
        uint256[] memory words = new uint256[](1);
        words[0] = uint256(keccak256(abi.encodePacked(milestone_id, "vrf_seed")));
        mockVRF.fulfillRandomWords(reqId, words);

        return bounty.getAssignmentByMilestone(milestone_id);
    }

    // =========================================================================
    // register — HAPPY PATH
    // =========================================================================

    function test_register_success() public {
        _registerHunter(hunter1, MIN_BOUNTY_HUNTER_STAKE);

        assertTrue(bounty.isRegistered(hunter1));
        assertEq(bounty.getHunterStake(hunter1), MIN_BOUNTY_HUNTER_STAKE);
        assertEq(bounty.getHunterPoolSize(), 1);
    }

    function test_register_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit HunterRegistered(hunter1, MIN_BOUNTY_HUNTER_STAKE);

        vm.prank(hunter1);
        bounty.register{value: MIN_BOUNTY_HUNTER_STAKE}();
    }

    function test_register_multipleHunters() public {
        _registerTwoHunters();
        _registerHunter(hunter3, 0.05 ether);

        assertEq(bounty.getHunterPoolSize(), 3);
        assertEq(bounty.getActiveHunterCount(), 3);
    }

    // =========================================================================
    // register — REVERT CASES
    // =========================================================================

    function test_register_reverts_alreadyRegistered() public {
        _registerHunter(hunter1, MIN_BOUNTY_HUNTER_STAKE);

        vm.prank(hunter1);
        vm.expectRevert(abi.encodeWithSelector(HunterAlreadyRegistered.selector, hunter1));
        bounty.register{value: MIN_BOUNTY_HUNTER_STAKE}();
    }

    function test_register_reverts_insufficientStake() public {
        vm.prank(hunter1);
        vm.expectRevert(abi.encodeWithSelector(InsufficientStake.selector, 0.001 ether, MIN_BOUNTY_HUNTER_STAKE));
        bounty.register{value: 0.001 ether}();
    }

    // =========================================================================
    // requestHunterAssignment — HAPPY PATH
    // =========================================================================

    function test_requestHunterAssignment_success() public {
        _registerTwoHunters();

        uint256 aid = _assignAndGetId(100);

        BountyAssignment memory a = bounty.getAssignment(aid);
        assertEq(a.milestone_id, 100);
        assertEq(uint256(a.phase), uint256(BountyPhase.COMMITTED));
        assertTrue(a.hunters[0] != address(0));
        assertTrue(a.hunters[1] != address(0));
        assertTrue(a.hunters[0] != a.hunters[1]);
    }

    function test_requestHunterAssignment_emitsEvent() public {
        _registerTwoHunters();

        vm.prank(admin);
        bounty.requestHunterAssignment(100);

        // Fulfill VRF
        uint256 reqId = mockVRF.getLastRequestId();
        uint256[] memory words = new uint256[](1);
        words[0] = uint256(keccak256(abi.encodePacked(uint256(100), "vrf_seed")));
        mockVRF.fulfillRandomWords(reqId, words);

        assertEq(bounty.getAssignmentByMilestone(100), 1);
    }

    // =========================================================================
    // requestHunterAssignment — REVERT CASES
    // =========================================================================

    function test_requestHunterAssignment_reverts_insufficientPool() public {
        _registerHunter(hunter1, MIN_BOUNTY_HUNTER_STAKE);
        // Only 1 hunter, need 2

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(InsufficientHunterPool.selector, 1, BOUNTY_HUNTERS_PER_MILESTONE));
        bounty.requestHunterAssignment(100);
    }

    function test_requestHunterAssignment_reverts_notAdmin() public {
        _registerTwoHunters();

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        bounty.requestHunterAssignment(100);
    }

    // =========================================================================
    // commitReview — HAPPY PATH
    // =========================================================================

    function test_commitReview_success() public {
        _registerTwoHunters();
        uint256 aid = _assignAndGetId(100);

        BountyAssignment memory a = bounty.getAssignment(aid);
        address assignedHunter = a.hunters[0];

        bytes32 commit = keccak256(abi.encodePacked(uint8(7), bytes32("mysalt")));

        vm.prank(assignedHunter);
        bounty.commitReview(aid, commit);

        BountyAssignment memory updated = bounty.getAssignment(aid);
        assertEq(updated.commit_hashes[0], commit);
    }

    function test_commitReview_bothHunters_advancesPhase() public {
        _registerTwoHunters();
        uint256 aid = _assignAndGetId(100);

        BountyAssignment memory a = bounty.getAssignment(aid);

        bytes32 commit1 = keccak256(abi.encodePacked(uint8(7), bytes32("salt1")));
        bytes32 commit2 = keccak256(abi.encodePacked(uint8(8), bytes32("salt2")));

        vm.prank(a.hunters[0]);
        bounty.commitReview(aid, commit1);

        // Still in COMMITTED phase
        assertEq(uint256(bounty.getAssignment(aid).phase), uint256(BountyPhase.COMMITTED));

        vm.prank(a.hunters[1]);
        bounty.commitReview(aid, commit2);

        // Now should be REVEALED
        assertEq(uint256(bounty.getAssignment(aid).phase), uint256(BountyPhase.REVEALED));
    }

    // =========================================================================
    // commitReview — REVERT CASES
    // =========================================================================

    function test_commitReview_reverts_notAssigned() public {
        _registerTwoHunters();
        _registerHunter(hunter3, MIN_BOUNTY_HUNTER_STAKE);
        uint256 aid = _assignAndGetId(100);

        BountyAssignment memory a = bounty.getAssignment(aid);
        // hunter3 is registered but not assigned
        if (a.hunters[0] != hunter3 && a.hunters[1] != hunter3) {
            vm.prank(hunter3);
            vm.expectRevert(abi.encodeWithSelector(NotAssignedHunter.selector, aid, hunter3));
            bounty.commitReview(aid, keccak256("test"));
        }
    }

    // =========================================================================
    // revealReview — HAPPY PATH
    // =========================================================================

    function test_revealReview_fullFlow() public {
        _registerTwoHunters();
        uint256 aid = _assignAndGetId(100);

        BountyAssignment memory a = bounty.getAssignment(aid);

        uint8 rating1 = 7;
        uint8 rating2 = 8;
        bytes32 salt1 = bytes32("salt1");
        bytes32 salt2 = bytes32("salt2");

        // Commit phase
        vm.prank(a.hunters[0]);
        bounty.commitReview(aid, keccak256(abi.encodePacked(rating1, salt1)));

        vm.prank(a.hunters[1]);
        bounty.commitReview(aid, keccak256(abi.encodePacked(rating2, salt2)));

        // Should now be in REVEALED phase
        assertEq(uint256(bounty.getAssignment(aid).phase), uint256(BountyPhase.REVEALED));

        // Reveal phase
        vm.prank(a.hunters[0]);
        bounty.revealReview(aid, rating1, salt1);

        vm.prank(a.hunters[1]);
        bounty.revealReview(aid, rating2, salt2);

        // Should now be COMPLETED
        BountyAssignment memory final_a = bounty.getAssignment(aid);
        assertEq(uint256(final_a.phase), uint256(BountyPhase.COMPLETED));
        assertEq(final_a.ratings[0], rating1);
        assertEq(final_a.ratings[1], rating2);
    }

    function test_revealReview_emitsEvent() public {
        _registerTwoHunters();
        uint256 aid = _assignAndGetId(100);
        BountyAssignment memory a = bounty.getAssignment(aid);

        uint8 rating = 9;
        bytes32 salt = bytes32("reveal_salt");

        // Commit both
        vm.prank(a.hunters[0]);
        bounty.commitReview(aid, keccak256(abi.encodePacked(rating, salt)));
        vm.prank(a.hunters[1]);
        bounty.commitReview(aid, keccak256(abi.encodePacked(uint8(5), bytes32("other"))));

        // Reveal hunter[0]
        vm.expectEmit(true, true, false, true);
        emit ReviewRevealed(aid, a.hunters[0], rating);

        vm.prank(a.hunters[0]);
        bounty.revealReview(aid, rating, salt);
    }

    // =========================================================================
    // revealReview — REVERT CASES
    // =========================================================================

    function test_revealReview_reverts_hashMismatch() public {
        _registerTwoHunters();
        uint256 aid = _assignAndGetId(100);
        BountyAssignment memory a = bounty.getAssignment(aid);

        // Commit
        vm.prank(a.hunters[0]);
        bounty.commitReview(aid, keccak256(abi.encodePacked(uint8(7), bytes32("real_salt"))));
        vm.prank(a.hunters[1]);
        bounty.commitReview(aid, keccak256(abi.encodePacked(uint8(5), bytes32("other"))));

        // Reveal with wrong salt
        vm.prank(a.hunters[0]);
        vm.expectRevert(abi.encodeWithSelector(CommitRevealMismatch.selector, aid, a.hunters[0]));
        bounty.revealReview(aid, 7, bytes32("wrong_salt"));
    }

    function test_revealReview_reverts_invalidRating_zero() public {
        _registerTwoHunters();
        uint256 aid = _assignAndGetId(100);
        BountyAssignment memory a = bounty.getAssignment(aid);

        // Commit both
        vm.prank(a.hunters[0]);
        bounty.commitReview(aid, keccak256(abi.encodePacked(uint8(0), bytes32("s"))));
        vm.prank(a.hunters[1]);
        bounty.commitReview(aid, keccak256(abi.encodePacked(uint8(5), bytes32("s2"))));

        vm.prank(a.hunters[0]);
        vm.expectRevert(abi.encodeWithSelector(InvalidRating.selector, 0));
        bounty.revealReview(aid, 0, bytes32("s"));
    }

    function test_revealReview_reverts_invalidRating_eleven() public {
        _registerTwoHunters();
        uint256 aid = _assignAndGetId(100);
        BountyAssignment memory a = bounty.getAssignment(aid);

        vm.prank(a.hunters[0]);
        bounty.commitReview(aid, keccak256(abi.encodePacked(uint8(11), bytes32("s"))));
        vm.prank(a.hunters[1]);
        bounty.commitReview(aid, keccak256(abi.encodePacked(uint8(5), bytes32("s2"))));

        vm.prank(a.hunters[0]);
        vm.expectRevert(abi.encodeWithSelector(InvalidRating.selector, 11));
        bounty.revealReview(aid, 11, bytes32("s"));
    }

    // =========================================================================
    // slash — HAPPY PATH
    // =========================================================================

    function test_slash_success() public {
        _registerHunter(hunter1, 0.05 ether);

        vm.prank(admin);
        bounty.slash(hunter1);

        assertFalse(bounty.isRegistered(hunter1));
        assertEq(bounty.getHunterStake(hunter1), 0);
    }

    function test_slash_emitsEvent() public {
        _registerHunter(hunter1, 0.05 ether);

        vm.expectEmit(true, false, false, true);
        emit HunterSlashed(hunter1, 0.05 ether, "Misconduct");

        vm.prank(admin);
        bounty.slash(hunter1);
    }

    function test_slash_reducesActiveCount() public {
        _registerTwoHunters();
        assertEq(bounty.getActiveHunterCount(), 2);

        vm.prank(admin);
        bounty.slash(hunter1);

        assertEq(bounty.getActiveHunterCount(), 1);
    }

    // =========================================================================
    // slash — REVERT CASES
    // =========================================================================

    function test_slash_reverts_notRegistered() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(HunterNotRegistered.selector, randomUser));
        bounty.slash(randomUser);
    }

    function test_slash_reverts_notAdmin() public {
        _registerHunter(hunter1, MIN_BOUNTY_HUNTER_STAKE);

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        bounty.slash(hunter1);
    }

    // =========================================================================
    // PAUSE
    // =========================================================================

    function test_pause_blocksRegister() public {
        vm.prank(admin);
        bounty.pause();

        vm.prank(hunter1);
        vm.expectRevert();
        bounty.register{value: MIN_BOUNTY_HUNTER_STAKE}();
    }

    // =========================================================================
    // VIEW
    // =========================================================================

    function test_getAssignment_reverts_notFound() public {
        vm.expectRevert(abi.encodeWithSelector(AssignmentNotFound.selector, 999));
        bounty.getAssignment(999);
    }

    // =========================================================================
    // FUZZ
    // =========================================================================

    function testFuzz_register_stakeAmount(uint256 stake) public {
        vm.assume(stake >= MIN_BOUNTY_HUNTER_STAKE);
        vm.assume(stake <= 10 ether);
        vm.deal(hunter1, stake);

        vm.prank(hunter1);
        bounty.register{value: stake}();

        assertEq(bounty.getHunterStake(hunter1), stake);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {RatingLedger} from "../../src/governance/RatingLedger.sol";
import {
    ContractorProfile,
    ORACLE_ROLE,
    AUDITOR_ROLE,
    ZKP_SCALING_FACTOR
} from "../../src/Types.sol";
import {
    ZeroAddressNotAllowed,
    ContractorIsFrozen,
    ProfileNotFound
} from "../../src/Types.sol";

/// @title RatingLedgerTest — Unit tests for RatingLedger contract
contract RatingLedgerTest is Test {
    // Redeclare events
    event RatingUpdated(address indexed contractor, uint256 new_rating, uint256 completion_delta, uint256 timestamp);
    event ContractorFrozen(address indexed contractor, uint256 timestamp);

    RatingLedger public ledger;

    address public admin = makeAddr("admin");
    address public oracleAddr = makeAddr("oracle");
    address public auditor = makeAddr("auditor");
    address public contractor1 = makeAddr("contractor1");
    address public contractor2 = makeAddr("contractor2");
    address public randomUser = makeAddr("randomUser");

    function setUp() public {
        ledger = new RatingLedger();
        ledger.initialize(admin);

        vm.startPrank(admin);
        ledger.grantRole(ORACLE_ROLE, oracleAddr);
        ledger.grantRole(AUDITOR_ROLE, auditor);
        vm.stopPrank();
    }

    // =========================================================================
    // HELPER
    // =========================================================================

    function _initProfile(address c) internal {
        vm.prank(admin);
        ledger.initializeProfile(c);
    }

    // =========================================================================
    // initializeProfile — HAPPY PATH
    // =========================================================================

    function test_initializeProfile_success() public {
        _initProfile(contractor1);

        assertTrue(ledger.profileExists(contractor1));
        assertEq(ledger.getProfileCount(), 1);

        ContractorProfile memory p = ledger.getRating(contractor1);
        assertEq(p.contractor_address, contractor1);
        assertFalse(p.is_frozen);
        assertFalse(p.zkp_verified);
        assertEq(p.rating, 0);
        assertEq(p.completion_rate, 0);
        assertEq(p.tender_count, 0);
    }

    function test_initializeProfile_multiple() public {
        _initProfile(contractor1);
        _initProfile(contractor2);

        assertEq(ledger.getProfileCount(), 2);
    }

    // =========================================================================
    // initializeProfile — REVERT CASES
    // =========================================================================

    function test_initializeProfile_reverts_notAdmin() public {
        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        ledger.initializeProfile(contractor1);
    }

    function test_initializeProfile_reverts_duplicate() public {
        _initProfile(contractor1);

        vm.prank(admin);
        vm.expectRevert("Profile already exists");
        ledger.initializeProfile(contractor1);
    }

    function test_initializeProfile_reverts_zeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(ZeroAddressNotAllowed.selector);
        ledger.initializeProfile(address(0));
    }

    // =========================================================================
    // updateRating — HAPPY PATH
    // =========================================================================

    function test_updateRating_success() public {
        _initProfile(contractor1);

        uint256 rating = 750_000; // 750.000 scaled
        uint256 completion = 2500; // 25.00%

        vm.prank(oracleAddr);
        ledger.updateRating(contractor1, rating, completion);

        ContractorProfile memory p = ledger.getRating(contractor1);
        assertEq(p.rating, rating);
        assertEq(p.completion_rate, completion);
        assertEq(p.tender_count, 1);
    }

    function test_updateRating_emitsEvent() public {
        _initProfile(contractor1);

        uint256 rating = 850_000;
        uint256 delta = 5000;

        vm.expectEmit(true, false, false, true);
        emit RatingUpdated(contractor1, rating, delta, block.timestamp);

        vm.prank(oracleAddr);
        ledger.updateRating(contractor1, rating, delta);
    }

    function test_updateRating_cumulativeCompletionRate() public {
        _initProfile(contractor1);

        vm.startPrank(oracleAddr);
        ledger.updateRating(contractor1, 500_000, 2500);
        ledger.updateRating(contractor1, 600_000, 3000);
        vm.stopPrank();

        ContractorProfile memory p = ledger.getRating(contractor1);
        assertEq(p.completion_rate, 5500); // 25.00% + 30.00%
        assertEq(p.tender_count, 2);
        assertEq(p.rating, 600_000); // latest rating overwrites
    }

    // =========================================================================
    // updateRating — REVERT CASES
    // =========================================================================

    function test_updateRating_reverts_notOracle() public {
        _initProfile(contractor1);

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        ledger.updateRating(contractor1, 500_000, 2500);
    }

    function test_updateRating_reverts_profileNotFound() public {
        vm.prank(oracleAddr);
        vm.expectRevert(abi.encodeWithSelector(ProfileNotFound.selector, contractor1));
        ledger.updateRating(contractor1, 500_000, 2500);
    }

    function test_updateRating_reverts_contractorFrozen() public {
        _initProfile(contractor1);

        vm.prank(auditor);
        ledger.freezeContractor(contractor1);

        vm.prank(oracleAddr);
        vm.expectRevert(abi.encodeWithSelector(ContractorIsFrozen.selector, contractor1));
        ledger.updateRating(contractor1, 500_000, 2500);
    }

    // =========================================================================
    // freezeContractor — HAPPY PATH
    // =========================================================================

    function test_freezeContractor_success() public {
        _initProfile(contractor1);

        vm.prank(auditor);
        ledger.freezeContractor(contractor1);

        assertTrue(ledger.isFrozen(contractor1));
    }

    function test_freezeContractor_emitsEvent() public {
        _initProfile(contractor1);

        vm.expectEmit(true, false, false, true);
        emit ContractorFrozen(contractor1, block.timestamp);

        vm.prank(auditor);
        ledger.freezeContractor(contractor1);
    }

    // =========================================================================
    // freezeContractor — REVERT CASES
    // =========================================================================

    function test_freezeContractor_reverts_notAuditor() public {
        _initProfile(contractor1);

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        ledger.freezeContractor(contractor1);
    }

    function test_freezeContractor_reverts_alreadyFrozen() public {
        _initProfile(contractor1);

        vm.prank(auditor);
        ledger.freezeContractor(contractor1);

        vm.prank(auditor);
        vm.expectRevert("Already frozen");
        ledger.freezeContractor(contractor1);
    }

    function test_freezeContractor_reverts_profileNotFound() public {
        vm.prank(auditor);
        vm.expectRevert(abi.encodeWithSelector(ProfileNotFound.selector, contractor1));
        ledger.freezeContractor(contractor1);
    }

    // =========================================================================
    // setZKPVerified
    // =========================================================================

    function test_setZKPVerified_success() public {
        _initProfile(contractor1);

        vm.prank(admin);
        ledger.setZKPVerified(contractor1);

        ContractorProfile memory p = ledger.getRating(contractor1);
        assertTrue(p.zkp_verified);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    function test_isFrozen_defaultFalse() public view {
        assertFalse(ledger.isFrozen(contractor1));
    }

    function test_getRating_reverts_notFound() public {
        vm.expectRevert(abi.encodeWithSelector(ProfileNotFound.selector, contractor1));
        ledger.getRating(contractor1);
    }

    // =========================================================================
    // PAUSE
    // =========================================================================

    function test_pause_blocksUpdateRating() public {
        _initProfile(contractor1);

        vm.prank(admin);
        ledger.pause();

        vm.prank(oracleAddr);
        vm.expectRevert();
        ledger.updateRating(contractor1, 500_000, 2500);
    }

    // =========================================================================
    // FUZZ
    // =========================================================================

    function testFuzz_updateRating_values(uint256 rating, uint256 delta) public {
        vm.assume(rating <= 10 * ZKP_SCALING_FACTOR);
        vm.assume(delta <= 10_000); // max 100.00%

        _initProfile(contractor1);

        vm.prank(oracleAddr);
        ledger.updateRating(contractor1, rating, delta);

        ContractorProfile memory p = ledger.getRating(contractor1);
        assertEq(p.rating, rating);
        assertEq(p.completion_rate, delta);
    }
}

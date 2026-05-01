// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {ZKPController} from "../../src/zkp/ZKPController.sol";
import {Groth16Verifier} from "../../src/zkp/Groth16Verifier.sol";
import {
    ORACLE_ROLE,
    AUDITOR_ROLE
} from "../../src/Types.sol";
import {
    ZeroAddressNotAllowed,
    InvalidZKProof
} from "../../src/Types.sol";

/// @title ZKPControllerTest — Unit tests for ZKPController
contract ZKPControllerTest is Test {
    // Redeclare events
    event KYCVerified(address indexed contractor, bytes32 identity_hash);
    event ScoreProofVerified(uint256 indexed tender_id, uint256 indexed bid_id, bytes32 score_commitment);
    event NullifierUsed(bytes32 indexed nullifier_hash, uint256 milestone_id);
    event ProofVerified(
        uint256 indexed proof_id,
        ZKPController.ProofType proof_type,
        address indexed prover,
        bytes32 public_hash,
        uint256 timestamp
    );

    ZKPController public controller;
    Groth16Verifier public verifier;

    address public admin = makeAddr("admin");
    address public oracle = makeAddr("oracle");
    address public contractor1 = makeAddr("contractor1");
    address public randomUser = makeAddr("randomUser");

    // Dummy proof data (mock verifier accepts anything)
    uint256[2] public proof_a = [uint256(1), uint256(2)];
    uint256[2][2] public proof_b = [[uint256(3), uint256(4)], [uint256(5), uint256(6)]];
    uint256[2] public proof_c = [uint256(7), uint256(8)];

    function setUp() public {
        verifier = new Groth16Verifier();
        controller = new ZKPController();
        controller.initialize(admin, address(verifier));

        vm.prank(admin);
        controller.grantRole(ORACLE_ROLE, oracle);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    function _kycInputs(bytes32 hash) internal pure returns (uint256[] memory) {
        uint256[] memory inputs = new uint256[](1);
        inputs[0] = uint256(hash);
        return inputs;
    }

    function _scoreInputs(uint256 tender_id, uint256 bid_id, uint256 score) internal pure returns (uint256[] memory) {
        uint256[] memory inputs = new uint256[](3);
        inputs[0] = tender_id;
        inputs[1] = bid_id;
        inputs[2] = score;
        return inputs;
    }

    function _nullifierInputs(bytes32 nullifier, bytes32 commitment) internal pure returns (uint256[] memory) {
        uint256[] memory inputs = new uint256[](2);
        inputs[0] = uint256(nullifier);
        inputs[1] = uint256(commitment);
        return inputs;
    }

    // =========================================================================
    // verifyKYC — HAPPY PATH
    // =========================================================================

    function test_verifyKYC_success() public {
        bytes32 identityHash = keccak256("test-identity");
        uint256[] memory inputs = _kycInputs(identityHash);

        vm.prank(oracle);
        controller.verifyKYC(contractor1, proof_a, proof_b, proof_c, inputs);

        assertTrue(controller.isKYCVerified(contractor1));
        assertEq(controller.getKYCHash(contractor1), identityHash);
    }

    function test_verifyKYC_emitsEvent() public {
        bytes32 identityHash = keccak256("test-identity");
        uint256[] memory inputs = _kycInputs(identityHash);

        vm.expectEmit(true, false, false, true);
        emit KYCVerified(contractor1, identityHash);

        vm.prank(oracle);
        controller.verifyKYC(contractor1, proof_a, proof_b, proof_c, inputs);
    }

    function test_verifyKYC_recordsProof() public {
        bytes32 identityHash = keccak256("test-identity");
        uint256[] memory inputs = _kycInputs(identityHash);

        vm.prank(oracle);
        controller.verifyKYC(contractor1, proof_a, proof_b, proof_c, inputs);

        assertEq(controller.getProofCount(), 1);
        ZKPController.ProofRecord memory record = controller.getProof(1);
        assertEq(uint256(record.proof_type), uint256(ZKPController.ProofType.KYC));
        assertTrue(record.is_valid);
    }

    // =========================================================================
    // verifyKYC — REVERT CASES
    // =========================================================================

    function test_verifyKYC_reverts_notOracle() public {
        uint256[] memory inputs = _kycInputs(keccak256("test"));

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        controller.verifyKYC(contractor1, proof_a, proof_b, proof_c, inputs);
    }

    function test_verifyKYC_reverts_zeroAddress() public {
        uint256[] memory inputs = _kycInputs(keccak256("test"));

        vm.prank(oracle);
        vm.expectRevert(ZeroAddressNotAllowed.selector);
        controller.verifyKYC(address(0), proof_a, proof_b, proof_c, inputs);
    }

    // =========================================================================
    // verifyScoreProof — HAPPY PATH
    // =========================================================================

    function test_verifyScoreProof_success() public {
        uint256[] memory inputs = _scoreInputs(1, 1, 850000);

        vm.prank(oracle);
        bool valid = controller.verifyScoreProof(1, 1, "", inputs);

        assertTrue(valid);
        assertEq(controller.getProofCount(), 1);
    }

    function test_verifyScoreProof_storesCommitment() public {
        uint256[] memory inputs = _scoreInputs(1, 1, 850000);

        vm.prank(oracle);
        controller.verifyScoreProof(1, 1, "", inputs);

        bytes32 commitment = controller.getScoreCommitment(1);
        assertEq(commitment, bytes32(uint256(850000)));
    }

    function test_verifyScoreProof_emitsEvent() public {
        uint256[] memory inputs = _scoreInputs(1, 1, 850000);

        vm.expectEmit(true, true, false, true);
        emit ScoreProofVerified(1, 1, bytes32(uint256(850000)));

        vm.prank(oracle);
        controller.verifyScoreProof(1, 1, "", inputs);
    }

    // =========================================================================
    // verifyScoreProof — REVERT CASES
    // =========================================================================

    function test_verifyScoreProof_reverts_notOracle() public {
        uint256[] memory inputs = _scoreInputs(1, 1, 850000);

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        controller.verifyScoreProof(1, 1, "", inputs);
    }

    function test_verifyScoreProof_reverts_insufficientInputs() public {
        uint256[] memory inputs = new uint256[](2); // Need 3
        inputs[0] = 1;
        inputs[1] = 1;

        vm.prank(oracle);
        vm.expectRevert("Missing public inputs");
        controller.verifyScoreProof(1, 1, "", inputs);
    }

    // =========================================================================
    // verifyNullifier — HAPPY PATH
    // =========================================================================

    function test_verifyNullifier_success() public {
        bytes32 nullifier = keccak256("invoice-1");
        bytes32 commitment = keccak256("commitment-1");
        uint256[] memory inputs = _nullifierInputs(nullifier, commitment);

        vm.prank(oracle);
        controller.verifyNullifier(1, proof_a, proof_b, proof_c, inputs);

        assertTrue(controller.isNullifierUsed(nullifier));
    }

    function test_verifyNullifier_emitsEvent() public {
        bytes32 nullifier = keccak256("invoice-1");
        bytes32 commitment = keccak256("commitment-1");
        uint256[] memory inputs = _nullifierInputs(nullifier, commitment);

        vm.expectEmit(true, false, false, true);
        emit NullifierUsed(nullifier, 1);

        vm.prank(oracle);
        controller.verifyNullifier(1, proof_a, proof_b, proof_c, inputs);
    }

    // =========================================================================
    // verifyNullifier — REVERT: Double Submission
    // =========================================================================

    function test_verifyNullifier_reverts_doubleSubmit() public {
        bytes32 nullifier = keccak256("invoice-1");
        bytes32 commitment = keccak256("commitment-1");
        uint256[] memory inputs = _nullifierInputs(nullifier, commitment);

        vm.prank(oracle);
        controller.verifyNullifier(1, proof_a, proof_b, proof_c, inputs);

        // Second submission with same nullifier should revert
        vm.prank(oracle);
        vm.expectRevert("Nullifier already used (double-submit)");
        controller.verifyNullifier(2, proof_a, proof_b, proof_c, inputs);
    }

    function test_verifyNullifier_differentInvoices_succeed() public {
        bytes32 null1 = keccak256("invoice-1");
        bytes32 null2 = keccak256("invoice-2");

        vm.startPrank(oracle);
        controller.verifyNullifier(1, proof_a, proof_b, proof_c, _nullifierInputs(null1, keccak256("c1")));
        controller.verifyNullifier(2, proof_a, proof_b, proof_c, _nullifierInputs(null2, keccak256("c2")));
        vm.stopPrank();

        assertTrue(controller.isNullifierUsed(null1));
        assertTrue(controller.isNullifierUsed(null2));
        assertEq(controller.getProofCount(), 2);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    function test_isKYCVerified_defaultFalse() public view {
        assertFalse(controller.isKYCVerified(contractor1));
    }

    function test_isNullifierUsed_defaultFalse() public view {
        assertFalse(controller.isNullifierUsed(keccak256("unused")));
    }

    function test_getProof_reverts_notFound() public {
        vm.expectRevert("Proof not found");
        controller.getProof(999);
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function test_setVerifier_success() public {
        Groth16Verifier newVerifier = new Groth16Verifier();

        vm.prank(admin);
        controller.setVerifier(address(newVerifier));

        assertEq(address(controller.verifier()), address(newVerifier));
    }

    function test_setVerifier_reverts_notAdmin() public {
        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        controller.setVerifier(address(1));
    }

    function test_pause_blocksVerification() public {
        vm.prank(admin);
        controller.pause();

        uint256[] memory inputs = _kycInputs(keccak256("test"));

        vm.prank(oracle);
        vm.expectRevert(); // Paused
        controller.verifyKYC(contractor1, proof_a, proof_b, proof_c, inputs);
    }

    // =========================================================================
    // FUZZ
    // =========================================================================

    function testFuzz_verifyKYC_hashValues(bytes32 identity_hash) public {
        vm.assume(identity_hash != bytes32(0));
        uint256[] memory inputs = _kycInputs(identity_hash);

        vm.prank(oracle);
        controller.verifyKYC(contractor1, proof_a, proof_b, proof_c, inputs);

        assertEq(controller.getKYCHash(contractor1), identity_hash);
    }
}

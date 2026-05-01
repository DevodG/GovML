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

    /// @dev BN254 scalar field order — public signals must be < this value
    uint256 constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    ZKPController public controller;
    Groth16Verifier public verifier;

    address public admin = makeAddr("admin");
    address public oracle = makeAddr("oracle");
    address public contractor1 = makeAddr("contractor1");
    address public randomUser = makeAddr("randomUser");

    // Valid non-zero proof data (small values within BN254 base field)
    uint256[2] public proof_a = [uint256(100), uint256(200)];
    uint256[2][2] public proof_b = [[uint256(300), uint256(400)], [uint256(500), uint256(600)]];
    uint256[2] public proof_c = [uint256(700), uint256(800)];

    function setUp() public {
        verifier = new Groth16Verifier();
        controller = new ZKPController();
        controller.initialize(admin, address(verifier));

        vm.prank(admin);
        controller.grantRole(ORACLE_ROLE, oracle);
    }

    // =========================================================================
    // HELPERS — produce in-field values from keccak hashes
    // =========================================================================

    /// @dev Reduce a keccak hash to fit within SNARK_SCALAR_FIELD
    function _inField(bytes32 h) internal pure returns (uint256) {
        return uint256(h) % SNARK_SCALAR_FIELD;
    }

    function _kycInputs(bytes32 hash) internal pure returns (uint256[] memory) {
        uint256[] memory inputs = new uint256[](1);
        inputs[0] = _inField(hash);
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
        inputs[0] = _inField(nullifier);
        inputs[1] = _inField(commitment);
        return inputs;
    }

    /// @dev Encode proof_a/b/c into packed bytes for verifyScoreProof
    function _encodeProof() internal view returns (bytes memory) {
        return abi.encode(proof_a, proof_b, proof_c);
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
    }

    function test_verifyKYC_emitsEvent() public {
        bytes32 identityHash = keccak256("test-identity");
        uint256 inFieldHash = _inField(identityHash);
        uint256[] memory inputs = _kycInputs(identityHash);

        vm.expectEmit(true, false, false, true);
        emit KYCVerified(contractor1, bytes32(inFieldHash));

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
        bool valid = controller.verifyScoreProof(1, 1, _encodeProof(), inputs);

        assertTrue(valid);
        assertEq(controller.getProofCount(), 1);
    }

    function test_verifyScoreProof_storesCommitment() public {
        uint256[] memory inputs = _scoreInputs(1, 1, 850000);

        vm.prank(oracle);
        controller.verifyScoreProof(1, 1, _encodeProof(), inputs);

        bytes32 commitment = controller.getScoreCommitment(1);
        assertEq(commitment, bytes32(uint256(850000)));
    }

    function test_verifyScoreProof_emitsEvent() public {
        uint256[] memory inputs = _scoreInputs(1, 1, 850000);

        vm.expectEmit(true, true, false, true);
        emit ScoreProofVerified(1, 1, bytes32(uint256(850000)));

        vm.prank(oracle);
        controller.verifyScoreProof(1, 1, _encodeProof(), inputs);
    }

    // =========================================================================
    // verifyScoreProof — REVERT CASES
    // =========================================================================

    function test_verifyScoreProof_reverts_notOracle() public {
        uint256[] memory inputs = _scoreInputs(1, 1, 850000);

        vm.prank(randomUser);
        vm.expectRevert(); // AccessControl
        controller.verifyScoreProof(1, 1, _encodeProof(), inputs);
    }

    function test_verifyScoreProof_reverts_insufficientInputs() public {
        uint256[] memory inputs = new uint256[](2); // Need 3
        inputs[0] = 1;
        inputs[1] = 1;

        vm.prank(oracle);
        vm.expectRevert("Missing public inputs");
        controller.verifyScoreProof(1, 1, _encodeProof(), inputs);
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

        assertTrue(controller.isNullifierUsed(bytes32(_inField(nullifier))));
    }

    function test_verifyNullifier_emitsEvent() public {
        bytes32 nullifier = keccak256("invoice-1");
        bytes32 commitment = keccak256("commitment-1");
        uint256[] memory inputs = _nullifierInputs(nullifier, commitment);

        vm.expectEmit(true, false, false, true);
        emit NullifierUsed(bytes32(_inField(nullifier)), 1);

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

        // Need different proof points for second call (unique nullifier per proof)
        uint256[2] memory proof_a2 = [uint256(101), uint256(201)];
        uint256[2][2] memory proof_b2 = [[uint256(301), uint256(401)], [uint256(501), uint256(601)]];
        uint256[2] memory proof_c2 = [uint256(701), uint256(801)];

        vm.prank(oracle);
        vm.expectRevert(); // NullifierAlreadyUsed
        controller.verifyNullifier(2, proof_a2, proof_b2, proof_c2, inputs);
    }

    function test_verifyNullifier_differentInvoices_succeed() public {
        bytes32 null1 = keccak256("invoice-1");
        bytes32 null2 = keccak256("invoice-2");

        vm.startPrank(oracle);
        controller.verifyNullifier(1, proof_a, proof_b, proof_c, _nullifierInputs(null1, keccak256("c1")));

        // Different proof points for second call
        uint256[2] memory proof_a2 = [uint256(101), uint256(201)];
        uint256[2][2] memory proof_b2 = [[uint256(301), uint256(401)], [uint256(501), uint256(601)]];
        uint256[2] memory proof_c2 = [uint256(701), uint256(801)];
        controller.verifyNullifier(2, proof_a2, proof_b2, proof_c2, _nullifierInputs(null2, keccak256("c2")));
        vm.stopPrank();

        assertTrue(controller.isNullifierUsed(bytes32(_inField(null1))));
        assertTrue(controller.isNullifierUsed(bytes32(_inField(null2))));
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

        assertEq(controller.getKYCHash(contractor1), bytes32(_inField(identity_hash)));
    }
}

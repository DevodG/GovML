// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {
    ORACLE_ROLE,
    AUDITOR_ROLE
} from "../Types.sol";
import {
    ZeroAddressNotAllowed,
    InvalidZKProof
} from "../Types.sol";
import {Groth16Verifier} from "./Groth16Verifier.sol";

/// @title ZKPController — On-chain ZKP Verification Router
/// @notice Routes ZKP verification requests to the appropriate circuit verifier
///         and manages proof metadata (nullifiers, commitments, verification status).
///         This is the single entry point for all ZKP operations in GovChain.
/// @dev    Upgradeable via TransparentUpgradeableProxy.
///         Supports three verification types:
///           1. KYC — Contractor identity verification (Aadhaar + GST)
///           2. Score — ML scoring integrity verification
///           3. Nullifier — Invoice double-submission prevention
///
///         In Phase 6, the Groth16Verifier is a mock (always returns true).
///         Once circuits are compiled with snarkjs, replace Groth16Verifier.sol
///         with the generated verifier and the controller remains unchanged.
/// @author GovChain Team
contract ZKPController is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    // =========================================================================
    // ENUMS
    // =========================================================================

    enum ProofType {
        KYC,        // Identity verification
        SCORE,      // ML score integrity
        NULLIFIER   // Invoice double-spend prevention
    }

    // =========================================================================
    // STRUCTS
    // =========================================================================

    struct ProofRecord {
        uint256 id;
        ProofType proof_type;
        address prover;
        bytes32 public_hash;     // Hash of public inputs (for lookup)
        uint256 verified_at;
        bool is_valid;
    }

    // =========================================================================
    // EVENTS
    // =========================================================================

    event ProofVerified(
        uint256 indexed proof_id,
        ProofType proof_type,
        address indexed prover,
        bytes32 public_hash,
        uint256 timestamp
    );

    event NullifierUsed(bytes32 indexed nullifier_hash, uint256 milestone_id);
    event KYCVerified(address indexed contractor, bytes32 identity_hash);
    event ScoreProofVerified(uint256 indexed tender_id, uint256 indexed bid_id, bytes32 score_commitment);

    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice The Groth16 verifier contract (mock in Phase 6, snarkjs-generated in production)
    Groth16Verifier public verifier;

    /// @notice Auto-incrementing proof record counter
    uint256 private _proof_count;

    /// @notice Mapping from proof ID to ProofRecord
    mapping(uint256 => ProofRecord) private mapping_proofs;

    /// @notice Tracks used nullifiers (prevents invoice double-submission)
    /// @dev nullifier_hash => true if already used
    mapping(bytes32 => bool) private mapping_nullifiers;

    /// @notice Tracks KYC verification status per contractor
    /// @dev contractor_address => identity_hash (0 = not verified)
    mapping(address => bytes32) private mapping_kyc_hashes;

    /// @notice Tracks score proof commitments per bid
    /// @dev bid_id => score_commitment
    mapping(uint256 => bytes32) private mapping_score_commitments;

    // =========================================================================
    // STORAGE GAP
    // =========================================================================

    uint256[42] private __gap;

    // =========================================================================
    // INITIALIZER
    // =========================================================================

    function initialize(address admin, address _verifier) external initializer {
        if (admin == address(0) || _verifier == address(0)) revert ZeroAddressNotAllowed();

        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        verifier = Groth16Verifier(_verifier);
    }

    // =========================================================================
    // ADMIN CONFIGURATION
    // =========================================================================

    /// @notice Update the verifier contract address
    /// @dev Called when replacing mock verifier with snarkjs-generated one
    function setVerifier(address _verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_verifier == address(0)) revert ZeroAddressNotAllowed();
        verifier = Groth16Verifier(_verifier);
    }

    // =========================================================================
    // EXTERNAL — KYC Verification
    // =========================================================================

    /// @notice Verify a KYC proof (Aadhaar + GST)
    /// @dev Stores the identity_hash on-chain for future reference.
    ///      The identity_hash is the Poseidon hash of (aadhaar, gst, salt).
    /// @param contractor Address of the contractor being verified
    /// @param proof_a Groth16 proof point A
    /// @param proof_b Groth16 proof point B
    /// @param proof_c Groth16 proof point C
    /// @param public_inputs Public signals from the circuit (identity_hash)
    function verifyKYC(
        address contractor,
        uint256[2] calldata proof_a,
        uint256[2][2] calldata proof_b,
        uint256[2] calldata proof_c,
        uint256[] calldata public_inputs
    )
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
    {
        if (contractor == address(0)) revert ZeroAddressNotAllowed();
        require(public_inputs.length >= 1, "Missing identity_hash");

        // Verify the proof
        bool valid = verifier.verifyProof(proof_a, proof_b, proof_c, public_inputs);
        if (!valid) revert InvalidZKProof(0);

        bytes32 identity_hash = bytes32(public_inputs[0]);

        // Store KYC verification
        mapping_kyc_hashes[contractor] = identity_hash;

        // Record proof
        _recordProof(ProofType.KYC, msg.sender, identity_hash);

        emit KYCVerified(contractor, identity_hash);
    }

    // =========================================================================
    // EXTERNAL — Score Integrity Verification
    // =========================================================================

    /// @notice Verify ML score integrity proof
    /// @dev Called by ScoringOracle when recording a score. Verifies the score
    ///      was computed correctly from the bid features using the ML model.
    /// @param tender_id ID of the tender
    /// @param bid_id ID of the bid being scored
    /// @param proof Serialized Groth16 proof (packed bytes)
    /// @param public_inputs Public signals [tender_id, bid_id, declared_score]
    /// @return True if the proof is valid
    function verifyScoreProof(
        uint256 tender_id,
        uint256 bid_id,
        bytes calldata proof,
        uint256[] calldata public_inputs
    )
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
        returns (bool)
    {
        require(public_inputs.length >= 3, "Missing public inputs");

        // Decode packed proof into Groth16 format
        (
            uint256[2] memory proof_a,
            uint256[2][2] memory proof_b,
            uint256[2] memory proof_c
        ) = _decodeProof(proof);

        bool valid = verifier.verifyProof(proof_a, proof_b, proof_c, public_inputs);
        if (!valid) revert InvalidZKProof(bid_id);

        // Store score commitment (last public signal)
        bytes32 score_commitment = bytes32(public_inputs[public_inputs.length - 1]);
        mapping_score_commitments[bid_id] = score_commitment;

        _recordProof(ProofType.SCORE, msg.sender, score_commitment);

        emit ScoreProofVerified(tender_id, bid_id, score_commitment);

        return true;
    }

    // =========================================================================
    // EXTERNAL — Invoice Nullifier Verification
    // =========================================================================

    /// @notice Verify an invoice nullifier proof and check for double-submission
    /// @dev The nullifier_hash is deterministic: same invoice always produces same nullifier.
    ///      If the nullifier was seen before, the invoice was already submitted — tx reverts.
    /// @param milestone_id ID of the milestone
    /// @param proof_a Groth16 proof point A
    /// @param proof_b Groth16 proof point B
    /// @param proof_c Groth16 proof point C
    /// @param public_inputs Public signals [nullifier_hash, commitment]
    function verifyNullifier(
        uint256 milestone_id,
        uint256[2] calldata proof_a,
        uint256[2][2] calldata proof_b,
        uint256[2] calldata proof_c,
        uint256[] calldata public_inputs
    )
        external
        onlyRole(ORACLE_ROLE)
        whenNotPaused
    {
        require(public_inputs.length >= 2, "Missing nullifier outputs");

        // Verify the proof
        bool valid = verifier.verifyProof(proof_a, proof_b, proof_c, public_inputs);
        if (!valid) revert InvalidZKProof(milestone_id);

        bytes32 nullifier_hash = bytes32(public_inputs[0]);

        // Check for double-submission
        require(!mapping_nullifiers[nullifier_hash], "Nullifier already used (double-submit)");

        // Mark nullifier as used
        mapping_nullifiers[nullifier_hash] = true;

        _recordProof(ProofType.NULLIFIER, msg.sender, nullifier_hash);

        emit NullifierUsed(nullifier_hash, milestone_id);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Check if a contractor's KYC is verified
    function isKYCVerified(address contractor) external view returns (bool) {
        return mapping_kyc_hashes[contractor] != bytes32(0);
    }

    /// @notice Get the KYC identity hash for a contractor
    function getKYCHash(address contractor) external view returns (bytes32) {
        return mapping_kyc_hashes[contractor];
    }

    /// @notice Check if a nullifier has been used
    function isNullifierUsed(bytes32 nullifier_hash) external view returns (bool) {
        return mapping_nullifiers[nullifier_hash];
    }

    /// @notice Get the score commitment for a bid
    function getScoreCommitment(uint256 bid_id) external view returns (bytes32) {
        return mapping_score_commitments[bid_id];
    }

    /// @notice Get a proof record by ID
    function getProof(uint256 proof_id) external view returns (ProofRecord memory) {
        require(proof_id > 0 && proof_id <= _proof_count, "Proof not found");
        return mapping_proofs[proof_id];
    }

    /// @notice Get total number of verified proofs
    function getProofCount() external view returns (uint256) {
        return _proof_count;
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /// @dev Records a proof verification event
    function _recordProof(ProofType proof_type, address prover, bytes32 public_hash) internal {
        _proof_count++;
        mapping_proofs[_proof_count] = ProofRecord({
            id: _proof_count,
            proof_type: proof_type,
            prover: prover,
            public_hash: public_hash,
            verified_at: block.timestamp,
            is_valid: true
        });

        emit ProofVerified(_proof_count, proof_type, prover, public_hash, block.timestamp);
    }

    /// @dev Decodes packed proof bytes into Groth16 format
    ///      Expected format: abi.encode(uint256[2], uint256[2][2], uint256[2])
    ///      If proof is empty (dev mode), returns zeroed arrays (mock verifier accepts them)
    function _decodeProof(bytes calldata proof)
        internal
        pure
        returns (
            uint256[2] memory proof_a,
            uint256[2][2] memory proof_b,
            uint256[2] memory proof_c
        )
    {
        if (proof.length == 0) {
            // Dev mode: empty proof for mock verifier
            return (proof_a, proof_b, proof_c);
        }

        if (proof.length >= 256) {
            // Full Groth16 proof: decode all 8 uint256 values
            (proof_a, proof_b, proof_c) = abi.decode(proof, (uint256[2], uint256[2][2], uint256[2]));
        }

        return (proof_a, proof_b, proof_c);
    }
}

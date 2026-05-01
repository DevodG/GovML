// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IZKPController — Interface for ZKP Verification Router
/// @notice Defines the public API for verifying ZKP proofs (KYC, Score, Nullifier).
///         Used by TenderRegistry and ScoringOracle for typed cross-contract calls
///         instead of raw staticcall/call, ensuring nullifier state changes propagate.
/// @dev    IMPORTANT: verifyScoreProof and verifyKYC are NOT view functions.
///         They modify state (nullifier tracking in Groth16Verifier).
///         Callers MUST use regular calls, NOT staticcall.
/// @author GovChain Team
interface IZKPController {
    // =========================================================================
    // EXTERNAL FUNCTIONS (STATE-MODIFYING)
    // =========================================================================

    /// @notice Verify ML score integrity proof
    /// @dev Modifies state: records nullifier usage in Groth16Verifier.
    ///      Callers must use regular call, not staticcall.
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
    ) external returns (bool);

    /// @notice Verify a KYC proof (Aadhaar + GST)
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
    ) external;

    /// @notice Verify an invoice nullifier proof and check for double-submission
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
    ) external;

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Check if a contractor's KYC is verified
    function isKYCVerified(address contractor) external view returns (bool);

    /// @notice Check if a nullifier has been used
    function isNullifierUsed(bytes32 nullifier_hash) external view returns (bool);

    /// @notice Get the score commitment for a bid
    function getScoreCommitment(uint256 bid_id) external view returns (bytes32);
}

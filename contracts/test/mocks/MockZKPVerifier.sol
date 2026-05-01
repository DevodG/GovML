// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MockZKPVerifier — Always returns true for non-ZKP test paths
/// @notice Used in unit tests to bypass ZKP verification. DO NOT deploy to production.
/// @dev    Mimics the ZKPController interface so TenderRegistry can call verifyScoreProof
///         without actual proof verification.
/// @author GovChain Team
contract MockZKPVerifier {
    /// @notice Always returns true — mock proof verification
    function verifyScoreProof(
        uint256, /* tender_id */
        uint256, /* bid_id */
        bytes calldata, /* proof */
        uint256[] calldata /* public_inputs */
    ) external pure returns (bool) {
        return true;
    }

    /// @notice Always returns true — mock KYC proof verification
    function verifyKYCProof(
        address, /* contractor */
        bytes calldata, /* proof */
        uint256[] calldata /* public_inputs */
    ) external pure returns (bool) {
        return true;
    }

    /// @notice Always returns true — mock nullifier verification
    function verifyNullifier(
        bytes32, /* invoice_hash */
        bytes calldata, /* proof */
        uint256[] calldata /* public_inputs */
    ) external pure returns (bool) {
        return true;
    }
}

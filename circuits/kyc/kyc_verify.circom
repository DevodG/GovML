// SPDX-License-Identifier: MIT
// KYC Verification Circuit — Groth16
//
// PURPOSE: Proves a contractor holds a valid Aadhaar number and GST registration
// without revealing the actual values on-chain. Only the hash commitment is public.
//
// FLOW:
//   Private inputs: aadhaar_number, gst_number, salt
//   Public outputs: identity_hash (Poseidon hash of private inputs)
//
// VERIFICATION: The on-chain ZKPController checks that the proof is valid
// and the identity_hash matches the commitment stored during KYC registration.
//
// @author GovChain Team

pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

/// @notice Verifies KYC credentials without revealing them
/// @dev Uses Poseidon hash for SNARK-friendly hashing (much cheaper than SHA256 in circuits)
///      Aadhaar is 12 digits, GST is 15 chars — both fit in a single field element
template KYCVerify() {
    // ─── Private Inputs (known only to the prover) ───────
    signal input aadhaar_number;    // 12-digit Aadhaar number
    signal input gst_number;       // GST registration number (encoded as field element)
    signal input salt;             // Random salt for privacy (prevents rainbow table attacks)

    // ─── Public Output ───────────────────────────────────
    signal output identity_hash;   // Poseidon(aadhaar, gst, salt) — stored on-chain

    // ─── Range Check: Aadhaar must be 12 digits ──────────
    // Aadhaar range: 100000000000 to 999999999999
    component aadhaar_lower = GreaterEqThan(40);
    aadhaar_lower.in[0] <== aadhaar_number;
    aadhaar_lower.in[1] <== 100000000000;  // 10^11
    aadhaar_lower.out === 1;

    component aadhaar_upper = LessEqThan(40);
    aadhaar_upper.in[0] <== aadhaar_number;
    aadhaar_upper.in[1] <== 999999999999;  // 10^12 - 1
    aadhaar_upper.out === 1;

    // ─── Non-zero GST check ──────────────────────────────
    component gst_nonzero = IsZero();
    gst_nonzero.in <== gst_number;
    gst_nonzero.out === 0;  // GST must not be zero

    // ─── Poseidon Hash (3 inputs → 1 output) ─────────────
    // WHY Poseidon: ~8x cheaper than SHA256 inside a SNARK circuit
    // because Poseidon is designed for prime field arithmetic
    component hasher = Poseidon(3);
    hasher.inputs[0] <== aadhaar_number;
    hasher.inputs[1] <== gst_number;
    hasher.inputs[2] <== salt;

    identity_hash <== hasher.out;
}

component main = KYCVerify();

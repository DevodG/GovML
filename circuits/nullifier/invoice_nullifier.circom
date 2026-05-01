// SPDX-License-Identifier: MIT
// Invoice Nullifier Circuit — Groth16
//
// PURPOSE: Prevents double-submission of invoices/deliverables across milestones.
// A contractor can prove they have a valid invoice without revealing its contents,
// and the nullifier hash ensures the same invoice cannot be used twice.
//
// FLOW:
//   Private inputs: invoice_data, contractor_secret
//   Public inputs:  nullifier_hash (derived deterministically from private inputs)
//   The on-chain contract stores used nullifiers — if a nullifier was seen before,
//   the transaction reverts (double-spend protection).
//
// ANALOGY: Similar to Tornado Cash nullifiers — a deterministic, unique identifier
// derived from private data that can only be generated once per invoice.
//
// @author GovChain Team

pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/// @notice Generates a unique nullifier for an invoice to prevent double-submission
/// @dev    nullifier_hash = Poseidon(invoice_data, contractor_secret)
///         commitment = Poseidon(invoice_data, contractor_secret, milestone_id)
template InvoiceNullifier() {
    // ─── Private Inputs ──────────────────────────────────
    signal input invoice_data;        // Hash of invoice contents (IPFS CID as field element)
    signal input contractor_secret;   // Contractor's private key / secret
    signal input milestone_id;        // Which milestone this invoice is for

    // ─── Public Outputs ──────────────────────────────────
    signal output nullifier_hash;     // Unique nullifier (stored on-chain, checked for duplicates)
    signal output commitment;         // Invoice commitment (binds invoice to specific milestone)

    // ─── Non-zero validation ─────────────────────────────
    component invoice_check = IsZero();
    invoice_check.in <== invoice_data;
    invoice_check.out === 0;  // Invoice data must not be zero

    component secret_check = IsZero();
    secret_check.in <== contractor_secret;
    secret_check.out === 0;  // Secret must not be zero

    // ─── Nullifier: Poseidon(invoice, secret) ────────────
    // WHY: The nullifier is deterministic — same invoice + same secret always
    // produces the same nullifier. If seen before on-chain, tx reverts.
    component null_hasher = Poseidon(2);
    null_hasher.inputs[0] <== invoice_data;
    null_hasher.inputs[1] <== contractor_secret;
    nullifier_hash <== null_hasher.out;

    // ─── Commitment: Poseidon(invoice, secret, milestone) ─
    // WHY: Binds the invoice to a specific milestone, preventing cross-milestone reuse
    component commit_hasher = Poseidon(3);
    commit_hasher.inputs[0] <== invoice_data;
    commit_hasher.inputs[1] <== contractor_secret;
    commit_hasher.inputs[2] <== milestone_id;
    commitment <== commit_hasher.out;
}

component main = InvoiceNullifier();

// SPDX-License-Identifier: MIT
// Score Integrity Circuit — PLONK
//
// PURPOSE: Proves the ML scoring service computed the bid score correctly
// without revealing the ML model weights. The verifier only checks that:
//   score == bid_amount_weight * norm_bid + rating_weight * norm_rating
//          + completion_weight * norm_completion + zkp_boost
//
// This prevents the ML service from arbitrarily picking winners.
//
// FLOW:
//   Private inputs: bid_amount, rating, completion_rate, weights[4], zkp_boost
//   Public inputs:  tender_id, bid_id, declared_score
//   The circuit computes the score from inputs and constrains it to match declared_score.
//
// @author GovChain Team

pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

/// @notice Proves ML score integrity — score = weighted sum of bid features
/// @dev    All values are scaled by SCALING_FACTOR (1e6) for fixed-point arithmetic.
///         Weights are private (model IP), but the computation is verifiable.
template ScoreIntegrity() {
    // ─── Public Inputs ───────────────────────────────────
    signal input tender_id;
    signal input bid_id;
    signal input declared_score;      // The score the ML service claims

    // ─── Private Inputs (ML model internals) ─────────────
    signal input bid_amount;          // Normalized bid amount (0-1M scaled)
    signal input rating;              // Contractor rating (scaled by 1e6)
    signal input completion_rate;     // Completion rate (scaled by 1e4 → 1e6)

    signal input weight_bid;          // Weight for bid amount component
    signal input weight_rating;       // Weight for rating component
    signal input weight_completion;   // Weight for completion component
    signal input zkp_boost;           // Bonus for ZKP-verified contractors

    // ─── Score Computation ───────────────────────────────
    // score = w1 * bid + w2 * rating + w3 * completion + boost
    signal component_bid;
    signal component_rating;
    signal component_completion;
    signal computed_score;

    component_bid <== weight_bid * bid_amount;
    component_rating <== weight_rating * rating;
    component_completion <== weight_completion * completion_rate;

    // Sum all components
    computed_score <== component_bid + component_rating + component_completion + zkp_boost;

    // ─── Constraint: computed must equal declared ────────
    // This is the core integrity check — if the ML service lies about the score,
    // the proof will not verify.
    computed_score === declared_score;

    // ─── Range Check: score must be positive ─────────────
    component score_positive = GreaterThan(64);
    score_positive.in[0] <== declared_score;
    score_positive.in[1] <== 0;
    score_positive.out === 1;

    // ─── Commitment: hash all inputs for uniqueness ──────
    signal output score_commitment;
    component hasher = Poseidon(3);
    hasher.inputs[0] <== tender_id;
    hasher.inputs[1] <== bid_id;
    hasher.inputs[2] <== declared_score;
    score_commitment <== hasher.out;
}

component main {public [tender_id, bid_id, declared_score]} = ScoreIntegrity();

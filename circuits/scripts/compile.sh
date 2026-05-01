#!/bin/bash
# =============================================================================
# GovChain — Circuit Compilation & Trusted Setup Script
# =============================================================================
#
# Usage: ./compile.sh <circuit_name> <circuit_dir>
# Example: ./compile.sh kyc_verify kyc
#
# Prerequisites:
#   - circom (install: git clone https://github.com/iden3/circom && cargo build --release)
#   - snarkjs (install: npm install -g snarkjs)
#   - Download Powers of Tau: wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
#
# This script:
#   1. Compiles the circom circuit → R1CS + WASM + SYM
#   2. Runs Phase 2 trusted setup (Groth16)
#   3. Exports the Solidity verifier
#   4. Generates a test proof from test.json
# =============================================================================

set -e

CIRCUIT_NAME=${1:-kyc_verify}
CIRCUIT_DIR=${2:-kyc}
PTAU_FILE=${3:-../powersOfTau28_hez_final_14.ptau}

BUILD_DIR="build/${CIRCUIT_DIR}"
CIRCUIT_FILE="${CIRCUIT_DIR}/${CIRCUIT_NAME}.circom"
TEST_INPUT="${CIRCUIT_DIR}/${CIRCUIT_NAME}.test.json"

echo "═══════════════════════════════════════════════════"
echo "  Compiling: ${CIRCUIT_NAME}"
echo "  Source:    ${CIRCUIT_FILE}"
echo "═══════════════════════════════════════════════════"

# Create build directory
mkdir -p "${BUILD_DIR}"

# ─── Step 1: Compile Circuit ─────────────────────────────
echo ""
echo "[1/5] Compiling circuit..."
circom "${CIRCUIT_FILE}" \
  --r1cs \
  --wasm \
  --sym \
  --output "${BUILD_DIR}" \
  -l node_modules

echo "    ✓ R1CS:  ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs"
echo "    ✓ WASM:  ${BUILD_DIR}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"
echo "    ✓ SYM:   ${BUILD_DIR}/${CIRCUIT_NAME}.sym"

# ─── Step 2: Circuit Info ────────────────────────────────
echo ""
echo "[2/5] Circuit info..."
snarkjs r1cs info "${BUILD_DIR}/${CIRCUIT_NAME}.r1cs"

# ─── Step 3: Groth16 Setup (Phase 2) ────────────────────
echo ""
echo "[3/5] Running Groth16 trusted setup..."

if [ ! -f "${PTAU_FILE}" ]; then
  echo "    ⚠ Powers of Tau file not found: ${PTAU_FILE}"
  echo "    Download it first:"
  echo "    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau"
  exit 1
fi

snarkjs groth16 setup \
  "${BUILD_DIR}/${CIRCUIT_NAME}.r1cs" \
  "${PTAU_FILE}" \
  "${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey"

# Contribute to ceremony (single contribution for dev)
snarkjs zkey contribute \
  "${BUILD_DIR}/${CIRCUIT_NAME}_0000.zkey" \
  "${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey" \
  --name="GovChain Dev Contribution" \
  -v

echo "    ✓ ZKey:  ${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey"

# ─── Step 4: Export Solidity Verifier ────────────────────
echo ""
echo "[4/5] Exporting Solidity verifier..."
snarkjs zkey export solidityverifier \
  "${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey" \
  "${BUILD_DIR}/${CIRCUIT_NAME}_verifier.sol"

echo "    ✓ Verifier: ${BUILD_DIR}/${CIRCUIT_NAME}_verifier.sol"
echo "    → Copy this to src/zkp/Groth16Verifier.sol to replace the mock"

# ─── Step 5: Generate Test Proof ─────────────────────────
echo ""
echo "[5/5] Generating test proof..."

if [ -f "${TEST_INPUT}" ]; then
  # Generate witness
  node "${BUILD_DIR}/${CIRCUIT_NAME}_js/generate_witness.js" \
    "${BUILD_DIR}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" \
    "${TEST_INPUT}" \
    "${BUILD_DIR}/witness.wtns"

  # Generate proof
  snarkjs groth16 prove \
    "${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey" \
    "${BUILD_DIR}/witness.wtns" \
    "${BUILD_DIR}/proof.json" \
    "${BUILD_DIR}/public.json"

  # Verify proof
  snarkjs groth16 verify \
    "${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey" \
    "${BUILD_DIR}/public.json" \
    "${BUILD_DIR}/proof.json"

  echo "    ✓ Proof:  ${BUILD_DIR}/proof.json"
  echo "    ✓ Public: ${BUILD_DIR}/public.json"
else
  echo "    ⚠ No test input found: ${TEST_INPUT}"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Circuit compilation complete!"
echo "═══════════════════════════════════════════════════"

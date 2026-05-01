"""
ZKP Proof Generation API Routes

Provides endpoints for generating Zero-Knowledge Proofs for:
- KYC verification (Aadhaar + GST)
- Score integrity verification
- Invoice nullifier verification
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
import structlog

from src.services.zkp_service import zkp_service

logger = structlog.get_logger(__name__)

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class KYCProofRequest(BaseModel):
    """Request for KYC verification proof"""
    aadhaar_number: int = Field(..., description="12-digit Aadhaar number")
    gst_number: str = Field(..., description="GST registration number")
    salt: int = Field(..., description="Random salt for privacy")


class ScoreProofRequest(BaseModel):
    """Request for score integrity proof"""
    tender_id: int = Field(..., description="Tender ID")
    bid_id: int = Field(..., description="Bid ID")
    bid_amount: float = Field(..., description="Normalized bid amount (0-1)")
    rating: float = Field(..., description="Contractor rating (0-1)")
    completion_rate: float = Field(..., description="Completion rate (0-1)")
    weights: List[float] = Field(
        default=[0.40, 0.45, 0.10, 0.05],
        description="ML model weights [bid, rating, completion, boost]"
    )
    zkp_boost: float = Field(default=0.0, description="Bonus for ZKP-verified contractors")


class NullifierProofRequest(BaseModel):
    """Request for invoice nullifier proof"""
    invoice_data: str = Field(..., description="Hash of invoice contents")
    contractor_secret: int = Field(..., description="Contractor's private key/secret")
    milestone_id: int = Field(..., description="Milestone ID")


class ZKPProofResponse(BaseModel):
    """Response containing ZKP proof"""
    proof_type: str = Field(..., description="Type of proof (KYC/SCORE/NULLIFIER)")
    proof_a: List[int] = Field(..., description="Proof A component")
    proof_b: List[List[int]] = Field(..., description="Proof B component")
    proof_c: List[int] = Field(..., description="Proof C component")
    public_inputs: List[int] = Field(..., description="Public inputs for verification")
    verified: bool = Field(default=False, description="Whether proof was verified locally")


class CircuitInfoResponse(BaseModel):
    """Response with circuit information"""
    kyc_circuit: dict = Field(..., description="KYC circuit information")
    scoring_circuit: dict = Field(..., description="Scoring circuit information")
    nullifier_circuit: dict = Field(..., description="Nullifier circuit information")


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/zkp/kyc", response_model=ZKPProofResponse, status_code=status.HTTP_200_OK)
async def generate_kyc_proof(request: KYCProofRequest):
    """
    Generate KYC verification proof

    Proves contractor holds valid Aadhaar and GST credentials without revealing them.
    Uses Groth16 ZKP scheme for efficient verification.

    Args:
        request: KYC proof request with Aadhaar, GST, and salt

    Returns:
        ZKP proof with public inputs for on-chain verification
    """
    try:
        logger.info(
            "Generating KYC proof",
            aadhaar=request.aadhaar_number,
            gst=request.gst_number
        )

        proof = await zkp_service.generate_kyc_proof(
            aadhaar_number=request.aadhaar_number,
            gst_number=request.gst_number,
            salt=request.salt
        )

        # Verify locally (for testing)
        verified = await zkp_service.verify_proof_locally(proof)

        logger.info("KYC proof generated successfully", verified=verified)

        return ZKPProofResponse(
            proof_type=proof.proof_type,
            proof_a=proof.proof_a,
            proof_b=proof.proof_b,
            proof_c=proof.proof_c,
            public_inputs=proof.public_inputs,
            verified=verified
        )

    except Exception as e:
        logger.error("Failed to generate KYC proof", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate KYC proof: {str(e)}"
        )


@router.post("/zkp/score", response_model=ZKPProofResponse, status_code=status.HTTP_200_OK)
async def generate_score_proof(request: ScoreProofRequest):
    """
    Generate score integrity proof

    Proves ML score was computed correctly using the weighted formula.
    Uses PLONK ZKP scheme for efficient verification.

    Args:
        request: Score proof request with bid details and ML weights

    Returns:
        ZKP proof with public inputs for on-chain verification
    """
    try:
        logger.info(
            "Generating score proof",
            tender_id=request.tender_id,
            bid_id=request.bid_id
        )

        proof = await zkp_service.generate_score_proof(
            tender_id=request.tender_id,
            bid_id=request.bid_id,
            bid_amount=request.bid_amount,
            rating=request.rating,
            completion_rate=request.completion_rate,
            weights=request.weights,
            zkp_boost=request.zkp_boost
        )

        # Verify locally (for testing)
        verified = await zkp_service.verify_proof_locally(proof)

        logger.info("Score proof generated successfully", verified=verified)

        return ZKPProofResponse(
            proof_type=proof.proof_type,
            proof_a=proof.proof_a,
            proof_b=proof.proof_b,
            proof_c=proof.proof_c,
            public_inputs=proof.public_inputs,
            verified=verified
        )

    except Exception as e:
        logger.error("Failed to generate score proof", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate score proof: {str(e)}"
        )


@router.post("/zkp/nullifier", response_model=ZKPProofResponse, status_code=status.HTTP_200_OK)
async def generate_nullifier_proof(request: NullifierProofRequest):
    """
    Generate invoice nullifier proof

    Proves invoice hasn't been submitted before without revealing contents.
    Uses Groth16 ZKP scheme for efficient verification.

    Args:
        request: Nullifier proof request with invoice data and secret

    Returns:
        ZKP proof with public inputs for on-chain verification
    """
    try:
        logger.info(
            "Generating nullifier proof",
            milestone_id=request.milestone_id
        )

        proof = await zkp_service.generate_nullifier_proof(
            invoice_data=request.invoice_data,
            contractor_secret=request.contractor_secret,
            milestone_id=request.milestone_id
        )

        # Verify locally (for testing)
        verified = await zkp_service.verify_proof_locally(proof)

        logger.info("Nullifier proof generated successfully", verified=verified)

        return ZKPProofResponse(
            proof_type=proof.proof_type,
            proof_a=proof.proof_a,
            proof_b=proof.proof_b,
            proof_c=proof.proof_c,
            public_inputs=proof.public_inputs,
            verified=verified
        )

    except Exception as e:
        logger.error("Failed to generate nullifier proof", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate nullifier proof: {str(e)}"
        )


@router.get("/zkp/circuits", response_model=CircuitInfoResponse, status_code=status.HTTP_200_OK)
async def get_circuit_info():
    """
    Get information about available ZKP circuits

    Returns:
        Information about all available circuits and their status
    """
    try:
        logger.info("Fetching circuit information")

        circuits = zkp_service.get_circuit_info()

        logger.info("Circuit information retrieved successfully")

        return CircuitInfoResponse(
            kyc_circuit=circuits["kyc_circuit"],
            scoring_circuit=circuits["scoring_circuit"],
            nullifier_circuit=circuits["nullifier_circuit"]
        )

    except Exception as e:
        logger.error("Failed to fetch circuit information", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch circuit information: {str(e)}"
        )


@router.post("/zkp/verify", status_code=status.HTTP_200_OK)
async def verify_proof(
    proof_type: str,
    proof_a: List[int],
    proof_b: List[List[int]],
    proof_c: List[int],
    public_inputs: List[int]
):
    """
    Verify a ZKP proof locally

    Args:
        proof_type: Type of proof (KYC/SCORE/NULLIFIER)
        proof_a: Proof A component
        proof_b: Proof B component
        proof_c: Proof C component
        public_inputs: Public inputs for verification

    Returns:
        Verification result
    """
    try:
        logger.info("Verifying ZKP proof", proof_type=proof_type)

        from src.services.zkp_service import ZKPProof

        proof = ZKPProof(
            proof_type=proof_type,
            proof_a=proof_a,
            proof_b=proof_b,
            proof_c=proof_c,
            public_inputs=public_inputs
        )

        verified = await zkp_service.verify_proof_locally(proof)

        logger.info("Proof verification completed", verified=verified)

        return {
            "verified": verified,
            "proof_type": proof_type,
            "public_inputs": public_inputs
        }

    except Exception as e:
        logger.error("Failed to verify proof", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify proof: {str(e)}"
        )
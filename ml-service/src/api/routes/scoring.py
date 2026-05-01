"""
Bid Scoring API Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import structlog
import numpy as np

from src.services.model_manager import ModelManager
from src.services.nvidia_nim import nvidia_service
from src.utils.metrics import metrics

logger = structlog.get_logger(__name__)
router = APIRouter()


class BidScoringRequest(BaseModel):
    """Request model for bid scoring"""
    tender_id: str = Field(..., description="Tender ID")
    contractor_id: str = Field(..., description="Contractor ID")
    bid_amount: float = Field(..., gt=0, description="Bid amount in INR")
    rating: float = Field(default=0.6, ge=0, le=1, description="Contractor rating (0-1)")
    completion_rate: float = Field(default=0.7, ge=0, le=1, description="Historical completion rate")
    newcomer_boost: float = Field(default=0.0, ge=0, le=1, description="Newcomer boost factor")
    historical_performance: float = Field(default=0.5, ge=0, le=1, description="Historical performance score")


class BidScoringResponse(BaseModel):
    """Response model for bid scoring"""
    score: float = Field(..., description="Overall score (0-1)")
    score_percentage: float = Field(..., description="Score as percentage (0-100)")
    breakdown: Dict[str, float] = Field(..., description="Score breakdown by component")
    weights: Dict[str, float] = Field(..., description="Weights used for scoring")
    rank: Optional[str] = Field(None, description="Rank position if available")
    fraud_flag: bool = Field(default=False, description="Whether fraud was detected")
    inference_time: float = Field(..., description="Time taken for inference in seconds")
    model_version: str = Field(..., description="Model version used")


class BatchScoringRequest(BaseModel):
    """Request model for batch scoring"""
    tender_id: str = Field(..., description="Tender ID")
    bids: list[BidScoringRequest] = Field(..., min_items=1, description="List of bids to score")


class BatchScoringResponse(BaseModel):
    """Response model for batch scoring"""
    tender_id: str = Field(..., description="Tender ID")
    total_bids: int = Field(..., description="Total number of bids scored")
    scores: list[Dict[str, Any]] = Field(..., description="List of scored bids")
    winner: Optional[Dict[str, Any]] = Field(None, description="Winning bid details")
    processing_time: float = Field(..., description="Total processing time")


def get_model_manager(request) -> ModelManager:
    """Dependency to get model manager from app state"""
    return request.app.state.model_manager


@router.post("/score", response_model=BidScoringResponse)
async def score_bid(
    request: BidScoringRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Score a single bid using ML models and rule-based scoring
    
    This endpoint combines rule-based scoring with ML predictions to provide
    a comprehensive bid score that considers multiple factors.
    """
    try:
        logger.info(
            "Scoring bid",
            tender_id=request.tender_id,
            contractor_id=request.contractor_id,
            bid_amount=request.bid_amount
        )
        
        # Prepare features
        features = {
            'bid_amount': request.bid_amount,
            'rating': request.rating,
            'completion_rate': request.completion_rate,
            'newcomer_boost': request.newcomer_boost
        }
        
        # Score the bid
        result = await model_manager.score_bid(features)
        
        # Determine rank (placeholder - would need all bids for real ranking)
        result['rank'] = "Pending"
        
        logger.info(
            "Bid scored successfully",
            tender_id=request.tender_id,
            score=result['score']
        )
        
        return BidScoringResponse(**result)
        
    except Exception as e:
        logger.error("Bid scoring failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


@router.post("/batch-score", response_model=BatchScoringResponse)
async def score_bids_batch(
    request: BatchScoringRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Score multiple bids for a tender and determine winner
    
    This endpoint processes all bids for a tender, scores them using ML models,
    and determines the winning bid based on the highest score.
    """
    import time
    
    try:
        start_time = time.time()
        logger.info(
            "Batch scoring bids",
            tender_id=request.tender_id,
            num_bids=len(request.bids)
        )
        
        # Score all bids
        scored_bids = []
        for bid_request in request.bids:
            features = {
                'bid_amount': bid_request.bid_amount,
                'rating': bid_request.rating,
                'completion_rate': bid_request.completion_rate,
                'newcomer_boost': bid_request.newcomer_boost
            }
            
            result = await model_manager.score_bid(features)
            scored_bids.append({
                'contractor_id': bid_request.contractor_id,
                'bid_amount': bid_request.bid_amount,
                **result
            })
        
        # Sort by score (descending)
        scored_bids.sort(key=lambda x: x['score'], reverse=True)
        
        # Assign ranks
        for i, bid in enumerate(scored_bids):
            bid['rank'] = f"{i + 1}{self._get_ordinal_suffix(i + 1)}"
        
        # Determine winner
        winner = scored_bids[0] if scored_bids else None
        
        processing_time = time.time() - start_time
        
        logger.info(
            "Batch scoring completed",
            tender_id=request.tender_id,
            total_bids=len(scored_bids),
            processing_time=processing_time
        )
        
        return BatchScoringResponse(
            tender_id=request.tender_id,
            total_bids=len(scored_bids),
            scores=scored_bids,
            winner=winner,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error("Batch scoring failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Batch scoring failed: {str(e)}")


@router.get("/score/{bid_id}")
async def get_bid_score(
    bid_id: str,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Get score for a specific bid (placeholder - would need database integration)
    """
    try:
        # This would normally fetch from database
        logger.info("Getting bid score", bid_id=bid_id)
        
        return {
            "bid_id": bid_id,
            "message": "Bid score retrieval requires database integration",
            "status": "not_implemented"
        }
        
    except Exception as e:
        logger.error("Failed to get bid score", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get bid score: {str(e)}")


def _get_ordinal_suffix(n: int) -> str:
    """Get ordinal suffix for number"""
    if 11 <= (n % 100) <= 13:
        return "th"
    return {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")

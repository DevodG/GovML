"""
Fraud Detection API Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import structlog
import numpy as np

from src.services.model_manager import ModelManager
from src.services.nvidia_nim import nvidia_service
from src.utils.metrics import metrics

logger = structlog.get_logger(__name__)
router = APIRouter()


class FraudDetectionRequest(BaseModel):
    """Request model for fraud detection"""
    tender_id: str = Field(..., description="Tender ID")
    contractor_id: str = Field(..., description="Contractor ID")
    bid_amount: float = Field(..., gt=0, description="Bid amount in INR")
    category_median: float = Field(..., gt=0, description="Median bid amount for category")
    rating: float = Field(default=0.6, ge=0, le=1, description="Contractor rating")
    days_since_registration: int = Field(default=30, ge=0, description="Days since contractor registration")
    bid_velocity_score: float = Field(default=0.5, ge=0, le=1, description="Bid velocity score")
    similar_bids_count: int = Field(default=0, ge=0, description="Count of similar bids from same contractor")


class FraudDetectionResponse(BaseModel):
    """Response model for fraud detection"""
    is_fraud: bool = Field(..., description="Whether fraud was detected")
    fraud_probability: float = Field(..., description="Probability of fraud (0-1)")
    anomaly_score: float = Field(..., description="Anomaly score from model")
    fraud_indicators: List[str] = Field(..., description="List of fraud indicators detected")
    risk_level: str = Field(..., description="Overall risk level")
    explanation: str = Field(..., description="Human-readable explanation")
    recommended_actions: List[str] = Field(..., description="Recommended actions")
    inference_time: float = Field(..., description="Time taken for inference")
    model_version: str = Field(..., description="Model version used")


class AnomalyDetectionRequest(BaseModel):
    """Request model for anomaly detection"""
    entity_id: str = Field(..., description="Entity ID")
    entity_type: str = Field(..., description="Type of entity")
    features: Dict[str, float] = Field(..., description="Feature values for anomaly detection")


class AnomalyDetectionResponse(BaseModel):
    """Response model for anomaly detection"""
    is_anomaly: bool = Field(..., description="Whether anomaly was detected")
    anomaly_score: float = Field(..., description="Anomaly score")
    severity: str = Field(..., description="Severity level")
    feature_contributions: Dict[str, float] = Field(..., description="Contribution of each feature")
    inference_time: float = Field(..., description="Time taken for inference")
    model_version: str = Field(..., description="Model version used")


def get_model_manager(request) -> ModelManager:
    """Dependency to get model manager from app state"""
    return request.app.state.model_manager


@router.post("/detect", response_model=FraudDetectionResponse)
async def detect_fraud(
    request: FraudDetectionRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Detect fraud in a bid using ML models and rule-based analysis
    
    This endpoint uses Isolation Forest for anomaly detection combined with
    rule-based checks to identify potential fraud patterns.
    """
    try:
        logger.info(
            "Detecting fraud",
            tender_id=request.tender_id,
            contractor_id=request.contractor_id,
            bid_amount=request.bid_amount
        )
        
        # Prepare features for ML model
        features = np.array([
            request.bid_amount / request.category_median,  # Normalized bid amount
            request.rating,
            request.days_since_registration / 365,  # Normalized registration time
            request.bid_velocity_score
        ])
        
        # Get ML prediction
        ml_result = await model_manager.predict_fraud(features)
        
        # Rule-based checks
        fraud_indicators = []
        risk_factors = 0
        
        # Check for overpricing
        price_ratio = request.bid_amount / request.category_median
        if price_ratio > 1.3:  # 30% above median
            fraud_indicators.append(f"Bid is {price_ratio:.1%} above category median")
            risk_factors += 2
        
        # Check for underpricing (potential bid rigging)
        if price_ratio < 0.5:  # 50% below median
            fraud_indicators.append(f"Bid is {price_ratio:.1%} below category median (suspicious)")
            risk_factors += 3
        
        # Check for new account
        if request.days_since_registration < 7:
            fraud_indicators.append(f"New account ({request.days_since_registration} days old)")
            risk_factors += 1
        
        # Check for high bid velocity
        if request.bid_velocity_score > 0.8:
            fraud_indicators.append("Unusually high bid submission velocity")
            risk_factors += 1
        
        # Check for similar bids pattern
        if request.similar_bids_count > 2:
            fraud_indicators.append(f"Multiple similar bids ({request.similar_bids_count}) detected")
            risk_factors += 2
        
        # Combine ML and rule-based results
        combined_probability = max(
            ml_result['fraud_probability'],
            min(1.0, risk_factors / 5.0)  # Normalize risk factors
        )
        
        # Determine overall fraud status
        is_fraud = combined_probability > 0.7 or ml_result['is_fraud']
        
        # Determine risk level
        if combined_probability > 0.8:
            risk_level = "critical"
        elif combined_probability > 0.6:
            risk_level = "high"
        elif combined_probability > 0.4:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Generate explanation
        explanation = await nvidia_service.explain_fraud_pattern({
            'type': 'bid_anomaly',
            'probability': combined_probability,
            'indicators': fraud_indicators,
            'context': f"Tender {request.tender_id}, Contractor {request.contractor_id}"
        })
        
        # Generate recommended actions
        recommended_actions = []
        if risk_level in ['critical', 'high']:
            recommended_actions.extend([
                "Immediate manual review required",
                "Verify contractor credentials",
                "Check for related entities",
                "Consider flagging for audit"
            ])
        elif risk_level == 'medium':
            recommended_actions.extend([
                "Schedule detailed review",
                "Monitor for similar patterns",
                "Verify supporting documentation"
            ])
        else:
            recommended_actions.extend([
                "Continue routine monitoring",
                "Document for audit trail"
            ])
        
        logger.info(
            "Fraud detection completed",
            tender_id=request.tender_id,
            is_fraud=is_fraud,
            probability=combined_probability
        )
        
        return FraudDetectionResponse(
            is_fraud=is_fraud,
            fraud_probability=combined_probability,
            anomaly_score=ml_result['anomaly_score'],
            fraud_indicators=fraud_indicators,
            risk_level=risk_level,
            explanation=explanation,
            recommended_actions=recommended_actions,
            inference_time=ml_result['inference_time'],
            model_version=ml_result['model_version']
        )
        
    except Exception as e:
        logger.error("Fraud detection failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Fraud detection failed: {str(e)}")


@router.post("/anomaly", response_model=AnomalyDetectionResponse)
async def detect_anomaly(
    request: AnomalyDetectionRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Detect anomalies in entity behavior using ML models
    
    This endpoint uses Isolation Forest to detect anomalous patterns
    in contractor behavior, bid patterns, or other entities.
    """
    try:
        logger.info(
            "Detecting anomaly",
            entity_id=request.entity_id,
            entity_type=request.entity_type
        )
        
        # Prepare features
        feature_values = list(request.features.values())
        features = np.array(feature_values)
        
        # Detect anomaly
        result = await model_manager.detect_anomaly(features)
        
        # Calculate feature contributions
        feature_contributions = {}
        for feature_name, value in request.features.items():
            # Simple contribution based on deviation from mean (placeholder)
            contribution = abs(value - 0.5) * 2  # Normalize to 0-1
            feature_contributions[feature_name] = min(1.0, contribution)
        
        logger.info(
            "Anomaly detection completed",
            entity_id=request.entity_id,
            is_anomaly=result['is_anomaly']
        )
        
        return AnomalyDetectionResponse(
            is_anomaly=result['is_anomaly'],
            anomaly_score=result['anomaly_score'],
            severity=result['severity'],
            feature_contributions=feature_contributions,
            inference_time=result['inference_time'],
            model_version=result['model_version']
        )
        
    except Exception as e:
        logger.error("Anomaly detection failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")


@router.get("/patterns")
async def get_fraud_patterns():
    """
    Get known fraud patterns and their characteristics
    
    This endpoint returns information about known fraud patterns
    that the system is designed to detect.
    """
    patterns = {
        "overpricing": {
            "description": "Bids significantly above market rate",
            "threshold": "30% above category median",
            "severity": "medium",
            "detection_method": "rule-based + ML"
        },
        "bid_rigging": {
            "description": "Suspiciously low bids indicating collusion",
            "threshold": "50% below category median",
            "severity": "high",
            "detection_method": "rule-based + ML"
        },
        "velocity": {
            "description": "Unusually rapid bid submission",
            "threshold": "Account created < 7 days ago",
            "severity": "medium",
            "detection_method": "rule-based"
        },
        "collusion": {
            "description": "Multiple similar bids from related entities",
            "threshold": "> 2 similar bids detected",
            "severity": "high",
            "detection_method": "network analysis + ML"
        },
        "round_number_bias": {
            "description": "Suspicious round-number bids",
            "threshold": "Exact round numbers (e.g., ₹50L)",
            "severity": "low",
            "detection_method": "pattern analysis"
        }
    }
    
    return {
        "patterns": patterns,
        "total_patterns": len(patterns),
        "detection_methods": ["rule-based", "ML", "network analysis", "pattern analysis"]
    }

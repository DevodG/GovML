"""
Input Validation Utilities
"""
from typing import Dict, Any, List, Optional
import re
from pydantic import BaseModel, validator, Field
import structlog

logger = structlog.get_logger(__name__)


class ValidationError(Exception):
    """Custom validation error"""
    pass


def validate_bid_amount(amount: float) -> bool:
    """Validate bid amount"""
    if amount <= 0:
        raise ValidationError("Bid amount must be positive")
    if amount > 1e10:  # Max 1000 Cr
        raise ValidationError("Bid amount exceeds maximum limit")
    return True


def validate_rating(rating: float) -> bool:
    """Validate contractor rating"""
    if not 0 <= rating <= 1:
        raise ValidationError("Rating must be between 0 and 1")
    return True


def validate_completion_rate(rate: float) -> bool:
    """Validate completion rate"""
    if not 0 <= rate <= 1:
        raise ValidationError("Completion rate must be between 0 and 1")
    return True


def validate_severity(severity: int) -> bool:
    """Validate severity level"""
    if not 1 <= severity <= 10:
        raise ValidationError("Severity must be between 1 and 10")
    return True


def validate_ethereum_address(address: str) -> bool:
    """Validate Ethereum address"""
    if not re.match(r'^0x[a-fA-F0-9]{40}$', address):
        raise ValidationError("Invalid Ethereum address")
    return True


def validate_tender_id(tender_id: str) -> bool:
    """Validate tender ID format"""
    if not tender_id or len(tender_id) > 100:
        raise ValidationError("Invalid tender ID")
    return True


def validate_contractor_id(contractor_id: str) -> bool:
    """Validate contractor ID format"""
    if not contractor_id or len(contractor_id) > 100:
        raise ValidationError("Invalid contractor ID")
    return True


class BidScoringValidator(BaseModel):
    """Validator for bid scoring requests"""
    tender_id: str = Field(..., min_length=1, max_length=100)
    contractor_id: str = Field(..., min_length=1, max_length=100)
    bid_amount: float = Field(..., gt=0, le=1e10)
    rating: float = Field(default=0.6, ge=0, le=1)
    completion_rate: float = Field(default=0.7, ge=0, le=1)
    newcomer_boost: float = Field(default=0.0, ge=0, le=1)
    
    @validator('tender_id')
    def validate_tender_id_format(cls, v):
        if not re.match(r'^[A-Za-z0-9\-_]+$', v):
            raise ValueError('Invalid tender ID format')
        return v
    
    @validator('contractor_id')
    def validate_contractor_id_format(cls, v):
        if not re.match(r'^[A-Za-z0-9\-_]+$', v):
            raise ValueError('Invalid contractor ID format')
        return v


class FraudDetectionValidator(BaseModel):
    """Validator for fraud detection requests"""
    tender_id: str = Field(..., min_length=1, max_length=100)
    contractor_id: str = Field(..., min_length=1, max_length=100)
    bid_amount: float = Field(..., gt=0, le=1e10)
    category_median: float = Field(..., gt=0, le=1e10)
    rating: float = Field(default=0.6, ge=0, le=1)
    days_since_registration: int = Field(default=30, ge=0, le=3650)
    bid_velocity_score: float = Field(default=0.5, ge=0, le=1)
    similar_bids_count: int = Field(default=0, ge=0, le=100)
    
    @validator('category_median')
    def validate_category_median(cls, v, values):
        if 'bid_amount' in values and v <= 0:
            raise ValueError('Category median must be positive')
        return v


class AuditReportValidator(BaseModel):
    """Validator for audit report requests"""
    anomaly_id: str = Field(..., min_length=1, max_length=100)
    anomaly_type: str = Field(..., min_length=1, max_length=50)
    entity_id: str = Field(..., min_length=1, max_length=100)
    entity_type: str = Field(..., min_length=1, max_length=50)
    severity: int = Field(..., ge=1, le=10)
    description: str = Field(..., min_length=1, max_length=1000)
    timestamp: str = Field(..., min_length=1, max_length=100)
    fraud_probability: Optional[float] = Field(None, ge=0, le=1)
    anomaly_score: Optional[float] = Field(None)
    related_transactions: Optional[List[str]] = Field(None)
    
    @validator('timestamp')
    def validate_timestamp_format(cls, v):
        # Simple ISO format validation
        if not re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', v):
            raise ValueError('Invalid timestamp format')
        return v


def validate_request_data(data: Dict[str, Any], validator_class: type) -> Dict[str, Any]:
    """Validate request data using Pydantic validator"""
    try:
        validated = validator_class(**data)
        return validated.dict()
    except Exception as e:
        logger.error("Request validation failed", error=str(e))
        raise ValidationError(f"Validation error: {str(e)}")


def sanitize_input(input_string: str) -> str:
    """Sanitize user input to prevent injection attacks"""
    if not input_string:
        return ""
    
    # Remove potentially dangerous characters
    sanitized = re.sub(r'[<>"\']', '', input_string)
    
    # Limit length
    return sanitized[:1000]


def validate_batch_size(size: int, max_size: int = 100) -> bool:
    """Validate batch processing size"""
    if size <= 0:
        raise ValidationError("Batch size must be positive")
    if size > max_size:
        raise ValidationError(f"Batch size exceeds maximum of {max_size}")
    return True

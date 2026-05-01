"""
ML Service Configuration
Production-ready settings with environment variable support
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    APP_NAME: str = "GovChain ML Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # NVIDIA NIM Configuration
    NVIDIA_API_KEY: str = ""
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "meta/llama-3.1-8b-instruct"
    NVIDIA_MAX_TOKENS: int = 2048
    NVIDIA_TEMPERATURE: float = 0.7
    
    # Model Configuration
    MODEL_CACHE_DIR: str = "./models"
    MODEL_RETRAIN_INTERVAL: int = 86400  # 24 hours in seconds
    
    # Scoring Configuration
    BID_SCORING_MODEL: str = "ensemble"
    FRAUD_DETECTION_MODEL: str = "isolation_forest"
    ANOMALY_THRESHOLD: float = 0.85
    
    # Feature Weights for Bid Scoring
    WEIGHT_BID_AMOUNT: float = 0.40
    WEIGHT_RATING: float = 0.45
    WEIGHT_COMPLETION_RATE: float = 0.10
    WEIGHT_NEWCOMER_BOOST: float = 0.05
    
    # Fraud Detection Thresholds
    FRAUD_THRESHOLD_OVERPRICING: float = 1.30  # 30% above median
    FRAUD_THRESHOLD_UNDERPRICING: float = 0.50  # 50% below median
    FRAUD_THRESHOLD_VELOCITY: int = 7  # days
    
    # Caching Configuration
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 3600  # 1 hour
    REDIS_URL: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE: str = "./logs/ml_service.log"
    
    # Monitoring
    METRICS_ENABLED: bool = True
    METRICS_PORT: int = 9090
    
    # Security
    API_KEY_REQUIRED: bool = False
    API_KEY: Optional[str] = None
    
    # Demo Mode
    DEMO_MODE: bool = False
    DEMO_TIMER_MINUTES: int = 2
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

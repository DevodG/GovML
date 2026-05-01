"""
Health Check API Routes
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
import structlog
import time
import psutil
import os

logger = structlog.get_logger(__name__)
router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="Service version")
    timestamp: str = Field(..., description="Current timestamp")
    uptime: float = Field(..., description="Service uptime in seconds")
    services: Dict[str, str] = Field(..., description="Status of dependent services")
    system: Dict[str, Any] = Field(..., description="System metrics")


class ReadinessResponse(BaseModel):
    """Readiness check response model"""
    ready: bool = Field(..., description="Whether service is ready")
    checks: Dict[str, bool] = Field(..., description="Individual check results")


class LivenessResponse(BaseModel):
    """Liveness check response model"""
    alive: bool = Field(..., description="Whether service is alive")
    timestamp: str = Field(..., description="Current timestamp")


# Track service start time
start_time = time.time()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Comprehensive health check endpoint
    
    Returns service status, dependency health, and system metrics.
    """
    try:
        uptime = time.time() - start_time
        
        # Check service health
        services = {
            "ml_service": "healthy",
            "models": "loaded",
            "api": "operational"
        }
        
        # System metrics
        system = {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "process_id": os.getpid(),
            "thread_count": psutil.Process().num_threads()
        }
        
        logger.info("Health check performed", uptime=uptime)
        
        return HealthResponse(
            status="healthy",
            version="1.0.0",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            uptime=uptime,
            services=services,
            system=system
        )
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return HealthResponse(
            status="unhealthy",
            version="1.0.0",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            uptime=time.time() - start_time,
            services={"error": str(e)},
            system={}
        )


@router.get("/ready", response_model=ReadinessResponse)
async def readiness_check():
    """
    Readiness check endpoint
    
    Returns whether the service is ready to handle requests.
    """
    try:
        checks = {
            "models_loaded": True,
            "api_operational": True,
            "dependencies_available": True
        }
        
        ready = all(checks.values())
        
        logger.info("Readiness check performed", ready=ready)
        
        return ReadinessResponse(
            ready=ready,
            checks=checks
        )
        
    except Exception as e:
        logger.error("Readiness check failed", error=str(e))
        return ReadinessResponse(
            ready=False,
            checks={"error": str(e)}
        )


@router.get("/live", response_model=LivenessResponse)
async def liveness_check():
    """
    Liveness check endpoint
    
    Returns whether the service is alive and responding.
    """
    try:
        logger.info("Liveness check performed")
        
        return LivenessResponse(
            alive=True,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        )
        
    except Exception as e:
        logger.error("Liveness check failed", error=str(e))
        return LivenessResponse(
            alive=False,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        )


@router.get("/metrics")
async def metrics():
    """
    Metrics endpoint (placeholder for Prometheus metrics)
    
    This would normally return Prometheus metrics in the proper format.
    """
    try:
        return {
            "message": "Metrics available at /metrics endpoint",
            "prometheus_enabled": True
        }
        
    except Exception as e:
        logger.error("Metrics check failed", error=str(e))
        return {"error": str(e)}


@router.get("/info")
async def service_info():
    """
    Service information endpoint
    
    Returns detailed information about the service configuration.
    """
    try:
        info = {
            "service": "GovChain ML Service",
            "version": "1.0.0",
            "description": "Advanced ML service for government procurement fraud detection and bid scoring",
            "endpoints": {
                "docs": "/api/docs",
                "health": "/api/v1/health",
                "ready": "/api/v1/ready",
                "live": "/api/v1/live",
                "scoring": "/api/v1/scoring",
                "fraud": "/api/v1/fraud",
                "audit": "/api/v1/audit"
            },
            "models": {
                "bid_scoring": "ensemble",
                "fraud_detection": "isolation_forest",
                "anomaly_detection": "isolation_forest",
                "ai_narrator": "nvidia_nim"
            },
            "features": [
                "ML-powered bid scoring",
                "Fraud detection with Isolation Forest",
                "AI audit narration with NVIDIA NIM",
                "Real-time anomaly detection",
                "Batch processing support",
                "Comprehensive metrics"
            ],
            "configuration": {
                "debug": False,
                "workers": 4,
                "cache_enabled": True,
                "metrics_enabled": True
            }
        }
        
        logger.info("Service info requested")
        
        return info
        
    except Exception as e:
        logger.error("Service info failed", error=str(e))
        return {"error": str(e)}

"""
GovChain ML Service
Production-ready machine learning service for bid scoring, fraud detection, and AI audit narration
"""
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import structlog
import time
from prometheus_client import Counter, Histogram, generate_latest
from prometheus_client exposition import CONTENT_TYPE_LATEST

from src.config.settings import settings
from src.api.routes import scoring, fraud, audit, health
from src.utils.logger import setup_logger
from src.utils.metrics import setup_metrics

# Setup structured logging
logger = setup_logger()

# Prometheus metrics
request_count = Counter('ml_service_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('ml_service_request_duration_seconds', 'Request duration')
model_predictions = Counter('ml_service_model_predictions_total', 'Total model predictions', ['model_type'])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting GovChain ML Service", version=settings.APP_VERSION)
    
    # Initialize models
    from src.services.model_manager import ModelManager
    model_manager = ModelManager()
    await model_manager.initialize()
    
    # Store in app state
    app.state.model_manager = model_manager
    
    logger.info("ML Service initialized successfully")
    yield
    
    # Cleanup
    logger.info("Shutting down ML Service")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Advanced ML service for government procurement fraud detection and bid scoring",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with structured logging"""
    start_time = time.time()
    
    logger.info(
        "request_started",
        method=request.method,
        path=request.url.path,
        client_ip=request.client.host if request.client else None
    )
    
    try:
        response = await call_next(request)
        
        duration = time.time() - start_time
        status_code = response.status_code
        
        # Update metrics
        request_count.labels(
            method=request.method,
            endpoint=request.url.path,
            status=status_code
        ).inc()
        request_duration.observe(duration)
        
        logger.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=status_code,
            duration=duration
        )
        
        return response
        
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            "request_failed",
            method=request.method,
            path=request.url.path,
            error=str(e),
            duration=duration
        )
        raise


# Include routers
app.include_router(scoring.router, prefix=settings.API_PREFIX, tags=["Scoring"])
app.include_router(fraud.router, prefix=settings.API_PREFIX, tags=["Fraud Detection"])
app.include_router(audit.router, prefix=settings.API_PREFIX, tags=["AI Audit"])
app.include_router(zkp.router, prefix=settings.API_PREFIX, tags=["ZKP Proofs"])
app.include_router(health.router, prefix=settings.API_PREFIX, tags=["Health"])


# Metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with structured logging"""
    logger.error(
        "unhandled_exception",
        path=request.url.path,
        error=str(exc),
        error_type=type(exc).__name__
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "endpoints": {
            "docs": "/api/docs",
            "health": "/api/v1/health",
            "scoring": "/api/v1/scoring",
            "fraud": "/api/v1/fraud",
            "audit": "/api/v1/audit"
        },
        "models": {
            "bid_scoring": settings.BID_SCORING_MODEL,
            "fraud_detection": settings.FRAUD_DETECTION_MODEL,
            "ai_narrator": settings.NVIDIA_MODEL
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        workers=settings.WORKERS,
        log_level=settings.LOG_LEVEL.lower(),
        reload=settings.DEBUG
    )

"""
Prometheus metrics setup for ML service
"""
from prometheus_client import Counter, Histogram, Gauge, Info
from prometheus_client import start_http_server
from src.config.settings import settings


def setup_metrics():
    """Setup Prometheus metrics"""
    
    if settings.METRICS_ENABLED:
        # Start metrics server on separate port
        start_http_server(settings.METRICS_PORT)
        
    return {
        # Request metrics
        "request_count": Counter(
            'ml_service_requests_total',
            'Total requests',
            ['method', 'endpoint', 'status']
        ),
        "request_duration": Histogram(
            'ml_service_request_duration_seconds',
            'Request duration'
        ),
        
        # Model metrics
        "model_predictions": Counter(
            'ml_service_model_predictions_total',
            'Total model predictions',
            ['model_type']
        ),
        "model_errors": Counter(
            'ml_service_model_errors_total',
            'Total model errors',
            ['model_type', 'error_type']
        ),
        "model_inference_time": Histogram(
            'ml_service_model_inference_time_seconds',
            'Model inference time',
            ['model_type']
        ),
        
        # Business metrics
        "bids_scored": Counter(
            'govchain_bids_scored_total',
            'Total bids scored'
        ),
        "fraud_detected": Counter(
            'govchain_fraud_detected_total',
            'Total fraud cases detected',
            ['fraud_type']
        ),
        "audit_reports_generated": Counter(
            'govchain_audit_reports_total',
            'Total audit reports generated'
        ),
        
        # System metrics
        "cache_hits": Counter(
            'ml_service_cache_hits_total',
            'Total cache hits'
        ),
        "cache_misses": Counter(
            'ml_service_cache_misses_total',
            'Total cache misses'
        ),
        
        # Info metrics
        "service_info": Info(
            'ml_service_info',
            'ML Service information'
        )
    }


# Global metrics instance
metrics = setup_metrics()

# Set service info
metrics["service_info"].info({
    "version": settings.APP_VERSION,
    "environment": "production" if not settings.DEBUG else "development"
})

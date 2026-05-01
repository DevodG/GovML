"""API Routes Package"""
from .scoring import router as scoring_router
from .fraud import router as fraud_router
from .audit import router as audit_router
from .health import router as health_router

__all__ = ['scoring_router', 'fraud_router', 'audit_router', 'health_router']

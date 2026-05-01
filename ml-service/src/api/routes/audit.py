"""
AI Audit Narration API Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import structlog
import json

from src.services.model_manager import ModelManager
from src.services.nvidia_nim import nvidia_service
from src.utils.metrics import metrics

logger = structlog.get_logger(__name__)
router = APIRouter()


class AuditReportRequest(BaseModel):
    """Request model for AI audit report generation"""
    anomaly_id: str = Field(..., description="Anomaly ID")
    anomaly_type: str = Field(..., description="Type of anomaly")
    entity_id: str = Field(..., description="Entity ID")
    entity_type: str = Field(..., description="Type of entity")
    severity: int = Field(..., ge=1, le=10, description="Severity level (1-10)")
    description: str = Field(..., description="Description of anomaly")
    timestamp: str = Field(..., description="Timestamp of anomaly")
    fraud_probability: Optional[float] = Field(None, ge=0, le=1, description="Fraud probability")
    anomaly_score: Optional[float] = Field(None, description="Anomaly score")
    related_transactions: Optional[List[str]] = Field(None, description="Related transaction IDs")


class AuditReportResponse(BaseModel):
    """Response model for AI audit report"""
    report_id: str = Field(..., description="Report ID")
    generated_at: str = Field(..., description="Generation timestamp")
    anomaly_type: str = Field(..., description="Type of anomaly")
    ai_generated: bool = Field(..., description="Whether report was AI-generated")
    model_used: str = Field(..., description="Model used for generation")
    executive_summary: str = Field(..., description="Executive summary")
    detailed_analysis: str = Field(..., description="Detailed analysis")
    risk_assessment: Dict[str, Any] = Field(..., description="Risk assessment")
    recommended_actions: List[str] = Field(..., description="Recommended actions")
    conclusion: str = Field(..., description="Conclusion")
    generation_time: float = Field(..., description="Time taken to generate report")


class BatchAuditRequest(BaseModel):
    """Request model for batch audit report generation"""
    anomalies: List[AuditReportRequest] = Field(..., min_items=1, description="List of anomalies")


class BatchAuditResponse(BaseModel):
    """Response model for batch audit report generation"""
    total_reports: int = Field(..., description="Total number of reports generated")
    reports: List[Dict[str, Any]] = Field(..., description="Generated reports")
    processing_time: float = Field(..., description="Total processing time")
    summary: Dict[str, Any] = Field(..., description="Summary of findings")


def get_model_manager(request) -> ModelManager:
    """Dependency to get model manager from app state"""
    return request.app.state.model_manager


@router.post("/generate", response_model=AuditReportResponse)
async def generate_audit_report(
    request: AuditReportRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Generate AI-powered audit report for blockchain anomaly
    
    This endpoint uses NVIDIA NIM (free cloud LLM) to generate
    human-readable audit reports from blockchain anomaly data.
    """
    import time
    
    try:
        start_time = time.time()
        logger.info(
            "Generating audit report",
            anomaly_id=request.anomaly_id,
            anomaly_type=request.anomaly_type
        )
        
        # Prepare anomaly data
        anomaly_data = {
            'id': request.anomaly_id,
            'anomaly_type': request.anomaly_type,
            'entity_id': request.entity_id,
            'entity_type': request.entity_type,
            'severity': request.severity,
            'description': request.description,
            'timestamp': request.timestamp,
            'fraud_probability': request.fraud_probability,
            'anomaly_score': request.anomaly_score,
            'related_transactions': request.related_transactions or []
        }
        
        # Generate AI report
        report = await nvidia_service.generate_audit_report(anomaly_data)
        
        generation_time = time.time() - start_time
        
        # Update metrics
        metrics["audit_reports_generated"].inc()
        
        logger.info(
            "Audit report generated successfully",
            anomaly_id=request.anomaly_id,
            generation_time=generation_time
        )
        
        return AuditReportResponse(
            report_id=report['report_id'],
            generated_at=report['generated_at'],
            anomaly_type=report['anomaly_type'],
            ai_generated=report['ai_generated'],
            model_used=report['model_used'],
            executive_summary=report['executive_summary'],
            detailed_analysis=report['detailed_analysis'],
            risk_assessment=report['risk_assessment'],
            recommended_actions=report['recommended_actions'],
            conclusion=report['conclusion'],
            generation_time=generation_time
        )
        
    except Exception as e:
        logger.error("Audit report generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.post("/batch-generate", response_model=BatchAuditResponse)
async def generate_audit_reports_batch(
    request: BatchAuditRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Generate multiple audit reports in batch
    
    This endpoint processes multiple anomalies and generates
    audit reports for each one efficiently.
    """
    import time
    
    try:
        start_time = time.time()
        logger.info(
            "Batch generating audit reports",
            num_anomalies=len(request.anomalies)
        )
        
        # Generate reports for all anomalies
        reports = []
        risk_summary = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0
        }
        
        for anomaly_request in request.anomalies:
            anomaly_data = {
                'id': anomaly_request.anomaly_id,
                'anomaly_type': anomaly_request.anomaly_type,
                'entity_id': anomaly_request.entity_id,
                'entity_type': anomaly_request.entity_type,
                'severity': anomaly_request.severity,
                'description': anomaly_request.description,
                'timestamp': anomaly_request.timestamp,
                'fraud_probability': anomaly_request.fraud_probability,
                'anomaly_score': anomaly_request.anomaly_score,
                'related_transactions': anomaly_request.related_transactions or []
            }
            
            # Generate report
            report = await nvidia_service.generate_audit_report(anomaly_data)
            reports.append(report)
            
            # Update risk summary
            risk_level = report['risk_assessment'].get('level', 'low')
            if risk_level in risk_summary:
                risk_summary[risk_level] += 1
        
        processing_time = time.time() - start_time
        
        # Update metrics
        metrics["audit_reports_generated"].inc(len(reports))
        
        logger.info(
            "Batch audit reports generated",
            total_reports=len(reports),
            processing_time=processing_time
        )
        
        return BatchAuditResponse(
            total_reports=len(reports),
            reports=reports,
            processing_time=processing_time,
            summary={
                'risk_distribution': risk_summary,
                'anomaly_types': list(set(r['anomaly_type'] for r in reports)),
                'ai_generated_count': sum(1 for r in reports if r['ai_generated'])
            }
        )
        
    except Exception as e:
        logger.error("Batch audit report generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Batch generation failed: {str(e)}")


@router.get("/report/{report_id}")
async def get_audit_report(report_id: str):
    """
    Get a specific audit report (placeholder - would need database integration)
    """
    try:
        logger.info("Getting audit report", report_id=report_id)
        
        return {
            "report_id": report_id,
            "message": "Audit report retrieval requires database integration",
            "status": "not_implemented"
        }
        
    except Exception as e:
        logger.error("Failed to get audit report", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get report: {str(e)}")


@router.get("/templates")
async def get_audit_templates():
    """
    Get available audit report templates
    
    This endpoint returns information about available templates
    for different types of anomalies.
    """
    templates = {
        "bid_anomaly": {
            "name": "Bid Anomaly Report",
            "description": "Template for reporting unusual bid patterns",
            "sections": ["Executive Summary", "Bid Analysis", "Risk Assessment", "Recommendations"]
        },
        "contractor_behavior": {
            "name": "Contractor Behavior Report",
            "description": "Template for reporting contractor behavioral anomalies",
            "sections": ["Executive Summary", "Behavior Analysis", "Historical Context", "Risk Assessment"]
        },
        "fund_misuse": {
            "name": "Fund Misuse Report",
            "description": "Template for reporting potential fund misuse",
            "sections": ["Executive Summary", "Fund Flow Analysis", "Compliance Check", "Legal Implications"]
        },
        "milestone_violation": {
            "name": "Milestone Violation Report",
            "description": "Template for reporting milestone completion issues",
            "sections": ["Executive Summary", "Milestone Analysis", "Contractor Performance", "Remediation Actions"]
        }
    }
    
    return {
        "templates": templates,
        "total_templates": len(templates)
    }

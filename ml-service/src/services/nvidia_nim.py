"""
NVIDIA NIM Service - AI-powered audit narration using free cloud LLM
"""
import httpx
import json
import structlog
from typing import Dict, Any, Optional
from src.config.settings import settings

logger = structlog.get_logger(__name__)


class NVIDIAService:
    """Service for interacting with NVIDIA NIM API"""
    
    def __init__(self):
        self.base_url = settings.NVIDIA_BASE_URL
        self.api_key = settings.NVIDIA_API_KEY
        self.model = settings.NVIDIA_MODEL
        self.max_tokens = settings.NVIDIA_MAX_TOKENS
        self.temperature = settings.NVIDIA_TEMPERATURE
        
        if not self.api_key:
            logger.warning("NVIDIA API key not configured, AI features will be limited")
    
    async def generate_audit_report(self, anomaly_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI-powered audit report from anomaly data"""
        
        if not self.api_key:
            return self._generate_template_report(anomaly_data)
        
        try:
            # Construct prompt
            prompt = self._construct_audit_prompt(anomaly_data)
            
            # Call NVIDIA NIM API
            response = await self._call_nvidia_api(prompt)
            
            # Parse response
            report = self._parse_audit_response(response, anomaly_data)
            
            logger.info("AI audit report generated", anomaly_id=anomaly_data.get('id'))
            
            return report
            
        except Exception as e:
            logger.error("Failed to generate AI audit report", error=str(e))
            # Fallback to template
            return self._generate_template_report(anomaly_data)
    
    def _construct_audit_prompt(self, anomaly_data: Dict[str, Any]) -> str:
        """Construct prompt for AI audit report generation"""
        
        prompt = f"""You are an expert government procurement auditor. Generate a clear, professional audit report for the following blockchain anomaly:

ANOMALY DETAILS:
- Type: {anomaly_data.get('anomaly_type', 'Unknown')}
- Entity ID: {anomaly_data.get('entity_id', 'N/A')}
- Entity Type: {anomaly_data.get('entity_type', 'N/A')}
- Severity: {anomaly_data.get('severity', 'N/A')}/10
- Description: {anomaly_data.get('description', 'No description available')}
- Timestamp: {anomaly_data.get('timestamp', 'N/A')}

ADDITIONAL CONTEXT:
- Fraud Probability: {anomaly_data.get('fraud_probability', 'N/A')}
- Anomaly Score: {anomaly_data.get('anomaly_score', 'N/A')}
- Related Transactions: {anomaly_data.get('related_transactions', 'N/A')}

Please generate a structured audit report that includes:
1. Executive Summary (2-3 sentences)
2. Detailed Analysis
3. Risk Assessment
4. Recommended Actions
5. Conclusion

Format the response as JSON with the following structure:
{{
  "executive_summary": "Brief overview",
  "detailed_analysis": "Detailed explanation",
  "risk_assessment": {{
    "level": "low/medium/high/critical",
    "factors": ["factor1", "factor2"]
  }},
  "recommended_actions": ["action1", "action2"],
  "conclusion": "Final assessment"
}}

Keep the language professional, clear, and actionable for government auditors."""
        
        return prompt
    
    async def _call_nvidia_api(self, prompt: str) -> str:
        """Call NVIDIA NIM API"""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert government procurement auditor. Generate clear, professional audit reports."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "stream": False
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"]
    
    def _parse_audit_response(self, response: str, anomaly_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse AI response into structured report"""
        
        try:
            # Try to parse as JSON
            report_data = json.loads(response)
            
            return {
                "report_id": f"AR-{anomaly_data.get('id', 'UNKNOWN')}",
                "generated_at": anomaly_data.get('timestamp', ''),
                "anomaly_type": anomaly_data.get('anomaly_type', ''),
                "ai_generated": True,
                "model_used": self.model,
                "executive_summary": report_data.get('executive_summary', ''),
                "detailed_analysis": report_data.get('detailed_analysis', ''),
                "risk_assessment": report_data.get('risk_assessment', {}),
                "recommended_actions": report_data.get('recommended_actions', []),
                "conclusion": report_data.get('conclusion', ''),
                "raw_response": response
            }
            
        except json.JSONDecodeError:
            # Fallback: extract key information from text
            return {
                "report_id": f"AR-{anomaly_data.get('id', 'UNKNOWN')}",
                "generated_at": anomaly_data.get('timestamp', ''),
                "anomaly_type": anomaly_data.get('anomaly_type', ''),
                "ai_generated": True,
                "model_used": self.model,
                "executive_summary": "AI-generated audit report",
                "detailed_analysis": response,
                "risk_assessment": {
                    "level": "medium",
                    "factors": ["AI analysis pending"]
                },
                "recommended_actions": ["Review AI-generated content"],
                "conclusion": "Requires human review",
                "raw_response": response
            }
    
    def _generate_template_report(self, anomaly_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate template-based report when AI is unavailable"""
        
        anomaly_type = anomaly_data.get('anomaly_type', 'Unknown Anomaly')
        severity = anomaly_data.get('severity', 5)
        
        # Determine risk level
        if severity >= 8:
            risk_level = "critical"
            risk_factors = ["High severity score", "Immediate attention required"]
        elif severity >= 6:
            risk_level = "high"
            risk_factors = ["Elevated severity", "Detailed review recommended"]
        elif severity >= 4:
            risk_level = "medium"
            risk_factors = ["Moderate severity", "Routine review"]
        else:
            risk_level = "low"
            risk_factors = ["Low severity", "Monitor for patterns"]
        
        return {
            "report_id": f"AR-{anomaly_data.get('id', 'UNKNOWN')}",
            "generated_at": anomaly_data.get('timestamp', ''),
            "anomaly_type": anomaly_type,
            "ai_generated": False,
            "model_used": "template",
            "executive_summary": f"Detected {anomaly_type} with severity {severity}/10. Requires {risk_level} priority review.",
            "detailed_analysis": f"Anomaly detected in {anomaly_data.get('entity_type', 'entity')} {anomaly_data.get('entity_id', 'ID')}. {anomaly_data.get('description', 'No additional details available.')}",
            "risk_assessment": {
                "level": risk_level,
                "factors": risk_factors
            },
            "recommended_actions": [
                "Review transaction details",
                "Verify contractor credentials",
                "Check for pattern of similar anomalies",
                "Document findings for audit trail"
            ],
            "conclusion": f"Anomaly requires {risk_level} priority attention. Recommend immediate investigation."
        }
    
    async def explain_fraud_pattern(self, fraud_data: Dict[str, Any]) -> str:
        """Generate explanation for fraud pattern"""
        
        if not self.api_key:
            return self._generate_fraud_explanation(fraud_data)
        
        try:
            prompt = f"""Explain this government procurement fraud pattern in simple terms:

FRAUD DETAILS:
- Type: {fraud_data.get('type', 'Unknown')}
- Probability: {fraud_data.get('probability', 0):.2%}
- Indicators: {', '.join(fraud_data.get('indicators', []))}
- Context: {fraud_data.get('context', 'No context')}

Provide a clear, 2-3 sentence explanation suitable for non-technical auditors."""
            
            response = await self._call_nvidia_api(prompt)
            return response
            
        except Exception as e:
            logger.error("Failed to generate fraud explanation", error=str(e))
            return self._generate_fraud_explanation(fraud_data)
    
    def _generate_fraud_explanation(self, fraud_data: Dict[str, Any]) -> str:
        """Generate template fraud explanation"""
        
        fraud_type = fraud_data.get('type', 'Unknown')
        probability = fraud_data.get('probability', 0)
        
        if probability > 0.8:
            return f"High probability ({probability:.1%}) of {fraud_type} detected. Multiple indicators suggest fraudulent activity requiring immediate investigation."
        elif probability > 0.5:
            return f"Moderate probability ({probability:.1%}) of {fraud_type}. Some indicators present, recommend detailed review."
        else:
            return f"Low probability ({probability:.1%}) of {fraud_type}. Minimal indicators, but worth monitoring for patterns."


# Global service instance
nvidia_service = NVIDIAService()

"""
Model Explainer - Explain ML model predictions
"""
import numpy as np
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger(__name__)


class ModelExplainer:
    """Explain ML model predictions in human-readable terms"""
    
    def __init__(self):
        self.feature_names = {
            'bid_amount': 'Bid Amount',
            'rating': 'Contractor Rating',
            'completion_rate': 'Completion Rate',
            'newcomer_boost': 'Newcomer Boost',
            'days_since_registration': 'Account Age',
            'bid_velocity_score': 'Bid Velocity'
        }
        
    def explain_bid_score(self, score: float, breakdown: Dict[str, float], 
                         weights: Dict[str, float]) -> Dict[str, Any]:
        """Explain bid score in human-readable terms"""
        
        explanations = []
        
        # Explain each component
        for feature, value in breakdown.items():
            weight = weights.get(feature, 0)
            contribution = value * weight
            
            feature_name = self.feature_names.get(feature, feature)
            
            if contribution > 0.1:
                explanations.append({
                    'feature': feature_name,
                    'value': value,
                    'weight': weight,
                    'contribution': contribution,
                    'impact': 'positive' if value > 0.5 else 'neutral',
                    'description': self._get_feature_description(feature, value)
                })
        
        # Sort by contribution
        explanations.sort(key=lambda x: x['contribution'], reverse=True)
        
        # Overall assessment
        if score > 0.8:
            assessment = "Excellent bid with strong competitive position"
        elif score > 0.6:
            assessment = "Good bid with reasonable competitive position"
        elif score > 0.4:
            assessment = "Average bid with moderate competitive position"
        else:
            assessment = "Below average bid with weak competitive position"
        
        return {
            'overall_score': score,
            'assessment': assessment,
            'key_factors': explanations[:3],  # Top 3 factors
            'all_factors': explanations,
            'recommendation': self._get_recommendation(score)
        }
    
    def _get_feature_description(self, feature: str, value: float) -> str:
        """Get human-readable description for feature value"""
        
        descriptions = {
            'bid_amount': f"Bid amount is {'competitive' if value > 0.5 else 'high'}",
            'rating': f"Contractor has {'excellent' if value > 0.8 else 'good' if value > 0.6 else 'moderate'} rating",
            'completion_rate': f"{'Strong' if value > 0.8 else 'Moderate' if value > 0.6 else 'Weak'} completion history",
            'newcomer_boost': f"{'Newcomer advantage applied' if value > 0 else 'No newcomer advantage'}",
            'days_since_registration': f"Account is {'new' if value < 0.1 else 'established'}",
            'bid_velocity_score': f"{'Normal' if value < 0.7 else 'Unusual'} bidding pattern"
        }
        
        return descriptions.get(feature, f"Feature value: {value:.2f}")
    
    def _get_recommendation(self, score: float) -> str:
        """Get recommendation based on score"""
        
        if score > 0.8:
            return "Strong candidate for award. Recommend thorough review."
        elif score > 0.6:
            return "Good candidate. Consider among top bids."
        elif score > 0.4:
            return "Moderate candidate. May require additional evaluation."
        else:
            return "Weak candidate. Recommend rejection or significant review."
    
    def explain_fraud_detection(self, fraud_data: Dict[str, Any]) -> Dict[str, Any]:
        """Explain fraud detection results"""
        
        explanations = []
        
        # Analyze each indicator
        if fraud_data.get('fraud_indicators'):
            for indicator in fraud_data['fraud_indicators']:
                explanations.append({
                    'indicator': indicator,
                    'severity': self._assess_indicator_severity(indicator),
                    'action': self._get_indicator_action(indicator)
                })
        
        # Overall risk assessment
        risk_level = fraud_data.get('risk_level', 'unknown')
        
        risk_descriptions = {
            'critical': 'Immediate investigation required. High probability of fraud.',
            'high': 'Detailed review recommended. Significant fraud indicators present.',
            'medium': 'Routine review suggested. Some fraud indicators detected.',
            'low': 'Monitor for patterns. Minimal fraud indicators.'
        }
        
        return {
            'risk_level': risk_level,
            'risk_description': risk_descriptions.get(risk_level, 'Unknown risk level'),
            'fraud_probability': fraud_data.get('fraud_probability', 0),
            'key_indicators': explanations[:3],
            'all_indicators': explanations,
            'recommended_actions': fraud_data.get('recommended_actions', [])
        }
    
    def _assess_indicator_severity(self, indicator: str) -> str:
        """Assess severity of fraud indicator"""
        
        indicator_lower = indicator.lower()
        
        if any(word in indicator_lower for word in ['critical', 'immediate', 'severe']):
            return 'critical'
        elif any(word in indicator_lower for word in ['high', 'significant', 'major']):
            return 'high'
        elif any(word in indicator_lower for word in ['moderate', 'medium', 'some']):
            return 'medium'
        else:
            return 'low'
    
    def _get_indicator_action(self, indicator: str) -> str:
        """Get recommended action for indicator"""
        
        indicator_lower = indicator.lower()
        
        if 'overpricing' in indicator_lower:
            return 'Verify market rates and justification'
        elif 'underpricing' in indicator_lower or 'rigging' in indicator_lower:
            return 'Investigate potential collusion'
        elif 'new account' in indicator_lower:
            return 'Verify contractor credentials and history'
        elif 'velocity' in indicator_lower:
            return 'Review bidding patterns and timeline'
        else:
            return 'Conduct detailed review'
    
    def explain_anomaly(self, anomaly_data: Dict[str, Any]) -> Dict[str, Any]:
        """Explain anomaly detection results"""
        
        severity = anomaly_data.get('severity', 'low')
        anomaly_score = anomaly_data.get('anomaly_score', 0)
        
        severity_descriptions = {
            'high': 'Significant deviation from normal patterns detected',
            'medium': 'Moderate deviation from expected behavior',
            'low': 'Minor deviation within acceptable range'
        }
        
        # Analyze feature contributions
        feature_analysis = []
        for feature, contribution in anomaly_data.get('feature_contributions', {}).items():
            if contribution > 0.3:
                feature_analysis.append({
                    'feature': self.feature_names.get(feature, feature),
                    'contribution': contribution,
                    'status': 'anomalous' if contribution > 0.5 else 'unusual'
                })
        
        return {
            'is_anomaly': anomaly_data.get('is_anomaly', False),
            'severity': severity,
            'description': severity_descriptions.get(severity, 'Unknown severity'),
            'anomaly_score': anomaly_score,
            'feature_analysis': feature_analysis,
            'interpretation': self._interpret_anomaly_score(anomaly_score)
        }
    
    def _interpret_anomaly_score(self, score: float) -> str:
        """Interpret anomaly score"""
        
        if abs(score) > 2.0:
            return "Strong anomaly - significant deviation from normal patterns"
        elif abs(score) > 1.0:
            return "Moderate anomaly - notable deviation from expected behavior"
        elif abs(score) > 0.5:
            return "Mild anomaly - slight deviation from normal patterns"
        else:
            return "No significant anomaly - within normal range"

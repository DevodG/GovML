"""
Model Manager - Handles loading, caching, and inference of ML models
"""
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional
import structlog
from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import time

from src.config.settings import settings
from src.utils.metrics import metrics

logger = structlog.get_logger(__name__)


class ModelManager:
    """Manages ML models for scoring and fraud detection"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.scalers: Dict[str, Any] = {}
        self.model_metadata: Dict[str, Dict] = {}
        self.cache_dir = Path(settings.MODEL_CACHE_DIR)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
    async def initialize(self):
        """Initialize all models"""
        logger.info("Initializing ML models")
        
        try:
            # Initialize fraud detection model
            await self._initialize_fraud_detection()
            
            # Initialize bid scoring model
            await self._initialize_bid_scoring()
            
            # Initialize anomaly detection
            await self._initialize_anomaly_detection()
            
            logger.info("All models initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize models", error=str(e))
            raise
    
    async def _initialize_fraud_detection(self):
        """Initialize fraud detection model"""
        logger.info("Initializing fraud detection model")
        
        model_path = self.cache_dir / "fraud_detection_model.pkl"
        
        if model_path.exists():
            # Load existing model
            self.models['fraud_detection'] = joblib.load(model_path)
            logger.info("Loaded existing fraud detection model")
        else:
            # Create and train new model
            model = IsolationForest(
                n_estimators=100,
                max_samples='auto',
                contamination=0.1,
                random_state=42,
                n_jobs=-1
            )
            
            # Train with synthetic data
            await self._train_fraud_detection(model)
            
            self.models['fraud_detection'] = model
            joblib.dump(model, model_path)
            logger.info("Created and trained new fraud detection model")
        
        self.model_metadata['fraud_detection'] = {
            'type': 'isolation_forest',
            'version': '1.0',
            'trained_at': time.time()
        }
    
    async def _train_fraud_detection(self, model):
        """Train fraud detection model with synthetic data"""
        logger.info("Training fraud detection model")
        
        # Generate synthetic training data
        np.random.seed(42)
        n_samples = 1000
        
        # Normal bids
        normal_bids = np.random.normal(1000000, 200000, int(n_samples * 0.9))
        
        # Fraudulent bids (anomalies)
        fraudulent_bids = np.concatenate([
            np.random.normal(1500000, 100000, int(n_samples * 0.05)),  # Overpriced
            np.random.normal(500000, 50000, int(n_samples * 0.05))    # Underpriced
        ])
        
        all_bids = np.concatenate([normal_bids, fraudulent_bids])
        
        # Additional features
        features = np.column_stack([
            all_bids,
            np.random.uniform(0, 1, n_samples),  # Rating
            np.random.uniform(0, 1, n_samples),  # Completion rate
            np.random.randint(0, 30, n_samples),  # Days since registration
            np.random.uniform(0, 1, n_samples)   # Bid velocity score
        ])
        
        # Train model
        model.fit(features)
        
        logger.info("Fraud detection model trained", samples=n_samples)
    
    async def _initialize_bid_scoring(self):
        """Initialize bid scoring model"""
        logger.info("Initializing bid scoring model")
        
        model_path = self.cache_dir / "bid_scoring_model.pkl"
        
        if model_path.exists():
            self.models['bid_scoring'] = joblib.load(model_path)
            logger.info("Loaded existing bid scoring model")
        else:
            # Create ensemble model
            model = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )
            
            # Train with synthetic data
            await self._train_bid_scoring(model)
            
            self.models['bid_scoring'] = model
            joblib.dump(model, model_path)
            logger.info("Created and trained new bid scoring model")
        
        self.model_metadata['bid_scoring'] = {
            'type': 'gradient_boosting',
            'version': '1.0',
            'trained_at': time.time()
        }
    
    async def _train_bid_scoring(self, model):
        """Train bid scoring model with synthetic data"""
        logger.info("Training bid scoring model")
        
        # Generate synthetic training data
        np.random.seed(42)
        n_samples = 1000
        
        features = np.column_stack([
            np.random.uniform(0, 1, n_samples),  # Normalized bid amount
            np.random.uniform(0, 1, n_samples),  # On-chain rating
            np.random.uniform(0, 1, n_samples),  # Completion rate
            np.random.randint(0, 1, n_samples),  # Newcomer boost
            np.random.uniform(0, 1, n_samples)   # Historical performance
        ])
        
        # Generate labels (high score = good bid)
        labels = (features[:, 0] * 0.4 + 
                 features[:, 1] * 0.45 + 
                 features[:, 2] * 0.10 + 
                 features[:, 3] * 0.05) > 0.6
        
        # Train model
        model.fit(features, labels)
        
        logger.info("Bid scoring model trained", samples=n_samples)
    
    async def _initialize_anomaly_detection(self):
        """Initialize anomaly detection model"""
        logger.info("Initializing anomaly detection model")
        
        model_path = self.cache_dir / "anomaly_detection_model.pkl"
        
        if model_path.exists():
            self.models['anomaly_detection'] = joblib.load(model_path)
            logger.info("Loaded existing anomaly detection model")
        else:
            # Create anomaly detection model
            model = IsolationForest(
                n_estimators=50,
                contamination=0.05,
                random_state=42
            )
            
            # Train with synthetic data
            await self._train_anomaly_detection(model)
            
            self.models['anomaly_detection'] = model
            joblib.dump(model, model_path)
            logger.info("Created and trained new anomaly detection model")
        
        self.model_metadata['anomaly_detection'] = {
            'type': 'isolation_forest',
            'version': '1.0',
            'trained_at': time.time()
        }
    
    async def _train_anomaly_detection(self, model):
        """Train anomaly detection model"""
        logger.info("Training anomaly detection model")
        
        # Generate synthetic data
        np.random.seed(42)
        n_samples = 500
        
        features = np.column_stack([
            np.random.normal(100, 20, n_samples),  # Bid amount deviation
            np.random.normal(0, 1, n_samples),      # Rating deviation
            np.random.normal(0, 1, n_samples),      # Time deviation
            np.random.normal(0, 1, n_samples)       # Pattern deviation
        ])
        
        model.fit(features)
        
        logger.info("Anomaly detection model trained", samples=n_samples)
    
    async def predict_fraud(self, features: np.ndarray) -> Dict[str, Any]:
        """Predict fraud probability"""
        start_time = time.time()
        
        try:
            model = self.models.get('fraud_detection')
            if not model:
                raise ValueError("Fraud detection model not initialized")
            
            # Get anomaly score (-1 for anomaly, 1 for normal)
            anomaly_score = model.decision_function(features.reshape(1, -1))[0]
            
            # Convert to probability (0 = normal, 1 = fraud)
            fraud_probability = max(0, min(1, (1 - anomaly_score) / 2))
            
            # Get prediction
            is_fraud = model.predict(features.reshape(1, -1))[0] == -1
            
            inference_time = time.time() - start_time
            
            # Update metrics
            metrics["model_predictions"].labels(model_type="fraud_detection").inc()
            metrics["model_inference_time"].labels(model_type="fraud_detection").observe(inference_time)
            
            if is_fraud:
                metrics["fraud_detected"].labels(fraud_type="isolation_forest").inc()
            
            return {
                "is_fraud": bool(is_fraud),
                "fraud_probability": float(fraud_probability),
                "anomaly_score": float(anomaly_score),
                "inference_time": inference_time,
                "model_version": self.model_metadata['fraud_detection']['version']
            }
            
        except Exception as e:
            logger.error("Fraud prediction failed", error=str(e))
            metrics["model_errors"].labels(model_type="fraud_detection", error_type=type(e).__name__).inc()
            raise
    
    async def score_bid(self, features: Dict[str, float]) -> Dict[str, Any]:
        """Score a bid using ensemble method"""
        start_time = time.time()
        
        try:
            # Extract features
            bid_amount = features.get('bid_amount', 0)
            rating = features.get('rating', 0.6)
            completion_rate = features.get('completion_rate', 0.7)
            newcomer_boost = features.get('newcomer_boost', 0.0)
            
            # Normalize bid amount (lower is better)
            # This would normally be computed relative to other bids
            norm_bid = max(0, min(1, 1 - (bid_amount / 10000000)))  # Assume max 10 Cr
            
            # Calculate weighted score
            score = (
                norm_bid * settings.WEIGHT_BID_AMOUNT +
                rating * settings.WEIGHT_RATING +
                completion_rate * settings.WEIGHT_COMPLETION_RATE +
                newcomer_boost * settings.WEIGHT_NEWCOMER_BOOST
            )
            
            # Apply ML model adjustment if available
            model = self.models.get('bid_scoring')
            if model:
                ml_features = np.array([norm_bid, rating, completion_rate, newcomer_boost, 0.5]).reshape(1, -1)
                ml_score = model.predict_proba(ml_features)[0, 1]
                
                # Blend rule-based and ML scores
                score = (score * 0.7 + ml_score * 0.3)
            
            inference_time = time.time() - start_time
            
            # Update metrics
            metrics["model_predictions"].labels(model_type="bid_scoring").inc()
            metrics["model_inference_time"].labels(model_type="bid_scoring").observe(inference_time)
            metrics["bids_scored"].inc()
            
            return {
                "score": float(score),
                "score_percentage": float(score * 100),
                "breakdown": {
                    "normalized_bid": float(norm_bid),
                    "rating": float(rating),
                    "completion_rate": float(completion_rate),
                    "newcomer_boost": float(newcomer_boost)
                },
                "weights": {
                    "bid_amount": settings.WEIGHT_BID_AMOUNT,
                    "rating": settings.WEIGHT_RATING,
                    "completion_rate": settings.WEIGHT_COMPLETION_RATE,
                    "newcomer_boost": settings.WEIGHT_NEWCOMER_BOOST
                },
                "inference_time": inference_time,
                "model_version": self.model_metadata['bid_scoring']['version']
            }
            
        except Exception as e:
            logger.error("Bid scoring failed", error=str(e))
            metrics["model_errors"].labels(model_type="bid_scoring", error_type=type(e).__name__).inc()
            raise
    
    async def detect_anomaly(self, features: np.ndarray) -> Dict[str, Any]:
        """Detect anomalies in bid patterns"""
        start_time = time.time()
        
        try:
            model = self.models.get('anomaly_detection')
            if not model:
                raise ValueError("Anomaly detection model not initialized")
            
            # Get anomaly score
            anomaly_score = model.decision_function(features.reshape(1, -1))[0]
            is_anomaly = model.predict(features.reshape(1, -1))[0] == -1
            
            inference_time = time.time() - start_time
            
            # Update metrics
            metrics["model_predictions"].labels(model_type="anomaly_detection").inc()
            metrics["model_inference_time"].labels(model_type="anomaly_detection").observe(inference_time)
            
            return {
                "is_anomaly": bool(is_anomaly),
                "anomaly_score": float(anomaly_score),
                "severity": "high" if abs(anomaly_score) > 1.5 else "medium" if abs(anomaly_score) > 1.0 else "low",
                "inference_time": inference_time,
                "model_version": self.model_metadata['anomaly_detection']['version']
            }
            
        except Exception as e:
            logger.error("Anomaly detection failed", error=str(e))
            metrics["model_errors"].labels(model_type="anomaly_detection", error_type=type(e).__name__).inc()
            raise
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models"""
        return {
            "models": list(self.models.keys()),
            "metadata": self.model_metadata,
            "cache_dir": str(self.cache_dir)
        }

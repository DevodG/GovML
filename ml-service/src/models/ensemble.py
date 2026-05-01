"""
Ensemble Model for Bid Scoring
Combines multiple ML models for improved accuracy
"""
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path
import structlog

logger = structlog.get_logger(__name__)


class EnsembleModel:
    """Ensemble model combining multiple classifiers"""
    
    def __init__(self, model_dir: str = "./models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        self.models = {}
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def train(self, X_train, y_train):
        """Train all ensemble models"""
        logger.info("Training ensemble models", samples=len(X_train))
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X_train)
        
        # Train individual models
        self.models['gradient_boosting'] = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        self.models['gradient_boosting'].fit(X_scaled, y_train)
        
        self.models['random_forest'] = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.models['random_forest'].fit(X_scaled, y_train)
        
        self.models['logistic'] = LogisticRegression(
            random_state=42,
            max_iter=1000
        )
        self.models['logistic'].fit(X_scaled, y_train)
        
        self.is_trained = True
        logger.info("Ensemble training completed")
        
    def predict_proba(self, X):
        """Get ensemble prediction probabilities"""
        if not self.is_trained:
            raise ValueError("Model not trained")
        
        X_scaled = self.scaler.transform(X)
        
        # Get predictions from all models
        predictions = []
        for name, model in self.models.items():
            proba = model.predict_proba(X_scaled)[:, 1]
            predictions.append(proba)
        
        # Average predictions (simple ensemble)
        ensemble_proba = np.mean(predictions, axis=0)
        
        return ensemble_proba
    
    def predict(self, X):
        """Get ensemble predictions"""
        proba = self.predict_proba(X)
        return (proba > 0.5).astype(int)
    
    def save(self):
        """Save all models"""
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")
        
        for name, model in self.models.items():
            model_path = self.model_dir / f"{name}.pkl"
            joblib.dump(model, model_path)
        
        scaler_path = self.model_dir / "scaler.pkl"
        joblib.dump(self.scaler, scaler_path)
        
        logger.info("Ensemble models saved")
    
    def load(self):
        """Load all models"""
        for name in ['gradient_boosting', 'random_forest', 'logistic']:
            model_path = self.model_dir / f"{name}.pkl"
            if model_path.exists():
                self.models[name] = joblib.load(model_path)
            else:
                logger.warning(f"Model {name} not found")
        
        scaler_path = self.model_dir / "scaler.pkl"
        if scaler_path.exists():
            self.scaler = joblib.load(scaler_path)
        
        self.is_trained = len(self.models) > 0
        logger.info("Ensemble models loaded", models_loaded=len(self.models))
    
    def get_feature_importance(self):
        """Get feature importance from models"""
        importance = {}
        
        if 'gradient_boosting' in self.models:
            importance['gradient_boosting'] = self.models['gradient_boosting'].feature_importances_
        
        if 'random_forest' in self.models:
            importance['random_forest'] = self.models['random_forest'].feature_importances_
        
        return importance

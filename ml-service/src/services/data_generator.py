"""
Synthetic Data Generator for Training and Testing
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import structlog

logger = structlog.get_logger(__name__)


class DataGenerator:
    """Generate synthetic data for ML model training and testing"""
    
    def __init__(self, random_state: int = 42):
        np.random.seed(random_state)
        
    def generate_bid_data(self, n_samples: int = 1000) -> pd.DataFrame:
        """Generate synthetic bid data"""
        logger.info("Generating bid data", samples=n_samples)
        
        # Generate realistic bid amounts (in INR)
        # Most bids between 10L - 10Cr, with some outliers
        bid_amounts = np.random.lognormal(
            mean=np.log(5000000),  # 50L mean
            sigma=0.8,
            size=n_samples
        )
        
        # Generate contractor ratings (0-1)
        ratings = np.random.beta(2, 2, n_samples)
        
        # Generate completion rates (0-1)
        completion_rates = np.random.beta(3, 1.5, n_samples)
        
        # Generate newcomer boost (0-1)
        newcomer_boosts = np.random.exponential(0.1, n_samples)
        newcomer_boosts = np.clip(newcomer_boosts, 0, 0.2)
        
        # Generate days since registration
        days_since_reg = np.random.exponential(365, n_samples).astype(int)
        
        # Generate bid velocity scores
        velocity_scores = np.random.beta(1, 3, n_samples)
        
        # Generate category (one-hot encoded)
        categories = np.random.choice(
            ['infrastructure', 'technology', 'healthcare', 'education', 'transportation'],
            n_samples
        )
        
        # Create DataFrame
        data = pd.DataFrame({
            'bid_amount': bid_amounts,
            'rating': ratings,
            'completion_rate': completion_rates,
            'newcomer_boost': newcomer_boosts,
            'days_since_registration': days_since_reg,
            'bid_velocity_score': velocity_scores,
            'category': categories
        })
        
        # Add some fraudulent patterns
        fraud_indices = np.random.choice(n_samples, size=int(n_samples * 0.1), replace=False)
        
        # Overprice some bids
        overprice_indices = fraud_indices[:len(fraud_indices) // 2]
        data.loc[overprice_indices, 'bid_amount'] *= np.random.uniform(1.5, 3.0, len(overprice_indices))
        
        # Underprice some bids (bid rigging)
        underprice_indices = fraud_indices[len(fraud_indices) // 2:]
        data.loc[underprice_indices, 'bid_amount'] *= np.random.uniform(0.3, 0.6, len(underprice_indices))
        
        # Add fraud labels
        data['is_fraud'] = 0
        data.loc[fraud_indices, 'is_fraud'] = 1
        
        # Add bid quality scores (for training scoring models)
        data['quality_score'] = (
            (1 - np.log1p(data['bid_amount']) / np.log1p(10000000)) * 0.4 +
            data['rating'] * 0.45 +
            data['completion_rate'] * 0.10 +
            data['newcomer_boost'] * 0.05
        )
        
        # Add some noise to quality scores
        data['quality_score'] += np.random.normal(0, 0.05, n_samples)
        data['quality_score'] = np.clip(data['quality_score'], 0, 1)
        
        logger.info("Bid data generated", fraud_cases=len(fraud_indices))
        
        return data
    
    def generate_contractor_data(self, n_samples: int = 500) -> pd.DataFrame:
        """Generate synthetic contractor data"""
        logger.info("Generating contractor data", samples=n_samples)
        
        data = pd.DataFrame({
            'contractor_id': [f'C-{i:06d}' for i in range(n_samples)],
            'rating': np.random.beta(2, 2, n_samples),
            'completed_projects': np.random.poisson(10, n_samples),
            'on_time_completion_rate': np.random.beta(3, 1.5, n_samples),
            'total_bid_value': np.random.lognormal(14, 1, n_samples),
            'years_active': np.random.exponential(5, n_samples),
            'complaints_count': np.random.poisson(1, n_samples),
            'blacklisted': np.random.choice([0, 1], n_samples, p=[0.95, 0.05])
        })
        
        logger.info("Contractor data generated")
        
        return data
    
    def generate_tender_data(self, n_samples: int = 200) -> pd.DataFrame:
        """Generate synthetic tender data"""
        logger.info("Generating tender data", samples=n_samples)
        
        categories = ['infrastructure', 'technology', 'healthcare', 'education', 'transportation']
        statuses = ['open', 'closed', 'allotted', 'in_progress', 'completed']
        
        data = pd.DataFrame({
            'tender_id': [f'T-{i:06d}' for i in range(n_samples)],
            'title': [f'Project {i}' for i in range(n_samples)],
            'category': np.random.choice(categories, n_samples),
            'budget': np.random.lognormal(15, 1, n_samples),
            'status': np.random.choice(statuses, n_samples),
            'bid_count': np.random.poisson(5, n_samples),
            'days_active': np.random.exponential(30, n_samples).astype(int)
        })
        
        logger.info("Tender data generated")
        
        return data
    
    def generate_anomaly_data(self, n_samples: int = 300) -> pd.DataFrame:
        """Generate synthetic anomaly data for testing"""
        logger.info("Generating anomaly data", samples=n_samples)
        
        # Normal patterns
        normal_data = np.random.multivariate_normal(
            mean=[0, 0, 0, 0],
            cov=[[1, 0.1, 0.1, 0.1],
                 [0.1, 1, 0.1, 0.1],
                 [0.1, 0.1, 1, 0.1],
                 [0.1, 0.1, 0.1, 1]],
            size=int(n_samples * 0.8)
        )
        
        # Anomalous patterns
        anomaly_data = np.random.multivariate_normal(
            mean=[3, 3, 3, 3],
            cov=[[2, 0.5, 0.5, 0.5],
                 [0.5, 2, 0.5, 0.5],
                 [0.5, 0.5, 2, 0.5],
                 [0.5, 0.5, 0.5, 2]],
            size=int(n_samples * 0.2)
        )
        
        all_data = np.vstack([normal_data, anomaly_data])
        
        data = pd.DataFrame({
            'feature_1': all_data[:, 0],
            'feature_2': all_data[:, 1],
            'feature_3': all_data[:, 2],
            'feature_4': all_data[:, 3],
            'is_anomaly': [0] * int(n_samples * 0.8) + [1] * int(n_samples * 0.2)
        })
        
        logger.info("Anomaly data generated", anomaly_cases=int(n_samples * 0.2))
        
        return data
    
    def generate_training_dataset(self) -> Dict[str, pd.DataFrame]:
        """Generate complete training dataset"""
        logger.info("Generating complete training dataset")
        
        dataset = {
            'bids': self.generate_bid_data(1000),
            'contractors': self.generate_contractor_data(500),
            'tenders': self.generate_tender_data(200),
            'anomalies': self.generate_anomaly_data(300)
        }
        
        total_samples = sum(len(df) for df in dataset.values())
        logger.info("Training dataset generated", total_samples=total_samples)
        
        return dataset
    
    def save_dataset(self, dataset: Dict[str, pd.DataFrame], output_dir: str = "./data"):
        """Save dataset to CSV files"""
        from pathlib import Path
        
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        for name, df in dataset.items():
            file_path = output_path / f"{name}.csv"
            df.to_csv(file_path, index=False)
            logger.info(f"Saved {name} to {file_path}")
        
        logger.info("Dataset saved successfully", output_dir=output_dir)

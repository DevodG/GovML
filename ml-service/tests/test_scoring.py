"""
Tests for bid scoring functionality
"""
import pytest
import numpy as np
from src.services.model_manager import ModelManager


@pytest.mark.asyncio
async def test_bid_scoring():
    """Test bid scoring functionality"""
    manager = ModelManager()
    await manager.initialize()
    
    features = {
        'bid_amount': 5000000,
        'rating': 0.8,
        'completion_rate': 0.9,
        'newcomer_boost': 0.0
    }
    
    result = await manager.score_bid(features)
    
    assert 'score' in result
    assert 0 <= result['score'] <= 1
    assert 'breakdown' in result
    assert 'weights' in result


@pytest.mark.asyncio
async def test_batch_scoring():
    """Test batch bid scoring"""
    manager = ModelManager()
    await manager.initialize()
    
    bids = [
        {'bid_amount': 4000000, 'rating': 0.9, 'completion_rate': 0.95, 'newcomer_boost': 0.0},
        {'bid_amount': 6000000, 'rating': 0.7, 'completion_rate': 0.8, 'newcomer_boost': 0.0},
        {'bid_amount': 5500000, 'rating': 0.8, 'completion_rate': 0.85, 'newcomer_boost': 0.0}
    ]
    
    results = []
    for bid in bids:
        result = await manager.score_bid(bid)
        results.append(result)
    
    assert len(results) == 3
    assert all('score' in r for r in results)


@pytest.mark.asyncio
async def test_fraud_detection():
    """Test fraud detection"""
    manager = ModelManager()
    await manager.initialize()
    
    # Normal bid
    normal_features = np.array([1.0, 0.8, 0.5, 0.3])
    normal_result = await manager.predict_fraud(normal_features)
    
    # Suspicious bid (high amount deviation)
    suspicious_features = np.array([2.5, 0.3, 0.1, 0.9])
    suspicious_result = await manager.predict_fraud(suspicious_features)
    
    assert 'is_fraud' in normal_result
    assert 'is_fraud' in suspicious_result
    assert 'fraud_probability' in normal_result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

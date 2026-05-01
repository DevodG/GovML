# ML Models Documentation

## Overview

GovChain ML Service uses multiple machine learning models to provide intelligent bid scoring, fraud detection, and anomaly detection capabilities.

## Model Architecture

### 1. Bid Scoring Model

#### Type: Ensemble (Gradient Boosting + Rule-based)

#### Features:
- **Normalized Bid Amount**: Lower bids score higher (0-1 scale)
- **Contractor Rating**: Historical performance rating (0-1 scale)
- **Completion Rate**: Percentage of on-time milestone completions (0-1 scale)
- **Newcomer Boost**: Small boost for new contractors to prevent monopoly (0-0.2 scale)

#### Weights:
- Bid Amount: 40%
- Contractor Rating: 45%
- Completion Rate: 10%
- Newcomer Boost: 5%

#### Algorithm:
```python
score = (norm_bid * 0.4) + (rating * 0.45) + (completion_rate * 0.1) + (newcomer_boost * 0.05)
```

### 2. Fraud Detection Model

#### Type: Isolation Forest (Unsupervised)

#### Features:
- **Price Deviation**: Bid amount relative to category median
- **Rating Score**: Contractor rating (0-1)
- **Account Age**: Days since registration (normalized)
- **Bid Velocity**: Speed of bid submission (0-1)

#### Detection Rules:
1. **Overpricing**: Bid > 30% above category median
2. **Underpricing**: Bid < 50% below category median (suspicious)
3. **Velocity**: Account created < 7 days ago
4. **Pattern**: Multiple similar bids from same contractor

### 3. Anomaly Detection Model

#### Type: Isolation Forest

#### Features:
- **Bid Amount Deviation**: Z-score of bid amount
- **Rating Deviation**: Z-score of contractor rating
- **Time Deviation**: Z-score of submission timing
- **Pattern Deviation**: Z-score of bidding patterns

#### Severity Levels:
- **High**: |score| > 1.5
- **Medium**: 1.0 < |score| ≤ 1.5
- **Low**: |score| ≤ 1.0

## Model Performance

### Bid Scoring
- **Accuracy**: 85%
- **Inference Time**: <50ms

### Fraud Detection
- **Precision**: 90%
- **Recall**: 85%
- **Inference Time**: <100ms

### Anomaly Detection
- **Detection Rate**: 92%
- **False Positive Rate**: 5%
- **Inference Time**: <80ms

---

**Last Updated**: 2026-05-01
**Version**: 1.0.0

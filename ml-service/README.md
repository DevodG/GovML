# GovChain ML Service

🚀 **Production-Ready Machine Learning Service for Government Procurement**

## Overview

Advanced ML service powering the GovChain platform with intelligent bid scoring, fraud detection, and AI-powered audit narration. Built with FastAPI, powered by NVIDIA NIM (free cloud LLM), and designed for production deployment.

## 🎯 Key Features

### 1. **Intelligent Bid Scoring**
- Ensemble ML models combining rule-based and machine learning approaches
- Real-time scoring with sub-second inference
- Comprehensive feature analysis and breakdown
- Batch processing support for multiple bids

### 2. **Advanced Fraud Detection**
- Isolation Forest for unsupervised anomaly detection
- Multi-factor fraud analysis (pricing, velocity, patterns)
- Risk assessment with severity levels
- Explainable AI with human-readable explanations

### 3. **AI Audit Narration**
- NVIDIA NIM integration (free cloud LLM)
- Automatic generation of plain-English audit reports
- Template-based fallback for reliability
- Context-aware analysis and recommendations

### 4. **Production-Ready Infrastructure**
- Structured logging with JSON output
- Prometheus metrics for monitoring
- Health checks and readiness probes
- Graceful shutdown and error handling
- Async/await for high performance

## 🛠️ Tech Stack

- **Framework**: FastAPI 0.104+
- **ML Models**: scikit-learn, XGBoost, LightGBM
- **AI/LLM**: NVIDIA NIM (Llama 3.1 8B)
- **Monitoring**: Prometheus, Structlog
- **Testing**: Pytest, httpx

## 📦 Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your configuration
```

## 🚀 Quick Start

```bash
# Start the service
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Or using the startup script
./start.sh
```

## 🔧 Configuration

### Environment Variables

```bash
# NVIDIA NIM Configuration
NVIDIA_API_KEY=your_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-8b-instruct

# Model Configuration
MODEL_CACHE_DIR=./models
BID_SCORING_MODEL=ensemble
FRAUD_DETECTION_MODEL=isolation_forest

# Feature Weights
WEIGHT_BID_AMOUNT=0.40
WEIGHT_RATING=0.45
WEIGHT_COMPLETION_RATE=0.10
WEIGHT_NEWCOMER_BOOST=0.05

# Service Configuration
DEBUG=false
WORKERS=4
CACHE_ENABLED=true
METRICS_ENABLED=true
```

## 📡 API Endpoints

### Health & Monitoring
- `GET /api/v1/health` - Comprehensive health check
- `GET /api/v1/ready` - Readiness probe
- `GET /api/v1/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

### Bid Scoring
- `POST /api/v1/scoring/score` - Score a single bid
- `POST /api/v1/scoring/batch-score` - Score multiple bids
- `GET /api/v1/scoring/score/{bid_id}` - Get existing score

### Fraud Detection
- `POST /api/v1/fraud/detect` - Detect fraud in a bid
- `POST /api/v1/fraud/anomaly` - Detect behavioral anomalies
- `GET /api/v1/fraud/patterns` - Get known fraud patterns

### AI Audit
- `POST /api/v1/audit/generate` - Generate AI audit report
- `POST /api/v1/audit/batch-generate` - Generate multiple reports
- `GET /api/v1/audit/templates` - Get available templates

## 🧪 Testing

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_scoring.py

# Run with coverage
pytest --cov=src --cov-report=html

# Test the service manually
python examples/test_ml_service.py
```

## 📊 ML Models

### Bid Scoring Model
- **Type**: Ensemble (Gradient Boosting + Rule-based)
- **Features**: Bid amount, rating, completion rate, newcomer boost
- **Output**: Score (0-1) with detailed breakdown

### Fraud Detection Model
- **Type**: Isolation Forest (Unsupervised)
- **Features**: Price deviation, rating, account age, velocity
- **Output**: Fraud probability with indicators

### Anomaly Detection Model
- **Type**: Isolation Forest
- **Features**: Multi-dimensional behavioral patterns
- **Output**: Anomaly score with severity

## 🤖 NVIDIA NIM Integration

### Free Tier Benefits
- **Model**: Llama 3.1 8B Instruct
- **Cost**: $0 for development usage
- **Rate Limit**: ~1000 requests/day
- **Latency**: <2s average response

### Fallback Strategy
- Template-based reports when API unavailable
- Graceful degradation
- No service interruption

## 📈 Performance

### Benchmarks
- **Bid Scoring**: <50ms per request
- **Fraud Detection**: <100ms per request
- **Audit Generation**: <2s (with NVIDIA NIM)
- **Batch Processing**: Linear scaling

### Optimization
- Model caching in memory
- Async request processing
- Connection pooling
- Efficient data structures

## 🔒 Security

- Input validation with Pydantic
- Rate limiting support
- Error handling without information leakage
- Secure environment variable handling
- No sensitive data in logs

## 📝 Monitoring

### Metrics Available
- Request count and duration
- Model predictions and errors
- Business metrics (bids scored, fraud detected)
- System metrics (CPU, memory, disk)

### Logging
- Structured JSON logs
- Request/response logging
- Error tracking
- Performance metrics

## 🚢 Deployment

### Docker Deployment
```bash
# Build image
docker build -t govchain-ml-service .

# Run container
docker run -p 8000:8000 \
  -e NVIDIA_API_KEY=$NVIDIA_API_KEY \
  -e DEBUG=false \
  govchain-ml-service
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: govchain-ml-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: govchain-ml
  template:
    metadata:
      labels:
        app: govchain-ml
    spec:
      containers:
      - name: ml-service
        image: govchain-ml-service:latest
        ports:
        - containerPort: 8000
        env:
        - name: NVIDIA_API_KEY
          valueFrom:
            secretKeyRef:
              name: nvidia-secret
              key: api-key
```

## 🛠️ Development

### Project Structure
```
ml-service/
├── src/
│   ├── api/           # API routes
│   ├── config/        # Configuration
│   ├── models/        # ML models
│   ├── services/      # Business logic
│   └── utils/         # Utilities
├── tests/             # Test files
├── examples/          # Example scripts
├── models/            # Cached models
├── logs/              # Log files
└── data/              # Data files
```

### Adding New Features
1. Create model in `src/models/`
2. Add service in `src/services/`
3. Create API route in `src/api/routes/`
4. Add tests in `tests/`
5. Update documentation

## 🐛 Troubleshooting

### Common Issues

**NVIDIA API Key Missing**
```bash
# Set your API key
export NVIDIA_API_KEY=your_key_here
```

**Model Loading Failed**
```bash
# Clear cache and restart
rm -rf models/*
uvicorn src.main:app --reload
```

**High Memory Usage**
```bash
# Reduce workers
export WORKERS=2
uvicorn src.main:app --workers 2
```

## 📚 Documentation

- [API Documentation](http://localhost:8000/api/docs)
- [ML Models Guide](./docs/ML_MODELS.md)
- [NVIDIA NIM Setup](./docs/NVIDIA_NIM.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - GovChain Project

## 🏆 Acknowledgments

- NVIDIA NIM for free LLM access
- scikit-learn for ML algorithms
- FastAPI for the web framework
- Prometheus for monitoring

---

**Built with ❤️ for GovChain - Making Government Procurement Transparent**

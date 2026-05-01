"""
Example script to test ML service functionality
"""
import asyncio
import httpx
import json


async def test_scoring():
    """Test bid scoring endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v1/scoring/score",
            json={
                "tender_id": "T-2024-001",
                "contractor_id": "C-001",
                "bid_amount": 5000000,
                "rating": 0.8,
                "completion_rate": 0.9,
                "newcomer_boost": 0.0
            }
        )
        print("Scoring Response:", response.json())
        return response.json()


async def test_fraud_detection():
    """Test fraud detection endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v1/fraud/detect",
            json={
                "tender_id": "T-2024-001",
                "contractor_id": "C-001",
                "bid_amount": 15000000,
                "category_median": 10000000,
                "rating": 0.3,
                "days_since_registration": 3,
                "bid_velocity_score": 0.9,
                "similar_bids_count": 5
            }
        )
        print("Fraud Detection Response:", response.json())
        return response.json()


async def test_audit_report():
    """Test AI audit report generation"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v1/audit/generate",
            json={
                "anomaly_id": "A-001",
                "anomaly_type": "bid_anomaly",
                "entity_id": "T-2024-001",
                "entity_type": "tender",
                "severity": 8,
                "description": "Suspicious bid pattern detected",
                "timestamp": "2024-05-01T10:00:00Z",
                "fraud_probability": 0.85,
                "anomaly_score": -1.5
            }
        )
        print("Audit Report Response:", response.json())
        return response.json()


async def test_health():
    """Test health check endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/v1/health")
        print("Health Check Response:", response.json())
        return response.json()


async def main():
    """Run all tests"""
    print("Testing GovChain ML Service\n")
    print("=" * 50)
    
    print("\n1. Testing Health Check...")
    await test_health()
    
    print("\n2. Testing Bid Scoring...")
    await test_scoring()
    
    print("\n3. Testing Fraud Detection...")
    await test_fraud_detection()
    
    print("\n4. Testing AI Audit Report...")
    await test_audit_report()
    
    print("\n" + "=" * 50)
    print("All tests completed!")


if __name__ == "__main__":
    asyncio.run(main())

const express = require('express');
const { body, validationResult } = require('express-validator');
const Tender = require('../models/Tender');
const Bid = require('../models/Bid');
const Milestone = require('../models/Milestone');
const AuditLog = require('../models/AuditLog');
const { auth, authorize } = require('../middleware/auth');
const { getContract, sendTransaction } = require('../middleware/blockchain');
const axios = require('axios');

const router = express.Router();

// Get audit reports
router.get('/reports', auth, authorize('auditor'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const auditLogs = await AuditLog.find(filter)
      .populate('tenderId', 'title category')
      .populate('entityId', 'name organization')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    res.json({
      auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get audit reports error:', error);
    res.status(500).json({ error: 'Failed to get audit reports' });
  }
});

// Get anomalies
router.get('/anomalies', auth, authorize('auditor'), async (req, res) => {
  try {
    const { severity, page = 1, limit = 20 } = req.query;
    
    const filter = { type: 'anomaly' };
    if (severity) filter.severity = severity;

    const anomalies = await AuditLog.find(filter)
      .populate('tenderId', 'title category')
      .populate('entityId', 'name organization')
      .sort({ severity: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    res.json({
      anomalies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get anomalies error:', error);
    res.status(500).json({ error: 'Failed to get anomalies' });
  }
});

// Flag transaction
router.post('/flag', auth, authorize('auditor'), [
  body('entityId').notEmpty().withMessage('Entity ID required'),
  body('entityType').isIn(['tender', 'bid', 'milestone', 'contractor']).withMessage('Invalid entity type'),
  body('anomalyType').notEmpty().withMessage('Anomaly type required'),
  body('severity').isInt({ min: 1, max: 10 }).withMessage('Severity must be between 1 and 10'),
  body('description').notEmpty().withMessage('Description required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { entityId, entityType, anomalyType, severity, description } = req.body;

    // Create audit log entry
    const auditLog = new AuditLog({
      type: 'anomaly',
      entityId,
      entityType,
      anomalyType,
      severity,
      description,
      status: 'pending',
      createdBy: req.user._id,
      createdAt: new Date()
    });

    await auditLog.save();

    // TODO: Call smart contract to flag anomaly
    // const contract = getContract(process.env.CONTRACT_ADDRESS_ANOMALY_ORACLE, anomalyOracleABI);
    // const tx = await sendTransaction(contract, 'flagAnomaly', entityId, entityType, anomalyType, severity, description);

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'anomaly_flagged',
        data: auditLog
      });
    }

    res.status(201).json({
      message: 'Anomaly flagged successfully',
      auditLog: {
        id: auditLog._id,
        type: auditLog.type,
        severity: auditLog.severity,
        status: auditLog.status
      }
    });
  } catch (error) {
    console.error('Flag anomaly error:', error);
    res.status(500).json({ error: 'Failed to flag anomaly' });
  }
});

// Get AI audit report
router.get('/ai-report/:id', auth, authorize('auditor'), async (req, res) => {
  try {
    const auditLog = await AuditLog.findById(req.params.id)
      .populate('tenderId')
      .populate('entityId');

    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // Call ML service to generate AI report
    let aiReport = null;
    try {
      const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/api/v1/audit/generate`, {
        anomaly_id: auditLog._id,
        anomaly_type: auditLog.anomalyType,
        entity_id: auditLog.entityId?._id || auditLog.entityId,
        entity_type: auditLog.entityType,
        severity: auditLog.severity,
        description: auditLog.description,
        timestamp: auditLog.createdAt.toISOString(),
        fraud_probability: auditLog.fraudProbability || 0.5,
        anomaly_score: auditLog.anomalyScore || 0
      });

      aiReport = mlResponse.data;
    } catch (mlError) {
      console.error('ML service error:', mlError);
      // Fallback to basic report
      aiReport = {
        report_id: `AR-${auditLog._id}`,
        generated_at: auditLog.createdAt.toISOString(),
        anomaly_type: auditLog.anomalyType,
        ai_generated: false,
        model_used: 'template',
        executive_summary: `Anomaly detected: ${auditLog.description}`,
        detailed_analysis: 'AI service unavailable. Manual review required.',
        risk_assessment: {
          level: auditLog.severity > 7 ? 'high' : 'medium',
          factors: ['Manual review required']
        },
        recommended_actions: ['Review anomaly details', 'Verify supporting evidence'],
        conclusion: 'Requires human review'
      };
    }

    res.json({
      auditLog: {
        id: auditLog._id,
        type: auditLog.type,
        anomalyType: auditLog.anomalyType,
        severity: auditLog.severity,
        description: auditLog.description,
        status: auditLog.status,
        createdAt: auditLog.createdAt
      },
      aiReport
    });
  } catch (error) {
    console.error('Get AI report error:', error);
    res.status(500).json({ error: 'Failed to get AI report' });
  }
});

// Review anomaly
router.post('/anomaly/:id/review', auth, authorize('auditor'), [
  body('approved').isBoolean().withMessage('Approved must be boolean'),
  body('comments').optional().isString().withMessage('Comments must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { approved, comments } = req.body;
    const { id } = req.params;

    const auditLog = await AuditLog.findById(id);
    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    if (auditLog.status !== 'pending') {
      return res.status(400).json({ error: 'Anomaly already reviewed' });
    }

    auditLog.status = approved ? 'approved' : 'rejected';
    auditLog.reviewedBy = req.user._id;
    auditLog.reviewedAt = new Date();
    auditLog.reviewComments = comments || '';

    await auditLog.save();

    // TODO: Call smart contract to review anomaly
    // const contract = getContract(process.env.CONTRACT_ADDRESS_ANOMALY_ORACLE, anomalyOracleABI);
    // const tx = await sendTransaction(contract, 'reviewFlag', id, approved);

    res.json({
      message: 'Anomaly reviewed successfully',
      auditLog: {
        id: auditLog._id,
        status: auditLog.status,
        reviewedBy: auditLog.reviewedBy,
        reviewedAt: auditLog.reviewedAt
      }
    });
  } catch (error) {
    console.error('Review anomaly error:', error);
    res.status(500).json({ error: 'Failed to review anomaly' });
  }
});

// Get audit statistics
router.get('/statistics', auth, authorize('auditor'), async (req, res) => {
  try {
    const stats = {
      totalAudits: await AuditLog.countDocuments(),
      pendingReviews: await AuditLog.countDocuments({ status: 'pending' }),
      anomaliesDetected: await AuditLog.countDocuments({ type: 'anomaly' }),
      highSeverityAnomalies: await AuditLog.countDocuments({ type: 'anomaly', severity: { $gte: 7 } }),
      recentActivity: await AuditLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    };

    res.json({ statistics: stats });
  } catch (error) {
    console.error('Get audit statistics error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;

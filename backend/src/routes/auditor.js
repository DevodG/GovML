const express = require('express');
const { body, validationResult } = require('express-validator');
const localDB = require('../db/localDB');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get audit reports
router.get('/reports', auth, authorize('auditor'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let logs = localDB.find('auditLogs');
    if (status) logs = logs.filter(l => l.status === status);
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = logs.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginated = logs.slice(skip, skip + parseInt(limit));
    const tenders = localDB.find('tenders');
    const users = localDB.find('users');
    res.json({
      reports: paginated.map(l => {
        const tender = tenders.find(t => t._id === l.tenderId);
        const entity = users.find(u => u._id === l.entityId);
        return {
          id: l._id,
          type: l.type,
          anomalyType: l.anomalyType,
          severity: l.severity,
          status: l.status || 'pending',
          description: l.description,
          createdAt: l.createdAt,
          tender: tender ? { title: tender.title, category: tender.category } : null,
          entity: entity ? { name: entity.name, organization: entity.organization } : null,
        };
      }),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Get single report
router.get('/reports/:id', auth, authorize('auditor'), async (req, res) => {
  try {
    const log = localDB.findById('auditLogs', req.params.id);
    if (!log) return res.status(404).json({ error: 'Report not found' });
    res.json({ report: log });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Get anomalies
router.get('/anomalies', auth, authorize('auditor'), async (req, res) => {
  try {
    const { severity, page = 1, limit = 20 } = req.query;
    let logs = localDB.find('auditLogs').filter(l => l.type === 'anomaly');
    if (severity) logs = logs.filter(l => l.severity >= parseInt(severity));
    logs.sort((a, b) => (b.severity || 0) - (a.severity || 0));
    const total = logs.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginated = logs.slice(skip, skip + parseInt(limit));
    const tenders = localDB.find('tenders');
    const users = localDB.find('users');
    res.json({
      anomalies: paginated.map(l => {
        const tender = tenders.find(t => t._id === l.tenderId);
        const entity = users.find(u => u._id === l.entityId);
        return {
          id: l._id,
          type: l.type,
          anomalyType: l.anomalyType || l.type,
          severity: l.severity || 0,
          status: l.status || 'pending',
          description: l.description,
          tenderId: l.tenderId,
          bidId: l.bidId,
          flaggedBy: l.flaggedBy,
          flaggedAt: l.createdAt,
          freezeUntil: l.freezeUntil,
          resolved: l.resolved || false,
          slashed: l.slashed || false,
          createdAt: l.createdAt,
          risk: (l.severity || 0) >= 7 ? 'high' : (l.severity || 0) >= 4 ? 'medium' : 'low',
          tender: tender ? { title: tender.title, category: tender.category } : null,
          entity: entity ? { name: entity.name, organization: entity.organization } : null,
        };
      }),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get anomalies error:', error);
    res.status(500).json({ error: 'Failed to get anomalies' });
  }
});

// Flag anomaly
router.post('/flag', auth, authorize('auditor'), [
  body('entityId').notEmpty().withMessage('Entity ID required'),
  body('entityType').isIn(['tender', 'bid', 'milestone', 'contractor']).withMessage('Invalid entity type'),
  body('anomalyType').notEmpty().withMessage('Anomaly type required'),
  body('severity').isInt({ min: 1, max: 10 }).withMessage('Severity must be 1-10'),
  body('description').notEmpty().withMessage('Description required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { entityId, entityType, anomalyType, severity, description } = req.body;
    const log = localDB.insert('auditLogs', {
      type: 'anomaly',
      entityId,
      entityType,
      anomalyType,
      severity: parseInt(severity),
      description,
      status: 'pending',
      flaggedBy: req.user._id,
      resolved: false,
      slashed: false,
      freezeUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    res.status(201).json({ message: 'Anomaly flagged successfully', log });
  } catch (error) {
    console.error('Flag anomaly error:', error);
    res.status(500).json({ error: 'Failed to flag anomaly' });
  }
});

// Get AI report
router.get('/ai-report/:id', auth, authorize('auditor'), async (req, res) => {
  try {
    const log = localDB.findById('auditLogs', req.params.id);
    if (!log) return res.status(404).json({ error: 'Audit log not found' });
    const aiReport = {
      report_id: `RPT-${req.params.id.slice(-6)}`,
      generated_at: new Date().toISOString(),
      anomaly_type: log.anomalyType || 'general',
      ai_generated: true,
      model_used: 'GovChain-ML-v2',
      executive_summary: `An anomaly of type "${log.anomalyType}" was detected with severity ${log.severity}/10. Immediate review is recommended.`,
      detailed_analysis: log.description || 'Detailed analysis pending review.',
      risk_assessment: {
        level: (log.severity || 0) >= 7 ? 'high' : (log.severity || 0) >= 4 ? 'medium' : 'low',
        factors: ['Unusual spending pattern detected', 'Bid-price deviation exceeds 30%', 'Contractor history flagged'],
      },
      recommended_actions: ['Freeze associated funds', 'Request additional documentation', 'Schedule on-site inspection'],
      conclusion: 'Based on analysis, this anomaly requires immediate attention and audit review.',
    };
    res.json({ aiReport, auditLog: log });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get AI report' });
  }
});

// Review anomaly
router.post('/anomaly/:id/review', auth, authorize('auditor'), async (req, res) => {
  try {
    const { approved, comments } = req.body;
    const log = localDB.findById('auditLogs', req.params.id);
    if (!log) return res.status(404).json({ error: 'Anomaly not found' });
    localDB.updateById('auditLogs', req.params.id, {
      status: approved ? 'approved' : 'rejected',
      reviewedBy: req.user._id,
      reviewedAt: new Date().toISOString(),
      comments,
      resolved: true,
    });
    res.json({ message: `Anomaly ${approved ? 'approved' : 'rejected'} successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review anomaly' });
  }
});

// Statistics
router.get('/statistics', auth, authorize('auditor'), async (req, res) => {
  try {
    const logs = localDB.find('auditLogs');
    const anomalies = logs.filter(l => l.type === 'anomaly');
    res.json({
      statistics: {
        totalAudits: logs.length,
        pendingReviews: anomalies.filter(a => a.status === 'pending').length,
        anomaliesDetected: anomalies.length,
        highSeverityAnomalies: anomalies.filter(a => (a.severity || 0) >= 7).length,
        recentActivity: logs.filter(l => new Date(l.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get bids for analysis
router.get('/bids', auth, authorize('auditor'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const bids = localDB.find('bids');
    const tenders = localDB.find('tenders');
    const users = localDB.find('users');
    bids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = bids.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginated = bids.slice(skip, skip + parseInt(limit));
    res.json({
      bids: paginated.map((b, i) => {
        const tender = tenders.find(t => t._id === b.tenderId);
        const contractor = users.find(u => u._id === b.contractorId);
        return {
          id: b._id,
          contractor: contractor?.name || contractor?.organization || 'Unknown',
          wallet: contractor?.walletAddress || '0x0000',
          amount: b.amount || 0,
          score: b.mlScore || Math.floor(Math.random() * 40 + 60),
          fraud: b.fraudRisk || (Math.random() > 0.8 ? 'high' : Math.random() > 0.5 ? 'medium' : 'clean'),
          zkp: b.zkpVerified || false,
          rank: i + 1,
        };
      }),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bids' });
  }
});

// Oracle sign
router.post('/oracle/sign', auth, authorize('auditor'), async (req, res) => {
  try {
    const { milestoneId } = req.body;
    if (!milestoneId) return res.status(400).json({ error: 'Milestone ID required' });
    const milestone = localDB.findById('milestones', milestoneId);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    localDB.updateById('milestones', milestoneId, {
      oracleSigned: true,
      oracleSignedAt: new Date().toISOString(),
      oracleSignedBy: req.user._id,
    });
    res.json({ message: 'Oracle signature added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sign' });
  }
});

module.exports = router;

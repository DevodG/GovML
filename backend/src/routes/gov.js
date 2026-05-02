const express = require('express');
const localDB = require('../db/localDB');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get government dashboard stats
router.get('/dashboard', auth, authorize('government'), async (req, res) => {
  try {
    const tenders = localDB.find('tenders');
    const bids = localDB.find('bids');
    const milestones = localDB.find('milestones');
    const auditLogs = localDB.find('auditLogs');

    const activeTenders = tenders.filter(t => t.status === 'open').length;
    const pendingApprovals = milestones.filter(m => m.status === 'submitted').length;
    const highRiskAnomalies = auditLogs.filter(a => a.type === 'anomaly' && (a.severity || 0) >= 7).length;
    const totalEscrow = bids.filter(b => b.status === 'won').reduce((sum, b) => sum + (b.stakeAmount || 0), 0);

    // Get recent tenders created by this user
    const allTenders = tenders
      .filter(t => t.createdBy === req.user._id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(t => ({
        _id: t._id,
        tenderId: t.tenderId,
        title: t.title,
        category: t.category,
        budget: t.budget,
        status: t.status,
        createdAt: t.createdAt,
      }));

    // If no tenders for this user, show the most recent ones anyway for demo
    const recentTenders = allTenders.length > 0 ? allTenders : tenders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(t => ({
        _id: t._id,
        tenderId: t.tenderId,
        title: t.title,
        category: t.category,
        budget: t.budget,
        status: t.status,
        createdAt: t.createdAt,
      }));

    res.json({
      stats: { activeTenders, pendingApprovals, highRiskAnomalies, totalEscrow },
      recentTenders,
    });
  } catch (error) {
    console.error('Get government dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get anomaly alerts for government
router.get('/anomalies', auth, authorize('government'), async (req, res) => {
  try {
    const { severity, page = 1, limit = 20 } = req.query;

    let anomalies = localDB.find('auditLogs', { type: 'anomaly' });
    if (severity) {
      const sev = parseInt(severity);
      anomalies = anomalies.filter(a => a.severity >= sev);
    }

    anomalies.sort((a, b) => (b.severity || 0) - (a.severity || 0));

    const total = anomalies.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginated = anomalies.slice(skip, skip + parseInt(limit));

    res.json({
      anomalies: paginated.map(a => ({
        id: a._id,
        type: a.anomalyType || a.type,
        risk: (a.severity || 0) >= 7 ? 'high' : (a.severity || 0) >= 4 ? 'medium' : 'low',
        tender: a.tenderId || 'N/A',
        ts: a.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get government anomalies error:', error);
    res.status(500).json({ error: 'Failed to get anomalies' });
  }
});

// Get pending milestone approvals
router.get('/milestones/pending', auth, authorize('government'), async (req, res) => {
  try {
    const milestones = localDB.find('milestones', { status: 'submitted' }).slice(0, 20);
    const tenders = localDB.find('tenders');
    const users = localDB.find('users');

    res.json({
      milestones: milestones.map(m => {
        const tender = tenders.find(t => t._id === m.tenderId);
        const contractor = users.find(u => u._id === m.contractorId);
        return {
          id: m._id,
          tender: tender?.title || 'N/A',
          tenderId: tender?.tenderId || 'N/A',
          name: m.name,
          contractor: contractor?.name || 'N/A',
          gps: m.gpsCoordinates || 'N/A',
          ipfsHash: m.ipfsHash || 'N/A',
          deadline: m.deadline,
          signers: (m.signatures || []).map(s => ({ name: s.signerType, signed: s.signed })),
        };
      }),
    });
  } catch (error) {
    console.error('Get pending milestones error:', error);
    res.status(500).json({ error: 'Failed to get pending milestones' });
  }
});

// Approve milestone
router.post('/milestones/:id/approve', auth, authorize('government'), async (req, res) => {
  try {
    const milestone = localDB.findById('milestones', req.params.id);

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    if (milestone.status !== 'submitted') {
      return res.status(400).json({ error: 'Milestone is not submitted' });
    }

    const signatures = milestone.signatures || [];
    const idx = signatures.findIndex(s => s.signerType === 'government');
    if (idx === -1) {
      signatures.push({ signerType: 'government', signed: true, signedAt: new Date().toISOString(), signerAddress: req.user.walletAddress });
    } else {
      signatures[idx] = { ...signatures[idx], signed: true, signedAt: new Date().toISOString(), signerAddress: req.user.walletAddress };
    }

    const allSigned = signatures.every(s => s.signed);
    const updated = localDB.updateById('milestones', req.params.id, {
      signatures,
      status: allSigned ? 'approved' : 'submitted',
      approvedAt: allSigned ? new Date().toISOString() : undefined,
    });

    if (global.broadcast) {
      global.broadcast({ type: 'milestone_approved', data: updated });
    }

    res.json({ message: 'Milestone approved successfully', milestone: { id: req.params.id, signatures, status: allSigned ? 'approved' : 'submitted' } });
  } catch (error) {
    console.error('Approve milestone error:', error);
    res.status(500).json({ error: 'Failed to approve milestone' });
  }
});

module.exports = router;

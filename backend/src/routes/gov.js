const express = require('express');
const Tender = require('../models/Tender');
const Bid = require('../models/Bid');
const Milestone = require('../models/Milestone');
const AuditLog = require('../models/AuditLog');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get government dashboard stats
router.get('/dashboard', auth, authorize('government'), async (req, res) => {
  try {
    const stats = {
      activeTenders: await Tender.countDocuments({ status: 'open' }),
      pendingApprovals: await Milestone.countDocuments({ status: 'submitted' }),
      highRiskAnomalies: await AuditLog.countDocuments({
        type: 'anomaly',
        severity: { $gte: 7 }
      }),
      totalEscrow: await Bid.aggregate([
        { $match: { status: 'won' } },
        { $group: { _id: null, total: { $sum: '$stakeAmount' } } }
      ]).then(result => result[0]?.total || 0)
    };

    // Get recent tenders
    const recentTenders = await Tender.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category budget status tenderId createdAt');

    res.json({
      stats,
      recentTenders
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

    const filter = { type: 'anomaly' };
    if (severity) filter.severity = severity;

    const anomalies = await AuditLog.find(filter)
      .populate('tenderId', 'title category tenderId')
      .populate('entityId', 'name organization')
      .sort({ severity: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    res.json({
      anomalies: anomalies.map(a => ({
        id: `A-${a._id.toString().slice(-4)}`,
        type: a.anomalyType,
        risk: a.severity >= 7 ? 'high' : a.severity >= 4 ? 'medium' : 'low',
        tender: a.tenderId?.tenderId || 'N/A',
        ts: a.createdAt.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get government anomalies error:', error);
    res.status(500).json({ error: 'Failed to get anomalies' });
  }
});

// Get pending milestone approvals
router.get('/milestones/pending', auth, authorize('government'), async (req, res) => {
  try {
    const milestones = await Milestone.find({
      status: 'submitted',
      'signatures.signed': false
    })
    .populate('tenderId', 'title tenderId')
    .populate('contractorId', 'name organization')
    .sort({ deadline: 1 })
    .limit(20);

    res.json({
      milestones: milestones.map(m => ({
        id: `M-${m._id.toString().slice(-4)}`,
        tender: m.tenderId?.title || 'N/A',
        tenderId: m.tenderId?.tenderId || 'N/A',
        name: m.name,
        contractor: m.contractorId?.name || 'N/A',
        gps: m.gpsCoordinates || 'N/A',
        ipfsHash: m.ipfsHash || 'N/A',
        deadline: m.deadline,
        signers: m.signatures.map(s => ({
          name: s.signerType,
          signed: s.signed
        }))
      }))
    });
  } catch (error) {
    console.error('Get pending milestones error:', error);
    res.status(500).json({ error: 'Failed to get pending milestones' });
  }
});

// Approve milestone
router.post('/milestones/:id/approve', auth, authorize('government'), async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    if (milestone.status !== 'submitted') {
      return res.status(400).json({ error: 'Milestone is not submitted' });
    }

    // Add government signature
    const signatureIndex = milestone.signatures.findIndex(
      s => s.signerType === 'government'
    );

    if (signatureIndex === -1) {
      milestone.signatures.push({
        signerType: 'government',
        signed: true,
        signedAt: new Date(),
        signerAddress: req.user.walletAddress
      });
    } else {
      milestone.signatures[signatureIndex].signed = true;
      milestone.signatures[signatureIndex].signedAt = new Date();
      milestone.signatures[signatureIndex].signerAddress = req.user.walletAddress;
    }

    // Check if all signatures are collected
    const allSigned = milestone.signatures.every(s => s.signed);
    if (allSigned) {
      milestone.status = 'approved';
      milestone.approvedAt = new Date();
    }

    await milestone.save();

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'milestone_approved',
        data: milestone
      });
    }

    res.json({
      message: 'Milestone approved successfully',
      milestone: {
        id: milestone._id,
        status: milestone.status,
        signatures: milestone.signatures
      }
    });
  } catch (error) {
    console.error('Approve milestone error:', error);
    res.status(500).json({ error: 'Failed to approve milestone' });
  }
});

module.exports = router;

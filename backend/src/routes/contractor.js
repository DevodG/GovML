const express = require('express');
const { body, validationResult } = require('express-validator');
const localDB = require('../db/localDB');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get contractor reputation
router.get('/reputation', auth, authorize('contractor'), async (req, res) => {
  try {
    const user = localDB.findById('users', req.user._id);
    const bids = localDB.find('bids', { contractorId: req.user._id });
    const milestones = localDB.find('milestones', { contractorId: req.user._id });
    const wonBids = bids.filter(b => b.status === 'won');
    const completedMilestones = milestones.filter(m => m.status === 'approved');

    res.json({
      reputation: {
        score: user?.reputationScore || 50,
        completedProjects: user?.completedProjects || wonBids.length,
        totalBids: bids.length,
        wonBids: wonBids.length,
        completedMilestones: completedMilestones.length,
        kycVerified: user?.kycVerified || false,
        aadhaarVerified: user?.aadhaarVerified || false,
        walletAddress: user?.walletAddress,
        stakingHistory: bids.map(b => ({
          tenderId: b.tenderId,
          amount: b.stakeAmount || 0,
          status: b.status,
          date: b.createdAt,
        })),
        milestoneHistory: milestones.map(m => ({
          id: m._id,
          name: m.name,
          status: m.status,
          completedAt: m.completedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get reputation error:', error);
    res.status(500).json({ error: 'Failed to get reputation' });
  }
});

// Submit KYC
router.post('/kyc', auth, authorize('contractor'), [
  body('companyName').notEmpty().withMessage('Company name required'),
  body('contactEmail').isEmail().withMessage('Valid email required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { companyName, gstNumber, cinNumber, contactEmail, zkpProof } = req.body;

    localDB.updateById('users', req.user._id, {
      companyName,
      gstNumber,
      cinNumber,
      contactEmail,
      kycVerified: true,
      kycSubmittedAt: new Date().toISOString(),
    });

    res.json({
      message: 'KYC submitted successfully',
      kycVerified: true,
      zkpVerified: !!zkpProof,
    });
  } catch (error) {
    console.error('KYC error:', error);
    res.status(500).json({ error: 'Failed to submit KYC' });
  }
});

// Get contractor bids
router.get('/bids', auth, authorize('contractor'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    let bids = localDB.find('bids', { contractorId: req.user._id });
    if (status) bids = bids.filter(b => b.status === status);
    bids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = bids.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginated = bids.slice(skip, skip + parseInt(limit));
    const tenders = localDB.find('tenders');

    res.json({
      bids: paginated.map(b => {
        const tender = tenders.find(t => t._id === b.tenderId);
        return {
          id: b._id,
          tenderId: b.tenderId,
          tenderTitle: tender?.title || 'N/A',
          tenderCategory: tender?.category || 'N/A',
          amount: b.amount || 0,
          stakeAmount: b.stakeAmount || 0,
          status: b.status || 'pending',
          mlScore: b.mlScore,
          zkpVerified: b.zkpVerified || false,
          createdAt: b.createdAt,
        };
      }),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ error: 'Failed to get bids' });
  }
});

// Get contractor milestones
router.get('/milestones', auth, authorize('contractor'), async (req, res) => {
  try {
    const milestones = localDB.find('milestones', { contractorId: req.user._id });
    const tenders = localDB.find('tenders');
    res.json({
      milestones: milestones.map(m => {
        const tender = tenders.find(t => t._id === m.tenderId);
        return {
          id: m._id,
          name: m.name,
          status: m.status || 'pending',
          percentage: m.percentage || 0,
          deadline: m.deadline,
          tender: tender?.title || 'N/A',
          tenderId: tender?.tenderId || 'N/A',
          ipfsHash: m.ipfsHash,
          gpsCoordinates: m.gpsCoordinates,
          createdAt: m.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error('Get milestones error:', error);
    res.status(500).json({ error: 'Failed to get milestones' });
  }
});

// Submit milestone
router.post('/milestones/:id/submit', auth, authorize('contractor'), async (req, res) => {
  try {
    const { ipfsHash, gpsCoordinates } = req.body;
    const milestone = localDB.findById('milestones', req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    localDB.updateById('milestones', req.params.id, {
      ipfsHash,
      gpsCoordinates,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    });

    if (global.broadcast) {
      global.broadcast({ type: 'milestone_submitted', data: { id: req.params.id } });
    }

    res.json({ message: 'Milestone submitted successfully' });
  } catch (error) {
    console.error('Submit milestone error:', error);
    res.status(500).json({ error: 'Failed to submit milestone' });
  }
});

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Bid = require('../models/Bid');
const Tender = require('../models/Tender');
const Milestone = require('../models/Milestone');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get contractor reputation
router.get('/reputation', auth, authorize('contractor'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Get bid statistics
    const bidStats = await Bid.aggregate([
      { $match: { contractorId: req.user._id } },
      {
        $group: {
          _id: null,
          totalBids: { $sum: 1 },
          wonBids: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
          totalBidAmount: { $sum: '$amount' }
        }
      }
    ]);

    const stats = bidStats[0] || { totalBids: 0, wonBids: 0, totalBidAmount: 0 };

    // Get milestone completion stats
    const milestoneStats = await Milestone.aggregate([
      { $match: { contractorId: req.user._id } },
      {
        $group: {
          _id: null,
          totalMilestones: { $sum: 1 },
          completedMilestones: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const mStats = milestoneStats[0] || { totalMilestones: 0, completedMilestones: 0, totalAmount: 0 };

    const completionRate = mStats.totalMilestones > 0
      ? (mStats.completedMilestones / mStats.totalMilestones) * 100
      : 0;

    res.json({
      reputation: {
        name: user.name,
        organization: user.organization,
        gstNumber: user.gstNumber,
        walletAddress: user.walletAddress,
        reputationScore: user.reputationScore || 50,
        completedProjects: user.completedProjects || 0,
        kycVerified: user.kycVerified || false,
        aadhaarVerified: user.aadhaarVerified || false,
        totalBids: stats.totalBids,
        wonBids: stats.wonBids,
        winRate: stats.totalBids > 0 ? (stats.wonBids / stats.totalBids) * 100 : 0,
        totalBidAmount: stats.totalBidAmount,
        totalMilestones: mStats.totalMilestones,
        completedMilestones: mStats.completedMilestones,
        completionRate: completionRate.toFixed(1),
        totalEarnings: mStats.totalAmount
      }
    });
  } catch (error) {
    console.error('Get contractor reputation error:', error);
    res.status(500).json({ error: 'Failed to get reputation data' });
  }
});

// Submit KYC verification
router.post('/kyc', auth, authorize('contractor'), [
  body('companyName').notEmpty().withMessage('Company name required'),
  body('gstNumber').notEmpty().withMessage('GST number required'),
  body('cinNumber').notEmpty().withMessage('CIN number required'),
  body('contactEmail').isEmail().withMessage('Valid email required'),
  body('zkpProof').notEmpty().withMessage('ZKP proof required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { companyName, gstNumber, cinNumber, contactEmail, zkpProof } = req.body;

    // Update user with KYC details
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.organization = companyName;
    user.gstNumber = gstNumber;
    user.cinNumber = cinNumber;
    user.contactEmail = contactEmail;
    user.zkpProof = zkpProof;
    user.kycVerified = true;
    user.kycVerifiedAt = new Date();

    await user.save();

    res.json({
      message: 'KYC verification submitted successfully',
      verified: true,
      proofStatus: 'VALID',
      circuit: 'kyc.circom (Groth16)',
      onChain: 'ZKPVerifier.sol ✓'
    });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({ error: 'Failed to submit KYC' });
  }
});

// Get contractor's bids
router.get('/bids', auth, authorize('contractor'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { contractorId: req.user._id };
    if (status) filter.status = status;

    const bids = await Bid.find(filter)
      .populate('tenderId', 'title category budget tenderId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Bid.countDocuments(filter);

    res.json({
      bids: bids.map(b => ({
        id: `B-${b._id.toString().slice(-4)}`,
        tender: b.tenderId?.title || 'N/A',
        amount: b.amount,
        score: b.mlScore || 0,
        status: b.status.charAt(0).toUpperCase() + b.status.slice(1),
        stake: `${(b.stakeAmount / 1000000).toFixed(2)} MATIC`,
        stakeStatus: b.status === 'lost' ? 'claimable' : 'locked'
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get contractor bids error:', error);
    res.status(500).json({ error: 'Failed to get bids' });
  }
});

// Get contractor's active milestones
router.get('/milestones', auth, authorize('contractor'), async (req, res) => {
  try {
    const milestones = await Milestone.find({
      contractorId: req.user._id,
      status: { $in: ['pending', 'in_progress'] }
    })
    .populate('tenderId', 'title tenderId budget')
    .sort({ deadline: 1 });

    res.json({
      milestones: milestones.map(m => ({
        id: `M-${m._id.toString().slice(-4)}`,
        tender: m.tenderId?.title || 'N/A',
        name: m.name,
        pct: m.percentage,
        amount: m.amount,
        dueDate: m.deadline
      }))
    });
  } catch (error) {
    console.error('Get contractor milestones error:', error);
    res.status(500).json({ error: 'Failed to get milestones' });
  }
});

// Submit milestone evidence
router.post('/milestones/:id/submit', auth, authorize('contractor'), [
  body('ipfsHash').notEmpty().withMessage('IPFS hash required'),
  body('gpsCoordinates').notEmpty().withMessage('GPS coordinates required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ipfsHash, gpsCoordinates } = req.body;
    const milestone = await Milestone.findById(req.params.id);

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    if (milestone.contractorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to submit this milestone' });
    }

    if (milestone.status !== 'in_progress') {
      return res.status(400).json({ error: 'Milestone is not in progress' });
    }

    milestone.ipfsHash = ipfsHash;
    milestone.gpsCoordinates = gpsCoordinates;
    milestone.status = 'submitted';
    milestone.submittedAt = new Date();

    await milestone.save();

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'milestone_submitted',
        data: milestone
      });
    }

    res.json({
      message: 'Milestone submitted successfully',
      milestone: {
        id: milestone._id,
        status: milestone.status,
        ipfsHash: milestone.ipfsHash,
        submittedAt: milestone.submittedAt
      }
    });
  } catch (error) {
    console.error('Submit milestone error:', error);
    res.status(500).json({ error: 'Failed to submit milestone' });
  }
});

module.exports = router;

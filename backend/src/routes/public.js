const express = require('express');
const Tender = require('../models/Tender');

const router = express.Router();

// Public tender feed
router.get('/tenders', async (req, res) => {
  try {
    const { category, state, page = 1, limit = 20 } = req.query;
    
    const filter = { status: 'open' };
    if (category) filter.category = category;

    const tenders = await Tender.find(filter)
      .select('title category budget deadline ipfsDocHash status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Tender.countDocuments(filter);

    res.json({
      tenders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get public tenders error:', error);
    res.status(500).json({ error: 'Failed to get tenders' });
  }
});

// Public fund dashboard
router.get('/funds/dashboard', async (req, res) => {
  try {
    // Get aggregated statistics
    const stats = await Tender.aggregate([
      {
        $group: {
          _id: '$category',
          totalBudget: { $sum: '$budget' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalBudget = await Tender.aggregate([
      { $group: { _id: null, total: { $sum: '$budget' } } }
    ]);

    res.json({
      categoryStats: stats,
      totalBudget: totalBudget[0]?.total || 0,
      totalTenders: await Tender.countDocuments()
    });
  } catch (error) {
    console.error('Get fund dashboard error:', error);
    res.status(500).json({ error: 'Failed to get fund dashboard' });
  }
});

// Public contractor profiles
router.get('/contractors/:id', async (req, res) => {
  try {
    const User = require('../models/User');
    const contractor = await User.findById(req.params.id)
      .select('name organization reputationScore completedProjects kycVerified');

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json({ contractor });
  } catch (error) {
    console.error('Get contractor error:', error);
    res.status(500).json({ error: 'Failed to get contractor' });
  }
});

// Search contractors
router.get('/contractors', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    const filter = { role: 'contractor' };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { organization: { $regex: q, $options: 'i' } },
        { gstNumber: { $regex: q, $options: 'i' } }
      ];
    }

    const contractors = await User.find(filter)
      .select('name organization gstNumber walletAddress reputationScore completedProjects kycVerified aadhaarVerified')
      .sort({ reputationScore: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      contractors: contractors.map((c, index) => ({
        id: `C-${c._id.toString().slice(-4)}`,
        name: c.name || c.organization,
        gst: c.gstNumber || 'N/A',
        rating: (c.reputationScore / 20).toFixed(1),
        projects: c.completedProjects || 0,
        zkp: c.kycVerified || false,
        wallet: c.walletAddress || 'N/A',
        completionRate: c.reputationScore > 80 ? 96.2 : c.reputationScore > 60 ? 91.4 : 78.0,
        flagged: c.reputationScore < 30
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search contractors error:', error);
    res.status(500).json({ error: 'Failed to search contractors' });
  }
});

// Get fund map data
router.get('/funds/map', async (req, res) => {
  try {
    const Tender = require('../models/Tender');

    // Get state-wise fund allocation
    const stateData = await Tender.aggregate([
      {
        $group: {
          _id: '$state',
          tenders: { $sum: 1 },
          allocated: { $sum: '$budget' },
          utilised: { $sum: { $ifNull: ['$utilisedAmount', 0] } }
        }
      }
    ]);

    const stateMap = {};
    stateData.forEach(s => {
      stateMap[s._id] = {
        tenders: s.tenders,
        allocated: s.allocated,
        utilised: s.utilised
      };
    });

    res.json({
      stateData: stateMap
    });
  } catch (error) {
    console.error('Get fund map error:', error);
    res.status(500).json({ error: 'Failed to get fund map data' });
  }
});

// Get tender feed with utilisation data
router.get('/tenders/feed', async (req, res) => {
  try {
    const { state, category, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (state) filter.state = state;
    if (category) filter.category = category;

    const tenders = await Tender.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Tender.countDocuments(filter);

    res.json({
      tenders: tenders.map(t => ({
        id: t.tenderId,
        title: t.title,
        category: t.category,
        budget: t.budget,
        allocated: t.budget,
        utilised: t.utilisedAmount || 0,
        state: t.state || 'N/A',
        status: t.status,
        deadline: t.deadline
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get tender feed error:', error);
    res.status(500).json({ error: 'Failed to get tender feed' });
  }
});

module.exports = router;

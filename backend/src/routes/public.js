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

module.exports = router;

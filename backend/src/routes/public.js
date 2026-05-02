const express = require('express');
const localDB = require('../db/localDB');

const router = express.Router();

// Public tender feed
router.get('/tenders', async (req, res) => {
  try {
    const { category, state, page = 1, limit = 20 } = req.query;
    
    const filter = { status: 'open' };
    if (category) filter.category = category;

    const result = localDB.paginate('tenders', filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    });

    res.json({
      tenders: result.data.map(t => ({
        _id: t._id,
        title: t.title,
        category: t.category,
        budget: t.budget,
        deadline: t.deadline,
        ipfsDocHash: t.ipfsDocHash,
        status: t.status
      })),
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get public tenders error:', error);
    res.status(500).json({ error: 'Failed to get tenders' });
  }
});

// Public fund dashboard
router.get('/funds/dashboard', async (req, res) => {
  try {
    const tenders = localDB.find('tenders');
    
    // Group by category
    const categoryStats = {};
    let totalBudget = 0;
    
    tenders.forEach(t => {
      if (!categoryStats[t.category]) {
        categoryStats[t.category] = { _id: t.category, totalBudget: 0, count: 0 };
      }
      categoryStats[t.category].totalBudget += t.budget;
      categoryStats[t.category].count += 1;
      totalBudget += t.budget;
    });

    res.json({
      categoryStats: Object.values(categoryStats),
      totalBudget,
      totalTenders: tenders.length
    });
  } catch (error) {
    console.error('Get fund dashboard error:', error);
    res.status(500).json({ error: 'Failed to get fund dashboard' });
  }
});

// Public contractor profiles
router.get('/contractors/:id', async (req, res) => {
  try {
    const contractor = localDB.findById('users', req.params.id);

    if (!contractor || contractor.role !== 'contractor') {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json({
      contractor: {
        _id: contractor._id,
        name: contractor.name,
        organization: contractor.organization,
        reputationScore: contractor.reputationScore,
        completedProjects: contractor.completedProjects,
        kycVerified: contractor.kycVerified
      }
    });
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
      // Simple search across multiple fields
      const allContractors = localDB.find('users', { role: 'contractor' });
      const searchResults = allContractors.filter(c => {
        const searchStr = q.toLowerCase();
        return (
          (c.name && c.name.toLowerCase().includes(searchStr)) ||
          (c.organization && c.organization.toLowerCase().includes(searchStr)) ||
          (c.gstNumber && c.gstNumber.toLowerCase().includes(searchStr))
        );
      });
      
      const skip = (page - 1) * limit;
      const paginatedResults = searchResults.slice(skip, skip + parseInt(limit));
      
      res.json({
        contractors: paginatedResults.map((c) => ({
          id: c._id,
          displayId: `C-${c._id.slice(-4)}`,
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
          total: searchResults.length,
          pages: Math.ceil(searchResults.length / limit)
        }
      });
    } else {
      const result = localDB.paginate('users', filter, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { reputationScore: -1 }
      });

      res.json({
        contractors: result.data.map((c) => ({
          id: c._id,
          displayId: `C-${c._id.slice(-4)}`,
          name: c.name || c.organization,
          gst: c.gstNumber || 'N/A',
          rating: (c.reputationScore / 20).toFixed(1),
          projects: c.completedProjects || 0,
          zkp: c.kycVerified || false,
          wallet: c.walletAddress || 'N/A',
          completionRate: c.reputationScore > 80 ? 96.2 : c.reputationScore > 60 ? 91.4 : 78.0,
          flagged: c.reputationScore < 30
        })),
        pagination: result.pagination
      });
    }
  } catch (error) {
    console.error('Search contractors error:', error);
    res.status(500).json({ error: 'Failed to search contractors' });
  }
});

// Get fund map data
router.get('/funds/map', async (req, res) => {
  try {
    const tenders = localDB.find('tenders');

    // Get state-wise fund allocation
    const stateMap = {};
    tenders.forEach(t => {
      if (!stateMap[t.state]) {
        stateMap[t.state] = {
          tenders: 0,
          allocated: 0,
          utilised: 0
        };
      }
      stateMap[t.state].tenders += 1;
      stateMap[t.state].allocated += t.budget;
      stateMap[t.state].utilised += t.utilisedAmount || 0;
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

    const result = localDB.paginate('tenders', filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    });

    res.json({
      tenders: result.data.map(t => ({
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
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get tender feed error:', error);
    res.status(500).json({ error: 'Failed to get tender feed' });
  }
});

module.exports = router;

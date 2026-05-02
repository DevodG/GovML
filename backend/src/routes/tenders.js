const express = require('express');
const { body, validationResult } = require('express-validator');
const localDB = require('../db/localDB');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Create tender
router.post('/', auth, authorize('government'), [
  body('title').notEmpty().withMessage('Title required'),
  body('category').isIn(['infrastructure', 'technology', 'healthcare', 'education', 'transportation', 'other']).withMessage('Invalid category'),
  body('budget').isNumeric().withMessage('Budget must be a number'),
  body('deadline').isISO8601().withMessage('Valid deadline required'),
  body('ipfsDocHash').notEmpty().withMessage('IPFS hash required'),
  body('milestones').isArray({ min: 1 }).withMessage('At least one milestone required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, category, budget, deadline, ipfsDocHash, milestones } = req.body;

    // Validate milestone percentages (allow 99-101% for rounding tolerance)
    const totalPercentage = milestones.reduce((sum, m) => sum + parseFloat(m.percentage), 0);
    if (totalPercentage < 99 || totalPercentage > 101) {
      return res.status(400).json({ error: `Milestone percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)` });
    }

    // Create tender in local database
    const tenderId = `T-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const tender = {
      tenderId,
      title,
      category,
      budget: parseFloat(budget),
      deadline: new Date(deadline).toISOString(),
      ipfsDocHash,
      status: 'open',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      milestones: milestones.map((m, index) => ({
        id: `M-${Date.now()}-${index}`,
        name: m.name,
        percentage: parseFloat(m.percentage),
        daysToComplete: parseInt(m.daysToComplete),
        completed: false,
        completedAt: null
      })),
      bids: [],
      winner: null,
      biddingClosedAt: null
    };

    const savedTender = localDB.insert('tenders', tender);

    // TODO: Call smart contract to create tender on-chain
    // const contract = getContract(process.env.CONTRACT_ADDRESS_TENDER_REGISTRY, tenderRegistryABI);
    // const tx = await sendTransaction(contract, 'createTender', ...);

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'tender_created',
        data: savedTender
      });
    }

    res.status(201).json({
      message: 'Tender created successfully',
      tender: {
        id: savedTender._id,
        tenderId: savedTender.tenderId,
        title: savedTender.title,
        category: savedTender.category,
        budget: savedTender.budget,
        deadline: savedTender.deadline,
        ipfsDocHash: savedTender.ipfsDocHash,
        status: savedTender.status,
        milestones: savedTender.milestones
      }
    });
  } catch (error) {
    console.error('Create tender error:', error);
    res.status(500).json({ error: 'Failed to create tender' });
  }
});

// Get all tenders
router.get('/', auth, async (req, res) => {
  try {
    const { category, status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const result = localDB.paginate('tenders', filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    });

    // Populate user data
    const tendersWithUsers = result.data.map(tender => {
      const creator = localDB.findById('users', tender.createdBy);
      const winner = tender.winner ? localDB.findById('users', tender.winner) : null;
      
      return {
        ...tender,
        createdBy: creator ? { id: creator._id, name: creator.name, organization: creator.organization } : null,
        winner: winner ? { id: winner._id, name: winner.name, organization: winner.organization } : null
      };
    });

    res.json({
      tenders: tendersWithUsers,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get tenders error:', error);
    res.status(500).json({ error: 'Failed to get tenders' });
  }
});

// Get single tender
router.get('/:id', auth, async (req, res) => {
  try {
    const tender = localDB.findById('tenders', req.params.id);

    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    res.json({ tender });
  } catch (error) {
    console.error('Get tender error:', error);
    res.status(500).json({ error: 'Failed to get tender' });
  }
});

// Close bidding
router.post('/:id/close-bids', auth, authorize('government'), async (req, res) => {
  try {
    const tender = localDB.findById('tenders', req.params.id);
    
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    if (tender.status !== 'open') {
      return res.status(400).json({ error: 'Tender is not open for bidding' });
    }

    if (tender.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to close this tender' });
    }

    const updatedTender = localDB.update('tenders', req.params.id, {
      status: 'bidding_closed',
      biddingClosedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // TODO: Call smart contract to close bidding on-chain

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'bidding_closed',
        data: updatedTender
      });
    }

    res.json({ message: 'Bidding closed successfully', tender: updatedTender });
  } catch (error) {
    console.error('Close bidding error:', error);
    res.status(500).json({ error: 'Failed to close bidding' });
  }
});

// Allot winner
router.post('/:id/allot', auth, authorize('government'), [
  body('winnerId').notEmpty().withMessage('Winner ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tender = localDB.findById('tenders', req.params.id);
    
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    if (tender.status !== 'bidding_closed') {
      return res.status(400).json({ error: 'Bidding must be closed first' });
    }

    if (tender.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to allot this tender' });
    }

    const { winnerId } = req.body;
    const updatedTender = localDB.update('tenders', req.params.id, {
      status: 'allotted',
      winner: winnerId,
      updatedAt: new Date().toISOString()
    });

    // TODO: Call smart contract to allot winner on-chain

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'winner_allotted',
        data: updatedTender
      });
    }

    res.json({ message: 'Winner allotted successfully', tender: updatedTender });
  } catch (error) {
    console.error('Allot winner error:', error);
    res.status(500).json({ error: 'Failed to allot winner' });
  }
});

module.exports = router;

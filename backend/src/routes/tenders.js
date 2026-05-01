const express = require('express');
const { body, validationResult } = require('express-validator');
const Tender = require('../models/Tender');
const { auth, authorize } = require('../middleware/auth');
const { getContract, sendTransaction } = require('../middleware/blockchain');

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

    // Validate milestone percentages
    const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
    if (totalPercentage !== 100) {
      return res.status(400).json({ error: 'Milestone percentages must sum to 100' });
    }

    // Create tender in database
    const tenderId = `T-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const tender = new Tender({
      tenderId,
      title,
      category,
      budget,
      deadline: new Date(deadline),
      ipfsDocHash,
      status: 'open',
      createdBy: req.user._id,
      milestones: milestones.map(m => ({
        ...m,
        completed: false,
        completedAt: null
      }))
    });

    await tender.save();

    // TODO: Call smart contract to create tender on-chain
    // const contract = getContract(process.env.CONTRACT_ADDRESS_TENDER_REGISTRY, tenderRegistryABI);
    // const tx = await sendTransaction(contract, 'createTender', ...);

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'tender_created',
        data: tender
      });
    }

    res.status(201).json({
      message: 'Tender created successfully',
      tender: {
        id: tender._id,
        tenderId: tender.tenderId,
        title: tender.title,
        category: tender.category,
        budget: tender.budget,
        deadline: tender.deadline,
        ipfsDocHash: tender.ipfsDocHash,
        status: tender.status,
        milestones: tender.milestones
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

    const tenders = await Tender.find(filter)
      .populate('createdBy', 'name organization')
      .populate('winner', 'name organization')
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
    console.error('Get tenders error:', error);
    res.status(500).json({ error: 'Failed to get tenders' });
  }
});

// Get single tender
router.get('/:id', auth, async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id)
      .populate('createdBy', 'name organization')
      .populate('winner', 'name organization');

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
    const tender = await Tender.findById(req.params.id);
    
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    if (tender.status !== 'open') {
      return res.status(400).json({ error: 'Tender is not open for bidding' });
    }

    if (tender.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to close this tender' });
    }

    tender.status = 'bidding_closed';
    tender.biddingClosedAt = new Date();
    await tender.save();

    // TODO: Call smart contract to close bidding on-chain

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'bidding_closed',
        data: tender
      });
    }

    res.json({ message: 'Bidding closed successfully', tender });
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

    const tender = await Tender.findById(req.params.id);
    
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    if (tender.status !== 'bidding_closed') {
      return res.status(400).json({ error: 'Bidding must be closed first' });
    }

    if (tender.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to allot this tender' });
    }

    const { winnerId } = req.body;
    tender.status = 'allotted';
    tender.winner = winnerId;
    await tender.save();

    // TODO: Call smart contract to allot winner on-chain

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'winner_allotted',
        data: tender
      });
    }

    res.json({ message: 'Winner allotted successfully', tender });
  } catch (error) {
    console.error('Allot winner error:', error);
    res.status(500).json({ error: 'Failed to allot winner' });
  }
});

module.exports = router;

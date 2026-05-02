const express = require('express');
const { body, validationResult } = require('express-validator');
const localDB = require('../db/localDB');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Submit bid
router.post('/', auth, authorize('contractor'), [
  body('tenderId').notEmpty().withMessage('Tender ID required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('stakeAmount').isNumeric().withMessage('Stake amount must be a number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { tenderId, amount, stakeAmount, commitHash, ipfsProofHash, zkpProof } = req.body;

    const tender = localDB.findById('tenders', tenderId);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });
    if (tender.status !== 'open') return res.status(400).json({ error: 'Tender is not open for bidding' });

    // Check for duplicate bid
    const existing = localDB.findOne('bids', { tenderId, contractorId: req.user._id });
    if (existing) return res.status(400).json({ error: 'You have already submitted a bid for this tender' });

    const bid = localDB.insert('bids', {
      tenderId,
      contractorId: req.user._id,
      amount: parseFloat(amount),
      stakeAmount: parseFloat(stakeAmount),
      commitHash,
      ipfsProofHash,
      zkpVerified: !!zkpProof,
      status: 'pending',
      mlScore: null,
    });

    if (global.broadcast) {
      global.broadcast({ type: 'bid_submitted', data: bid });
    }

    res.status(201).json({ message: 'Bid submitted successfully', bid });
  } catch (error) {
    console.error('Submit bid error:', error);
    res.status(500).json({ error: 'Failed to submit bid' });
  }
});

// Get bids for a tender
router.get('/tender/:tenderId', auth, async (req, res) => {
  try {
    const bids = localDB.find('bids', { tenderId: req.params.tenderId });
    const users = localDB.find('users');
    res.json({
      bids: bids.map(b => {
        const contractor = users.find(u => u._id === b.contractorId);
        return {
          ...b,
          contractor: contractor ? { name: contractor.name, organization: contractor.organization, walletAddress: contractor.walletAddress } : null,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bids' });
  }
});

// Withdraw bid
router.delete('/:id', auth, authorize('contractor'), async (req, res) => {
  try {
    const bid = localDB.findById('bids', req.params.id);
    if (!bid) return res.status(404).json({ error: 'Bid not found' });
    if (bid.contractorId !== req.user._id) return res.status(403).json({ error: 'Not authorized' });
    if (bid.status !== 'pending') return res.status(400).json({ error: 'Cannot withdraw a bid that is not pending' });

    localDB.updateById('bids', req.params.id, { status: 'withdrawn' });
    res.json({ message: 'Bid withdrawn successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to withdraw bid' });
  }
});

module.exports = router;

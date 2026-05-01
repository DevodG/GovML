const express = require('express');
const { body, validationResult } = require('express-validator');
const Bid = require('../models/Bid');
const Tender = require('../models/Tender');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { getContract, sendTransaction, callContract } = require('../middleware/blockchain');
const axios = require('axios');

const router = express.Router();

// Submit bid
router.post('/', auth, authorize('contractor'), [
  body('tenderId').notEmpty().withMessage('Tender ID required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tenderId, amount, proposal } = req.body;

    // Check if tender exists and is open
    const tender = await Tender.findOne({ tenderId });
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    if (tender.status !== 'open') {
      return res.status(400).json({ error: 'Tender is not open for bidding' });
    }

    // Check if already bid
    const existingBid = await Bid.findOne({
      tenderId,
      contractorId: req.user._id
    });

    if (existingBid) {
      return res.status(400).json({ error: 'Already submitted bid for this tender' });
    }

    // Create bid in database
    const bid = new Bid({
      tenderId,
      contractorId: req.user._id,
      amount,
      proposal: proposal || '',
      status: 'pending',
      submittedAt: new Date()
    });

    await bid.save();

    // TODO: Call smart contract to stake MATIC
    // const contract = getContract(process.env.CONTRACT_ADDRESS_BID_ESCROW, bidEscrowABI);
    // const tx = await sendTransaction(contract, 'submitBid', tenderId, amount);

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'bid_submitted',
        data: bid
      });
    }

    res.status(201).json({
      message: 'Bid submitted successfully',
      bid: {
        id: bid._id,
        tenderId: bid.tenderId,
        amount: bid.amount,
        status: bid.status,
        submittedAt: bid.submittedAt
      }
    });
  } catch (error) {
    console.error('Submit bid error:', error);
    res.status(500).json({ error: 'Failed to submit bid' });
  }
});

// Get my bids
router.get('/my', auth, authorize('contractor'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = { contractorId: req.user._id };
    if (status) filter.status = status;

    const bids = await Bid.find(filter)
      .populate('tenderId', 'title category budget deadline')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Bid.countDocuments(filter);

    res.json({
      bids,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ error: 'Failed to get bids' });
  }
});

// Get bid score
router.get('/:id/score', auth, authorize('contractor'), async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id)
      .populate('tenderId')
      .populate('contractorId');

    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (bid.contractorId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view this bid' });
    }

    // Call ML service for scoring
    let mlScore = null;
    try {
      const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/api/v1/scoring/score`, {
        tender_id: bid.tenderId.tenderId,
        contractor_id: req.user._id,
        bid_amount: bid.amount,
        rating: req.user.reputationScore / 100,
        completion_rate: req.user.completedProjects > 0 ? 0.9 : 0.7,
        newcomer_boost: req.user.completedProjects === 0 ? 0.05 : 0.0
      });

      mlScore = mlResponse.data;
    } catch (mlError) {
      console.error('ML service error:', mlError);
      // Fallback to simple scoring
      mlScore = {
        score: 0.5,
        score_percentage: 50,
        breakdown: {
          normalized_bid: 0.5,
          rating: req.user.reputationScore / 100,
          completion_rate: 0.8,
          newcomer_boost: 0.0
        }
      };
    }

    // Calculate rank (placeholder)
    const rank = "Pending";

    res.json({
      bid_id: bid._id,
      final_score: mlScore.score,
      breakdown: mlScore.breakdown,
      weights: mlScore.weights || {
        bid_amount: 0.40,
        rating: 0.45,
        completion_rate: 0.10,
        newcomer_boost: 0.05
      },
      fraud_flag: false,
      rank: rank,
      zkp_proof_valid: true,
      ml_service_response: mlScore
    });
  } catch (error) {
    console.error('Get bid score error:', error);
    res.status(500).json({ error: 'Failed to get bid score' });
  }
});

// Withdraw bid
router.post('/:id/withdraw', auth, authorize('contractor'), async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (bid.contractorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to withdraw this bid' });
    }

    if (bid.status !== 'pending') {
      return res.status(400).json({ error: 'Can only withdraw pending bids' });
    }

    // Check if tender is still open
    const tender = await Tender.findOne({ tenderId: bid.tenderId });
    if (!tender || tender.status !== 'open') {
      return res.status(400).json({ error: 'Tender is no longer open' });
    }

    bid.status = 'withdrawn';
    bid.withdrawnAt = new Date();
    await bid.save();

    // TODO: Call smart contract to refund stake
    // const contract = getContract(process.env.CONTRACT_ADDRESS_BID_ESCROW, bidEscrowABI);
    // const tx = await sendTransaction(contract, 'withdrawBid', bid._id);

    res.json({ message: 'Bid withdrawn successfully', bid });
  } catch (error) {
    console.error('Withdraw bid error:', error);
    res.status(500).json({ error: 'Failed to withdraw bid' });
  }
});

module.exports = router;

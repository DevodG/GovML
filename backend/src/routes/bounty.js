const express = require('express');
const { body, validationResult } = require('express-validator');
const BountyHunter = require('../models/BountyHunter');
const Milestone = require('../models/Milestone');
const { auth } = require('../middleware/auth');
const { getContract, sendTransaction } = require('../middleware/blockchain');

const router = express.Router();

// Register as bounty hunter
router.post('/register', auth, [
  body('stakeAmount').isNumeric().withMessage('Stake amount must be a number'),
  body('stakeAmount').isFloat({ gt: 0 }).withMessage('Stake amount must be greater than 0')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stakeAmount } = req.body;

    // Check if already registered
    const existingHunter = await BountyHunter.findOne({ userId: req.user._id });
    if (existingHunter) {
      return res.status(400).json({ error: 'Already registered as bounty hunter' });
    }

    // Create bounty hunter
    const hunter = new BountyHunter({
      userId: req.user._id,
      stakeAmount,
      status: 'active',
      completedReviews: 0,
      reputation: 50,
      registeredAt: new Date()
    });

    await hunter.save();

    // TODO: Call smart contract to stake MATIC
    // const contract = getContract(process.env.CONTRACT_ADDRESS_BOUNTY_HUNTER, bountyHunterABI);
    // const tx = await sendTransaction(contract, 'registerHunter');

    res.status(201).json({
      message: 'Registered as bounty hunter successfully',
      hunter: {
        id: hunter._id,
        status: hunter.status,
        stakeAmount: hunter.stakeAmount,
        reputation: hunter.reputation
      }
    });
  } catch (error) {
    console.error('Register bounty hunter error:', error);
    res.status(500).json({ error: 'Failed to register as bounty hunter' });
  }
});

// Get bounty assignments
router.get('/assignments', auth, async (req, res) => {
  try {
    const hunter = await BountyHunter.findOne({ userId: req.user._id });
    
    if (!hunter) {
      return res.status(404).json({ error: 'Not registered as bounty hunter' });
    }

    // Get active assignments
    const assignments = await Milestone.find({
      status: 'submitted',
      'signatures.signer': { $ne: req.user._id }
    })
    .populate('tenderId', 'title category')
    .populate('contractorId', 'name organization')
    .sort({ submittedAt: -1 })
    .limit(10);

    res.json({
      assignments: assignments.map(m => ({
        id: m._id,
        tender: m.tenderId,
        contractor: m.contractorId,
        milestone: m.name,
        amount: m.amount,
        submittedAt: m.submittedAt,
        proofWindow: m.proofWindow
      }))
    });
  } catch (error) {
    console.error('Get bounty assignments error:', error);
    res.status(500).json({ error: 'Failed to get assignments' });
  }
});

// Commit review
router.post('/:id/commit', auth, [
  body('commitHash').notEmpty().withMessage('Commit hash required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { commitHash } = req.body;
    const { id } = req.params;

    const hunter = await BountyHunter.findOne({ userId: req.user._id });
    if (!hunter) {
      return res.status(403).json({ error: 'Not registered as bounty hunter' });
    }

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // TODO: Call smart contract to commit review
    // const contract = getContract(process.env.CONTRACT_ADDRESS_BOUNTY_HUNTER, bountyHunterABI);
    // const tx = await sendTransaction(contract, 'commitReview', id, commitHash);

    res.json({
      message: 'Review committed successfully',
      milestoneId: id,
      commitHash
    });
  } catch (error) {
    console.error('Commit review error:', error);
    res.status(500).json({ error: 'Failed to commit review' });
  }
});

// Reveal review
router.post('/:id/reveal', auth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('salt').notEmpty().withMessage('Salt required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, salt, justification } = req.body;
    const { id } = req.params;

    const hunter = await BountyHunter.findOne({ userId: req.user._id });
    if (!hunter) {
      return res.status(403).json({ error: 'Not registered as bounty hunter' });
    }

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // TODO: Call smart contract to reveal review
    // const contract = getContract(process.env.CONTRACT_ADDRESS_BOUNTY_HUNTER, bountyHunterABI);
    // const tx = await sendTransaction(contract, 'revealReview', id, rating, salt);

    // Update hunter stats
    hunter.completedReviews += 1;
    await hunter.save();

    res.json({
      message: 'Review revealed successfully',
      milestoneId: id,
      rating,
      justification
    });
  } catch (error) {
    console.error('Reveal review error:', error);
    res.status(500).json({ error: 'Failed to reveal review' });
  }
});

// Get bounty leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const hunters = await BountyHunter.find({ status: 'active' })
      .populate('userId', 'name organization')
      .sort({ reputation: -1, completedReviews: -1 })
      .limit(parseInt(limit));

    res.json({
      leaderboard: hunters.map((h, index) => ({
        rank: index + 1,
        name: h.userId.name || h.userId.organization,
        reputation: h.reputation,
        completedReviews: h.completedReviews,
        earnings: h.earnings || 0
      }))
    });
  } catch (error) {
    console.error('Get bounty leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

module.exports = router;

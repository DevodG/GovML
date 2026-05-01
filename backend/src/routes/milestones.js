const express = require('express');
const { body, validationResult } = require('express-validator');
const Milestone = require('../models/Milestone');
const Tender = require('../models/Tender');
const { auth, authorize } = require('../middleware/auth');
const { getContract, sendTransaction } = require('../middleware/blockchain');
const axios = require('axios');

const router = express.Router();

// Submit milestone
router.post('/:tenderId', auth, authorize('contractor'), [
  body('milestoneIndex').isInt({ min: 0 }).withMessage('Valid milestone index required'),
  body('ipfsHash').notEmpty().withMessage('IPFS hash required'),
  body('gpsHash').notEmpty().withMessage('GPS hash required'),
  body('evidence').isArray().withMessage('Evidence must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { milestoneIndex, ipfsHash, gpsHash, evidence, description } = req.body;
    const { tenderId } = req.params;

    // Check if tender exists and is allotted
    const tender = await Tender.findOne({ tenderId });
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    if (tender.status !== 'allotted' && tender.status !== 'in_progress') {
      return res.status(400).json({ error: 'Tender is not in progress' });
    }

    if (tender.winner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to submit milestones for this tender' });
    }

    // Check if milestone exists in tender
    if (!tender.milestones[milestoneIndex]) {
      return res.status(400).json({ error: 'Invalid milestone index' });
    }

    // Check if milestone already submitted
    const existingMilestone = await Milestone.findOne({
      tenderId,
      milestoneIndex,
      contractorId: req.user._id
    });

    if (existingMilestone) {
      return res.status(400).json({ error: 'Milestone already submitted' });
    }

    // Calculate amount based on milestone percentage
    const milestoneAmount = (tender.budget * tender.milestones[milestoneIndex].percentage) / 100;

    // Create milestone in database
    const milestone = new Milestone({
      tenderId,
      milestoneIndex,
      contractorId: req.user._id,
      name: tender.milestones[milestoneIndex].name,
      amount: milestoneAmount,
      ipfsHash,
      gpsHash,
      evidence: evidence || [],
      description: description || '',
      status: 'submitted',
      submittedAt: new Date(),
      proofWindow: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
    });

    await milestone.save();

    // TODO: Call smart contract to submit milestone
    // const contract = getContract(process.env.CONTRACT_ADDRESS_MILESTONE_ESCROW, milestoneEscrowABI);
    // const tx = await sendTransaction(contract, 'submitMilestone', tenderId, milestoneIndex, ipfsHash, gpsHash, milestoneAmount);

    // Broadcast to WebSocket clients
    if (global.broadcast) {
      global.broadcast({
        type: 'milestone_submitted',
        data: milestone
      });
    }

    res.status(201).json({
      message: 'Milestone submitted successfully',
      milestone: {
        id: milestone._id,
        name: milestone.name,
        amount: milestone.amount,
        status: milestone.status,
        submittedAt: milestone.submittedAt,
        proofWindow: milestone.proofWindow
      }
    });
  } catch (error) {
    console.error('Submit milestone error:', error);
    res.status(500).json({ error: 'Failed to submit milestone' });
  }
});

// Get milestones for tender
router.get('/:tenderId', auth, async (req, res) => {
  try {
    const { tenderId } = req.params;

    // Check if user has access
    const tender = await Tender.findOne({ tenderId });
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    const isAuthorized = 
      tender.createdBy.toString() === req.user._id.toString() ||
      tender.winner?.toString() === req.user._id.toString() ||
      req.user.role === 'auditor';

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to view milestones' });
    }

    const milestones = await Milestone.find({ tenderId })
      .populate('signatures.signer', 'name organization')
      .sort({ milestoneIndex: 1 });

    res.json({ milestones });
  } catch (error) {
    console.error('Get milestones error:', error);
    res.status(500).json({ error: 'Failed to get milestones' });
  }
});

// Sign milestone
router.post('/:id/sign', auth, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id)
      .populate('tenderId');

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Check authorization (government, auditor, or contractor)
    const isAuthorized = 
      req.user.role === 'government' ||
      req.user.role === 'auditor' ||
      milestone.contractorId.toString() === req.user._id.toString();

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to sign this milestone' });
    }

    // Check if already signed by this user
    const alreadySigned = milestone.signatures.some(
      sig => sig.signer.toString() === req.user._id.toString()
    );

    if (alreadySigned) {
      return res.status(400).json({ error: 'Already signed this milestone' });
    }

    // Add signature
    milestone.signatures.push({
      signer: req.user._id,
      signedAt: new Date(),
      comments: req.body.comments || ''
    });

    // Check if we have enough signatures (3-of-5)
    if (milestone.signatures.length >= 3) {
      milestone.status = 'approved';
      milestone.approvedAt = new Date();

      // TODO: Call smart contract to release funds
      // const contract = getContract(process.env.CONTRACT_ADDRESS_MILESTONE_ESCROW, milestoneEscrowABI);
      // const tx = await sendTransaction(contract, 'signMilestone', milestone._id);

      // Broadcast to WebSocket clients
      if (global.broadcast) {
        global.broadcast({
          type: 'milestone_approved',
          data: milestone
        });
      }
    }

    await milestone.save();

    res.json({
      message: 'Milestone signed successfully',
      milestone: {
        id: milestone._id,
        status: milestone.status,
        signaturesCount: milestone.signatures.length,
        signaturesRequired: 3
      }
    });
  } catch (error) {
    console.error('Sign milestone error:', error);
    res.status(500).json({ error: 'Failed to sign milestone' });
  }
});

// Get milestone status
router.get('/:id/status', auth, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id)
      .populate('tenderId')
      .populate('contractorId', 'name organization');

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Check authorization
    const isAuthorized = 
      milestone.tenderId.createdBy.toString() === req.user._id.toString() ||
      milestone.contractorId._id.toString() === req.user._id.toString() ||
      req.user.role === 'auditor';

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to view this milestone' });
    }

    // Calculate time remaining in proof window
    const timeRemaining = milestone.proofWindow - new Date();
    const isExpired = timeRemaining <= 0;

    res.json({
      milestone: {
        id: milestone._id,
        name: milestone.name,
        status: milestone.status,
        amount: milestone.amount,
        submittedAt: milestone.submittedAt,
        proofWindow: milestone.proofWindow,
        timeRemaining: Math.max(0, timeRemaining),
        isExpired,
        signaturesCount: milestone.signatures.length,
        signaturesRequired: 3,
        signatures: milestone.signatures.map(sig => ({
          signer: sig.signer.name || sig.signer.organization,
          signedAt: sig.signedAt,
          comments: sig.comments
        }))
      }
    });
  } catch (error) {
    console.error('Get milestone status error:', error);
    res.status(500).json({ error: 'Failed to get milestone status' });
  }
});

module.exports = router;

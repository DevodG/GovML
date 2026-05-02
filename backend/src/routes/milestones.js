const express = require('express');
const { body, validationResult } = require('express-validator');
const localDB = require('../db/localDB');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get milestones for a tender
router.get('/tender/:tenderId', auth, async (req, res) => {
  try {
    const milestones = localDB.find('milestones', { tenderId: req.params.tenderId });
    const users = localDB.find('users');
    res.json({
      milestones: milestones.map(m => {
        const contractor = users.find(u => u._id === m.contractorId);
        return { ...m, contractor: contractor ? { name: contractor.name, organization: contractor.organization } : null };
      }),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get milestones' });
  }
});

// Submit milestone proof
router.post('/:id/submit', auth, authorize('contractor'), [
  body('ipfsHash').notEmpty().withMessage('IPFS hash required'),
  body('gpsCoordinates').notEmpty().withMessage('GPS coordinates required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { ipfsHash, gpsCoordinates } = req.body;
    const milestone = localDB.findById('milestones', req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    localDB.updateById('milestones', req.params.id, {
      ipfsHash,
      gpsCoordinates,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      submittedBy: req.user._id,
    });
    res.json({ message: 'Milestone submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit milestone' });
  }
});

// Sign milestone (multi-sig)
router.post('/:id/sign', auth, async (req, res) => {
  try {
    const milestone = localDB.findById('milestones', req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    const signatures = milestone.signatures || [];
    const signerType = req.user.role;
    const idx = signatures.findIndex(s => s.signerType === signerType);
    if (idx === -1) {
      signatures.push({ signerType, signed: true, signedAt: new Date().toISOString(), signerAddress: req.user.walletAddress });
    } else {
      signatures[idx] = { ...signatures[idx], signed: true, signedAt: new Date().toISOString() };
    }

    const requiredSigners = ['government', 'contractor', 'auditor'];
    const allSigned = requiredSigners.every(role => signatures.some(s => s.signerType === role && s.signed));

    localDB.updateById('milestones', req.params.id, {
      signatures,
      status: allSigned ? 'approved' : 'submitted',
      approvedAt: allSigned ? new Date().toISOString() : undefined,
    });

    res.json({ message: 'Signed successfully', allSigned });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sign milestone' });
  }
});

module.exports = router;

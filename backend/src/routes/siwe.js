const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const User = require('../models/User');

const router = express.Router();

// In-memory nonce store (swap for Redis in production)
const nonceStore = new Map();

// GET /api/auth/nonce — issue a random nonce for SIWE
router.get('/nonce', (req, res) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  // Nonces expire after 5 minutes
  nonceStore.set(nonce, { createdAt: Date.now() });
  // Cleanup expired nonces
  for (const [key, val] of nonceStore.entries()) {
    if (Date.now() - val.createdAt > 5 * 60 * 1000) nonceStore.delete(key);
  }
  res.json({ nonce });
});

// POST /api/auth/siwe — verify SIWE signature and issue JWT
router.post('/siwe', async (req, res) => {
  try {
    const { message, signature } = req.body;

    if (!message || !signature) {
      return res.status(400).json({ error: 'message and signature are required' });
    }

    // Recover the signer address from the signed message
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse nonce from message and validate
    const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/i);
    if (!nonceMatch || !nonceStore.has(nonceMatch[1])) {
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }
    // Consume nonce (one-time use)
    nonceStore.delete(nonceMatch[1]);

    // Parse requested address from message
    const addrMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (addrMatch && addrMatch[0].toLowerCase() !== recoveredAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Signature does not match claimed address' });
    }

    const walletAddress = recoveredAddress;

    // Upsert user — find by wallet or create with default role 'public'
    let user = await User.findOne({ walletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } });

    if (!user) {
      user = new User({
        walletAddress,
        role: 'public',
        name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        isActive: true
      });
      await user.save();
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Issue JWT
    const token = jwt.sign(
      { id: user._id, walletAddress: user.walletAddress, role: user.role },
      process.env.JWT_SECRET || 'govchain-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name,
        email: user.email,
        organization: user.organization,
        reputationScore: user.reputationScore,
        completedProjects: user.completedProjects,
        kycVerified: user.kycVerified,
        aadhaarVerified: user.aadhaarVerified
      }
    });
  } catch (error) {
    console.error('SIWE auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

module.exports = router;

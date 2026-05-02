const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const localDB = require('../db/localDB');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['government', 'contractor', 'public', 'auditor']).withMessage('Invalid role'),
  body('name').notEmpty().withMessage('Name required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role, name, organization, gstNumber, walletAddress } = req.body;

    // Check if user exists
    const existingUser = localDB.findOne('users', { email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = localDB.insert('users', {
      email,
      password: hashedPassword,
      role,
      name,
      organization,
      gstNumber,
      walletAddress,
      isActive: true,
      reputationScore: 50,
      completedProjects: 0,
      kycVerified: false,
      aadhaarVerified: false
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'govchain-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = localDB.findOne('users', { email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'govchain-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        walletAddress: user.walletAddress,
        reputationScore: user.reputationScore
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Connect wallet
router.post('/connect-wallet', auth, [
  body('walletAddress').isEthereumAddress().withMessage('Valid Ethereum address required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { walletAddress } = req.body;

    // Update user wallet address
    localDB.updateById('users', req.user._id, { walletAddress });

    res.json({
      message: 'Wallet connected successfully',
      walletAddress
    });
  } catch (error) {
    console.error('Wallet connection error:', error);
    res.status(500).json({ error: 'Wallet connection failed' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        name: req.user.name,
        walletAddress: req.user.walletAddress,
        organization: req.user.organization,
        reputationScore: req.user.reputationScore,
        completedProjects: req.user.completedProjects,
        kycVerified: req.user.kycVerified,
        aadhaarVerified: req.user.aadhaarVerified
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Wallet Login — find or create user by wallet address + role (demo/Web3 mode)
router.post('/wallet-login', [
  body('walletAddress').notEmpty().withMessage('Wallet address required'),
  body('role').isIn(['government', 'contractor', 'public', 'auditor']).withMessage('Invalid role'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { walletAddress, role } = req.body;
    const normalizedWallet = walletAddress.toLowerCase();

    // Look for existing user with this wallet
    let user = localDB.findOne('users', { walletAddress: normalizedWallet });

    if (!user) {
      // Auto-create user for this wallet + role
      const roleNames = {
        government: 'Government Official',
        contractor: 'Contractor',
        auditor: 'Auditor',
        public: 'Citizen',
      };
      const hashedPassword = await bcrypt.hash('wallet-auto-' + Date.now(), 8);
      user = localDB.insert('users', {
        email: `${normalizedWallet.substring(2, 8)}@wallet.govchain`,
        password: hashedPassword,
        role,
        name: roleNames[role] || role,
        organization: role === 'government' ? 'Ministry of Infrastructure' : undefined,
        walletAddress: normalizedWallet,
        isActive: true,
        reputationScore: 50,
        completedProjects: 0,
        kycVerified: false,
        aadhaarVerified: false,
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'govchain-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Wallet login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        walletAddress: user.walletAddress,
        reputationScore: user.reputationScore,
      },
    });
  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({ error: 'Wallet login failed' });
  }
});

module.exports = router;

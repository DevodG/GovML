const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'govchain-secret-key');

    // Support both legacy (id) and SIWE (walletAddress) tokens
    let user;
    if (decoded.id) {
      user = await User.findById(decoded.id).select('-password');
    }
    if (!user && decoded.walletAddress) {
      user = await User.findOne({
        walletAddress: { $regex: new RegExp(`^${decoded.walletAddress}$`, 'i') }
      }).select('-password');
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `Role ${req.user.role} is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = { auth, authorize };

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['government', 'contractor', 'public', 'auditor'],
    required: true
  },
  walletAddress: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true
  },
  organization: {
    type: String,
    required: function() {
      return this.role === 'government' || this.role === 'contractor';
    }
  },
  gstNumber: {
    type: String,
    required: function() {
      return this.role === 'contractor';
    }
  },
  aadhaarVerified: {
    type: Boolean,
    default: false
  },
  kycVerified: {
    type: Boolean,
    default: false
  },
  reputationScore: {
    type: Number,
    default: 60,
    min: 0,
    max: 100
  },
  completedProjects: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);

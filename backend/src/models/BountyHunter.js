const mongoose = require('mongoose');

const bountyHunterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  stakeAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  completedReviews: {
    type: Number,
    default: 0
  },
  reputation: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  earnings: {
    type: Number,
    default: 0
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
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
bountyHunterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
bountyHunterSchema.index({ userId: 1 }, { unique: true });
bountyHunterSchema.index({ status: 1 });
bountyHunterSchema.index({ reputation: -1 });

module.exports = mongoose.model('BountyHunter', bountyHunterSchema);

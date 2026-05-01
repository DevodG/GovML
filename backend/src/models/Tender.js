const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema({
  tenderId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['infrastructure', 'technology', 'healthcare', 'education', 'transportation', 'other']
  },
  budget: {
    type: Number,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  ipfsDocHash: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'bidding_closed', 'allotted', 'in_progress', 'completed', 'cancelled'],
    default: 'open'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  milestones: [{
    name: String,
    percentage: Number,
    daysToComplete: Number,
    completed: Boolean,
    completedAt: Date
  }],
  blockchainTxHash: {
    type: String
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
tenderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
tenderSchema.index({ status: 1, deadline: 1 });
tenderSchema.index({ category: 1 });
tenderSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Tender', tenderSchema);

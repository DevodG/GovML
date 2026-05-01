const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  tenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tender',
    required: true
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  proposal: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'won', 'lost', 'withdrawn', 'refunded'],
    default: 'pending'
  },
  mlScore: {
    type: Number,
    default: 0
  },
  fraudFlag: {
    type: Boolean,
    default: false
  },
  blockchainTxHash: {
    type: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  withdrawnAt: {
    type: Date
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
bidSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
bidSchema.index({ tenderId: 1, contractorId: 1 }, { unique: true });
bidSchema.index({ contractorId: 1 });
bidSchema.index({ status: 1 });

module.exports = mongoose.model('Bid', bidSchema);

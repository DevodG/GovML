const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  tenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tender',
    required: true
  },
  milestoneIndex: {
    type: Number,
    required: true
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  ipfsHash: {
    type: String,
    required: true
  },
  gpsHash: {
    type: String,
    required: true
  },
  evidence: [{
    type: String // IPFS hashes of evidence files
  }],
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['submitted', 'approved', 'rejected', 'expired'],
    default: 'submitted'
  },
  signatures: [{
    signer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signedAt: {
      type: Date,
      default: Date.now
    },
    comments: {
      type: String,
      default: ''
    }
  }],
  blockchainTxHash: {
    type: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  proofWindow: {
    type: Date,
    required: true
  },
  approvedAt: {
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
milestoneSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
milestoneSchema.index({ tenderId: 1, milestoneIndex: 1 }, { unique: true });
milestoneSchema.index({ contractorId: 1 });
milestoneSchema.index({ status: 1 });

module.exports = mongoose.model('Milestone', milestoneSchema);

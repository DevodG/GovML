const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['anomaly', 'review', 'flag', 'compliance'],
    required: true
  },
  tenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tender'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entityType'
  },
  entityType: {
    type: String,
    enum: ['tender', 'bid', 'milestone', 'contractor']
  },
  anomalyType: {
    type: String
  },
  severity: {
    type: Number,
    min: 1,
    max: 10
  },
  description: {
    type: String,
    required: true
  },
  fraudProbability: {
    type: Number,
    min: 0,
    max: 1
  },
  anomalyScore: {
    type: Number
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'resolved'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewComments: {
    type: String
  },
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
auditLogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
auditLogSchema.index({ type: 1, status: 1 });
auditLogSchema.index({ severity: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

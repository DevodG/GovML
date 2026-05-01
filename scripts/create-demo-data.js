/**
 * GovChain Demo Data Generator
 * Creates sample data for testing and demonstration
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../backend/src/models/User');
const Tender = require('../backend/src/models/Tender');
const Bid = require('../backend/src/models/Bid');
const Milestone = require('../backend/src/models/Milestone');
const AuditLog = require('../backend/src/models/AuditLog');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/govchain', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Demo data
const demoUsers = [
  {
    email: 'government@govchain.com',
    password: 'password123',
    role: 'government',
    name: 'Government Authority',
    organization: 'Ministry of Infrastructure',
    reputationScore: 100,
    completedProjects: 50
  },
  {
    email: 'auditor@govchain.com',
    password: 'password123',
    role: 'auditor',
    name: 'Independent Auditor',
    organization: 'Audit Bureau',
    reputationScore: 95,
    completedProjects: 100
  },
  {
    email: 'contractor1@govchain.com',
    password: 'password123',
    role: 'contractor',
    name: 'BuildCorp Construction',
    organization: 'BuildCorp Ltd',
    gstNumber: '29ABCDE1234F1Z5',
    reputationScore: 85,
    completedProjects: 25,
    kycVerified: true
  },
  {
    email: 'contractor2@govchain.com',
    password: 'password123',
    role: 'contractor',
    name: 'TechSolutions Infra',
    organization: 'TechSolutions Pvt Ltd',
    gstNumber: '29FGHIJ5678K2L9',
    reputationScore: 78,
    completedProjects: 18,
    kycVerified: true
  },
  {
    email: 'contractor3@govchain.com',
    password: 'password123',
    role: 'contractor',
    name: 'Prime Contractors',
    organization: 'Prime Contractors Inc',
    gstNumber: '29LMNOP9012M3N7',
    reputationScore: 92,
    completedProjects: 35,
    kycVerified: true
  }
];

const demoTenders = [
  {
    title: 'NH-48 Highway Rehabilitation - Phase 1',
    category: 'infrastructure',
    budget: 42000000,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ipfsDocHash: 'QmXyz123HighwayRehab',
    milestones: [
      { name: 'Site Survey & Planning', percentage: 15, daysToComplete: 30 },
      { name: 'Foundation Work', percentage: 35, daysToComplete: 60 },
      { name: 'Road Surface Laying', percentage: 40, daysToComplete: 90 },
      { name: 'Final Inspection', percentage: 10, daysToComplete: 15 }
    ]
  },
  {
    title: 'Smart City Digital Infrastructure',
    category: 'technology',
    budget: 25000000,
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    ipfsDocHash: 'QmAbc456SmartCity',
    milestones: [
      { name: 'Network Design', percentage: 20, daysToComplete: 45 },
      { name: 'Hardware Installation', percentage: 50, daysToComplete: 90 },
      { name: 'Software Integration', percentage: 30, daysToComplete: 60 }
    ]
  },
  {
    title: 'District Hospital Modernization',
    category: 'healthcare',
    budget: 35000000,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    ipfsDocHash: 'QmDef789Hospital',
    milestones: [
      { name: 'Structural Assessment', percentage: 10, daysToComplete: 30 },
      { name: 'Medical Equipment Setup', percentage: 40, daysToComplete: 90 },
      { name: 'IT Infrastructure', percentage: 25, daysToComplete: 60 },
      { name: 'Final Commissioning', percentage: 25, daysToComplete: 45 }
    ]
  }
];

async function createDemoData() {
  try {
    console.log('🎨 Creating GovChain Demo Data');
    console.log('================================');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Tender.deleteMany({});
    await Bid.deleteMany({});
    await Milestone.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('   ✅ Existing data cleared');

    // Create users
    console.log('👥 Creating demo users...');
    const createdUsers = {};
    for (const userData of demoUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers[user.role] = user;
      console.log(`   ✅ Created ${user.role}: ${user.email}`);
    }

    // Create tenders
    console.log('📋 Creating demo tenders...');
    const createdTenders = [];
    for (const tenderData of demoTenders) {
      const tender = new Tender({
        tenderId: `T-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...tenderData,
        status: 'open',
        createdBy: createdUsers['government']._id
      });
      await tender.save();
      createdTenders.push(tender);
      console.log(`   ✅ Created tender: ${tender.title}`);
    }

    // Create bids for first tender
    console.log('💰 Creating demo bids...');
    const contractors = ['contractor1', 'contractor2', 'contractor3'];
    const firstTender = createdTenders[0];
    
    for (let i = 0; i < contractors.length; i++) {
      const contractor = createdUsers[contractors[i]];
      const bid = new Bid({
        tenderId: firstTender._id,
        contractorId: contractor._id,
        amount: firstTender.budget * (0.8 + (i * 0.1)), // Varying amounts
        proposal: `Comprehensive proposal for ${firstTender.title}`,
        status: 'pending',
        mlScore: 0.7 + (i * 0.1),
        fraudFlag: false
      });
      await bid.save();
      console.log(`   ✅ Created bid from ${contractor.name}: ₹${(bid.amount / 100000).toFixed(2)}L`);
    }

    // Create sample audit logs
    console.log('📝 Creating demo audit logs...');
    const auditLog = new AuditLog({
      type: 'anomaly',
      tenderId: firstTender._id,
      entityType: 'bid',
      anomalyType: 'price_deviation',
      severity: 3,
      description: 'Bid amount slightly above category median',
      fraudProbability: 0.25,
      anomalyScore: -0.5,
      status: 'pending',
      createdBy: createdUsers['auditor']._id
    });
    await auditLog.save();
    console.log('   ✅ Created sample audit log');

    console.log('');
    console.log('✅ Demo Data Creation Complete!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Users: ${Object.keys(createdUsers).length}`);
    console.log(`   - Tenders: ${createdTenders.length}`);
    console.log(`   - Bids: ${contractors.length}`);
    console.log(`   - Audit Logs: 1`);
    console.log('');
    console.log('🔑 Test Credentials:');
    console.log('   Government: government@govchain.com / password123');
    console.log('   Auditor: auditor@govchain.com / password123');
    console.log('   Contractor 1: contractor1@govchain.com / password123');
    console.log('   Contractor 2: contractor2@govchain.com / password123');
    console.log('   Contractor 3: contractor3@govchain.com / password123');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
createDemoData();

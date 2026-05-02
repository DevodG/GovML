const localDB = require('./localDB');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  console.log('🌱 Seeding local database...');

  // Check if data already exists
  const existingUsers = localDB.find('users');
  if (existingUsers.length > 0) {
    console.log('✅ Database already seeded');
    return;
  }

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const govUser = localDB.insert('users', {
    email: 'gov@example.com',
    password: hashedPassword,
    name: 'Government Officer',
    role: 'government',
    organization: 'Ministry of Infrastructure',
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    reputationScore: 100,
    kycVerified: true
  });

  const contractor1 = localDB.insert('users', {
    email: 'contractor@example.com',
    password: hashedPassword,
    name: 'BuildTech Solutions',
    role: 'contractor',
    organization: 'BuildTech Solutions Pvt Ltd',
    gstNumber: 'GST123456789',
    walletAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    reputationScore: 85,
    completedProjects: 12,
    kycVerified: true,
    aadhaarVerified: true
  });

  const contractor2 = localDB.insert('users', {
    email: 'contractor2@example.com',
    password: hashedPassword,
    name: 'InfraCore Engineering',
    role: 'contractor',
    organization: 'InfraCore Engineering Ltd',
    gstNumber: 'GST987654321',
    walletAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    reputationScore: 92,
    completedProjects: 18,
    kycVerified: true,
    aadhaarVerified: true
  });

  const contractor3 = localDB.insert('users', {
    email: 'contractor3@example.com',
    password: hashedPassword,
    name: 'SmartBuild Contractors',
    role: 'contractor',
    organization: 'SmartBuild Contractors',
    gstNumber: 'GST456789123',
    walletAddress: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
    reputationScore: 78,
    completedProjects: 8,
    kycVerified: true,
    aadhaarVerified: false
  });

  const auditor = localDB.insert('users', {
    email: 'auditor@example.com',
    password: hashedPassword,
    name: 'Audit Inspector',
    role: 'auditor',
    organization: 'National Audit Office',
    walletAddress: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    reputationScore: 100,
    kycVerified: true
  });

  // Create tenders
  const states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Delhi', 'Uttar Pradesh', 'Rajasthan', 'West Bengal'];
  const categories = ['infrastructure', 'healthcare', 'education', 'transport', 'energy'];
  
  // Realistic tender data
  const tenderTemplates = [
    // Infrastructure - Roads
    { title: 'NH-48 Mumbai-Pune Expressway Widening Project', category: 'infrastructure', state: 'Maharashtra', budget: 45000000, desc: 'Widening of 95km stretch from 4-lane to 6-lane with smart traffic management system' },
    { title: 'Bangalore Outer Ring Road Phase 3 Construction', category: 'infrastructure', state: 'Karnataka', budget: 38000000, desc: 'Construction of 32km elevated expressway with 8 interchanges and toll plazas' },
    { title: 'Chennai-Trichy National Highway Upgrade', category: 'transport', state: 'Tamil Nadu', budget: 28000000, desc: 'Upgrade to 4-lane highway with service roads and 12 bypasses' },
    { title: 'Delhi-Meerut Expressway Extension', category: 'transport', state: 'Delhi', budget: 52000000, desc: '14-lane expressway with dedicated freight corridor and smart lighting' },
    { title: 'Ahmedabad-Vadodara Expressway Maintenance', category: 'infrastructure', state: 'Gujarat', budget: 15000000, desc: 'Annual maintenance and resurfacing of 93km expressway stretch' },
    
    // Infrastructure - Bridges
    { title: 'Signature Bridge Construction over Yamuna River', category: 'infrastructure', state: 'Delhi', budget: 65000000, desc: 'Cable-stayed bridge with 154m pylon and 8-lane carriageway' },
    { title: 'Bandra-Worli Sea Link Extension Project', category: 'infrastructure', state: 'Maharashtra', budget: 78000000, desc: 'Extension of sea link by 5.6km with 8-lane bridge and tunnel' },
    { title: 'Howrah Bridge Restoration and Strengthening', category: 'infrastructure', state: 'West Bengal', budget: 22000000, desc: 'Structural restoration of heritage cantilever bridge with modern safety systems' },
    { title: 'Pamban Rail-Road Bridge Replacement', category: 'transport', state: 'Tamil Nadu', budget: 42000000, desc: 'New vertical lift bridge replacing 108-year-old structure' },
    { title: 'Atal Setu Mumbai Trans Harbour Link', category: 'infrastructure', state: 'Maharashtra', budget: 95000000, desc: '21.8km sea bridge connecting Mumbai to Navi Mumbai with 6 lanes' },
    
    // Transport - Metro & Rail
    { title: 'Bangalore Metro Purple Line Extension', category: 'transport', state: 'Karnataka', budget: 58000000, desc: '18.5km underground metro with 13 stations and depot' },
    { title: 'Delhi Metro Phase 4 - Aerocity to Tughlakabad', category: 'transport', state: 'Delhi', budget: 72000000, desc: '28.92km corridor with 24 stations including interchange facilities' },
    { title: 'Mumbai Metro Line 3 Underground Construction', category: 'transport', state: 'Maharashtra', budget: 88000000, desc: '33.5km fully underground metro with 27 stations' },
    { title: 'Chennai Metro Phase 2 Corridor 3', category: 'transport', state: 'Tamil Nadu', budget: 45000000, desc: '45.8km elevated and underground metro with 50 stations' },
    { title: 'Ahmedabad Metro Phase 2 Extension', category: 'transport', state: 'Gujarat', budget: 35000000, desc: '28.25km metro extension with 20 new stations' },
    
    // Healthcare
    { title: 'AIIMS Satellite Center Construction - Nagpur', category: 'healthcare', state: 'Maharashtra', budget: 32000000, desc: '750-bed super specialty hospital with trauma center and research facility' },
    { title: 'District Hospital Modernization - Mysore', category: 'healthcare', state: 'Karnataka', budget: 18000000, desc: 'Upgrade of 500-bed hospital with modern ICU and diagnostic center' },
    { title: 'Primary Health Center Network - Rural TN', category: 'healthcare', state: 'Tamil Nadu', budget: 12000000, desc: 'Construction of 45 PHCs with telemedicine facilities' },
    { title: 'COVID Care Center Conversion - Delhi', category: 'healthcare', state: 'Delhi', budget: 8000000, desc: 'Converting temporary facility to permanent 300-bed infectious disease hospital' },
    
    // Education
    { title: 'IIT Campus Infrastructure Development', category: 'education', state: 'Maharashtra', budget: 42000000, desc: 'New academic blocks, hostels, and research labs for 5000 students' },
    { title: 'Smart Classroom Initiative - 500 Schools', category: 'education', state: 'Karnataka', budget: 15000000, desc: 'Digital infrastructure and smart boards for government schools' },
    { title: 'University Sports Complex Construction', category: 'education', state: 'Tamil Nadu', budget: 22000000, desc: 'Olympic-standard sports facilities with indoor stadium' },
    { title: 'Skill Development Centers - 25 Districts', category: 'education', state: 'Uttar Pradesh', budget: 18000000, desc: 'Vocational training centers with modern equipment' },
    
    // Energy
    { title: 'Solar Power Plant - 500 MW Capacity', category: 'energy', state: 'Rajasthan', budget: 68000000, desc: 'Grid-connected solar farm with battery storage system' },
    { title: 'Wind Energy Project - Coastal Region', category: 'energy', state: 'Gujarat', budget: 55000000, desc: '300 MW wind farm with 150 turbines and transmission infrastructure' },
    { title: 'Smart Grid Implementation - Urban Areas', category: 'energy', state: 'Karnataka', budget: 28000000, desc: 'Advanced metering and distribution automation for 2 million consumers' },
    { title: 'Hydroelectric Plant Modernization', category: 'energy', state: 'Uttarakhand', budget: 38000000, desc: 'Upgrade of 250 MW plant with new turbines and control systems' },
  ];

  const tenders = [];
  const now = Date.now();
  
  tenderTemplates.forEach((template, i) => {
    const daysOffset = Math.floor(Math.random() * 180) - 90; // -90 to +90 days
    const createdDate = new Date(now + daysOffset * 24 * 60 * 60 * 1000);
    const deadlineDays = Math.floor(Math.random() * 90) + 30; // 30-120 days from creation
    const deadline = new Date(createdDate.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
    
    // Determine status based on dates
    let status = 'open';
    let utilised = 0;
    
    if (deadline < new Date()) {
      status = Math.random() > 0.3 ? 'completed' : 'in_progress';
    } else if (Math.random() > 0.7) {
      status = 'in_progress';
    }
    
    if (status === 'completed') {
      utilised = template.budget;
    } else if (status === 'in_progress') {
      utilised = Math.floor(template.budget * (0.3 + Math.random() * 0.5));
    }

    const tender = localDB.insert('tenders', {
      tenderId: `TND-2024-${String(i + 1).padStart(4, '0')}`,
      title: template.title,
      description: template.desc,
      category: template.category,
      state: template.state,
      budget: template.budget,
      utilisedAmount: utilised,
      deadline: deadline.toISOString(),
      status,
      ipfsDocHash: `Qm${Math.random().toString(36).substr(2, 44)}`,
      governmentId: govUser._id,
      createdAt: createdDate.toISOString(),
      milestones: [
        {
          name: 'Site Survey & Planning',
          percentage: 15,
          daysToComplete: 30,
          completed: status !== 'open',
          amount: Math.floor(template.budget * 0.15)
        },
        {
          name: 'Design & Approval',
          percentage: 20,
          daysToComplete: 45,
          completed: status === 'completed' || (status === 'in_progress' && Math.random() > 0.5),
          amount: Math.floor(template.budget * 0.20)
        },
        {
          name: 'Foundation & Structural Work',
          percentage: 35,
          daysToComplete: 120,
          completed: status === 'completed',
          amount: Math.floor(template.budget * 0.35)
        },
        {
          name: 'Finishing & Quality Check',
          percentage: 20,
          daysToComplete: 60,
          completed: status === 'completed',
          amount: Math.floor(template.budget * 0.20)
        },
        {
          name: 'Handover & Documentation',
          percentage: 10,
          daysToComplete: 15,
          completed: status === 'completed',
          amount: Math.floor(template.budget * 0.10)
        }
      ]
    });
    tenders.push(tender);
  });

  // Create bids for open and in_progress tenders
  const openTenders = tenders.filter(t => t.status === 'open' || t.status === 'in_progress');
  const contractors = [contractor1, contractor2, contractor3];
  
  openTenders.slice(0, 20).forEach((tender, i) => {
    // Each tender gets 2-3 bids
    const numBids = Math.floor(Math.random() * 2) + 2;
    
    for (let j = 0; j < numBids; j++) {
      const contractor = contractors[j % contractors.length];
      const bidAmount = tender.budget * (0.85 + Math.random() * 0.15); // 85-100% of budget
      const timeline = Math.floor(Math.random() * 180) + 180; // 180-360 days
      const mlScore = Math.floor(Math.random() * 25) + 70; // 70-95 score
      
      // First bid on each tender is usually won
      let bidStatus = 'pending';
      if (tender.status === 'in_progress' && j === 0) {
        bidStatus = 'won';
      } else if (tender.status === 'in_progress' && j > 0) {
        bidStatus = 'lost';
      }

      localDB.insert('bids', {
        tenderId: tender._id,
        contractorId: contractor._id,
        amount: Math.floor(bidAmount),
        timeline,
        mlScore,
        status: bidStatus,
        stakeAmount: 10000000000000000, // 0.01 ETH
        ipfsProposalHash: `Qm${Math.random().toString(36).substr(2, 44)}`,
        technicalScore: Math.floor(Math.random() * 30) + 70,
        financialScore: Math.floor(Math.random() * 30) + 70,
        experienceScore: Math.floor(Math.random() * 30) + 70,
        submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  });

  // Create bounty hunters with realistic names
  const hunterNames = [
    'Rajesh Kumar Verma',
    'Priya Sharma',
    'Amit Patel',
    'Sneha Reddy',
    'Vikram Singh',
    'Ananya Iyer',
    'Arjun Mehta',
    'Kavya Nair'
  ];
  
  for (let i = 0; i < 8; i++) {
    const reputation = Math.floor(Math.random() * 40) + 60; // 60-100
    const verifications = Math.floor(Math.random() * 50) + 10; // 10-60
    const earnings = Math.floor(Math.random() * 8000000) + 1000000; // 1-9 million wei (0.001-0.009 ETH)
    
    localDB.insert('bountyHunters', {
      walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      name: hunterNames[i],
      stakeAmount: 10000000000000000, // 0.01 ETH in wei
      reputationScore: reputation,
      totalEarnings: earnings,
      verificationsCount: verifications,
      successRate: Math.floor(Math.random() * 15) + 85, // 85-100%
      registeredAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log(`   Users: ${localDB.count('users')}`);
  console.log(`   Tenders: ${localDB.count('tenders')} (Roads, Bridges, Metro, Healthcare, Education)`);
  console.log(`   Bids: ${localDB.count('bids')}`);
  console.log(`   Bounty Hunters: ${localDB.count('bountyHunters')}`);
}

module.exports = { seedDatabase };

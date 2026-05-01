require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const http = require('http');

// Import routes
const authRoutes = require('./routes/auth');
const siweRoutes = require('./routes/siwe');
const tenderRoutes = require('./routes/tenders');
const bidRoutes = require('./routes/bids');
const milestoneRoutes = require('./routes/milestones');
const bountyRoutes = require('./routes/bounty');
const auditorRoutes = require('./routes/auditor');
const publicRoutes = require('./routes/public');
const govRoutes = require('./routes/gov');
const contractorRoutes = require('./routes/contractor');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const blockchainMiddleware = require('./middleware/blockchain');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Blockchain middleware
app.use(blockchainMiddleware);

// Health check
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'up' : 'down',
      blockchain: req.blockchain ? 'up' : 'down',
      mlService: process.env.ML_SERVICE_URL ? 'configured' : 'not configured'
    }
  };
  res.json(health);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', siweRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/bounty', bountyRoutes);
app.use('/api/auditor', auditorRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/gov', govRoutes);
app.use('/api/contractor', contractorRoutes);

// Error handling
app.use(errorHandler);

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  
  ws.on('message', (message) => {
    console.log('Received message:', message.toString());
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Broadcast function for real-time updates
global.broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/govchain', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`GovChain Backend API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Demo Mode: ${process.env.DEMO_MODE === 'true' ? 'enabled' : 'disabled'}`);
  console.log(`ML Service: ${process.env.ML_SERVICE_URL || 'not configured'}`);
});

module.exports = app;

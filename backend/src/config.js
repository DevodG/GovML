/**
 * GovChain Backend — Configuration
 * Loads env vars and exports a clean config object.
 */
require("dotenv").config();

const config = {
  // Ethereum
  rpcUrl: process.env.ETHEREUM_RPC_URL || "https://rpc.sepolia.org",
  oraclePrivateKey: process.env.ORACLE_PRIVATE_KEY || "",

  // Contract addresses
  contracts: {
    tenderRegistry:   process.env.CONTRACT_TENDER_REGISTRY   || "",
    bidEscrow:        process.env.CONTRACT_BID_ESCROW        || "",
    milestoneEscrow:  process.env.CONTRACT_MILESTONE_ESCROW  || "",
    scoringOracle:    process.env.CONTRACT_SCORING_ORACLE    || "",
    anomalyOracle:    process.env.CONTRACT_ANOMALY_ORACLE    || "",
    bountyHunter:     process.env.CONTRACT_BOUNTY_HUNTER     || "",
    ratingLedger:     process.env.CONTRACT_RATING_LEDGER     || "",
  },

  // Auth
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  apiKey:    process.env.API_KEY    || "dev-api-key",

  // Server
  port:        parseInt(process.env.PORT) || 4000,
  nodeEnv:     process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8000",

  // Rate limiting
  rateLimitWindowMs:   parseInt(process.env.RATE_LIMIT_WINDOW_MS)   || 900000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
};

module.exports = config;

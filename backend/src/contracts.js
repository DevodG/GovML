/**
 * GovChain Backend — Contract Instance Factory
 * Creates ethers.js v6 Contract instances for all 7 contracts.
 * 
 * Read-only calls use the provider directly.
 * Write calls use the ORACLE_ROLE signer wallet.
 */
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const config = require("./config");

// ─── Provider & Signer ───────────────────────────────────────
const provider = new ethers.JsonRpcProvider(config.rpcUrl);

let oracleSigner = null;
if (config.oraclePrivateKey) {
  oracleSigner = new ethers.Wallet(config.oraclePrivateKey, provider);
}

// ─── ABI Loader ──────────────────────────────────────────────
function loadAbi(name) {
  const abiPath = path.resolve(__dirname, `./abi/${name}.json`);
  if (!fs.existsSync(abiPath)) {
    console.warn(`⚠ ABI not found for ${name}. Run: npm run export-abi`);
    return [];
  }
  return JSON.parse(fs.readFileSync(abiPath, "utf8"));
}

// ─── Contract Factory ────────────────────────────────────────
function createContract(name, address, signer = null) {
  if (!address) {
    console.warn(`⚠ No address for ${name}. Set CONTRACT_${name.toUpperCase()} in .env`);
    return null;
  }
  const abi = loadAbi(name);
  return new ethers.Contract(address, abi, signer || provider);
}

// ─── Contract Instances ──────────────────────────────────────
const contracts = {
  // Read-only instances (provider)
  tenderRegistry:  createContract("TenderRegistry",  config.contracts.tenderRegistry),
  bidEscrow:       createContract("BidEscrow",       config.contracts.bidEscrow),
  milestoneEscrow: createContract("MilestoneEscrow", config.contracts.milestoneEscrow),
  scoringOracle:   createContract("ScoringOracle",   config.contracts.scoringOracle),
  anomalyOracle:   createContract("AnomalyOracle",   config.contracts.anomalyOracle),
  bountyHunter:    createContract("BountyHunter",    config.contracts.bountyHunter),
  ratingLedger:    createContract("RatingLedger",    config.contracts.ratingLedger),

  // Write instances (oracle signer) — for ML relay endpoints
  oracleSigned: {
    tenderRegistry: createContract("TenderRegistry", config.contracts.tenderRegistry, oracleSigner),
    scoringOracle:  createContract("ScoringOracle",  config.contracts.scoringOracle,  oracleSigner),
    anomalyOracle:  createContract("AnomalyOracle",  config.contracts.anomalyOracle,  oracleSigner),
    ratingLedger:   createContract("RatingLedger",   config.contracts.ratingLedger,   oracleSigner),
  },
};

module.exports = { provider, oracleSigner, contracts };

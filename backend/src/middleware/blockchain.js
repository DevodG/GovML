const { ethers } = require('ethers');

// Initialize blockchain provider (Ethereum Sepolia Testnet)
let provider = null;
let signer = null;

try {
  if (process.env.ETHEREUM_RPC_URL) {
    provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    
    if (process.env.PRIVATE_KEY) {
      signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      console.log('Blockchain provider initialized with signer (Ethereum Sepolia)');
    } else {
      console.log('Blockchain provider initialized (read-only, Ethereum Sepolia)');
    }
  } else {
    console.warn('ETHEREUM_RPC_URL not set, blockchain features disabled');
  }
} catch (error) {
  console.error('Failed to initialize blockchain provider:', error);
}

// Middleware to add blockchain to request
const blockchainMiddleware = (req, res, next) => {
  req.blockchain = {
    provider,
    signer,
    isConnected: provider !== null,
    network: provider ? provider.getNetwork() : null
  };
  next();
};

// Helper functions for blockchain interactions
const getContract = (address, abi) => {
  if (!provider) {
    throw new Error('Blockchain provider not initialized');
  }
  return new ethers.Contract(address, abi, signer || provider);
};

const sendTransaction = async (contract, method, ...args) => {
  if (!signer) {
    throw new Error('Blockchain signer not initialized');
  }
  
  try {
    const tx = await contract[method](...args);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
};

const callContract = async (contract, method, ...args) => {
  if (!provider) {
    throw new Error('Blockchain provider not initialized');
  }
  
  try {
    const result = await contract[method](...args);
    return result;
  } catch (error) {
    console.error('Contract call failed:', error);
    throw error;
  }
};

module.exports = blockchainMiddleware;
module.exports.getContract = getContract;
module.exports.sendTransaction = sendTransaction;
module.exports.callContract = callContract;

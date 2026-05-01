# GovChain Frontend Web3 Architecture

The current frontend implementation relies on traditional Web2 paradigms (username/password login, MongoDB-based roles). For a trustless, anti-corruption procurement system, the frontend must be deeply integrated with the blockchain as the source of truth.

This document outlines the proposed ground-up architecture for the GovChain frontend to fully utilize the smart contracts and backend infrastructure.

---

## 1. Authentication: Sign-In with Ethereum (SIWE)

**The Problem**: Centralized login systems are vulnerable to database breaches and admin manipulation.
**The Web3 Solution**: Passwords are eliminated. The user's cryptographic wallet is their identity.

- **Workflow**:
  1. User clicks **"Connect Wallet"** (MetaMask, WalletConnect).
  2. Frontend requests the user to sign a standardized message (EIP-4361: SIWE) to prove ownership of the address.
  3. Frontend sends the signature to the Backend (`/api/auth/verify`).
  4. Backend verifies the signature and issues a session JWT.
  5. *Optional*: Off-chain metadata (like email for notifications or organization name) is linked to the wallet address in the backend, but the wallet remains the sole authenticator.

## 2. Authorization: On-Chain Role-Based Access Control (RBAC)

Instead of the backend database dictating who is a Government Official or an Auditor, the frontend must read roles directly from the smart contracts.

- **Dynamic Routing**:
  - The frontend uses `wagmi` and `viem` to query the blockchain upon connection.
  - `TenderRegistry.hasRole(GOVT_ROLE, address)` → Grants access to Government Portal.
  - `AnomalyOracle.hasRole(AUDITOR_ROLE, address)` → Grants access to Auditor Portal.
- **Graceful Fallbacks**: If a wallet connects without a privileged role, they default to the **Public Portal** where they can view transparent data or choose to stake Sepolia ETH to become a Bounty Hunter.

## 3. Contractor Flow: ZKP KYC Integration

Contractors cannot simply register with an email; they must cryptographically prove they are legitimate registered entities without exposing sensitive data (like Aadhaar or GST details) on the public ledger.

- **Workflow**:
  1. Contractor connects wallet. Frontend checks `ZKPController.isKYCVerified(address)`.
  2. If `false`, the contractor is locked out of bidding and redirected to the **KYC Portal**.
  3. Contractor inputs Aadhaar and GST details locally in the browser.
  4. Frontend uses `snarkjs` (WebAssembly) to generate a Groth16 Zero-Knowledge Proof **entirely client-side**.
  5. Contractor submits the generated proof via MetaMask to `ZKPController.verifyKYC()`.
  6. Once the transaction confirms, the smart contract permanently flags the wallet as verified.

## 4. Secure Bidding: Commit-Reveal Pattern

The backend API must *never* hold the plaintext bid amount before the deadline, and the blockchain shouldn't either (to prevent front-running). The newly merged `ratik` branch implemented a Commit-Reveal pattern in `BidEscrow.sol`.

- **Phase 1: Commit (Bidding Window)**
  - Contractor enters `amount` and a secret `salt` in the UI.
  - Frontend computes `hash = keccak256(amount, salt)`.
  - Frontend prompts MetaMask to execute `BidEscrow.commitBid(tender_id, hash)`. The exact bid amount remains a secret.
- **Phase 2: Reveal (Reveal Window)**
  - Once the bidding phase closes, the frontend alerts the contractor.
  - Contractor clicks "Reveal Bid".
  - Frontend prompts MetaMask to execute `BidEscrow.submitBid(tender_id, amount, salt)`.
  - The contract verifies the hash matches the commitment and records the actual bid.

## 5. Data Architecture: Hybrid On-Chain / Off-Chain

To keep gas costs feasible while maintaining transparency, the frontend orchestrates a hybrid data flow:

| Entity | On-Chain (Smart Contracts) | Off-Chain (Backend / IPFS) |
|--------|----------------------------|----------------------------|
| **Tenders** | ID, Status, Deadlines, Hashes | Title, Description, PDF specs |
| **Bids** | Hashes, Stake Amount, ML Score | Technical blueprints, presentations |
| **Anomalies** | Flag Status, Multi-sig approvals | AI narration, detailed risk reports |

- **Example (Creating a Tender)**:
  1. Gov Official fills out the Tender Form.
  2. Frontend sends text/files to the Backend.
  3. Backend pins data to IPFS and returns the `CID` (Content ID).
  4. Frontend prompts the Gov Official's wallet to call `TenderRegistry.createTender(CID)`.

## 6. Suggested Frontend Tech Stack Adjustments

To implement this architecture effectively:
- **`wagmi` + `viem`**: Replace manual ethers.js/web3.js calls. Excellent for React integration and reading on-chain state (like roles and ZKP status).
- **`snarkjs`**: Added to the frontend bundle for client-side Zero-Knowledge Proof generation.
- **Remove Auth Store**: Replace the current Zustand `authStore` with Wagmi's `useAccount()` and `useSignMessage()`. The "current user" is simply the connected wallet.

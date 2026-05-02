/**
 * GovChain Bid Anomaly Detection - Test Suite
 * 
 * 10 test cases simulating real bid submissions:
 *   - TC01-TC08: PASS (legitimate bids)
 *   - TC09:      FAIL - Cartel Bid Collusion (bids suspiciously close, same IP block)
 *   - TC10:      FAIL - Shill Bid / Price Dumping (bid 72% below market floor)
 *
 * Run:  node test/bid-anomaly.test.cjs
 */

const BASE = 'http://localhost:3000/api';

// ─── ANSI helpers ──────────────────────────────────────────────────────────
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM    = (s) => `\x1b[2m${s}\x1b[0m`;

// ─── Anomaly detection engine (mirrors what the auditor ML pipeline does) ──
const ANOMALY_THRESHOLDS = {
  MIN_STAKE_RATIO: 0.05,       // stake must be >= 5% of bid amount
  MAX_BID_DEVIATION: 0.65,     // bid cannot be >65% below median market price
  COLLUSION_SPREAD: 0.02,      // bids within 2% of each other from diff contractors = flag
  MAX_BIDS_PER_TENDER: 20,     // sanity cap
  MIN_BID_AMOUNT: 1000,        // floor in USD equivalent
};

function detectAnomalies(bid, context = {}) {
  const flags = [];

  // Rule 1 — Insufficient stake (skin-in-the-game check)
  const stakeRatio = bid.stakeAmount / bid.amount;
  if (stakeRatio < ANOMALY_THRESHOLDS.MIN_STAKE_RATIO) {
    flags.push({
      type: 'INSUFFICIENT_STAKE',
      severity: 7,
      detail: `Stake ratio ${(stakeRatio * 100).toFixed(2)}% < required ${ANOMALY_THRESHOLDS.MIN_STAKE_RATIO * 100}%`,
    });
  }

  // Rule 2 — Price dumping / below-floor bid
  if (context.marketMedian) {
    const deviation = (context.marketMedian - bid.amount) / context.marketMedian;
    if (deviation > ANOMALY_THRESHOLDS.MAX_BID_DEVIATION) {
      flags.push({
        type: 'PRICE_DUMPING',
        severity: 9,
        detail: `Bid ₹${bid.amount.toLocaleString()} is ${(deviation * 100).toFixed(1)}% below market median ₹${context.marketMedian.toLocaleString()}. Likely loss-leader / shill bid.`,
      });
    }
  }

  // Rule 3 — Bid collusion (multiple bids suspiciously close together)
  if (context.otherBids && context.otherBids.length > 0) {
    for (const other of context.otherBids) {
      const spread = Math.abs(bid.amount - other.amount) / Math.max(bid.amount, other.amount);
      if (spread < ANOMALY_THRESHOLDS.COLLUSION_SPREAD && bid.contractorId !== other.contractorId) {
        flags.push({
          type: 'BID_COLLUSION',
          severity: 8,
          detail: `Bid ₹${bid.amount.toLocaleString()} and ₹${other.amount.toLocaleString()} from different contractors differ by only ${(spread * 100).toFixed(2)}%. Cartel behaviour suspected.`,
        });
        break;
      }
    }
  }

  // Rule 4 — Missing ZKP proof for high-value tenders
  if (context.tenderBudget > 10_000_000 && !bid.zkpVerified) {
    flags.push({
      type: 'MISSING_ZKP',
      severity: 5,
      detail: `High-value tender (₹${context.tenderBudget.toLocaleString()}) requires ZKP identity verification.`,
    });
  }

  // Rule 5 — Bid below absolute floor
  if (bid.amount < ANOMALY_THRESHOLDS.MIN_BID_AMOUNT) {
    flags.push({
      type: 'BID_BELOW_FLOOR',
      severity: 10,
      detail: `Bid amount ₹${bid.amount} is below the absolute minimum floor of ₹${ANOMALY_THRESHOLDS.MIN_BID_AMOUNT}.`,
    });
  }

  const anomalyDetected = flags.length > 0;
  const maxSeverity = flags.reduce((max, f) => Math.max(max, f.severity), 0);

  return { anomalyDetected, flags, maxSeverity };
}

// ─── Test runner ────────────────────────────────────────────────────────────
let passed = 0, failed = 0, anomalyFailed = 0;

async function walletLogin(wallet, role) {
  const res = await fetch(`${BASE}/auth/wallet-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: wallet, role }),
  });
  const data = await res.json();
  return data.token;
}

function runTest(name, bid, context, expectAnomaly, expectAnomalyType = null) {
  const { anomalyDetected, flags, maxSeverity } = detectAnomalies(bid, context);
  const icon  = anomalyDetected ? '🚨' : '✅';
  const pass  = anomalyDetected === expectAnomaly;

  if (pass && !anomalyDetected) {
    passed++;
    console.log(`  ${GREEN('PASS')} ${icon} ${name}`);
    console.log(DIM(`       Bid ₹${bid.amount.toLocaleString()} | Stake ₹${bid.stakeAmount.toLocaleString()} | ZKP: ${bid.zkpVerified ? 'Yes' : 'No'} | No anomaly detected.`));
  } else if (pass && anomalyDetected) {
    anomalyFailed++;
    console.log(`  ${RED('ANOMALY DETECTED')} ${icon} ${name}`);
    flags.forEach(f => {
      console.log(`       ${RED('►')} [Severity ${f.severity}/10] ${BOLD(f.type)}`);
      console.log(`         ${f.detail}`);
    });
    console.log(DIM(`       → Bid would be FLAGGED and frozen until audit review.`));
  } else {
    failed++;
    console.log(`  ${YELLOW('UNEXPECTED')} ${name}`);
    console.log(`       Expected anomaly=${expectAnomaly} but got anomalyDetected=${anomalyDetected}`);
  }
  console.log();
}

// ─── TENDER CONTEXT (shared across tests) ───────────────────────────────────
const TENDER = {
  id: 'T-DEMO-NH48',
  title: 'NH-48 Highway Expansion Project',
  budget: 50_000_000,
  category: 'infrastructure',
};

// Market median (derived from historical similar tenders)
const MARKET_MEDIAN = 42_000_000;

// ─── RUN TESTS ───────────────────────────────────────────────────────────────
async function runAll() {
  console.log();
  console.log(BOLD('═══════════════════════════════════════════════════════════════'));
  console.log(BOLD('  GovChain — Bid Anomaly Detection Test Suite'));
  console.log(BOLD('  Tender: NH-48 Highway Expansion | Budget: ₹5 Cr'));
  console.log(BOLD('═══════════════════════════════════════════════════════════════'));
  console.log();

  // ── SECTION A: Legitimate Bids (Expected: PASS, no anomaly) ────────────────
  console.log(BOLD('── Section A: Legitimate Bids ──'));
  console.log();

  // TC01 — Standard competitive bid with proper stake
  runTest(
    'TC01 | Standard competitive bid (Infra Corp)',
    { amount: 43_500_000, stakeAmount: 2_200_000, zkpVerified: true, contractorId: 'C001' },
    { marketMedian: MARKET_MEDIAN, tenderBudget: TENDER.budget },
    false // expect NO anomaly
  );

  // TC02 — Slightly higher bid, still within market range
  runTest(
    'TC02 | Premium bid with strong ZKP (BuildTech Ltd)',
    { amount: 46_800_000, stakeAmount: 2_500_000, zkpVerified: true, contractorId: 'C002' },
    { marketMedian: MARKET_MEDIAN, tenderBudget: TENDER.budget },
    false
  );

  // TC03 — Conservative bid, good stake ratio
  runTest(
    'TC03 | Conservative bid (RoadMasters Pvt)',
    { amount: 41_200_000, stakeAmount: 2_100_000, zkpVerified: true, contractorId: 'C003' },
    { marketMedian: MARKET_MEDIAN, tenderBudget: TENDER.budget },
    false
  );

  // TC04 — Exactly at budget, ZKP verified
  runTest(
    'TC04 | At-budget bid with full ZKP (NationalCon)',
    { amount: 49_900_000, stakeAmount: 3_000_000, zkpVerified: true, contractorId: 'C004' },
    { marketMedian: MARKET_MEDIAN, tenderBudget: TENDER.budget },
    false
  );

  // TC05 — Competitive bid, no ZKP but low-value tender (budget < 10M context override)
  runTest(
    'TC05 | Low-value tender bid without ZKP (SmallBuild)',
    { amount: 3_500_000, stakeAmount: 200_000, zkpVerified: false, contractorId: 'C005' },
    { marketMedian: 3_200_000, tenderBudget: 4_000_000 }, // small tender
    false
  );

  // TC06 — Bid with generous stake (15% ratio — very high credibility)
  runTest(
    'TC06 | High-credibility bid with 15% stake (GovernCon)',
    { amount: 44_000_000, stakeAmount: 6_600_000, zkpVerified: true, contractorId: 'C006' },
    { marketMedian: MARKET_MEDIAN, tenderBudget: TENDER.budget },
    false
  );

  // TC07 — Just within the collusion spread threshold (3% difference — safe)
  runTest(
    'TC07 | Near-competitor bid but above collusion threshold (SafeBid)',
    { amount: 43_000_000, stakeAmount: 2_200_000, zkpVerified: true, contractorId: 'C007' },
    {
      marketMedian: MARKET_MEDIAN,
      tenderBudget: TENDER.budget,
      otherBids: [{ amount: 41_800_000, contractorId: 'C001' }], // 2.9% spread — just above threshold
    },
    false
  );

  // TC08 — Bid with minimum valid stake (exactly 5%)
  runTest(
    'TC08 | Minimum stake ratio bid (EdgeCase Ltd)',
    { amount: 40_000_000, stakeAmount: 2_000_000, zkpVerified: true, contractorId: 'C008' },  // exactly 5%
    { marketMedian: MARKET_MEDIAN, tenderBudget: TENDER.budget },
    false
  );

  // ── SECTION B: Anomalous Bids (Expected: FAIL with anomaly detected) ───────
  console.log(BOLD('── Section B: Anomalous Bids (should be flagged) ──'));
  console.log();

  // TC09 — ANOMALY: Cartel bid collusion
  //   Two different contractors submit bids within 1.1% of each other.
  //   Classic cartel rotation — both agree on price, one "wins", they share profit.
  runTest(
    'TC09 | ⚠️  BID COLLUSION — Cartel Ring (ShadyCon + GhostBuild)',
    { amount: 43_200_000, stakeAmount: 2_200_000, zkpVerified: true, contractorId: 'C009' },
    {
      marketMedian: MARKET_MEDIAN,
      tenderBudget: TENDER.budget,
      otherBids: [
        { amount: 43_680_000, contractorId: 'C010' }, // 1.1% spread = COLLUSION
      ],
    },
    true // EXPECT anomaly
  );

  // TC10 — ANOMALY: Price dumping / shill bid
  //   Bid is 72% below market median — economically impossible to deliver.
  //   Classic loss-leader scam: win tender, claim variations later to inflate cost.
  runTest(
    'TC10 | ⚠️  PRICE DUMPING — Shill Bid (LowestBid Inc)',
    { amount: 11_760_000, stakeAmount: 600_000, zkpVerified: false, contractorId: 'C011' },
    { marketMedian: MARKET_MEDIAN, tenderBudget: TENDER.budget },
    true // EXPECT anomaly
  );

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  console.log(BOLD('═══════════════════════════════════════════════════════════════'));
  console.log(BOLD('  Test Results'));
  console.log(BOLD('═══════════════════════════════════════════════════════════════'));
  console.log(`  ${GREEN('✓ Legitimate bids correctly cleared:')} ${passed}`);
  console.log(`  ${RED('✗ Anomalies correctly detected:')}       ${anomalyFailed}`);
  if (failed > 0) console.log(`  ${YELLOW('⚠  Unexpected outcomes:')}              ${failed}`);
  console.log();
  const total = passed + anomalyFailed + failed;
  const correctTotal = passed + anomalyFailed;
  console.log(`  ${BOLD(`Detection accuracy: ${correctTotal}/${total} (${(correctTotal/total*100).toFixed(0)}%)`)}`);
  console.log();

  if (anomalyFailed === 2 && passed === 8 && failed === 0) {
    console.log(GREEN(BOLD('  🎯  All 10 tests behaved as expected.')));
    console.log(GREEN('  The anomaly detection engine correctly identified both'  ));
    console.log(GREEN('  cartel collusion (TC09) and price-dumping (TC10).'      ));
  } else {
    console.log(YELLOW('  Some tests had unexpected results. Check above output.'));
  }
  console.log();
  console.log(BOLD('═══════════════════════════════════════════════════════════════'));
  console.log();

  // Also log the flagged bids to the backend auditLogs (real persistence)
  try {
    const auditorToken = await walletLogin('0xAuditor00000000000000000000000000000001', 'auditor');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` };

    // Flag TC09 - Collusion
    await fetch(`${BASE}/auditor/flag`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        entityId: 'C009',
        entityType: 'bid',
        anomalyType: 'BID_COLLUSION',
        severity: 8,
        description: 'TC09: Bids from C009 and C010 differ by only 1.1% (₹43.2M vs ₹43.68M). Cartel ring suspected. Both contractors should be frozen pending investigation.',
      }),
    });

    // Flag TC10 - Price dumping
    await fetch(`${BASE}/auditor/flag`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        entityId: 'C011',
        entityType: 'bid',
        anomalyType: 'PRICE_DUMPING',
        severity: 9,
        description: 'TC10: Bid of ₹11.76M is 72% below market median (₹42M) for an infrastructure tender worth ₹50Cr. Economically non-viable — likely shill bid for scope variation fraud.',
      }),
    });

    console.log(DIM('  [Anomaly flags persisted to backend audit log]'));
    console.log();
  } catch (e) {
    console.log(DIM(`  [Could not persist to backend: ${e.message}]`));
  }
}

runAll().catch(console.error);

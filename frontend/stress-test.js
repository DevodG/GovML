import autocannon from 'autocannon';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

console.log('🚀 Starting GovChain API Stress Test...');
console.log(`Target: ${API_BASE_URL}`);

const instance = autocannon({
  url: API_BASE_URL,
  connections: 50, // 50 concurrent virtual users
  duration: 15, // Test for 15 seconds
  pipelining: 1, // How many requests a single connection should send
  requests: [
    {
      method: 'GET',
      path: '/public/tenders/feed',
    },
    {
      method: 'GET',
      path: '/public/funds/map',
    },
    {
      method: 'GET',
      path: '/public/contractors',
    },
    {
      method: 'GET',
      path: '/bounty/leaderboard',
    }
  ]
}, (err, results) => {
  if (err) {
    console.error('Error running stress test:', err);
    return;
  }
  
  console.log('\n📊 --- STRESS TEST RESULTS --- 📊\n');
  console.log(`Duration:         ${results.duration} seconds`);
  console.log(`Connections:      ${results.connections}`);
  console.log(`Total Requests:   ${results.requests.total}`);
  console.log(`Requests/sec:     ${results.requests.average.toFixed(2)} req/s`);
  console.log(`Total Errors:     ${results.errors}`);
  console.log(`Timeouts:         ${results.timeouts}`);
  console.log('\n⏱️ --- LATENCY --- ⏱️\n');
  console.log(`Average:          ${results.latency.average.toFixed(2)} ms`);
  console.log(`p90:              ${results.latency.p90.toFixed(2)} ms`);
  console.log(`p99:              ${results.latency.p99.toFixed(2)} ms`);
  console.log(`Max:              ${results.latency.max.toFixed(2)} ms`);
  
  if (results.errors > 0) {
    console.warn('\n⚠️ WARNING: The API experienced errors under load. Check backend logs.');
  } else {
    console.log('\n✅ SUCCESS: The API handled the load with zero dropped connections.');
  }
});

autocannon.track(instance, { renderProgressBar: true });

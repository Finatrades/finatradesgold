const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

interface StressPhase {
  name: string;
  users: number;
  duration: number;
  rampUp: number;
}

const phases: StressPhase[] = [
  { name: "Warm-up", users: 50, duration: 30000, rampUp: 10000 },
  { name: "Load", users: 200, duration: 60000, rampUp: 15000 },
  { name: "Stress", users: 500, duration: 60000, rampUp: 20000 },
  { name: "Spike", users: 800, duration: 30000, rampUp: 5000 },
  { name: "Recovery", users: 100, duration: 30000, rampUp: 5000 },
];

const endpoints = [
  { name: "Health", path: "/api/health", weight: 5 },
  { name: "Gold Price", path: "/api/gold-price", weight: 30 },
  { name: "Config", path: "/api/platform-config", weight: 15 },
  { name: "Fees", path: "/api/fees", weight: 10 },
];

interface PhaseResults {
  phase: string;
  totalRequests: number;
  successfulRequests: number;
  avgLatency: number;
  p95Latency: number;
  maxLatency: number;
  rps: number;
  errorRate: number;
}

const allLatencies: number[] = [];
let phaseResults: PhaseResults[] = [];
let activeUsers = 0;
let totalRequests = 0;
let successfulRequests = 0;
let currentPhaseLatencies: number[] = [];

async function makeRequest(): Promise<number | null> {
  const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;
  let endpoint = endpoints[0];
  
  for (const ep of endpoints) {
    random -= ep.weight;
    if (random <= 0) {
      endpoint = ep;
      break;
    }
  }
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: "GET",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    
    const latency = Date.now() - startTime;
    totalRequests++;
    
    if (response.ok) {
      successfulRequests++;
      currentPhaseLatencies.push(latency);
      allLatencies.push(latency);
      return latency;
    }
    
    return null;
  } catch {
    totalRequests++;
    return null;
  }
}

function calculatePercentile(arr: number[], percentile: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runUser(endTime: number): Promise<void> {
  activeUsers++;
  
  while (Date.now() < endTime) {
    await makeRequest();
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  }
  
  activeUsers--;
}

async function runPhase(phase: StressPhase): Promise<PhaseResults> {
  console.log(`\n[${phase.name}] Starting with ${phase.users} users...`);
  
  currentPhaseLatencies = [];
  const phaseStart = Date.now();
  const phaseStartRequests = totalRequests;
  const phaseStartSuccess = successfulRequests;
  
  const endTime = Date.now() + phase.duration;
  const userPromises: Promise<void>[] = [];
  
  for (let i = 0; i < phase.users; i++) {
    const delay = (i / phase.users) * phase.rampUp;
    userPromises.push(
      new Promise(resolve => setTimeout(resolve, delay))
        .then(() => runUser(endTime))
    );
  }
  
  const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - phaseStart) / 1000).toFixed(0);
    const currentRps = (totalRequests - phaseStartRequests) / parseFloat(elapsed) || 0;
    console.log(
      `  [${elapsed}s] Active: ${activeUsers}, ` +
      `Requests: ${totalRequests - phaseStartRequests}, ` +
      `RPS: ${currentRps.toFixed(1)}`
    );
  }, 10000);
  
  await Promise.all(userPromises);
  clearInterval(progressInterval);
  
  const phaseDuration = (Date.now() - phaseStart) / 1000;
  const phaseRequests = totalRequests - phaseStartRequests;
  const phaseSuccess = successfulRequests - phaseStartSuccess;
  
  const result: PhaseResults = {
    phase: phase.name,
    totalRequests: phaseRequests,
    successfulRequests: phaseSuccess,
    avgLatency: currentPhaseLatencies.length > 0
      ? currentPhaseLatencies.reduce((a, b) => a + b, 0) / currentPhaseLatencies.length
      : 0,
    p95Latency: calculatePercentile(currentPhaseLatencies, 95),
    maxLatency: currentPhaseLatencies.length > 0 ? Math.max(...currentPhaseLatencies) : 0,
    rps: phaseRequests / phaseDuration,
    errorRate: phaseRequests > 0
      ? ((phaseRequests - phaseSuccess) / phaseRequests) * 100
      : 0,
  };
  
  console.log(
    `[${phase.name}] Complete: ${phaseRequests} requests, ` +
    `${result.rps.toFixed(1)} RPS, ` +
    `${result.errorRate.toFixed(1)}% errors`
  );
  
  return result;
}

function generateReport(): void {
  console.log("\n" + "=".repeat(90));
  console.log("STRESS TEST REPORT");
  console.log("=".repeat(90));
  
  console.log("\nPhase Summary:");
  console.log("-".repeat(90));
  console.log(
    "Phase".padEnd(15) +
    "Requests".padStart(10) +
    "RPS".padStart(10) +
    "Avg(ms)".padStart(10) +
    "P95(ms)".padStart(10) +
    "Max(ms)".padStart(10) +
    "Errors".padStart(10) +
    "Status".padStart(15)
  );
  console.log("-".repeat(90));
  
  for (const result of phaseResults) {
    const status = result.errorRate < 1 ? "PASS" :
                   result.errorRate < 5 ? "DEGRADED" : "FAIL";
    
    console.log(
      result.phase.padEnd(15) +
      result.totalRequests.toString().padStart(10) +
      result.rps.toFixed(1).padStart(10) +
      result.avgLatency.toFixed(0).padStart(10) +
      result.p95Latency.toFixed(0).padStart(10) +
      result.maxLatency.toFixed(0).padStart(10) +
      `${result.errorRate.toFixed(1)}%`.padStart(10) +
      status.padStart(15)
    );
  }
  
  console.log("-".repeat(90));
  
  console.log("\nOverall Summary:");
  console.log(`  Total Requests: ${totalRequests}`);
  console.log(`  Successful: ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`  Average Latency: ${(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length).toFixed(0)}ms`);
  console.log(`  P95 Latency: ${calculatePercentile(allLatencies, 95).toFixed(0)}ms`);
  console.log(`  Max Latency: ${Math.max(...allLatencies).toFixed(0)}ms`);
  
  const maxRpsPhase = phaseResults.reduce((a, b) => a.rps > b.rps ? a : b);
  console.log(`\nPeak Performance:`);
  console.log(`  Max RPS: ${maxRpsPhase.rps.toFixed(1)} (during ${maxRpsPhase.phase})`);
  
  const breakPoint = phaseResults.find(r => r.errorRate > 5);
  if (breakPoint) {
    console.log(`\nBreaking Point:`);
    console.log(`  System degraded during "${breakPoint.phase}" phase`);
    console.log(`  Error rate reached ${breakPoint.errorRate.toFixed(1)}%`);
  } else {
    console.log(`\nSystem Stability: All phases passed within acceptable error thresholds`);
  }
  
  console.log("\n" + "=".repeat(90));
  console.log("RECOMMENDATIONS");
  console.log("=".repeat(90));
  
  const avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
  
  if (avgLatency > 500) {
    console.log("- Consider adding Redis caching for frequently accessed data");
  }
  if (maxRpsPhase.rps < 100) {
    console.log("- Database connection pooling may need optimization");
  }
  if (breakPoint) {
    console.log("- Consider horizontal scaling or rate limiting");
  }
  console.log("- Monitor database slow query log during production load");
  console.log("- Implement request coalescing for gold price endpoint");
  
  console.log("\n" + "=".repeat(90) + "\n");
}

async function runStressTest(): Promise<void> {
  console.log("=".repeat(90));
  console.log("FINATRADES STRESS TEST");
  console.log("=".repeat(90));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Phases: ${phases.map(p => p.name).join(" → ")}`);
  console.log(`Max Users: ${Math.max(...phases.map(p => p.users))}`);
  console.log("");
  
  for (const phase of phases) {
    const result = await runPhase(phase);
    phaseResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  generateReport();
}

runStressTest().catch(console.error);

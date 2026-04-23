const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

interface TestResult {
  endpoint: string;
  method: string;
  requests: number;
  successes: number;
  failures: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p95Latency: number;
  rps: number;
}

interface LoadTestConfig {
  virtualUsers: number;
  duration: number;
  rampUp: number;
  endpoints: EndpointConfig[];
}

interface EndpointConfig {
  name: string;
  method: string;
  path: string;
  weight: number;
  body?: any;
  headers?: Record<string, string>;
}

const config: LoadTestConfig = {
  virtualUsers: 100,
  duration: 60000,
  rampUp: 10000,
  endpoints: [
    { name: "Health Check", method: "GET", path: "/api/health", weight: 5 },
    { name: "Gold Price", method: "GET", path: "/api/gold-price", weight: 20 },
    { name: "Platform Config", method: "GET", path: "/api/platform-config", weight: 10 },
    { name: "Fees", method: "GET", path: "/api/fees", weight: 10 },
  ],
};

const results: Map<string, number[]> = new Map();
const errors: Map<string, number> = new Map();
let totalRequests = 0;
let successfulRequests = 0;

async function makeRequest(endpoint: EndpointConfig): Promise<void> {
  const startTime = Date.now();
  const url = `${BASE_URL}${endpoint.path}`;
  
  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...endpoint.headers,
      },
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    });
    
    const latency = Date.now() - startTime;
    totalRequests++;
    
    if (response.ok) {
      successfulRequests++;
      const latencies = results.get(endpoint.name) || [];
      latencies.push(latency);
      results.set(endpoint.name, latencies);
    } else {
      const count = errors.get(endpoint.name) || 0;
      errors.set(endpoint.name, count + 1);
    }
  } catch (error) {
    totalRequests++;
    const count = errors.get(endpoint.name) || 0;
    errors.set(endpoint.name, count + 1);
  }
}

function selectEndpoint(): EndpointConfig {
  const totalWeight = config.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of config.endpoints) {
    random -= endpoint.weight;
    if (random <= 0) return endpoint;
  }
  
  return config.endpoints[0];
}

function calculatePercentile(arr: number[], percentile: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function generateReport(): void {
  console.log("\n" + "=".repeat(80));
  console.log("LOAD TEST RESULTS");
  console.log("=".repeat(80));
  
  console.log(`\nConfiguration:`);
  console.log(`  Virtual Users: ${config.virtualUsers}`);
  console.log(`  Duration: ${config.duration / 1000}s`);
  console.log(`  Ramp-up: ${config.rampUp / 1000}s`);
  
  console.log(`\nOverall Metrics:`);
  console.log(`  Total Requests: ${totalRequests}`);
  console.log(`  Successful: ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`  Failed: ${totalRequests - successfulRequests}`);
  console.log(`  Throughput: ${(totalRequests / (config.duration / 1000)).toFixed(1)} req/s`);
  
  console.log(`\nEndpoint Performance:`);
  console.log("-".repeat(80));
  console.log(
    "Endpoint".padEnd(25) +
    "Reqs".padStart(8) +
    "OK%".padStart(8) +
    "Avg(ms)".padStart(10) +
    "P95(ms)".padStart(10) +
    "Max(ms)".padStart(10)
  );
  console.log("-".repeat(80));
  
  for (const endpoint of config.endpoints) {
    const latencies = results.get(endpoint.name) || [];
    const errorCount = errors.get(endpoint.name) || 0;
    const total = latencies.length + errorCount;
    
    if (total === 0) continue;
    
    const avg = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
    const p95 = calculatePercentile(latencies, 95);
    const max = latencies.length > 0 ? Math.max(...latencies) : 0;
    const successRate = (latencies.length / total) * 100;
    
    console.log(
      endpoint.name.padEnd(25) +
      total.toString().padStart(8) +
      `${successRate.toFixed(0)}%`.padStart(8) +
      avg.toFixed(0).padStart(10) +
      p95.toFixed(0).padStart(10) +
      max.toFixed(0).padStart(10)
    );
  }
  
  console.log("-".repeat(80));
  
  if (errors.size > 0) {
    console.log(`\nErrors by Endpoint:`);
    for (const [name, count] of errors) {
      console.log(`  ${name}: ${count} errors`);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("TEST COMPLETE");
  console.log("=".repeat(80) + "\n");
}

async function runVirtualUser(userId: number): Promise<void> {
  const userStartDelay = (userId / config.virtualUsers) * config.rampUp;
  await new Promise(resolve => setTimeout(resolve, userStartDelay));
  
  const endTime = Date.now() + config.duration - userStartDelay;
  
  while (Date.now() < endTime) {
    const endpoint = selectEndpoint();
    await makeRequest(endpoint);
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }
}

async function runLoadTest(): Promise<void> {
  console.log("=".repeat(80));
  console.log("FINATRADES LOAD TEST");
  console.log("=".repeat(80));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Virtual Users: ${config.virtualUsers}`);
  console.log(`Duration: ${config.duration / 1000}s (with ${config.rampUp / 1000}s ramp-up)`);
  console.log("");
  console.log("Starting load test...");
  console.log("");
  
  const startTime = Date.now();
  
  const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const currentRps = totalRequests / parseFloat(elapsed) || 0;
    console.log(
      `[${elapsed}s] Requests: ${totalRequests}, ` +
      `Success: ${successfulRequests}, ` +
      `RPS: ${currentRps.toFixed(1)}`
    );
  }, 5000);
  
  const users = Array.from({ length: config.virtualUsers }, (_, i) => runVirtualUser(i));
  await Promise.all(users);
  
  clearInterval(progressInterval);
  generateReport();
}

runLoadTest().catch(console.error);

import { db } from "../server/db";
import { sql } from "drizzle-orm";

const BASE = "http://localhost:5000";

interface TestResult {
  name: string;
  module: string;
  pass: boolean;
  detail: string;
}

interface Session {
  cookies: string;
  userId: string;
}

const results: TestResult[] = [];

function record(module: string, name: string, pass: boolean, detail: string) {
  results.push({ module, name, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`  [${icon}] ${name}: ${detail}`);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function login(email: string, password: string, isAdmin = false): Promise<Session | null> {
  const csrfRes = await fetch(`${BASE}/api/csrf-token`);
  const csrfCookies = csrfRes.headers.getSetCookie?.() || [];
  const csrfBody = await csrfRes.json();
  const csrfCookie = csrfCookies[csrfCookies.length - 1]?.split(";")[0] || "";

  const loginUrl = isAdmin ? `${BASE}/api/admin/login` : `${BASE}/api/auth/login`;
  const loginRes = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": csrfCookie,
      "x-csrf-token": csrfBody.csrfToken,
    },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });

  if (loginRes.status !== 200) {
    await loginRes.text();
    return null;
  }

  const loginBody = await loginRes.json();
  const loginCookies = loginRes.headers.getSetCookie?.() || [];
  const cookies = [csrfCookie, ...loginCookies.map(c => c.split(";")[0])].join("; ");
  const userId = loginBody.user?.id || loginBody.id || "";
  return { cookies, userId };
}

async function apiGet(path: string, session?: Session): Promise<{ status: number; body: any; isJson: boolean }> {
  const headers: Record<string, string> = {};
  if (session) headers["Cookie"] = session.cookies;

  const res = await fetch(`${BASE}${path}`, { headers, redirect: "manual" });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  let body: any = null;
  if (isJson) {
    try { body = await res.json(); } catch { body = null; }
  } else {
    await res.text();
  }
  return { status: res.status, body, isJson };
}

async function main() {
  console.log("=".repeat(60));
  console.log("FINATRADES E2E FLOW TESTS");
  console.log("=".repeat(60));

  console.log("\n--- Phase 1: Health & Public ---");
  const health = await apiGet("/api/health");
  record("System", "Health endpoint returns 200 OK", health.status === 200 && health.body?.status === "ok", `Status: ${health.status}`);

  const noAuthMe = await apiGet("/api/auth/me/fake-id");
  record("Auth", "Protected endpoint rejects unauthenticated request", noAuthMe.status === 401 || !noAuthMe.isJson, `Status: ${noAuthMe.status}`);

  console.log("\n--- Phase 2: Authentication ---");
  const userSession = await login("demo_user_15@finatrades-test.com", "DemoTest123!");
  record("Auth", "User login with valid credentials", userSession !== null, userSession ? `userId: ${userSession.userId.slice(0,8)}...` : "Failed");
  await sleep(300);

  const adminSession = await login("demo_user_0@finatrades-test.com", "DemoTest123!", true);
  record("Auth", "Admin login via /api/admin/login", adminSession !== null, adminSession ? `userId: ${adminSession.userId.slice(0,8)}...` : "Failed");
  await sleep(300);

  const noKycSession = await login("demo_user_40@finatrades-test.com", "DemoTest123!");
  record("Auth", "Non-KYC user login", noKycSession !== null, noKycSession ? "Got session" : "Failed");
  await sleep(300);

  const badLogin = await login("demo_user_49@finatrades-test.com", "WrongPassword!");
  record("Auth", "Rejects wrong password", badLogin === null, badLogin ? "Should have failed" : "Correctly rejected");
  await sleep(300);

  if (userSession) {
    const me = await apiGet(`/api/auth/me/${userSession.userId}`, userSession);
    const meUser = me.body?.user || me.body;
    record("Auth", "GET /api/auth/me/:userId returns user data", me.status === 200 && meUser?.email !== undefined, `Status: ${me.status}, email: ${meUser?.email}`);
  }

  console.log("\n--- Phase 3: Dashboard / Wallet ---");
  if (userSession) {
    const wallet = await apiGet(`/api/wallet/${userSession.userId}`, userSession);
    const walletData = wallet.body?.wallet || wallet.body;
    record("Dashboard", "Wallet endpoint returns data", wallet.status === 200 && walletData?.goldGrams !== undefined, `goldGrams: ${walletData?.goldGrams}`);

    const notifs = await apiGet(`/api/users/${userSession.userId}/notifications`, userSession);
    record("Dashboard", "Notifications endpoint works", notifs.status === 200, `Status: ${notifs.status}`);
  }

  console.log("\n--- Phase 4: FinaPay ---");
  if (userSession) {
    const tx = await apiGet(`/api/transactions/${userSession.userId}`, userSession);
    record("FinaPay", "Transactions list", tx.status === 200, `Status: ${tx.status}`);

    const deps = await apiGet(`/api/deposit-requests/${userSession.userId}`, userSession);
    record("FinaPay", "Deposit requests", deps.status === 200, `Status: ${deps.status}`);

    const wds = await apiGet(`/api/withdrawal-requests/${userSession.userId}`, userSession);
    record("FinaPay", "Withdrawal requests", wds.status === 200, `Status: ${wds.status}`);

    const qr = await apiGet(`/api/qr-payments/${userSession.userId}`, userSession);
    record("FinaPay", "QR payments endpoint", qr.status === 200 || qr.isJson, `Status: ${qr.status}`);
  }

  console.log("\n--- Phase 5: FinaVault ---");
  if (userSession) {
    const certs = await apiGet(`/api/certificates/${userSession.userId}`, userSession);
    record("FinaVault", "Certificates endpoint", certs.status === 200, `Status: ${certs.status}`);
  }

  console.log("\n--- Phase 6: BNSL ---");
  if (userSession) {
    const bnslWallet = await apiGet(`/api/bnsl/wallet/${userSession.userId}`, userSession);
    record("BNSL", "BNSL wallet", bnslWallet.status === 200, `Status: ${bnslWallet.status}`);

    const plans = await apiGet(`/api/bnsl/plans/${userSession.userId}`, userSession);
    record("BNSL", "BNSL plans", plans.status === 200, `Status: ${plans.status}`);
  }

  console.log("\n--- Phase 7: FinaBridge ---");
  const bizSession = await login("demo_user_5@finatrades-test.com", "DemoTest123!");
  await sleep(300);
  if (bizSession) {
    const fbWallet = await apiGet(`/api/finabridge/wallet/${bizSession.userId}`, bizSession);
    record("FinaBridge", "FinaBridge wallet", fbWallet.status === 200, `Status: ${fbWallet.status}`);

    const trades = await apiGet(`/api/finabridge/importer/requests/${bizSession.userId}`, bizSession);
    record("FinaBridge", "Importer trade requests", trades.status === 200, `Status: ${trades.status}`);
  } else {
    record("FinaBridge", "Business user login", false, "Could not login");
  }

  console.log("\n--- Phase 8: FinaCard ---");
  if (userSession) {
    const cards = await apiGet(`/api/finacard/card/${userSession.userId}`, userSession);
    record("FinaCard", "Cards list", cards.status === 200, `Status: ${cards.status}`);

    const spending = await apiGet(`/api/finacard/spending/${userSession.userId}`, userSession);
    record("FinaCard", "Spending history", spending.status === 200, `Status: ${spending.status}`);
  }

  console.log("\n--- Phase 9: Admin ---");
  if (adminSession) {
    record("Admin", "Admin session established", true, "Via /api/admin/login");

    const users = await apiGet("/api/admin/users", adminSession);
    record("Admin", "Admin users endpoint responds", users.status === 200 || users.status === 403, `Status: ${users.status}`);

    const noAuth = await apiGet("/api/admin/users");
    record("Admin", "Admin blocked without auth", noAuth.status === 401 || !noAuth.isJson, `Status: ${noAuth.status}`);

    if (userSession) {
      const userAdmin = await apiGet("/api/admin/users", userSession);
      record("Admin", "Non-admin blocked from admin", userAdmin.status === 403 || userAdmin.status === 401, `Status: ${userAdmin.status}`);
    }
  }

  console.log("\n--- Phase 10: KYC Gating ---");
  if (noKycSession) {
    const me = await apiGet(`/api/auth/me/${noKycSession.userId}`, noKycSession);
    const meUser = me.body?.user || me.body;
    record("KYC", "Non-KYC user profile access", me.status === 200, `Status: ${me.status}`);
    record("KYC", "KYC status is Not Started", meUser?.kycStatus === "Not Started", `KYC: ${meUser?.kycStatus}`);
  }

  interface CountRow { cnt: string }
  interface KycRow { kyc_status: string; cnt: string }
  interface MaxRow { mx: string }

  console.log("\n--- Phase 11: Data Integrity ---");
  const uc = await db.execute(sql`SELECT count(*) as cnt FROM users WHERE email LIKE 'demo_user_%'`);
  const ucRow = uc.rows[0] as CountRow;
  record("Data", "50 demo users exist", ucRow.cnt === '50', `Count: ${ucRow.cnt}`);

  const wc = await db.execute(sql`SELECT count(*) as cnt FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'demo_user_%')`);
  const wcRow = wc.rows[0] as CountRow;
  record("Data", "All users have wallets", wcRow.cnt === '50', `Count: ${wcRow.cnt}`);

  const kyc = await db.execute(sql`SELECT kyc_status, count(*) as cnt FROM users WHERE email LIKE 'demo_user_%' GROUP BY kyc_status ORDER BY kyc_status`);
  const kycMap: Record<string, string> = {};
  for (const row of kyc.rows as KycRow[]) kycMap[row.kyc_status] = row.cnt;
  record("Data", "KYC distribution 35/5/5/5", kycMap["Approved"] === "35" && kycMap["Pending Review"] === "5" && kycMap["Not Started"] === "5" && kycMap["Rejected"] === "5", JSON.stringify(kycMap));

  const mb = await db.execute(sql`SELECT MAX(CAST(gold_grams AS DECIMAL)) as mx FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'demo_user_%')`);
  const mbRow = mb.rows[0] as MaxRow;
  const maxGold = parseFloat(mbRow.mx);
  record("Data", "Max wallet balance <= 500g", maxGold <= 500, `Max: ${maxGold}g`);

  const txCheck = await db.execute(sql`SELECT count(*) as cnt FROM transactions t JOIN users u ON t.user_id = u.id WHERE u.email LIKE 'demo_user_%' AND u.kyc_status != 'Approved'`);
  const txRow = txCheck.rows[0] as CountRow;
  record("Data", "Transactions only for approved users", txRow.cnt === '0', `Non-approved: ${txRow.cnt}`);

  const fbCheck = await db.execute(sql`SELECT count(*) as cnt FROM finabridge_wallets fw JOIN users u ON fw.user_id = u.id WHERE u.email LIKE 'demo_user_%' AND (u.account_type != 'business' OR u.kyc_status != 'Approved')`);
  const fbRow = fbCheck.rows[0] as CountRow;
  record("Data", "FB wallets only for approved business", fbRow.cnt === '0', `Non-qualifying: ${fbRow.cnt}`);

  console.log("\n" + "=".repeat(60));
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${results.length} tests`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  [FAIL] ${r.module} > ${r.name}: ${r.detail}`);
    }
  }

  console.log("=".repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

main();

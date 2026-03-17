import { db } from "../server/db";
import { 
  users, wallets, transactions, peerTransfers, notifications, 
  bnslWallets, finabridgeWallets,
  finacardCards, employees, userRoleAssignments, adminRoles
} from "../shared/schema";
import bcrypt from "bcryptjs";
import { sql, eq } from "drizzle-orm";

const TOTAL_DEMO = 50;

const firstNames = [
  "Ahmed", "Fatima", "Mohammed", "Sara", "Omar", "Layla", "Hassan", "Amira", "Yusuf", "Noor",
  "Raj", "Priya", "Arjun", "Meera", "Vikram", "Ananya", "Karan", "Divya", "Rohit", "Sneha",
  "James", "Emma", "Oliver", "Sophia", "William", "Ava", "Benjamin", "Isabella", "Lucas", "Mia",
  "Chen", "Li", "Wei", "Yan", "Ming", "Sakura", "Kenji", "Yuki", "Ryu", "Hana",
  "Carlos", "Maria", "Pedro", "Ana", "Diego", "Camila", "Ricardo", "Valentina", "Hugo", "Elena"
];

const lastNames = [
  "Al-Rashid", "Khan", "Al-Maktoum", "Patel", "Al-Saud", "Sharma", "Al-Nahyan", "Kumar", "Al-Thani", "Singh",
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Martinez", "Anderson", "Thomas", "Taylor",
  "Wang", "Zhang", "Liu", "Chen", "Yang", "Tanaka", "Suzuki", "Watanabe", "Sato", "Yamamoto",
  "Rodriguez", "Fernandez", "Lopez", "Gonzalez", "Perez", "Santos", "Oliveira", "Costa", "Silva", "Almeida",
  "Mueller", "Schmidt", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Hoffmann", "Schulz", "Koch"
];

const countries = ["AE", "US", "GB", "IN", "SG", "SA", "QA", "KW", "BH", "DE"];
const kycStatuses = ["Approved", "Approved", "Approved", "Not Started", "Rejected"] as const;

function genFinatradesId(index: number): string {
  return `FT-DEMO${String(index).padStart(3, '0')}`;
}

function genPhone(country: string): string {
  const prefixes: Record<string, string> = {
    AE: "+971", US: "+1", GB: "+44", IN: "+91", SG: "+65", SA: "+966", QA: "+974", KW: "+965", BH: "+973", DE: "+49"
  };
  const prefix = prefixes[country] || "+971";
  return `${prefix}${Math.floor(500000000 + Math.random() * 499999999)}`;
}

function randomGold(min: number, max: number): string {
  return (min + Math.random() * (max - min)).toFixed(6);
}

async function cleanDemoData() {
  console.log("Cleaning any existing demo data...");
  const demoEmails = Array.from({ length: TOTAL_DEMO }, (_, i) => `demo${i + 1}@finatrades.com`);
  const existingDemos = await db.select({ id: users.id }).from(users).where(
    sql`${users.email} LIKE 'demo%@finatrades.com'`
  );
  if (existingDemos.length > 0) {
    const ids = existingDemos.map(u => u.id);
    for (const id of ids) {
      await db.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, id)).catch(() => {});
      await db.delete(employees).where(eq(employees.userId, id)).catch(() => {});
      await db.delete(notifications).where(eq(notifications.userId, id)).catch(() => {});
      await db.delete(finacardCards).where(eq(finacardCards.userId, id)).catch(() => {});
      await db.delete(bnslWallets).where(eq(bnslWallets.userId, id)).catch(() => {});
      await db.delete(finabridgeWallets).where(eq(finabridgeWallets.userId, id)).catch(() => {});
      await db.delete(transactions).where(eq(transactions.userId, id)).catch(() => {});
      await db.delete(wallets).where(eq(wallets.userId, id)).catch(() => {});
    }
    await db.delete(peerTransfers).where(
      sql`${peerTransfers.senderId} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`
    ).catch(() => {});
    for (const id of ids) {
      await db.delete(users).where(eq(users.id, id)).catch(() => {});
    }
    console.log(`  Cleaned ${existingDemos.length} existing demo users`);
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("FINATRADES DEMO DATA SEEDER — 50 USERS");
  console.log("=".repeat(60));

  await cleanDemoData();

  const existing = await db.select({ count: sql`count(*)` }).from(users);
  console.log(`Existing users (after cleanup): ${existing[0].count}`);

  const hashedPassword = await bcrypt.hash("Demo@2025!", 10);
  console.log("Password hashed.");

  const demoUsers: any[] = [];
  for (let i = 0; i < TOTAL_DEMO; i++) {
    const isAdmin = i < 3;
    const isBusiness = !isAdmin && i < 13;
    const country = countries[i % countries.length];
    const kycStatus = isAdmin ? "Approved" : kycStatuses[i % kycStatuses.length];

    demoUsers.push({
      email: `demo${i + 1}@finatrades.com`,
      password: hashedPassword,
      firstName: firstNames[i],
      lastName: lastNames[i],
      phoneNumber: genPhone(country),
      country,
      finatradesId: genFinatradesId(i + 1),
      accountType: isBusiness ? "business" : "personal",
      role: isAdmin ? "admin" : "user",
      kycStatus,
      isEmailVerified: true,
      companyName: isBusiness ? `${firstNames[i]} Trading LLC` : null,
      registrationNumber: isBusiness ? `REG-${100000 + i}` : null,
      finabridgeRole: isBusiness ? (i % 3 === 0 ? "both" : i % 2 === 0 ? "importer" : "exporter") : null,
      finabridgeDisclaimerAcceptedAt: isBusiness ? new Date() : null,
    });
  }

  console.log("\nCreating 50 demo users...");
  const inserted = await db.insert(users).values(demoUsers).returning({ id: users.id, email: users.email });
  const userIds = inserted.map(u => u.id);
  console.log(`  ✓ ${inserted.length} users created`);

  console.log("Creating employee records & RBAC for admin users...");
  const allPerms = ['manage_users','view_users','manage_employees','manage_kyc','view_kyc','manage_transactions','view_transactions','manage_withdrawals','manage_deposits','manage_vault','view_vault','manage_bnsl','view_bnsl','manage_finabridge','view_finabridge','manage_support','view_support','manage_cms','view_cms','manage_settings','view_reports','generate_reports','manage_fees'];
  const superAdminRoles = await db.select({ id: adminRoles.id }).from(adminRoles).where(eq(adminRoles.name, 'Super Admin'));
  if (superAdminRoles.length === 0) {
    console.error("  ✗ Super Admin role not found in admin_roles table. Admin RBAC will not work.");
  } else {
    const superAdminRoleId = superAdminRoles[0].id;
    for (let i = 0; i < 3; i++) {
      await db.insert(employees).values({
        userId: userIds[i],
        employeeId: `EMP-DEMO${String(i + 1).padStart(3, '0')}`,
        role: 'super_admin',
        rbacRoleId: superAdminRoleId,
        department: 'Administration',
        jobTitle: i === 0 ? 'Chief Admin' : 'Senior Admin',
        status: 'active',
        permissions: allPerms,
      });
      await db.insert(userRoleAssignments).values({
        userId: userIds[i],
        roleId: superAdminRoleId,
        isActive: true,
        assignedBy: 'system',
      });
    }
    console.log("  ✓ 3 admin employees + RBAC role assignments created");
  }

  console.log("Creating wallets...");
  const walletValues = userIds.map((uid, i) => {
    const isAdmin = i < 3;
    const kycOk = isAdmin || kycStatuses[i % kycStatuses.length] === "Approved";
    const goldAmt = kycOk ? randomGold(5, 500) : "0";
    const finacardGold = kycOk && i % 4 === 0 ? randomGold(1, 20) : "0";
    return {
      userId: uid,
      goldGrams: goldAmt,
      usdBalance: "0",
      eurBalance: "0",
      finacardGoldGrams: finacardGold,
    };
  });
  await db.insert(wallets).values(walletValues);
  console.log(`  ✓ ${walletValues.length} wallets created`);

  const approvedIndices = userIds.map((_, i) => i).filter(i => i < 3 || kycStatuses[i % kycStatuses.length] === "Approved");
  const approvedIds = approvedIndices.map(i => userIds[i]);

  console.log("Creating BNSL wallets...");
  const bnslWalletValues = approvedIds.map(uid => ({
    userId: uid,
    availableGoldGrams: randomGold(0, 10),
    lockedGoldGrams: randomGold(0, 5),
  }));
  await db.insert(bnslWallets).values(bnslWalletValues);
  console.log(`  ✓ ${bnslWalletValues.length} BNSL wallets created`);

  console.log("Creating FinaBridge wallets...");
  const businessIndices = Array.from({ length: 10 }, (_, i) => i + 3);
  const fbWalletValues = businessIndices.map(i => ({
    userId: userIds[i],
    availableGoldGrams: randomGold(10, 100),
    lockedGoldGrams: randomGold(0, 20),
    incomingLockedGoldGrams: "0",
  }));
  await db.insert(finabridgeWallets).values(fbWalletValues);
  console.log(`  ✓ ${fbWalletValues.length} FinaBridge wallets created`);

  console.log("Creating transactions...");
  const txTypes = ["Buy", "Sell", "Send", "Receive", "Deposit", "Withdrawal"] as const;
  const txStatuses = ["Completed", "Completed", "Completed", "Pending", "Approved"] as const;
  const txValues: any[] = [];
  for (const idx of approvedIndices) {
    const numTx = 3 + Math.floor(Math.random() * 8);
    for (let t = 0; t < numTx; t++) {
      const gold = randomGold(0.1, 50);
      const price = (90 + Math.random() * 10).toFixed(2);
      const usd = (parseFloat(gold) * parseFloat(price)).toFixed(2);
      txValues.push({
        userId: userIds[idx],
        type: txTypes[t % txTypes.length],
        amountUsd: usd,
        goldGrams: gold,
        pricePerGram: price,
        status: txStatuses[t % txStatuses.length],
        paymentMethod: t % 3 === 0 ? "Bank Transfer" : t % 3 === 1 ? "Card" : "Crypto",
        description: `Demo ${txTypes[t % txTypes.length]} transaction #${t + 1}`,
      });
    }
  }
  for (let b = 0; b < txValues.length; b += 50) {
    await db.insert(transactions).values(txValues.slice(b, b + 50));
  }
  console.log(`  ✓ ${txValues.length} transactions created`);

  console.log("Creating peer transfers...");
  const ptValues: any[] = [];
  for (let i = 0; i < Math.min(30, approvedIds.length - 1); i++) {
    const gold = randomGold(0.05, 5);
    const price = (92 + Math.random() * 5).toFixed(2);
    ptValues.push({
      referenceNumber: `PT-DEMO-${String(i + 1).padStart(4, '0')}`,
      senderId: approvedIds[i],
      recipientId: approvedIds[(i + 1) % approvedIds.length],
      amountUsd: (parseFloat(gold) * parseFloat(price)).toFixed(2),
      amountGold: gold,
      goldPriceUsdPerGram: price,
      channel: "email",
      recipientIdentifier: `demo${((i + 1) % approvedIds.length) + 1}@finatrades.com`,
      status: "Completed",
    });
  }
  if (ptValues.length > 0) {
    await db.insert(peerTransfers).values(ptValues);
  }
  console.log(`  ✓ ${ptValues.length} peer transfers created`);

  console.log("Creating FinaCard applications...");
  const cardValues: any[] = [];
  for (let i = 0; i < Math.min(15, approvedIds.length); i++) {
    cardValues.push({
      userId: approvedIds[i],
      cardType: i % 3 === 0 ? "virtual" : "physical",
      cardStatus: i < 5 ? "active" : i < 8 ? "approved" : i < 11 ? "applied" : "under_review",
      last4Digits: String(1000 + Math.floor(Math.random() * 8999)),
      expiry: "12/28",
      dailyLimitGrams: "5.000000",
      monthlyLimitGrams: "50.000000",
    });
  }
  if (cardValues.length > 0) {
    await db.insert(finacardCards).values(cardValues);
  }
  console.log(`  ✓ ${cardValues.length} FinaCard applications created`);

  console.log("Creating notifications...");
  const notifTypes = ["transaction", "system", "info", "success", "kyc", "warning", "bnsl", "trade", "error"] as const;
  const notifTitles = [
    "Gold Purchase Confirmed", "Welcome to Finatrades", "Login from new device",
    "Gold Price Alert", "KYC Approved", "Transfer Received", "Withdrawal Processed",
    "BNSL Plan Activated", "FinaCard Ready"
  ];
  const notifValues: any[] = [];
  for (let i = 0; i < userIds.length; i++) {
    const numNotifs = 3 + Math.floor(Math.random() * 7);
    for (let n = 0; n < numNotifs; n++) {
      notifValues.push({
        userId: userIds[i],
        type: notifTypes[n % notifTypes.length],
        title: notifTitles[n % notifTitles.length],
        message: `Demo notification: ${notifTitles[n % notifTitles.length]} for ${firstNames[i]}`,
        read: Math.random() > 0.4,
      });
    }
  }
  for (let b = 0; b < notifValues.length; b += 100) {
    await db.insert(notifications).values(notifValues.slice(b, b + 100));
  }
  console.log(`  ✓ ${notifValues.length} notifications created`);

  console.log("");
  console.log("=".repeat(60));
  console.log("SEEDING COMPLETE!");
  console.log("=".repeat(60));
  console.log("");
  console.log("Demo User Credentials:");
  console.log("  Admin:    demo1@finatrades.com / Demo@2025!");
  console.log("  Admin:    demo2@finatrades.com / Demo@2025!");
  console.log("  Admin:    demo3@finatrades.com / Demo@2025!");
  console.log("  Business: demo4@finatrades.com - demo13@finatrades.com / Demo@2025!");
  console.log("  Personal: demo14@finatrades.com - demo50@finatrades.com / Demo@2025!");
  console.log("");
  console.log("KYC Distribution:");
  console.log("  Approved: ~30 users (admins + 60% of users)");
  console.log("  Not Started: ~10 users");
  console.log("  Rejected: ~10 users");
  console.log("");
  console.log("Summary:");
  console.log(`  Users: ${inserted.length}`);
  console.log(`  Wallets: ${walletValues.length}`);
  console.log(`  BNSL Wallets: ${bnslWalletValues.length}`);
  console.log(`  FinaBridge Wallets: ${fbWalletValues.length}`);
  console.log(`  Transactions: ${txValues.length}`);
  console.log(`  Peer Transfers: ${ptValues.length}`);
  console.log(`  FinaCards: ${cardValues.length}`);
  console.log(`  Notifications: ${notifValues.length}`);

  process.exit(0);
}

main().catch(err => {
  console.error("SEEDER FAILED:", err);
  process.exit(1);
});

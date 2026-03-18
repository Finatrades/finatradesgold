import { db } from "../server/db";
import { 
  users, wallets, transactions, peerTransfers, notifications, 
  bnslPlans, bnslWallets, bnslPayouts,
  vaultHoldings, certificates,
  depositRequests, withdrawalRequests, qrPaymentInvoices,
  tradeRequests, tradeProposals, finabridgeWallets,
  finacardCards, finacardTransfers, finacardSpending
} from "../shared/schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const TOTAL_USERS = 50;
const countries = ["AE", "US", "GB", "IN", "SG"];

function getKycStatus(index: number): "Approved" | "Pending Review" | "Not Started" | "Rejected" {
  if (index < 5) return "Approved";
  if (index >= 5 && index < 35) return "Approved";
  if (index >= 35 && index < 40) return "Pending Review";
  if (index >= 40 && index < 45) return "Not Started";
  return "Rejected";
}

function generatePhone(index: number): string {
  return `+971${500000000 + index}`;
}

function generateEmail(index: number): string {
  return `demo_user_${index}@finatrades-test.com`;
}

function randomGoldBalance(): string {
  const balances = [0, 5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500];
  return balances[Math.floor(Math.random() * balances.length)].toFixed(6);
}

function generateRef(prefix: string, index: number): string {
  return `${prefix}-DEMO-${Date.now().toString(36).toUpperCase()}-${index.toString().padStart(4, '0')}`;
}

function randomDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d;
}

const firstNames = ["Ahmed", "Sarah", "Mohammed", "Fatima", "John", "Emily", "Raj", "Priya", "Wei", "Aisha",
  "Omar", "Layla", "David", "Maria", "Arjun", "Mei", "Khalid", "Zara", "James", "Sophia",
  "Hassan", "Noor", "Alex", "Lisa", "Vikram", "Sana", "Tom", "Anna", "Ravi", "Huda",
  "Ali", "Maryam", "Chris", "Julia", "Sunil", "Yasmin", "Mark", "Nina", "Raj", "Amira",
  "Sam", "Dina", "Mike", "Rosa", "Dev", "Leena", "Paul", "Ava", "Arun", "Lina"];
const lastNames = ["Khan", "Ahmed", "Smith", "Ali", "Johnson", "Williams", "Kumar", "Patel", "Chen", "Hassan",
  "Ibrahim", "Malik", "Brown", "Garcia", "Sharma", "Wang", "Al-Rashid", "Naser", "Davis", "Lee",
  "Singh", "Qasim", "Wilson", "Martinez", "Gupta", "Rashid", "Clark", "Roberts", "Verma", "Farooq",
  "Hussain", "Sayed", "Taylor", "Anderson", "Rajan", "Abbas", "Moore", "Thomas", "Nair", "Bakr",
  "Hill", "Saleh", "White", "Lopez", "Menon", "Hamid", "Green", "Young", "Rao", "Khatib"];

interface SeededUser {
  id: string;
  index: number;
  kycStatus: string;
  role: string;
  accountType: string;
}

async function seedUsers(): Promise<SeededUser[]> {
  const hashedPassword = await bcrypt.hash("DemoTest123!", 10);
  console.log(`Seeding ${TOTAL_USERS} demo users...`);

  const batchUsers = [];
  for (let i = 0; i < TOTAL_USERS; i++) {
    const isAdmin = i < 5;
    const isBusiness = !isAdmin && i < 15;
    const kycStatus = getKycStatus(i);

    batchUsers.push({
      email: generateEmail(i),
      password: hashedPassword,
      firstName: firstNames[i],
      lastName: lastNames[i],
      phoneNumber: generatePhone(i),
      country: countries[i % countries.length],
      role: isAdmin ? "admin" as const : "user" as const,
      accountType: isBusiness ? "business" as const : "personal" as const,
      kycStatus,
      isEmailVerified: true,
      companyName: isBusiness ? `${firstNames[i]} Trading LLC` : null,
      registrationNumber: isBusiness ? `REG-${100000 + i}` : null,
      finabridgeRole: isBusiness ? (i % 2 === 0 ? "importer" as const : "exporter" as const) : null,
      finabridgeDisclaimerAcceptedAt: isBusiness ? new Date() : null,
    });
  }

  const inserted = await db.insert(users).values(batchUsers).returning({ id: users.id });

  const seededUsers: SeededUser[] = inserted.map((u, i) => ({
    id: u.id,
    index: i,
    kycStatus: batchUsers[i].kycStatus,
    role: batchUsers[i].role,
    accountType: batchUsers[i].accountType,
  }));

  const approvedCount = seededUsers.filter(u => u.kycStatus === "Approved").length;
  const pendingCount = seededUsers.filter(u => u.kycStatus === "Pending Review").length;
  const notStartedCount = seededUsers.filter(u => u.kycStatus === "Not Started").length;
  const rejectedCount = seededUsers.filter(u => u.kycStatus === "Rejected").length;
  console.log(`  Created ${seededUsers.length} users (KYC: ${approvedCount} approved, ${pendingCount} pending, ${notStartedCount} not started, ${rejectedCount} rejected)`);

  return seededUsers;
}

async function seedWallets(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding wallets...`);

  const batchWallets = seededUsers.map((su) => ({
    userId: su.id,
    goldGrams: randomGoldBalance(),
    finacardGoldGrams: su.kycStatus === "Approved" && su.index >= 15 && su.index < 25 ? (Math.random() * 10).toFixed(6) : "0",
  }));

  await db.insert(wallets).values(batchWallets);
  console.log(`  Created ${batchWallets.length} wallets`);
}

function getApprovedUsers(seededUsers: SeededUser[]): SeededUser[] {
  return seededUsers.filter(u => u.kycStatus === "Approved");
}

function getApprovedBusinessUsers(seededUsers: SeededUser[]): SeededUser[] {
  return seededUsers.filter(u => u.kycStatus === "Approved" && u.accountType === "business");
}

async function seedTransactions(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding transactions...`);

  const approvedUsers = getApprovedUsers(seededUsers);
  const types: Array<"Buy" | "Sell" | "Send" | "Receive" | "Deposit" | "Withdrawal"> = 
    ["Buy", "Sell", "Buy", "Send", "Receive", "Deposit"];
  const statuses: Array<"Completed" | "Pending" | "Approved" | "Failed"> = 
    ["Completed", "Completed", "Completed", "Pending", "Approved"];

  const batchTx = [];
  for (let i = 0; i < approvedUsers.length; i++) {
    const txCount = 3 + Math.floor(Math.random() * 5);
    for (let t = 0; t < txCount; t++) {
      const goldGrams = (0.5 + Math.random() * 20).toFixed(6);
      const pricePerGram = (90 + Math.random() * 10).toFixed(2);
      const amountUsd = (parseFloat(goldGrams) * parseFloat(pricePerGram)).toFixed(2);

      batchTx.push({
        userId: approvedUsers[i].id,
        type: types[t % types.length],
        amountUsd,
        amountGold: goldGrams,
        goldPriceUsdPerGram: pricePerGram,
        status: statuses[t % statuses.length],
        description: `Demo ${types[t % types.length].toLowerCase()} transaction`,
        sourceModule: "finapay",
        createdAt: randomDate(90),
        updatedAt: new Date(),
      });
    }
  }

  for (let b = 0; b < batchTx.length; b += 100) {
    await db.insert(transactions).values(batchTx.slice(b, b + 100));
  }
  console.log(`  Created ${batchTx.length} transactions (only for KYC-approved users)`);
}

async function seedPeerTransfers(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding peer transfers...`);

  const approvedUsers = getApprovedUsers(seededUsers);
  const batchTransfers = [];

  for (let i = 0; i < 30; i++) {
    const senderIdx = i % approvedUsers.length;
    const recipientIdx = (i + 1) % approvedUsers.length;
    const goldAmount = (0.1 + Math.random() * 5).toFixed(6);
    const pricePerGram = "93.50";
    const amountUsd = (parseFloat(goldAmount) * parseFloat(pricePerGram)).toFixed(2);

    batchTransfers.push({
      referenceNumber: generateRef("PT", i),
      senderId: approvedUsers[senderIdx].id,
      recipientId: approvedUsers[recipientIdx].id,
      amountUsd,
      amountGold: goldAmount,
      goldPriceUsdPerGram: pricePerGram,
      channel: "email" as const,
      recipientIdentifier: generateEmail(approvedUsers[recipientIdx].index),
      status: "Completed" as const,
      createdAt: randomDate(60),
    });
  }

  await db.insert(peerTransfers).values(batchTransfers);
  console.log(`  Created ${batchTransfers.length} peer transfers`);
}

async function seedDepositRequests(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding deposit requests...`);

  const approvedUsers = getApprovedUsers(seededUsers);
  const statuses: Array<"Pending" | "Under Review" | "Confirmed" | "Rejected"> = 
    ["Pending", "Under Review", "Confirmed", "Confirmed", "Rejected"];
  const batchDeposits = [];

  for (let i = 0; i < 20; i++) {
    const user = approvedUsers[i % approvedUsers.length];
    const amountUsd = (100 + Math.random() * 5000).toFixed(2);
    
    batchDeposits.push({
      referenceNumber: generateRef("DEP", i),
      userId: user.id,
      amountUsd,
      currency: "USD",
      paymentMethod: i % 3 === 0 ? "Crypto" : i % 3 === 1 ? "Card Payment" : "Bank Transfer",
      senderBankName: "Demo Bank",
      senderAccountName: `${firstNames[user.index]} ${lastNames[user.index]}`,
      expectedGoldGrams: (parseFloat(amountUsd) / 93.5).toFixed(6),
      priceSnapshotUsdPerGram: "93.50",
      status: statuses[i % statuses.length],
      createdAt: randomDate(30),
    });
  }

  await db.insert(depositRequests).values(batchDeposits);
  console.log(`  Created ${batchDeposits.length} deposit requests`);
}

async function seedWithdrawalRequests(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding withdrawal requests...`);

  const approvedUsers = getApprovedUsers(seededUsers);
  const statuses: Array<"Pending" | "Processing" | "Completed" | "Rejected"> = 
    ["Pending", "Processing", "Completed", "Completed", "Rejected"];
  const batchWithdrawals = [];

  for (let i = 0; i < 15; i++) {
    const user = approvedUsers[i % approvedUsers.length];
    const amountUsd = (50 + Math.random() * 2000).toFixed(2);

    batchWithdrawals.push({
      referenceNumber: generateRef("WD", i),
      userId: user.id,
      amountUsd,
      currency: "USD",
      bankName: "Emirates NBD",
      accountName: `${firstNames[user.index]} ${lastNames[user.index]}`,
      accountNumber: `AE${(1000000000 + i).toString()}`,
      swiftCode: "EABORAED",
      goldGrams: (parseFloat(amountUsd) / 93.5).toFixed(6),
      goldPriceAtRequest: "93.50",
      status: statuses[i % statuses.length],
      createdAt: randomDate(30),
    });
  }

  await db.insert(withdrawalRequests).values(batchWithdrawals);
  console.log(`  Created ${batchWithdrawals.length} withdrawal requests`);
}

async function seedVaultHoldings(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding vault holdings and certificates...`);

  const approvedUsers = getApprovedUsers(seededUsers);
  const batchHoldings = [];

  for (let i = 0; i < 20; i++) {
    const user = approvedUsers[i % approvedUsers.length];
    const goldGrams = (10 + Math.random() * 100).toFixed(6);

    batchHoldings.push({
      userId: user.id,
      goldGrams,
      vaultLocation: i % 2 === 0 ? "Dubai - Wingold & Metals DMCC" : "Singapore Freeport",
      storageFeesAnnualPercent: "0.50",
      purchasePriceUsdPerGram: "93.50",
    });
  }

  const insertedHoldings = await db.insert(vaultHoldings).values(batchHoldings).returning({ id: vaultHoldings.id, userId: vaultHoldings.userId, goldGrams: vaultHoldings.goldGrams });

  const batchCerts = insertedHoldings.map(holding => ({
    certificateNumber: `FT-DOC-DEMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    userId: holding.userId,
    vaultHoldingId: holding.id,
    type: "Digital Ownership" as const,
    status: "Active" as const,
    goldGrams: holding.goldGrams,
    goldPriceUsdPerGram: "93.50",
    totalValueUsd: (parseFloat(holding.goldGrams) * 93.5).toFixed(2),
    issuer: "Finatrades",
    vaultLocation: "Dubai - Wingold & Metals DMCC",
  }));

  await db.insert(certificates).values(batchCerts);
  console.log(`  Created ${insertedHoldings.length} vault holdings, ${batchCerts.length} certificates`);
}

async function seedBnslPlans(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding BNSL wallets and plans...`);

  const approvedNonAdminUsers = getApprovedUsers(seededUsers).filter(u => u.role !== "admin");
  const tenors = [12, 24, 36];
  const planStatuses: Array<"Active" | "Completed" | "Early Terminated" | "Pending Activation"> = 
    ["Active", "Active", "Completed", "Active", "Early Terminated", "Pending Activation"];

  const batchWallets = approvedNonAdminUsers.slice(0, 25).map(su => ({
    userId: su.id,
    availableGoldGrams: (Math.random() * 50).toFixed(6),
    lockedGoldGrams: "0",
  }));

  await db.insert(bnslWallets).values(batchWallets);

  const batchPlans = [];
  for (let i = 0; i < 25; i++) {
    const user = approvedNonAdminUsers[i % approvedNonAdminUsers.length];
    const tenor = tenors[i % tenors.length];
    const goldSold = (5 + Math.random() * 50).toFixed(6);
    const price = 93.5;
    const rate = 8 + Math.random() * 7;
    const base = parseFloat(goldSold) * price;
    const margin = base * (rate / 100) * (tenor / 12);
    const quarterly = margin / (tenor / 3);
    const startDate = randomDate(180);
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + tenor);

    batchPlans.push({
      contractId: `BNSL-DEMO-${Date.now().toString(36).toUpperCase()}-${i.toString().padStart(3, '0')}`,
      userId: user.id,
      tenorMonths: tenor,
      agreedMarginAnnualPercent: rate.toFixed(2),
      goldSoldGrams: goldSold,
      enrollmentPriceUsdPerGram: price.toFixed(2),
      basePriceComponentUsd: base.toFixed(2),
      totalMarginComponentUsd: margin.toFixed(2),
      quarterlyMarginUsd: quarterly.toFixed(2),
      totalSaleProceedsUsd: (base + margin).toFixed(2),
      startDate,
      maturityDate,
      status: planStatuses[i % planStatuses.length],
      paidMarginUsd: (Math.random() * margin * 0.5).toFixed(2),
      paidMarginGrams: "0",
      remainingMarginUsd: (margin * 0.5).toFixed(2),
      planRiskLevel: "Low" as const,
    });
  }

  const insertedPlans = await db.insert(bnslPlans).values(batchPlans).returning({ id: bnslPlans.id, quarterlyMarginUsd: bnslPlans.quarterlyMarginUsd, startDate: bnslPlans.startDate });

  const batchPayouts = [];
  for (const plan of insertedPlans) {
    for (let seq = 1; seq <= 4; seq++) {
      const schedDate = new Date(plan.startDate);
      schedDate.setMonth(schedDate.getMonth() + (seq * 3));
      batchPayouts.push({
        planId: plan.id,
        sequence: seq,
        scheduledDate: schedDate,
        monetaryAmountUsd: plan.quarterlyMarginUsd,
        status: seq <= 2 ? "Paid" as const : "Scheduled" as const,
        paidAt: seq <= 2 ? randomDate(30) : null,
      });
    }
  }

  for (let b = 0; b < batchPayouts.length; b += 100) {
    await db.insert(bnslPayouts).values(batchPayouts.slice(b, b + 100));
  }

  console.log(`  Created ${batchWallets.length} BNSL wallets, ${batchPlans.length} plans, ${batchPayouts.length} payouts`);
}

async function seedFinaBridge(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding FinaBridge data...`);

  const businessUsers = getApprovedBusinessUsers(seededUsers);
  const importers = businessUsers.filter((_, i) => i % 2 === 0);
  const exporters = businessUsers.filter((_, i) => i % 2 !== 0);

  const fbWallets = businessUsers.map(su => ({
    userId: su.id,
    availableGoldGrams: (Math.random() * 100).toFixed(6),
    lockedGoldGrams: "0",
    incomingLockedGoldGrams: "0",
  }));

  await db.insert(finabridgeWallets).values(fbWallets);

  const tradeStatusOptions: Array<"Draft" | "Open" | "Proposal Review" | "Awaiting Importer" | "Active Trade" | "Completed"> = 
    ["Open", "Proposal Review", "Awaiting Importer", "Active Trade", "Completed", "Draft"];
  const goodsNames = ["Electronics Components", "Textiles & Fabrics", "Agricultural Products", "Machinery Parts", "Pharmaceutical Supplies"];

  const batchRequests = [];
  for (let i = 0; i < 10; i++) {
    const importer = importers[i % importers.length];
    const tradeValue = (5000 + Math.random() * 50000).toFixed(2);
    const goldGrams = (parseFloat(tradeValue) / 93.5).toFixed(6);

    batchRequests.push({
      tradeRefId: `TR-DEMO-${Date.now().toString(36).toUpperCase()}-${i.toString().padStart(3, '0')}`,
      importerUserId: importer.id,
      goodsName: goodsNames[i % goodsNames.length],
      description: `Demo trade for ${goodsNames[i % goodsNames.length]}`,
      quantity: `${10 + Math.floor(Math.random() * 100)} units`,
      incoterms: ["FOB", "CIF", "EXW", "DDP"][i % 4],
      destination: ["Dubai, UAE", "Mumbai, India", "London, UK", "Singapore"][i % 4],
      tradeValueUsd: tradeValue,
      settlementGoldGrams: goldGrams,
      goldPriceUsdPerGram: "93.50",
      status: tradeStatusOptions[i % tradeStatusOptions.length],
      createdAt: randomDate(60),
    });
  }

  const insertedRequests = await db.insert(tradeRequests).values(batchRequests).returning({ id: tradeRequests.id, status: tradeRequests.status });

  const batchProposals = [];
  for (const req of insertedRequests) {
    if (req.status === "Draft") continue;
    const exporter = exporters[Math.floor(Math.random() * exporters.length)];
    batchProposals.push({
      tradeRequestId: req.id,
      exporterUserId: exporter.id,
      quotePrice: (5000 + Math.random() * 50000).toFixed(2),
      timelineDays: 14 + Math.floor(Math.random() * 30),
      notes: "Demo proposal with competitive pricing",
      portOfLoading: "Jebel Ali",
      shippingMethod: "Sea Freight",
      incoterms: "FOB",
      status: "Submitted" as const,
    });
  }

  if (batchProposals.length > 0) {
    await db.insert(tradeProposals).values(batchProposals);
  }

  console.log(`  Created ${fbWallets.length} FB wallets, ${batchRequests.length} trade requests, ${batchProposals.length} proposals`);
}

async function seedFinaCard(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding FinaCard data...`);

  const approvedUsers = getApprovedUsers(seededUsers).filter(u => u.role !== "admin");
  const cardStatuses: Array<"applied" | "under_review" | "approved" | "active" | "frozen"> = 
    ["applied", "under_review", "approved", "active", "active"];

  const batchCards = [];
  for (let i = 0; i < 20; i++) {
    const user = approvedUsers[i % approvedUsers.length];
    const status = cardStatuses[i % cardStatuses.length];
    const last4 = (1000 + Math.floor(Math.random() * 8999)).toString();

    batchCards.push({
      userId: user.id,
      cardType: i % 3 === 0 ? "physical" as const : "virtual" as const,
      cardStatus: status,
      last4Digits: status === "active" || status === "approved" || status === "frozen" ? last4 : null,
      expiryMonth: status !== "applied" ? 12 : null,
      expiryYear: status !== "applied" ? 2028 : null,
      dailyLimitGrams: "5",
      monthlyLimitGrams: "50",
      isFrozen: status === "frozen",
      reviewedAt: status !== "applied" ? randomDate(30) : null,
      issuedAt: status === "active" || status === "frozen" ? randomDate(20) : null,
      activatedAt: status === "active" ? randomDate(10) : null,
    });
  }

  const insertedCards = await db.insert(finacardCards).values(batchCards).returning({ 
    id: finacardCards.id, userId: finacardCards.userId, cardStatus: finacardCards.cardStatus 
  });

  const activeCards = insertedCards.filter(c => c.cardStatus === "active");
  const merchants = ["Amazon.ae", "Carrefour", "Noon.com", "ADNOC", "Starbucks", "Emirates NBD ATM", "Apple Store", "Sharaf DG"];
  const categories = ["Online Shopping", "Groceries", "E-commerce", "Fuel", "Cafe", "ATM", "Electronics", "Electronics"];

  const batchSpending = [];
  for (const card of activeCards) {
    const spendCount = 3 + Math.floor(Math.random() * 5);
    for (let s = 0; s < spendCount; s++) {
      const merchantIdx = (s + Math.floor(Math.random() * merchants.length)) % merchants.length;
      const amountLocal = (10 + Math.random() * 500).toFixed(2);
      const goldPrice = 93.5;
      const goldDeducted = (parseFloat(amountLocal) / goldPrice).toFixed(6);

      batchSpending.push({
        userId: card.userId,
        cardId: card.id,
        merchantName: merchants[merchantIdx],
        merchantCategory: categories[merchantIdx],
        merchantCountry: "AE",
        amountLocal,
        currencyLocal: "AED",
        goldGramsDeducted: goldDeducted,
        goldPriceAtTime: goldPrice.toFixed(6),
        usdEquivalent: (parseFloat(amountLocal) / 3.67).toFixed(2),
        fxRate: "3.670000",
        fxFeeGrams: (parseFloat(goldDeducted) * 0.01).toFixed(6),
        status: "completed" as const,
        createdAt: randomDate(30),
      });
    }
  }

  if (batchSpending.length > 0) {
    await db.insert(finacardSpending).values(batchSpending);
  }

  const batchTransfers = [];
  for (const card of activeCards) {
    batchTransfers.push({
      userId: card.userId,
      type: "fund" as const,
      goldGrams: (5 + Math.random() * 20).toFixed(6),
      goldPriceUsdPerGram: "93.50",
      usdEquivalent: ((5 + Math.random() * 20) * 93.5).toFixed(2),
      note: "Initial card funding",
    });
  }

  if (batchTransfers.length > 0) {
    await db.insert(finacardTransfers).values(batchTransfers);
  }

  console.log(`  Created ${batchCards.length} cards, ${batchSpending.length} spending records, ${batchTransfers.length} card transfers`);
}

async function seedNotifications(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding notifications...`);

  const types = ["transaction", "system", "info", "success", "kyc"];
  const titles = ["Transaction Completed", "Welcome to Finatrades", "Account Update", "Action Completed", "KYC Update"];
  const messages = [
    "Your gold purchase has been processed successfully.",
    "Welcome! Start by completing your identity verification.",
    "Your account settings have been updated.",
    "Your requested action was completed successfully.",
    "Your KYC verification status has been updated."
  ];

  const batchNotifications = [];
  for (const su of seededUsers) {
    const notifCount = 3 + Math.floor(Math.random() * 5);
    for (let n = 0; n < notifCount; n++) {
      const idx = n % types.length;
      batchNotifications.push({
        userId: su.id,
        type: types[idx],
        title: titles[idx],
        message: messages[idx],
        read: Math.random() > 0.4,
      });
    }
  }

  for (let b = 0; b < batchNotifications.length; b += 100) {
    await db.insert(notifications).values(batchNotifications.slice(b, b + 100));
  }
  console.log(`  Created ${batchNotifications.length} notifications`);
}

async function seedQrPayments(seededUsers: SeededUser[]): Promise<void> {
  console.log(`Seeding QR payment invoices...`);

  const approvedUsers = getApprovedUsers(seededUsers);
  const batchInvoices = [];

  for (let i = 0; i < 10; i++) {
    const merchant = approvedUsers[i % approvedUsers.length];
    const goldGrams = (0.5 + Math.random() * 5).toFixed(6);

    batchInvoices.push({
      invoiceCode: `QR-DEMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      merchantId: merchant.id,
      goldGrams,
      amountUsd: (parseFloat(goldGrams) * 93.5).toFixed(2),
      goldPriceAtCreation: "93.50",
      description: `Demo QR payment #${i + 1}`,
      status: i < 3 ? "Active" as const : i < 7 ? "Paid" as const : "Expired" as const,
      payerId: i >= 3 && i < 7 ? approvedUsers[(i + 1) % approvedUsers.length].id : null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }

  await db.insert(qrPaymentInvoices).values(batchInvoices);
  console.log(`  Created ${batchInvoices.length} QR payment invoices`);
}

async function runSeeder(): Promise<void> {
  console.log("=".repeat(60));
  console.log("FINATRADES DEMO DATA SEEDER (50 Users)");
  console.log("=".repeat(60));
  console.log("");

  try {
    const startTime = Date.now();

    const seededUsers = await seedUsers();
    await seedWallets(seededUsers);
    await seedTransactions(seededUsers);
    await seedPeerTransfers(seededUsers);
    await seedDepositRequests(seededUsers);
    await seedWithdrawalRequests(seededUsers);
    await seedVaultHoldings(seededUsers);
    await seedBnslPlans(seededUsers);
    await seedFinaBridge(seededUsers);
    await seedFinaCard(seededUsers);
    await seedQrPayments(seededUsers);
    await seedNotifications(seededUsers);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("");
    console.log("=".repeat(60));
    console.log("SEEDING COMPLETE");
    console.log("=".repeat(60));
    console.log(`Duration: ${duration}s`);
    console.log("");
    console.log("Test credentials (all use password: DemoTest123!):");
    console.log("  Admin:              demo_user_0@finatrades-test.com");
    console.log("  Business (import):  demo_user_6@finatrades-test.com");
    console.log("  Business (export):  demo_user_5@finatrades-test.com");
    console.log("  Personal (KYC OK):  demo_user_15@finatrades-test.com");
    console.log("  Pending Review:     demo_user_35@finatrades-test.com");
    console.log("  No KYC:             demo_user_40@finatrades-test.com");
    console.log("  KYC Rejected:       demo_user_45@finatrades-test.com");
    console.log("");

  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

runSeeder();

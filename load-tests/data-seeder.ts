import { db } from "../server/db";
import { users, wallets, transactions, peerTransfers, notifications, bnslPlans } from "../shared/schema";
import bcrypt from "bcryptjs";

const TOTAL_USERS = 1000;
const BATCH_SIZE = 100;

interface SeedProgress {
  users: number;
  wallets: number;
  transactions: number;
  transfers: number;
  notifications: number;
}

const countries = ["AE", "US", "GB", "IN", "SG", "SA", "QA", "KW", "BH", "OM"];
const kycStatuses = ["Not Started", "In Progress", "Approved", "Approved", "Approved"];

function generatePhone(): string {
  return `+971${Math.floor(500000000 + Math.random() * 99999999)}`;
}

function generateEmail(index: number): string {
  const domains = ["testmail.com", "loadtest.io", "fakeuser.net"];
  return `loadtest_user_${index}@${domains[index % domains.length]}`;
}

function randomGoldBalance(): string {
  const balances = [0, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250];
  return balances[Math.floor(Math.random() * balances.length)].toFixed(6);
}

async function seedUsers(progress: SeedProgress): Promise<string[]> {
  const userIds: string[] = [];
  const hashedPassword = await bcrypt.hash("LoadTest123!", 10);
  
  console.log(`Seeding ${TOTAL_USERS} users in batches of ${BATCH_SIZE}...`);
  
  for (let batch = 0; batch < TOTAL_USERS / BATCH_SIZE; batch++) {
    const batchUsers = [];
    
    for (let i = 0; i < BATCH_SIZE; i++) {
      const index = batch * BATCH_SIZE + i;
      const isAdmin = index < 10;
      const isCorporate = !isAdmin && index < 100;
      
      batchUsers.push({
        email: generateEmail(index),
        password: hashedPassword,
        firstName: `LoadTest`,
        lastName: `User${index}`,
        phone: generatePhone(),
        country: countries[index % countries.length],
        role: isAdmin ? "admin" : "user",
        accountType: isCorporate ? "Business" : "Personal",
        kycStatus: kycStatuses[index % kycStatuses.length],
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      });
    }
    
    const inserted = await db.insert(users).values(batchUsers).returning({ id: users.id });
    userIds.push(...inserted.map(u => u.id));
    progress.users += BATCH_SIZE;
    
    if ((batch + 1) % 5 === 0) {
      console.log(`  Users: ${progress.users}/${TOTAL_USERS}`);
    }
  }
  
  return userIds;
}

async function seedWallets(userIds: string[], progress: SeedProgress): Promise<void> {
  console.log(`Seeding wallets for ${userIds.length} users...`);
  
  for (let batch = 0; batch < userIds.length / BATCH_SIZE; batch++) {
    const batchWallets = [];
    const start = batch * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, userIds.length);
    
    for (let i = start; i < end; i++) {
      batchWallets.push({
        userId: userIds[i],
        goldGrams: randomGoldBalance(),
        currency: "USD",
      });
    }
    
    await db.insert(wallets).values(batchWallets);
    progress.wallets += batchWallets.length;
    
    if ((batch + 1) % 5 === 0) {
      console.log(`  Wallets: ${progress.wallets}/${userIds.length}`);
    }
  }
}

async function seedTransactions(userIds: string[], progress: SeedProgress): Promise<void> {
  const TRANSACTIONS_PER_USER = 5;
  const totalTransactions = userIds.length * TRANSACTIONS_PER_USER;
  
  console.log(`Seeding ${totalTransactions} transactions...`);
  
  const types = ["Buy", "Sell", "Buy", "Buy", "Sell"];
  const statuses = ["Completed", "Completed", "Completed", "Pending", "Approved"];
  
  for (let batch = 0; batch < userIds.length / BATCH_SIZE; batch++) {
    const batchTransactions = [];
    const start = batch * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, userIds.length);
    
    for (let i = start; i < end; i++) {
      for (let t = 0; t < TRANSACTIONS_PER_USER; t++) {
        const amount = (50 + Math.random() * 500).toFixed(2);
        const goldGrams = (parseFloat(amount) / 93.5).toFixed(6);
        
        batchTransactions.push({
          userId: userIds[i],
          type: types[t % types.length],
          amountUsd: amount,
          goldGrams,
          pricePerGram: "93.50",
          status: statuses[t % statuses.length],
          paymentMethod: "Bank Transfer",
        });
      }
    }
    
    await db.insert(transactions).values(batchTransactions);
    progress.transactions += batchTransactions.length;
    
    if ((batch + 1) % 5 === 0) {
      console.log(`  Transactions: ${progress.transactions}/${totalTransactions}`);
    }
  }
}

async function seedPeerTransfers(userIds: string[], progress: SeedProgress): Promise<void> {
  const TRANSFERS_COUNT = Math.min(500, userIds.length);
  
  console.log(`Seeding ${TRANSFERS_COUNT} peer transfers...`);
  
  const batchTransfers = [];
  
  for (let i = 0; i < TRANSFERS_COUNT; i++) {
    const senderIndex = i % userIds.length;
    const recipientIndex = (i + 1) % userIds.length;
    const goldAmount = (0.1 + Math.random() * 2).toFixed(6);
    
    batchTransfers.push({
      senderId: userIds[senderIndex],
      recipientId: userIds[recipientIndex],
      goldGrams: goldAmount,
      channel: "FinaPay",
      status: "Completed",
    });
    
    if (batchTransfers.length >= BATCH_SIZE) {
      await db.insert(peerTransfers).values(batchTransfers);
      progress.transfers += batchTransfers.length;
      batchTransfers.length = 0;
      console.log(`  Transfers: ${progress.transfers}/${TRANSFERS_COUNT}`);
    }
  }
  
  if (batchTransfers.length > 0) {
    await db.insert(peerTransfers).values(batchTransfers);
    progress.transfers += batchTransfers.length;
  }
}

async function seedNotifications(userIds: string[], progress: SeedProgress): Promise<void> {
  const NOTIFICATIONS_PER_USER = 10;
  const totalNotifications = userIds.length * NOTIFICATIONS_PER_USER;
  
  console.log(`Seeding ${totalNotifications} notifications...`);
  
  const types = ["transaction", "system", "security", "promotion", "kyc"];
  const titles = [
    "Transaction Completed",
    "Welcome to Finatrades",
    "Security Alert",
    "Special Offer",
    "KYC Update",
  ];
  
  for (let batch = 0; batch < userIds.length / BATCH_SIZE; batch++) {
    const batchNotifications = [];
    const start = batch * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, userIds.length);
    
    for (let i = start; i < end; i++) {
      for (let n = 0; n < NOTIFICATIONS_PER_USER; n++) {
        batchNotifications.push({
          userId: userIds[i],
          type: types[n % types.length],
          title: titles[n % titles.length],
          message: `Load test notification ${n} for user ${i}`,
          isRead: Math.random() > 0.3,
        });
      }
    }
    
    await db.insert(notifications).values(batchNotifications);
    progress.notifications += batchNotifications.length;
    
    if ((batch + 1) % 5 === 0) {
      console.log(`  Notifications: ${progress.notifications}/${totalNotifications}`);
    }
  }
}

async function runSeeder(): Promise<void> {
  console.log("=".repeat(60));
  console.log("FINATRADES LOAD TEST DATA SEEDER");
  console.log("=".repeat(60));
  console.log(`Target: ${TOTAL_USERS} users with related data`);
  console.log("");
  
  const progress: SeedProgress = {
    users: 0,
    wallets: 0,
    transactions: 0,
    transfers: 0,
    notifications: 0,
  };
  
  try {
    const startTime = Date.now();
    
    const userIds = await seedUsers(progress);
    await seedWallets(userIds, progress);
    await seedTransactions(userIds, progress);
    await seedPeerTransfers(userIds, progress);
    await seedNotifications(userIds, progress);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log("");
    console.log("=".repeat(60));
    console.log("SEEDING COMPLETE");
    console.log("=".repeat(60));
    console.log(`Duration: ${duration}s`);
    console.log(`Users: ${progress.users}`);
    console.log(`Wallets: ${progress.wallets}`);
    console.log(`Transactions: ${progress.transactions}`);
    console.log(`Peer Transfers: ${progress.transfers}`);
    console.log(`Notifications: ${progress.notifications}`);
    console.log("");
    console.log("Test credentials:");
    console.log("  Email: loadtest_user_0@testmail.com");
    console.log("  Password: LoadTest123!");
    
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

runSeeder();

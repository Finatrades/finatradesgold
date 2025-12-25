import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface ChatbotResponse {
  message: string;
  category: string;
  confidence: number;
  suggestedActions?: string[];
  escalateToHuman?: boolean;
}

// User context for personalized responses (only for authenticated users)
export interface UserContext {
  userId: string;
  userName: string;
  goldBalance: number; // in grams
  usdValue: number; // current USD value of gold
  vaultGold: number; // gold in vault (grams)
  kycStatus: string;
}

// Platform configuration for dynamic knowledge base
export interface PlatformConfig {
  // Gold Pricing
  buySpreadPercent: number;
  sellSpreadPercent: number;
  storageFeePercent: number;
  minTradeAmount: number;
  
  // Transaction Limits by Tier
  tier1DailyLimit: number;
  tier1MonthlyLimit: number;
  tier2DailyLimit: number;
  tier2MonthlyLimit: number;
  tier3DailyLimit: number;
  tier3MonthlyLimit: number;
  
  // Deposit/Withdrawal
  minDeposit: number;
  maxDepositSingle: number;
  dailyDepositLimit: number;
  minWithdrawal: number;
  maxWithdrawalSingle: number;
  withdrawalFeePercent: number;
  withdrawalFeeFixed: number;
  
  // P2P
  minP2pTransfer: number;
  maxP2pTransfer: number;
  p2pFeePercent: number;
  
  // BNSL
  bnslMinAmount: number;
  bnslMaxTermMonths: number;
  bnslEarlyExitPenalty: number;
  
  // Payment Fees
  cardFeePercent: number;
  cardFeeFixed: number;
  bankTransferFeePercent: number;
  cryptoFeePercent: number;
}

interface FAQEntry {
  keywords: string[];
  patterns: RegExp[];
  response: string;
  category: string;
  actions?: string[];
}

// Rate limiting for chatbot
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // Max 20 messages per minute

export function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitMap.entries());
  for (const [key, value] of entries) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 300000); // Clean every 5 minutes

const FAQ_DATABASE: FAQEntry[] = [
  // KB-01 — What Is Finatrades
  {
    keywords: ['what is finatrades', 'about finatrades', 'finatrades platform', 'what does finatrades do'],
    patterns: [/what is finatrades/i, /about finatrades/i, /tell me about finatrades/i, /what does finatrades do/i],
    response: "Finatrades is a gold-backed digital financial platform that allows users to store, transfer, earn, and settle value using physical gold.\n\nAlthough balances are displayed in USD for convenience, all real value is held in gold grams. Every gram shown on the platform is backed by physical gold stored securely with our vault partner, Wingold & Metals DMCC.\n\nFinatrades combines the reliability of physical gold with the usability of modern digital banking, without relying on fiat inflation or speculative assets.",
    category: 'general',
    actions: ['Learn More', 'Sign Up']
  },
  // KB-02 — Gold vs USD (Critical Concept)
  {
    keywords: ['usd changed', 'balance changed', 'gold vs usd', 'why usd', 'value changed'],
    patterns: [/why (did|does) my (usd|balance|value) chang/i, /gold vs usd/i, /usd reference/i, /balance show usd/i, /value (is different|changed)/i],
    response: "On Finatrades, gold grams are your actual balance. USD is shown only as a reference value so users can easily understand worth.\n\nYour USD value may change with market prices, but your gold grams remain the same unless you:\n• Add funds\n• Send or receive payments\n• Lock gold in BNSL or trade settlement\n• Withdraw or sell gold\n\nRemember: Gold is your real asset. USD is just for display.",
    category: 'account',
    actions: ['View Dashboard']
  },
  // KB-03 — Account Types
  {
    keywords: ['personal account', 'business account', 'account type', 'account difference'],
    patterns: [/personal (vs|or|and) business/i, /account type/i, /difference between.*account/i, /business account/i, /personal account/i],
    response: "Finatrades offers two account types:\n\n**Personal Account includes:**\n• FinaPay (gold-backed wallet)\n• FinaVault (secure gold storage)\n• BNSL (gold-based yield plans)\n\n**Business Account includes:**\n• All Personal features\n• FinaBridge (trade settlement for importers/exporters)\n\nThe only difference is access to trade finance tools.",
    category: 'account',
    actions: ['View Profile']
  },
  // KB-04 — FinaPay Overview
  {
    keywords: ['finapay', 'what is finapay', 'digital wallet', 'gold wallet'],
    patterns: [/what is finapay/i, /finapay wallet/i, /digital wallet/i, /gold wallet/i],
    response: "FinaPay is your gold-backed digital wallet.\n\nYou can:\n• Add funds (Card / Bank / Crypto)\n• Send payments to other users\n• Request payments from others\n\nAll transactions represent gold ownership transfers, even though amounts are displayed in USD for convenience.",
    category: 'finapay',
    actions: ['Go to FinaPay', 'Deposit Funds']
  },
  // KB-05 — Add Funds Process
  {
    keywords: ['add funds', 'how add funds works', 'deposit process', 'fund wallet'],
    patterns: [/how (does )?add funds work/i, /add funds process/i, /deposit process/i, /funding process/i],
    response: "Here's how Add Funds works:\n\n1. Enter amount in USD\n2. See equivalent gold grams\n3. Submit payment\n4. Payment is verified and approved\n5. Physical gold is purchased and stored\n6. Gold grams are credited to your wallet\n\nAfter approval, you receive:\n• Digital Ownership Certificate (from Finatrades)\n• Physical Storage Certificate (from Wingold & Metals DMCC)",
    category: 'deposits',
    actions: ['Deposit Funds']
  },
  // Gold Buying (enhanced)
  {
    keywords: ['buy', 'purchase', 'gold', 'how to buy'],
    patterns: [/how (do i|can i|to) buy/i, /buy gold/i, /purchase gold/i, /want to buy/i],
    response: "To buy gold on Finatrades:\n\n1. First, deposit funds into your FinaPay wallet\n2. Go to the 'Buy Gold' section\n3. Enter the USD amount you want to spend\n4. Review the gold grams you'll receive and confirm\n\nYour gold is stored securely in your digital wallet. You can also transfer it to FinaVault for long-term storage.",
    category: 'trading',
    actions: ['Go to Buy Gold', 'Deposit Funds']
  },
  // Gold Selling (enhanced)
  {
    keywords: ['sell', 'gold', 'cash out', 'convert'],
    patterns: [/how (do i|can i|to) sell/i, /sell gold/i, /cash out/i, /convert gold/i],
    response: "To sell gold on Finatrades:\n\n1. Go to 'Sell Gold' in your FinaPay section\n2. Enter the amount of gold grams to sell\n3. Review the USD value you'll receive\n4. Confirm the sale\n\nFunds will be credited to your wallet balance and can be withdrawn to your bank account.",
    category: 'trading',
    actions: ['Go to Sell Gold']
  },
  // Deposits / Add Funds
  {
    keywords: ['deposit', 'add funds', 'fund account', 'payment', 'add money', 'top up', 'load funds'],
    patterns: [/how (do i|can i|to) deposit/i, /add (funds|money)/i, /deposit (funds|money)/i, /fund my account/i, /add fund/i, /top.?up/i, /load.*(funds|money|wallet)/i],
    response: "__DEPOSIT_INFO__",
    category: 'deposits',
    actions: ['Deposit Funds', 'Go to FinaPay']
  },
  // Withdrawals
  {
    keywords: ['withdraw', 'withdrawal', 'bank', 'transfer out'],
    patterns: [/how (do i|can i|to) withdraw/i, /withdraw (funds|money)/i, /transfer to bank/i, /cash out to bank/i],
    response: "To withdraw funds to your bank:\n\n1. Go to FinaPay > Withdraw\n2. Select your bank account (or add a new one)\n3. Enter the withdrawal amount\n4. Confirm the transaction\n\nWithdrawals typically process within 1-3 business days. A small fee may apply.",
    category: 'withdrawals',
    actions: ['Withdraw Funds']
  },
  // KB-06 — FinaVault Explained
  {
    keywords: ['vault', 'finavault', 'storage', 'secure', 'store gold', 'gold vault'],
    patterns: [/what is (fina)?vault/i, /vault storage/i, /store (my )?gold/i, /secure storage/i, /long.?term/i, /gold vault/i],
    response: "FinaVault is your digital gold vault.\n\nIt shows:\n• Total gold owned\n• Available gold\n• Locked gold\n• Certificates\n\nFinaVault is the official record of your gold ownership on Finatrades. Your gold is stored in insured, Grade-A vaults and you can cash out or transfer back to wallet anytime.",
    category: 'vault',
    actions: ['Go to FinaVault']
  },
  // KB-07 — Physical Gold Deposit
  {
    keywords: ['physical gold', 'deposit gold', 'own gold', 'bring gold'],
    patterns: [/physical gold/i, /deposit (my )?gold/i, /bring (my )?gold/i, /own gold/i],
    response: "You may deposit your own physical gold.\n\nProcess:\n1. Submit deposit request\n2. Gold is verified and stored\n3. Admin approves\n4. Digital gold credited\n5. Certificates issued\n\nYour gold becomes usable inside FinaPay after approval.",
    category: 'vault',
    actions: ['Submit Deposit Request']
  },
  // KB-08 — Buy Gold Bar
  {
    keywords: ['gold bar', 'wingold', 'buy bar', 'physical purchase'],
    patterns: [/gold bar/i, /wingold/i, /buy (a )?bar/i, /physical (gold )?purchase/i],
    response: "You may purchase gold bars through Wingold & Metals.\n\nSteps:\n1. Complete purchase on partner site\n2. Upload receipt\n3. Admin verifies storage\n4. Gold credited digitally\n5. Certificates issued\n\nUntil verification, balance may show as pending.",
    category: 'vault',
    actions: ['Learn More']
  },
  // KB-09 — Send Payment (enhanced)
  {
    keywords: ['send payment', 'send gold', 'transfer gold', 'pay someone'],
    patterns: [/send (a )?payment/i, /send gold/i, /transfer gold/i, /pay someone/i],
    response: "Sending a payment transfers gold ownership.\n\nSteps:\n1. Enter receiver email\n2. Enter USD amount (gold shown)\n3. Confirm transfer\n\nSender receives: Transfer Certificate\nReceiver receives: Digital Ownership Certificate\n\nGold remains physically stored. Transfers are instant and free!",
    category: 'transfers',
    actions: ['Transfer Gold']
  },
  // KB-10 — Request Payment
  {
    keywords: ['request payment', 'ask for payment', 'receive payment'],
    patterns: [/request (a )?payment/i, /ask for payment/i, /receive payment/i],
    response: "Request Payment allows you to ask another Finatrades user for gold.\n\nOnce paid:\n• Ownership transfers\n• Certificates are issued\n• Balances update automatically\n\nThis is useful for invoicing or receiving payments from other users.",
    category: 'transfers',
    actions: ['Request Payment']
  },
  // KB-11 — BNSL Plans (enhanced)
  {
    keywords: ['bnsl', 'buy now sell later', 'lock', 'profit', 'guaranteed', 'yield', 'returns'],
    patterns: [/what is bnsl/i, /buy now sell later/i, /lock gold/i, /guaranteed (return|profit)/i, /bnsl (plan|return)/i],
    response: "BNSL (Buy Now Sell Later) allows you to commit gold for a fixed term and earn a margin.\n\nPlans:\n• 12 months → 10%\n• 24 months → 11%\n• 36 months → 12%\n\nGold is locked during the term. Returns accrue daily and are paid quarterly in gold value.\n\nNote: Returns are defined per plan terms and settled quarterly.",
    category: 'bnsl',
    actions: ['Explore BNSL Plans']
  },
  // KB-12 — Locked vs Available Balance
  {
    keywords: ['locked', 'locked gold', 'unavailable', 'why locked', 'available balance'],
    patterns: [/locked (gold|balance)/i, /why (is|are) (my )?.*locked/i, /unavailable/i, /available (vs|and) locked/i],
    response: "Gold may be locked if:\n• It is committed to a BNSL plan\n• It is reserved for a trade settlement (FinaBridge)\n\nOnly available gold can be transferred or spent. Locked gold remains safely stored and will become available when the plan or trade completes.",
    category: 'account',
    actions: ['View Dashboard']
  },
  // KB-13 — FinaBridge Overview (enhanced)
  {
    keywords: ['finabridge', 'trade finance', 'business', 'b2b', 'import', 'export', 'trade settlement'],
    patterns: [/what is finabridge/i, /trade finance/i, /business (trading|gold)/i, /import|export/i, /trade settlement/i],
    response: "FinaBridge is a business-only module for gold-backed trade settlement between importers and exporters.\n\nGold is locked as settlement collateral and released upon trade completion.\n\nFeatures:\n• Document verification and escrow services\n• Deal room for secure negotiations\n• Transparent fees and tracking\n\nContact our team to set up a business account.",
    category: 'finabridge',
    actions: ['Contact Support', 'Learn More']
  },
  // KB-14 — Trade Flow (Importer)
  {
    keywords: ['importer', 'import trade', 'trade request', 'importer flow'],
    patterns: [/importer/i, /import trade/i, /trade request/i, /importer flow/i],
    response: "Importer Trade Flow:\n\n1. Create trade request\n2. Receive exporter proposals\n3. Select proposal\n4. Lock settlement gold\n5. Enter deal room\n6. Admin finalizes settlement\n\nImporter details are protected throughout the process.",
    category: 'finabridge',
    actions: ['Create Trade Request']
  },
  // KB-15 — Trade Flow (Exporter)
  {
    keywords: ['exporter', 'export trade', 'proposal', 'exporter flow'],
    patterns: [/exporter/i, /export trade/i, /submit proposal/i, /exporter flow/i],
    response: "Exporter Trade Flow:\n\n1. View trade requests via Finatrades ID\n2. Submit proposals\n3. See locked settlement indicator\n4. Communicate in deal room\n\nNo personal importer data is shared initially for privacy.",
    category: 'finabridge',
    actions: ['View Trade Requests']
  },
  // Fees
  {
    keywords: ['fee', 'fees', 'cost', 'charges', 'spread', 'commission'],
    patterns: [/what are the fees/i, /how much (does it|do you) charge/i, /trading fee/i, /spread/i, /commission/i],
    response: "Our fee structure is transparent:\n\n• Buy Gold: ~0.5% spread\n• Sell Gold: ~1.5% spread\n• Deposits: 0.5%\n• Withdrawals: 1.5%\n• P2P Transfers: Free\n• Vault Storage: 0.5% annually\n\nAll fees are shown before you confirm any transaction.",
    category: 'fees',
    actions: ['View All Fees']
  },
  // KYC
  {
    keywords: ['kyc', 'verify', 'verification', 'identity', 'documents'],
    patterns: [/kyc/i, /verify (my )?(identity|account)/i, /verification/i, /upload documents/i, /id verification/i],
    response: "KYC verification unlocks higher transaction limits:\n\n1. Go to Settings > KYC Verification\n2. Upload required documents (ID, proof of address)\n3. Complete liveness verification\n4. Wait for approval (usually within 24 hours)\n\nBasic verification allows up to $5,000/day. Enhanced verification unlocks $50,000/day.",
    category: 'kyc',
    actions: ['Start KYC Verification']
  },
  // Security
  {
    keywords: ['security', 'safe', '2fa', 'mfa', 'two factor', 'protect'],
    patterns: [/is (it|my gold) safe/i, /security/i, /2fa|mfa|two.?factor/i, /protect my account/i],
    response: "Your security is our priority:\n\n• 256-bit SSL encryption\n• Two-factor authentication (2FA) available\n• Biometric login support\n• Gold stored in insured Grade-A vaults\n• Regular security audits\n• 24/7 monitoring\n\nEnable 2FA in Settings for extra protection.",
    category: 'security',
    actions: ['Enable 2FA', 'Security Settings']
  },
  // Gold Price
  {
    keywords: ['gold price', 'current price', 'rate', 'spot price', 'market price'],
    patterns: [/gold price/i, /current (gold )?price/i, /spot price/i, /market (price|rate)/i, /price per gram/i],
    response: "Gold prices on Finatrades are updated in real-time based on international market rates. The current price is displayed on your dashboard and in the Buy/Sell sections.\n\nWe source prices from major gold markets and apply a small spread for trading. You can view live price charts in the Market section.",
    category: 'pricing',
    actions: ['View Current Price', 'Price Charts']
  },
  // Account Creation (Enhanced)
  {
    keywords: ['account', 'register', 'sign up', 'create account', 'new account', 'join'],
    patterns: [/create (an )?account/i, /sign up/i, /register/i, /open account/i, /new account/i, /how (do i|to) join/i],
    response: "Creating a Finatrades account is simple:\n\n1. Choose account type (Personal or Business)\n2. Enter your email address\n3. Create a secure password\n4. Verify your email via the link sent to you\n5. Complete your profile information\n\nAfter email verification, you can access basic features. Complete KYC verification to unlock full platform access and higher limits.\n\nNeed step-by-step guidance? Chat with Juris AI for personalized registration assistance.",
    category: 'account',
    actions: ['Sign Up', 'Talk to Juris AI']
  },
  // Email Verification
  {
    keywords: ['email verification', 'verify email', 'email link', 'verification email', 'confirm email'],
    patterns: [/email verification/i, /verify (my )?email/i, /verification (link|email)/i, /confirm (my )?email/i, /didn't receive email/i],
    response: "Email verification is required to activate your account:\n\n**How it works:**\n1. After registration, a verification link is sent to your email\n2. Click the link to verify your email address\n3. Your account is now active for basic features\n\n**Didn't receive the email?**\n• Check your spam/junk folder\n• Make sure you entered the correct email\n• Request a new verification email from the login page\n\nEmail verification typically takes 1-2 minutes to arrive.",
    category: 'account',
    actions: ['Resend Verification', 'Contact Support']
  },
  // Finatrades KYC (Main Entry)
  {
    keywords: ['finatrades kyc', 'kyc process', 'verification process', 'kyc steps', 'how kyc works'],
    patterns: [/finatrades kyc/i, /kyc process/i, /verification process/i, /kyc steps/i, /how (does )?kyc work/i, /complete kyc/i],
    response: "Finatrades KYC verification unlocks full platform access:\n\n**Verification Tiers:**\n• Basic (Tier 1) - Quick verification, basic limits\n• Enhanced (Tier 2) - Full access, higher limits\n• Corporate (Tier 3) - Business accounts\n\n**Required Documents:**\n• Valid ID (Passport, National ID, or Driver's License)\n• Proof of Address (utility bill, bank statement)\n• Selfie with ID for liveness verification\n\n**Processing Time:**\n• Basic: 1-2 hours\n• Enhanced: 1-2 business days\n• Corporate: 3-5 business days\n\nFor guided assistance, chat with **Juris AI** - our specialized KYC assistant.",
    category: 'kyc',
    actions: ['Start KYC', 'Talk to Juris AI']
  },
  // Juris AI Reference
  {
    keywords: ['juris', 'juris ai', 'registration assistant', 'kyc assistant', 'kyc help'],
    patterns: [/juris/i, /juris ai/i, /registration assistant/i, /kyc (help|assistant|guide)/i],
    response: "**Juris AI** is our specialized registration and KYC assistant.\n\nJuris can help you with:\n• Creating a new account step-by-step\n• Completing KYC verification\n• Document requirements and tips\n• Checking verification status\n\nTo chat with Juris AI, select the 'Juris AI' agent from the chat options or click 'Talk to Juris AI' below.",
    category: 'support',
    actions: ['Talk to Juris AI']
  },
  // Transfer / P2P
  {
    keywords: ['transfer', 'send gold', 'p2p', 'peer to peer', 'gift'],
    patterns: [/transfer gold/i, /send gold/i, /p2p/i, /peer.?to.?peer/i, /gift gold/i],
    response: "You can transfer gold to other Finatrades users for free:\n\n1. Go to FinaPay > Transfer\n2. Enter the recipient's email or username\n3. Enter the amount in gold grams or USD\n4. Confirm the transfer\n\nTransfers are instant and there's no fee for P2P transfers!",
    category: 'transfers',
    actions: ['Transfer Gold']
  },
  // Limits
  {
    keywords: ['limit', 'limits', 'maximum', 'minimum', 'how much can'],
    patterns: [/limit/i, /maximum/i, /minimum/i, /how much can i/i],
    response: "Transaction limits depend on your KYC tier:\n\n**Basic (No KYC):**\n• Daily: $1,000\n• Monthly: $5,000\n\n**Tier 1 (Basic KYC):**\n• Daily: $5,000\n• Monthly: $20,000\n\n**Tier 2 (Enhanced KYC):**\n• Daily: $50,000\n• Monthly: $250,000\n\nComplete KYC verification to increase your limits.",
    category: 'limits',
    actions: ['View My Limits', 'Start KYC']
  },
  // Support / Help
  {
    keywords: ['help', 'support', 'contact', 'problem', 'issue', 'complaint'],
    patterns: [/need help/i, /contact support/i, /problem with/i, /having (an )?issue/i, /customer (support|service)/i],
    response: "I'm here to help! If you need further assistance:\n\n• Email: support@finatrades.com\n• Live Chat: Available 9 AM - 6 PM GMT\n• Response Time: Usually within 24 hours\n\nPlease describe your issue and I'll do my best to assist, or connect you with our support team.",
    category: 'support',
    actions: ['Contact Support', 'Speak to Agent']
  },
  // Card/Crypto Deposits
  {
    keywords: ['card', 'credit card', 'debit card', 'crypto', 'bitcoin', 'usdt', 'cryptocurrency'],
    patterns: [/card (deposit|payment)/i, /pay (with|by) card/i, /crypto (deposit|payment)/i, /bitcoin/i, /usdt/i, /cryptocurrency/i],
    response: "We accept multiple payment methods:\n\n**Card Payments:**\n• Visa and Mastercard supported\n• Instant processing\n• 3D Secure verification\n\n**Crypto Deposits:**\n• Bitcoin (BTC)\n• USDT (TRC20/ERC20)\n• Crypto deposits convert to USD at current rates\n\nGo to FinaPay > Deposit to choose your preferred method.",
    category: 'deposits',
    actions: ['Deposit Funds']
  },
  // KB-16 — Certificates Explained
  {
    keywords: ['certificate', 'ownership', 'proof', 'document', 'verify', 'storage certificate'],
    patterns: [/certificate/i, /proof of ownership/i, /verify (my )?gold/i, /gold document/i, /storage certificate/i],
    response: "Finatrades provides multiple certificate types:\n\n• Digital Ownership Certificate — issued by Finatrades\n• Physical Storage Certificate — issued by Wingold & Metals DMCC\n• Transfer Certificate — issued on payments\n\nCertificates are issued after verification and approval. View your certificates in FinaVault > My Holdings.",
    category: 'certificates',
    actions: ['View Certificates']
  },
  // KB-17 — Pending Status
  {
    keywords: ['pending', 'waiting', 'processing', 'not complete', 'transaction pending'],
    patterns: [/pending/i, /why (is )?(my )?.*pending/i, /waiting/i, /processing/i, /not complete/i, /transaction pending/i],
    response: "A transaction may be pending due to:\n• Payment verification\n• Gold allocation confirmation\n• Compliance review\n\nYour request is under verification and will be completed after approval. Once approved, balances and certificates update automatically.",
    category: 'support',
    actions: ['View Transaction History']
  },
  // KB-18 — Security & Transparency
  {
    keywords: ['security', 'safe', 'protect', 'transparency', 'protected', 'secure'],
    patterns: [/is (it|my gold) safe/i, /security/i, /protect/i, /how.*protected/i, /transparency/i],
    response: "Your gold is protected by:\n\n• Physical storage in secure vaults\n• Digital ownership ledger\n• No rehypothecation (your gold is never lent out)\n• Full audit trail\n• Certificate-backed balances\n\nYour security is our priority.",
    category: 'security',
    actions: ['Security Settings']
  },
  // MFA / Two-Factor
  {
    keywords: ['mfa', '2fa', 'two factor', 'authenticator', 'google authenticator', 'security code'],
    patterns: [/mfa/i, /2fa/i, /two.?factor/i, /authenticator/i, /security code/i, /enable (2fa|mfa)/i],
    response: "To enable Two-Factor Authentication (2FA):\n\n1. Go to Settings > Security\n2. Click 'Enable 2FA'\n3. Scan the QR code with Google Authenticator or similar app\n4. Enter the 6-digit code to verify\n5. Save your backup codes securely\n\n2FA adds an extra layer of protection to your account.",
    category: 'security',
    actions: ['Enable 2FA']
  },
  // Biometric
  {
    keywords: ['biometric', 'fingerprint', 'face id', 'touch id', 'face recognition'],
    patterns: [/biometric/i, /fingerprint/i, /face.?id/i, /touch.?id/i],
    response: "Biometric login is available on our mobile app:\n\n• Face ID / Touch ID for iOS\n• Fingerprint for Android\n• Enable in Settings > Security > Biometric Login\n\nNote: You'll still need your password as a backup.",
    category: 'security',
    actions: ['Security Settings']
  },
  // Disputes / Chargebacks
  {
    keywords: ['dispute', 'chargeback', 'refund', 'wrong amount', 'missing', 'not received'],
    patterns: [/dispute/i, /chargeback/i, /refund/i, /wrong (amount|transaction)/i, /not received/i, /missing (gold|funds|deposit)/i],
    response: "For transaction disputes or refunds:\n\n1. First, check your transaction history for the exact details\n2. If you see an issue, contact support with:\n   • Transaction ID\n   • Date and amount\n   • Description of the problem\n\nWe investigate all disputes within 5 business days. For urgent issues, please speak with an agent.",
    category: 'support',
    actions: ['Speak to Agent', 'Contact Support']
  },
  // BNSL Eligibility
  {
    keywords: ['bnsl eligible', 'bnsl requirements', 'can i use bnsl', 'bnsl minimum'],
    patterns: [/bnsl (eligible|eligibility|requirements?)/i, /can i (use|join|start) bnsl/i, /bnsl minimum/i],
    response: "BNSL (Buy Now Sell Later) eligibility requirements:\n\n• Minimum gold: 1 gram\n• Completed KYC verification (Tier 1 or higher)\n• Account in good standing\n• No active disputes\n\nLock periods range from 30 to 365 days. Longer terms offer higher guaranteed returns.",
    category: 'bnsl',
    actions: ['Start BNSL Plan', 'Complete KYC']
  },
  // Regulatory / Compliance
  {
    keywords: ['regulation', 'regulated', 'license', 'compliance', 'aml', 'legal'],
    patterns: [/regulat/i, /license/i, /compliance/i, /aml/i, /legal/i, /is it legal/i],
    response: "Finatrades operates with full regulatory compliance:\n\n• Licensed gold trading platform\n• AML/KYC compliant\n• Regular third-party audits\n• Transparent fee structure\n• Secure, insured vault storage\n\nFor specific regulatory questions in your region, please contact our compliance team.",
    category: 'compliance',
    actions: ['Contact Support']
  },
  // Country Restrictions
  {
    keywords: ['country', 'countries', 'available', 'restricted', 'region'],
    patterns: [/which countr/i, /available in/i, /restricted (countr|region)/i, /can i use from/i],
    response: "Finatrades is available in most countries worldwide. Some restrictions apply:\n\n• Services may be limited in sanctioned countries\n• Certain features may require local compliance verification\n• KYC requirements may vary by region\n\nCheck during registration if your country is supported.",
    category: 'compliance',
    actions: ['Sign Up']
  },
  // Balance Queries (requires authentication - handled dynamically)
  {
    keywords: ['balance', 'how much', 'my gold', 'my account', 'holdings', 'portfolio'],
    patterns: [/my balance/i, /how much (gold|do i have)/i, /my (gold|holdings|portfolio)/i, /what('s| is) my balance/i, /check (my )?balance/i, /account balance/i],
    response: '__BALANCE_QUERY__', // Special marker - handled by processUserMessage
    category: 'account',
    actions: ['View Dashboard']
  },
  // Account Status
  {
    keywords: ['account', 'status', 'kyc status', 'verification status'],
    patterns: [/my account/i, /account status/i, /kyc status/i, /verification status/i],
    response: '__ACCOUNT_STATUS__', // Special marker - handled by processUserMessage
    category: 'account',
    actions: ['View Profile']
  },
  // Dynamic Fee Queries
  {
    keywords: ['fee', 'fees', 'cost', 'charges', 'commission', 'spread'],
    patterns: [/what (are|is) the fee/i, /fee(s)? for/i, /how much (do you|is the) (charge|fee)/i, /trading fee/i, /spread/i, /commission/i],
    response: '__FEE_INFO__', // Dynamic - uses platform config
    category: 'fees',
    actions: ['View Fee Schedule']
  },
  // Dynamic Limit Queries
  {
    keywords: ['limit', 'limits', 'maximum', 'minimum', 'daily limit', 'monthly limit'],
    patterns: [/what (are|is) (the |my )?limit/i, /daily limit/i, /monthly limit/i, /max(imum)? (deposit|withdrawal|transfer)/i, /min(imum)? (deposit|withdrawal|amount)/i],
    response: '__LIMIT_INFO__', // Dynamic - uses platform config
    category: 'limits',
    actions: ['View My Limits', 'Start KYC']
  },
  // Dynamic Deposit Info
  {
    keywords: ['deposit info', 'deposit fee', 'deposit limit', 'deposit minimum'],
    patterns: [/deposit (fee|limit|min|max)/i, /how to deposit/i, /minimum deposit/i],
    response: '__DEPOSIT_INFO__', // Dynamic - uses platform config
    category: 'deposits',
    actions: ['Deposit Funds']
  },
  // Dynamic Withdrawal Info
  {
    keywords: ['withdrawal info', 'withdrawal fee', 'withdrawal limit', 'withdraw minimum'],
    patterns: [/withdrawal? (fee|limit|min|max)/i, /how to withdraw/i, /minimum withdrawal/i],
    response: '__WITHDRAWAL_INFO__', // Dynamic - uses platform config
    category: 'withdrawals',
    actions: ['Withdraw Funds']
  },
  // Dynamic BNSL Info
  {
    keywords: ['bnsl info', 'bnsl fee', 'bnsl limit', 'bnsl terms'],
    patterns: [/bnsl (fee|limit|term|min|max|penalty)/i, /early exit/i, /lock period/i],
    response: '__BNSL_INFO__', // Dynamic - uses platform config
    category: 'bnsl',
    actions: ['Start BNSL Plan']
  },
  // Current Gold Price
  {
    keywords: ['gold price', 'current price', 'price today', 'gold rate'],
    patterns: [/gold price/i, /current price/i, /price (today|now)/i, /gold rate/i, /what('s| is) the price/i],
    response: '__GOLD_PRICE__', // Dynamic - uses live gold price
    category: 'pricing',
    actions: ['Buy Gold', 'Sell Gold']
  },
  // --- ENHANCED FAQ ENTRIES ---
  
  // Why is my USD value different today
  {
    keywords: ['usd different', 'value changed overnight', 'balance dropped', 'lost money', 'value decreased'],
    patterns: [/why (is|did) my (usd|dollar|value|balance) (change|drop|decrease|go down|different)/i, /lost money overnight/i, /balance (dropped|went down|decreased)/i],
    response: "Your USD value changes because it reflects the current market price of gold.\n\n**Important:** Your gold grams haven't changed - only the USD display value has.\n\n• If gold price rises → your USD value increases\n• If gold price falls → your USD value decreases\n\n**Your gold grams only change when you:**\n• Buy or sell gold\n• Send or receive payments\n• Lock gold in BNSL\n• Make withdrawals\n\nCheck your transaction history to confirm your gold grams are unchanged.",
    category: 'account',
    actions: ['View Dashboard', 'Check Transactions']
  },
  // FinaCard (Coming Soon - Feature in Development)
  {
    keywords: ['finacard', 'fina card', 'debit card', 'gold card', 'visa', 'mastercard'],
    patterns: [/finacard/i, /fina card/i, /debit card/i, /gold (debit )?card/i, /visa|mastercard/i],
    response: "**FinaCard** - Gold-Backed Debit Card\n\n**Status:** Currently in development. We're working to bring you a physical card that lets you spend your gold holdings anywhere.\n\n**Planned Features (not yet available):**\n• Spend gold directly at merchants worldwide\n• Auto-convert gold to local currency at point of sale\n• Integration with major card networks\n\n**Want to be notified?** We'll announce the launch date via email and in-app notifications. Check your profile settings to ensure notifications are enabled.",
    category: 'products',
    actions: ['Enable Notifications']
  },
  // Mobile App
  {
    keywords: ['mobile app', 'ios', 'android', 'app store', 'play store', 'download app'],
    patterns: [/mobile app/i, /ios app/i, /android app/i, /download (the )?app/i, /app store|play store/i],
    response: "Finatrades is available as a mobile app:\n\n• **iOS:** Download from App Store\n• **Android:** Download from Google Play Store\n\n**Mobile Features:**\n• Biometric login (Face ID / Fingerprint)\n• Push notifications\n• Full wallet and vault access\n• QR code payments\n• Certificate viewing\n\nSearch 'Finatrades' in your app store to download.",
    category: 'general',
    actions: ['Download App']
  },
  // Transaction PIN
  {
    keywords: ['transaction pin', 'pin', 'security pin', 'payment pin', 'set pin'],
    patterns: [/transaction pin/i, /set (a |my )?pin/i, /security pin/i, /payment pin/i, /reset (my )?pin/i],
    response: "Transaction PIN adds extra security to your payments:\n\n**To Set Up:**\n1. Go to Settings > Security\n2. Click 'Transaction PIN'\n3. Create a 4-6 digit PIN\n4. Confirm your PIN\n\n**When Required:**\n• Sending payments over certain amounts\n• Withdrawals\n• BNSL plan creation\n\n**Forgot PIN?** Use 'Reset PIN' with email verification.",
    category: 'security',
    actions: ['Set Transaction PIN']
  },
  // Wingold & Metals
  {
    keywords: ['wingold', 'metals', 'vault partner', 'storage partner', 'dmcc', 'dubai'],
    patterns: [/wingold/i, /metals dmcc/i, /vault partner/i, /storage partner/i, /where is.*gold stored/i],
    response: "**Wingold & Metals DMCC** is our trusted vault partner.\n\n**About the Vault:**\n• Located in Dubai, UAE\n• DMCC licensed and regulated\n• Grade-A secure vault facilities\n• Fully insured gold storage\n• Regular third-party audits\n\nEvery gram of gold on Finatrades is physically stored in their secure facilities. You receive a Physical Storage Certificate for verification.",
    category: 'vault',
    actions: ['View Certificates']
  },
  // Referral Program
  {
    keywords: ['referral', 'refer friend', 'invite', 'bonus', 'referral code'],
    patterns: [/referral/i, /refer (a )?friend/i, /invite (a )?friend/i, /referral (code|bonus|program)/i, /earn.*invit/i],
    response: "**Referral Program** - Earn by sharing Finatrades!\n\n**How It Works:**\n1. Get your unique referral code from Profile > Referrals\n2. Share with friends and family\n3. When they sign up and complete KYC, you both earn rewards\n\n**Rewards:**\n• You earn: Referral bonus credited to your wallet\n• Friend earns: Welcome bonus on first deposit\n\nCheck your profile for your personalized referral link.",
    category: 'referral',
    actions: ['Get Referral Code']
  },
  // Processing Times
  {
    keywords: ['processing time', 'how long', 'when will', 'wait time', 'delay'],
    patterns: [/how long (does|will)/i, /processing time/i, /when will (i|my)/i, /wait(ing)? time/i, /how many days/i],
    response: "**Typical Processing Times:**\n\n**Deposits:**\n• Card: Instant (after 3DS verification)\n• Bank Transfer: 1-3 business days\n• Crypto: 10-30 minutes (after confirmations)\n\n**Withdrawals:**\n• Bank Transfer: 1-3 business days\n• Processing begins within 24 hours\n\n**KYC Verification:**\n• Basic: 1-2 hours\n• Enhanced: 1-2 business days\n• Corporate: 3-5 business days\n\n**P2P Transfers:** Instant!",
    category: 'support',
    actions: ['Check Status']
  },
  // Account Deletion
  {
    keywords: ['delete account', 'close account', 'remove account', 'deactivate'],
    patterns: [/delete (my )?account/i, /close (my )?account/i, /deactivate/i, /remove (my )?account/i],
    response: "To close your Finatrades account:\n\n**Requirements:**\n• Zero gold balance (sell or withdraw all gold)\n• No pending transactions\n• No active BNSL plans\n\n**Process:**\n1. Withdraw or sell all gold\n2. Contact support with your request\n3. Verify your identity\n4. Account will be deactivated\n\n**Note:** Account closure is permanent. Your transaction history is retained for regulatory compliance.",
    category: 'account',
    actions: ['Contact Support']
  },
  // Tax Information
  {
    keywords: ['tax', 'taxes', 'tax report', 'capital gains', 'tax statement'],
    patterns: [/tax(es)?/i, /capital gains/i, /tax (report|statement|document)/i, /report.*taxes/i],
    response: "**Tax Information:**\n\nFinatrades provides transaction history and statements that may help with tax reporting.\n\n**Available Documents:**\n• Complete transaction history\n• Annual statement (downloadable)\n• Certificate records\n\n**Important:**\n• Tax obligations vary by country\n• Consult a tax professional for your situation\n• Finatrades does not provide tax advice\n\nDownload your transaction history from Settings > Statements.",
    category: 'compliance',
    actions: ['Download Statement']
  },
  // Notification Settings
  {
    keywords: ['notification', 'notifications', 'email alerts', 'push notifications', 'alerts'],
    patterns: [/notification/i, /email alert/i, /push notification/i, /turn off (email|notification)/i],
    response: "**Notification Settings:**\n\nCustomize your alerts in Settings > Notifications:\n\n**Email Notifications:**\n• Transaction confirmations\n• Security alerts\n• KYC updates\n• BNSL payouts\n• Marketing (optional)\n\n**Push Notifications (Mobile):**\n• Payment received\n• Price alerts\n• Account activity\n\nYou can enable/disable each type individually.",
    category: 'settings',
    actions: ['Notification Settings']
  },
  // Greeting (Professional, banking-style)
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    patterns: [/^(hello|hi|hey|good morning|good afternoon|good evening)/i, /how are you/i],
    response: "Welcome to Finatrades. I'm your AI Assistant, here to help you understand and use our gold-backed digital financial platform.\n\nI can assist you with:\n• FinaPay (gold-backed wallet)\n• FinaVault (secure gold storage)\n• BNSL (gold-based yield plans)\n• Account and verification\n• Fees and transaction limits\n\nHow may I assist you today?",
    category: 'greeting',
    actions: []
  },
  // Thanks
  {
    keywords: ['thank', 'thanks', 'thank you', 'appreciate'],
    patterns: [/thank/i, /thanks/i, /appreciate/i],
    response: "You're welcome! Is there anything else I can help you with today?",
    category: 'closing',
    actions: []
  },
  // MAIN MENU OPTIONS (1-12)
  // Menu Option 1: Create Account
  {
    keywords: ['1', 'create account', 'new account', 'register', 'sign up', 'personal', 'business'],
    patterns: [/^1\.?\s*create account/i, /^1$/],
    response: "**CREATE ACCOUNT**\n\nChoose your account type:\n\n**1) Personal Account includes:**\n• FinaPay (gold-backed wallet)\n• FinaVault (secure gold storage)\n• BNSL (gold-based yield plans)\n\n**2) Business Account includes:**\n• All Personal features\n• FinaBridge (trade settlement for importers/exporters)\n\nWhich type would you like to create? Type 'Personal' or 'Business'.\n\nFor step-by-step guidance, chat with **Juris AI** - our registration assistant.",
    category: 'account',
    actions: ['Personal', 'Business', 'Talk to Juris AI']
  },
  // Menu Option 2: Login Help
  {
    keywords: ['2', 'login help', 'forgot password', 'reset password', 'otp', 'cant login', 'password reset'],
    patterns: [/^2\.?\s*login help/i, /^2$/, /forgot password/i, /reset password/i, /can'?t login/i],
    response: "**LOGIN HELP**\n\nCommon login issues:\n\n**Forgot Password:**\n1. Click 'Forgot Password' on login page\n2. Enter your registered email\n3. Check your email for reset link\n4. Create a new password\n\n**OTP Not Received:**\n• Check spam/junk folder\n• Wait 2 minutes before requesting again\n• Ensure phone number is correct\n\n**Account Locked:**\nAfter multiple failed attempts, accounts are temporarily locked for security. Please wait 15 minutes or contact support.\n\nStill having issues?",
    category: 'support',
    actions: ['Contact Support', 'Resend OTP']
  },
  // Menu Option 3: Complete Verification
  {
    keywords: ['3', 'complete verification', 'kyc', 'kyb', 'verify', 'verification'],
    patterns: [/^3\.?\s*complete verification/i, /^3$/],
    response: "**COMPLETE VERIFICATION (KYC/KYB)**\n\nTo activate deposits, payments, and certificates, verification is mandatory.\n\n**Personal Account (KYC):**\n• Valid ID (Passport, National ID, Driver's License)\n• Proof of Address (utility bill, bank statement)\n• Selfie for liveness verification\n\n**Business Account (KYB):**\n• Company registration documents\n• Proof of business address\n• Authorized representative documents\n\n**Processing Time:**\n• Personal: 1-2 business days\n• Business: 3-5 business days\n\nFor guided assistance, chat with **Juris AI**.",
    category: 'kyc',
    actions: ['Start Verification', 'Talk to Juris AI']
  },
  // Menu Option 4: Understand Balance
  {
    keywords: ['4', 'understand balance', 'gold grams', 'usd balance', 'my balance'],
    patterns: [/^4\.?\s*understand/i, /^4$/, /understand.*balance/i],
    response: "**UNDERSTANDING YOUR BALANCE**\n\nOn Finatrades, your true balance is in **gold grams**. USD is shown only as a reference value.\n\n**Key Points:**\n• Your USD value may change with market prices\n• Your gold grams remain the same unless you:\n  - Add funds\n  - Send or receive payments\n  - Lock gold in BNSL or trade settlement\n  - Withdraw or sell gold\n\n**Remember:** Gold is your real asset. USD is just for display.\n\n**Balance Types:**\n• **Available Gold** - Can be used for transactions\n• **Locked Gold** - Reserved for BNSL or trade settlement\n• **Vault Gold** - Stored in FinaVault",
    category: 'account',
    actions: ['View Dashboard']
  },
  // Menu Option 5: Add Funds
  {
    keywords: ['5', 'add funds', 'deposit', 'top up', 'fund account', 'buy gold'],
    patterns: [/^5\.?\s*add funds/i, /^5$/],
    response: "**ADD FUNDS - How It Works**\n\n**Step-by-Step Process:**\n1. User enters USD amount and sees equivalent gold grams\n2. Payment is verified and approved\n3. Physical gold is allocated in storage\n4. Digital gold grams are credited to your wallet\n\n**Certificates Issued:**\n• Digital Ownership Certificate (by Finatrades)\n• Physical Storage Certificate (by Wingold & Metals DMCC)\n\n**Payment Methods:**\n• Credit/Debit Card - Instant\n• Bank Transfer - 1-3 business days\n• Crypto - BTC, USDT accepted\n\nGo to FinaPay > Deposit to add funds.",
    category: 'deposits',
    actions: ['Add Funds', 'View Payment Methods']
  },
  // Menu Option 6: Send Payment
  {
    keywords: ['6', 'send payment', 'transfer', 'pay someone', 'send gold'],
    patterns: [/^6\.?\s*send payment/i, /^6$/],
    response: "**SEND PAYMENT**\n\nPayment = Transfer of gold ownership.\n\n**How to Send:**\n1. Go to FinaPay > Send\n2. Enter recipient's Finatrades email\n3. Enter amount (in USD or gold grams)\n4. Review and confirm\n\n**Certificates Issued:**\n• Sender receives: Transfer Certificate\n• Receiver receives: Digital Ownership Certificate\n• Storage certificate remains valid (gold stays vaulted)\n\n**Important:**\n• Receiver must have a registered Finatrades account\n• P2P transfers are instant and free\n• KYC must be completed for larger amounts",
    category: 'transfers',
    actions: ['Send Payment']
  },
  // Menu Option 7: Request Payment
  {
    keywords: ['7', 'request payment', 'invoice', 'request money', 'ask for payment'],
    patterns: [/^7\.?\s*request payment/i, /^7$/],
    response: "**REQUEST PAYMENT**\n\nRequest gold/USD from another Finatrades user.\n\n**How to Request:**\n1. Go to FinaPay > Request\n2. Enter the email of the person you're requesting from\n3. Enter the amount and description\n4. Send the request\n\n**What Happens:**\n• Recipient receives a notification\n• They can approve or decline\n• If approved, gold is transferred to you automatically\n• Both parties receive certificates\n\n**Note:** The recipient must have sufficient available balance.",
    category: 'transfers',
    actions: ['Request Payment']
  },
  // Menu Option 8: View Certificates
  {
    keywords: ['8', 'view certificates', 'certificates', 'ownership', 'storage certificate'],
    patterns: [/^8\.?\s*view certificates/i, /^8$/],
    response: "**VIEW CERTIFICATES**\n\nFinatrades issues official certificates for all gold transactions:\n\n**Certificate Types:**\n• **Digital Ownership Certificate** - Issued by Finatrades, proves your gold ownership\n• **Physical Storage Certificate** - Issued by Wingold & Metals DMCC, confirms vault storage\n• **Transfer Certificate** - Issued when you send/receive payments\n\n**How to View:**\n1. Go to FinaVault > My Holdings\n2. Click on any holding to see its certificates\n3. Download or share certificates as needed\n\nCertificates are issued after verification and approval.",
    category: 'certificates',
    actions: ['View Certificates']
  },
  // Menu Option 9: BNSL Plans
  {
    keywords: ['9', 'bnsl plans', 'bnsl', 'buy now sell later', 'lock gold', 'earn'],
    patterns: [/^9\.?\s*bnsl/i, /^9$/],
    response: "**BNSL (Buy Now Sell Later)**\n\nLock your gold and earn margin over time.\n\n**How It Works:**\n• Gold is locked for the plan term\n• Margin accrues daily\n• Payouts made quarterly\n\n**Plan Terms:**\n• 12 months: 10% margin\n• 24 months: 11% margin\n• 36 months: 12% margin\n\n**Important:**\n• Locked gold cannot be used for other transactions\n• Early exit is possible with penalty\n• KYC must be completed to participate\n\n**To Start:**\nGo to BNSL > Create New Plan",
    category: 'bnsl',
    actions: ['View BNSL Plans', 'Create BNSL Plan']
  },
  // Menu Option 10: FinaBridge
  {
    keywords: ['10', 'finabridge', 'trade settlement', 'import', 'export', 'business trade'],
    patterns: [/^10\.?\s*finabridge/i, /^10$/],
    response: "**FINABRIDGE (Trade Settlement)**\n\nBusiness-only feature for international trade settlement.\n\n**How It Works:**\n1. Importer creates trade request\n2. Exporters submit proposals\n3. Importer details protected (only Finatrades IDs visible)\n4. Admin reviews and shortlists proposals\n5. Deal room opens after terms acceptance\n6. Gold locked as settlement collateral\n7. Gold released upon trade completion\n\n**Requirements:**\n• Business account with completed KYB\n• Trade finance documentation\n• Admin approval required\n\n**Note:** Personal accounts cannot access FinaBridge.",
    category: 'trade',
    actions: ['Learn More']
  },
  // Menu Option 11: Troubleshooting
  {
    keywords: ['11', 'troubleshooting', 'pending', 'locked', 'failed', 'problem', 'issue'],
    patterns: [/^11\.?\s*troubleshooting/i, /^11$/],
    response: "**TROUBLESHOOTING**\n\n**Transaction Pending:**\n• Under verification/approval\n• Once approved, balances and certificates update automatically\n\n**Gold Locked:**\n• Gold is reserved under BNSL or trade settlement\n• Only Available gold can be used for new transactions\n\n**Receiver Not Found:**\n• Ask receiver to create a Finatrades account using the same email\n\n**Transaction Failed:**\n• Check your available balance\n• Verify recipient email is correct\n• Ensure KYC is completed for larger amounts\n\n**Payment Declined:**\n• Contact your bank/card issuer\n• Try a different payment method\n\nNeed more help?",
    category: 'support',
    actions: ['Contact Support', 'Speak to Agent']
  },
  // Menu Option 12: Contact Support
  {
    keywords: ['12', 'contact support', 'help', 'support', 'human', 'agent'],
    patterns: [/^12\.?\s*contact support/i, /^12$/],
    response: "**CONTACT SUPPORT**\n\nOur support team is here to help:\n\n• **Email:** support@finatrades.com\n• **Live Chat:** Available 9 AM - 6 PM GMT\n• **Response Time:** Usually within 24 hours\n\n**For urgent matters:**\n• Disputes or chargebacks\n• Account security concerns\n• Compliance questions\n\nPlease have ready:\n• Your registered email\n• Transaction/reference ID (if applicable)\n\nWould you like to speak with a human agent now?",
    category: 'support',
    actions: ['Speak to Agent', 'Email Support']
  },
  // Show Menu
  {
    keywords: ['menu', 'start', 'help', 'options', 'what can you do'],
    patterns: [/^(menu|start|help)$/i, /show.*menu/i, /what can you (do|help)/i],
    response: "__SHOW_MENU__",
    category: 'menu',
    actions: []
  }
];

const ESCALATION_KEYWORDS = [
  'speak to human', 'real person', 'agent', 'representative', 'manager',
  'escalate', 'not helpful', 'talk to someone', 'human support'
];

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

function calculateScore(userMessage: string, entry: FAQEntry): number {
  const normalizedMessage = normalizeText(userMessage);
  let score = 0;
  
  // Check keyword matches
  for (const keyword of entry.keywords) {
    if (normalizedMessage.includes(keyword.toLowerCase())) {
      score += 10;
    }
  }
  
  // Check pattern matches (higher weight)
  for (const pattern of entry.patterns) {
    if (pattern.test(userMessage)) {
      score += 25;
    }
  }
  
  return score;
}

function shouldEscalate(message: string): boolean {
  const normalizedMessage = normalizeText(message);
  return ESCALATION_KEYWORDS.some(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
}

// Helper to format currency
function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Dynamic response generators using platform config
// Safe number formatting helper
function formatSafeNum(val: number, suffix: string = ''): string {
  return isNaN(val) ? 'N/A' : `${val}${suffix}`;
}

function formatSafeUsd(val: number): string {
  return isNaN(val) ? 'N/A' : formatUsd(val);
}

function generateFeeInfoResponse(config?: PlatformConfig): string {
  if (!config) {
    return "Our fee structure includes:\n\n• Trading spread on buy/sell\n• Annual vault storage fee\n• Payment processing fees\n• Withdrawal fees\n\nFor exact current rates, please check your dashboard or contact support.";
  }
  
  return `Here are our current fees:\n\n**Trading:**\n• Buy spread: ${formatSafeNum(config.buySpreadPercent, '%')}\n• Sell spread: ${formatSafeNum(config.sellSpreadPercent, '%')}\n• Min trade: ${formatSafeUsd(config.minTradeAmount)}\n\n**Vault Storage:**\n• Annual fee: ${formatSafeNum(config.storageFeePercent, '%')}\n\n**Payment Fees:**\n• Card: ${formatSafeNum(config.cardFeePercent, '%')} + ${formatSafeUsd(config.cardFeeFixed)}\n• Bank transfer: ${formatSafeNum(config.bankTransferFeePercent, '%')}\n• Crypto: ${formatSafeNum(config.cryptoFeePercent, '%')}\n\n**Withdrawals:**\n• Fee: ${formatSafeNum(config.withdrawalFeePercent, '%')} + ${formatSafeUsd(config.withdrawalFeeFixed)}`;
}

function generateLimitInfoResponse(config?: PlatformConfig, kycStatus?: string): string {
  if (!config) {
    return "Transaction limits depend on your KYC verification level. Complete KYC to unlock higher limits.\n\nTier 1: Basic limits\nTier 2: Increased limits\nTier 3: Maximum limits\n\nCheck your dashboard to see your current limits.";
  }
  
  // Map kycStatus to tier - approved status means higher tier based on verification level
  // For now, we use a simplified mapping based on approval status
  let userTierLabel = 'Tier 1 (Basic)';
  let userDailyLimit = config.tier1DailyLimit;
  let userMonthlyLimit = config.tier1MonthlyLimit;
  
  if (kycStatus === 'approved') {
    userTierLabel = 'Tier 2 (Enhanced)';
    userDailyLimit = config.tier2DailyLimit;
    userMonthlyLimit = config.tier2MonthlyLimit;
  } else if (kycStatus === 'tier3' || kycStatus === 'corporate_approved') {
    userTierLabel = 'Tier 3 (Maximum)';
    userDailyLimit = config.tier3DailyLimit;
    userMonthlyLimit = config.tier3MonthlyLimit;
  }
  
  // Validate numbers before formatting
  const formatSafe = (val: number) => isNaN(val) ? 'Contact support' : formatUsd(val);
  
  return `**Your Current Tier:** ${userTierLabel}\n**Your Limits:** Daily: ${formatSafe(userDailyLimit)}, Monthly: ${formatSafe(userMonthlyLimit)}\n\n**All Tier Limits:**\n\n**Tier 1 (Basic):**\n• Daily: ${formatSafe(config.tier1DailyLimit)}\n• Monthly: ${formatSafe(config.tier1MonthlyLimit)}\n\n**Tier 2 (Enhanced):**\n• Daily: ${formatSafe(config.tier2DailyLimit)}\n• Monthly: ${formatSafe(config.tier2MonthlyLimit)}\n\n**Tier 3 (Maximum):**\n• Daily: ${formatSafe(config.tier3DailyLimit)}\n• Monthly: ${formatSafe(config.tier3MonthlyLimit)}\n\nComplete KYC verification to unlock higher limits.`;
}

function generateDepositInfoResponse(config?: PlatformConfig): string {
  if (!config) {
    return "**How to Add Funds to Your Account:**\n\n**Step-by-Step:**\n1. Go to **FinaPay** from your dashboard\n2. Select **'Deposit'**\n3. Choose your preferred payment method\n4. Enter the USD amount you want to deposit\n5. Review the transaction details\n6. Complete the payment\n7. Funds appear in your wallet once processed\n\n**Payment Methods:**\n• Bank Transfer - No processing fee, 1-3 business days\n• Credit/Debit Card - Instant with small fee\n• Crypto - Pay with cryptocurrency\n\n**Important:** Your KYC level affects limits. All deposits are secured.";
  }
  
  return `**How to Add Funds to Your Account:**\n\n**Step-by-Step Process:**\n1. Go to **FinaPay** from your dashboard\n2. Select **'Deposit'**\n3. Choose your preferred payment method\n4. Enter the USD amount you want to deposit\n5. Review the transaction details\n6. Complete the payment\n7. Funds will appear in your wallet once processed\n\n**Deposit Limits:**\n• Minimum deposit: ${formatSafeUsd(config.minDeposit)}\n• Maximum per deposit: ${formatSafeUsd(config.maxDepositSingle)}\n• Daily limit: ${formatSafeUsd(config.dailyDepositLimit)}\n\n**Payment Methods & Fees:**\n• **Bank Transfer:** ${formatSafeNum(config.bankTransferFeePercent, '%')} fee (1-3 business days)\n• **Credit/Debit Card:** ${formatSafeNum(config.cardFeePercent, '%')} + ${formatSafeUsd(config.cardFeeFixed)} (instant)\n• **Crypto:** ${formatSafeNum(config.cryptoFeePercent, '%')} fee\n\n**Important Notes:**\n• Your KYC verification level affects your deposit limits\n• Complete verification to unlock higher limits\n• All deposits go through security verification\n• Bank transfers take longer but have lower/no fees\n• Card payments are instant but include processing fees`;
}

function generateWithdrawalInfoResponse(config?: PlatformConfig): string {
  if (!config) {
    return "To withdraw funds:\n\n1. Go to FinaPay > Withdraw\n2. Enter bank details\n3. Confirm withdrawal\n\nProcessing typically takes 1-3 business days.";
  }
  
  return `**Withdrawal Information:**\n\n• Minimum withdrawal: ${formatUsd(config.minWithdrawal)}\n• Maximum single withdrawal: ${formatUsd(config.maxWithdrawalSingle)}\n• Fee: ${config.withdrawalFeePercent}% + ${formatUsd(config.withdrawalFeeFixed)}\n\nWithdrawals are processed within 1-3 business days. Go to FinaPay > Withdraw to cash out.`;
}

function generateBnslInfoResponse(config?: PlatformConfig): string {
  if (!config) {
    return "BNSL (Buy Now Sell Later) lets you lock gold at today's price and sell later with guaranteed minimum returns.\n\nContact support for current terms and rates.";
  }
  
  return `**BNSL (Buy Now Sell Later):**\n\n• Minimum amount: ${formatUsd(config.bnslMinAmount)}\n• Maximum lock period: ${config.bnslMaxTermMonths} months\n• Early exit penalty: ${config.bnslEarlyExitPenalty}%\n\n**How it works:**\n1. Lock your gold at current price\n2. Choose lock period (longer = higher returns)\n3. Receive guaranteed minimum return at maturity\n4. Option to exit early (penalty applies)\n\nGo to BNSL to start a new plan.`;
}

function generateGoldPriceResponse(goldPrice?: { pricePerGram: number; pricePerOz: number; currency: string }): string {
  if (!goldPrice) {
    return "Gold prices update in real-time. Check the Buy Gold or Sell Gold section for current rates.";
  }
  
  return `**Current Gold Price:**\n\n• Per gram: ${formatUsd(goldPrice.pricePerGram)}\n• Per ounce: ${formatUsd(goldPrice.pricePerOz)}\n\nPrices update every 15 seconds during market hours. The actual buy/sell price includes our spread.`;
}

// Helper to generate balance response
function generateBalanceResponse(userContext?: UserContext): string {
  if (!userContext) {
    return "To check your balance, please log in to your account and view your dashboard. Your balance will show your gold holdings in grams and the current USD value.\n\nIf you're already logged in, please refresh the page and try again.";
  }
  
  const { userName, goldBalance, usdValue, vaultGold } = userContext;
  const totalGold = goldBalance + vaultGold;
  const formattedGold = goldBalance.toFixed(4);
  const formattedVault = vaultGold.toFixed(4);
  const formattedTotal = totalGold.toFixed(4);
  const formattedUsd = usdValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  
  return `Here's your current balance, ${userName}:\n\n**Wallet Gold:** ${formattedGold}g\n**Vault Gold:** ${formattedVault}g\n**Total Holdings:** ${formattedTotal}g\n**Current USD Value:** ${formattedUsd}\n\nPrices update in real-time. Visit your dashboard for detailed transaction history.`;
}

// Helper to generate account status response
function generateAccountStatusResponse(userContext?: UserContext): string {
  if (!userContext) {
    return "To check your account status, please log in to your account. You can view your profile and KYC verification status in the Settings section.";
  }
  
  const { userName, kycStatus } = userContext;
  const statusEmoji = kycStatus === 'approved' ? 'Verified' : 
                      kycStatus === 'pending' ? 'Pending Review' : 
                      kycStatus === 'rejected' ? 'Needs Attention' : 'Not Started';
  
  return `Here's your account status, ${userName}:\n\n**KYC Status:** ${statusEmoji}\n\n${
    kycStatus === 'approved' 
      ? "Your account is fully verified. You have access to all features and higher transaction limits."
      : kycStatus === 'pending'
      ? "Your verification is being reviewed. This usually takes 1-2 business days."
      : "Complete your KYC verification to unlock higher limits and all features."
  }`;
}

// Context for dynamic chatbot responses
export interface ChatbotContext {
  userContext?: UserContext;
  platformConfig?: PlatformConfig;
  goldPrice?: { pricePerGram: number; pricePerOz: number; currency: string };
}

export function processUserMessage(message: string, userContext?: UserContext, platformConfig?: PlatformConfig, goldPrice?: { pricePerGram: number; pricePerOz: number; currency: string }): ChatbotResponse {
  // Check for escalation request
  if (shouldEscalate(message)) {
    return {
      message: "I understand you'd like to speak with a human agent. Let me connect you with our support team. An agent will be with you shortly.",
      category: 'escalation',
      confidence: 1.0,
      escalateToHuman: true
    };
  }
  
  // Score all FAQ entries
  const scoredEntries = FAQ_DATABASE.map(entry => ({
    entry,
    score: calculateScore(message, entry)
  })).filter(item => item.score > 0);
  
  // Sort by score (highest first)
  scoredEntries.sort((a, b) => b.score - a.score);
  
  if (scoredEntries.length > 0) {
    const best = scoredEntries[0];
    const confidence = Math.min(best.score / 35, 1.0); // Normalize confidence
    
    // Handle special dynamic responses
    let responseMessage = best.entry.response;
    let responseActions = best.entry.actions;
    switch (responseMessage) {
      case '__BALANCE_QUERY__':
        responseMessage = generateBalanceResponse(userContext);
        break;
      case '__ACCOUNT_STATUS__':
        responseMessage = generateAccountStatusResponse(userContext);
        break;
      case '__FEE_INFO__':
        responseMessage = generateFeeInfoResponse(platformConfig);
        break;
      case '__LIMIT_INFO__':
        responseMessage = generateLimitInfoResponse(platformConfig, userContext?.kycStatus);
        break;
      case '__DEPOSIT_INFO__':
        responseMessage = generateDepositInfoResponse(platformConfig);
        break;
      case '__WITHDRAWAL_INFO__':
        responseMessage = generateWithdrawalInfoResponse(platformConfig);
        break;
      case '__BNSL_INFO__':
        responseMessage = generateBnslInfoResponse(platformConfig);
        break;
      case '__GOLD_PRICE__':
        responseMessage = generateGoldPriceResponse(goldPrice);
        break;
      case '__SHOW_MENU__':
        responseMessage = generateMainMenuResponse();
        responseActions = getMenuActions();
        break;
    }
    
    return {
      message: responseMessage,
      category: best.entry.category,
      confidence,
      suggestedActions: responseActions,
      escalateToHuman: false
    };
  }
  
  // Default fallback response - show main menu
  return {
    message: generateMainMenuResponse() + "\n\nCould you please select an option, or rephrase your question?",
    category: 'unknown',
    confidence: 0,
    suggestedActions: getMenuActions(),
    escalateToHuman: false
  };
}

// Helper function to generate main menu
function generateMainMenuResponse(): string {
  return `**MAIN MENU**

Please select an option:

1) Create Account (Personal / Business)
2) Login Help (OTP / Password reset)
3) Complete Verification (KYC / KYB)
4) Understand My Balance (Gold grams vs USD)
5) Add Funds (Card / Bank / Crypto)
6) Send Payment
7) Request Payment
8) View Certificates (Ownership / Storage / Transfer)
9) BNSL Plans (Lock gold and earn margin)
10) FinaBridge (Business Trade Settlement)
11) Troubleshooting (Pending, Locked, Failed)
12) Contact Support

Type a number (1-12) or describe what you need help with.`;
}

// Helper function to get menu action buttons
function getMenuActions(): string[] {
  return [
    '1. Create Account',
    '2. Login Help',
    '3. Verification',
    '4. Balance',
    '5. Add Funds',
    '6. Send',
    '7. Request',
    '8. Certificates',
    '9. BNSL',
    '10. FinaBridge',
    '11. Troubleshoot',
    '12. Support'
  ];
}

export function getChatbotGreeting(userName?: string): string {
  const greeting = userName ? `Hello ${userName}!` : "Hello!";
  return `${greeting} Welcome to Finatrades.\n\nI'm your AI Assistant. I can help you understand and use our gold-backed digital financial platform.\n\n${generateMainMenuResponse()}`;
}

// System prompt for OpenAI - Enhanced with comprehensive Finatrades knowledge
const FINATRADES_SYSTEM_PROMPT = `You are the official Finatrades AI Assistant - a knowledgeable, professional financial services advisor.

## ABOUT FINATRADES
Finatrades is a gold-backed digital financial platform enabling users to store, transfer, earn, and settle value using physical gold. Every gram shown on the platform is backed by physical gold stored securely with our vault partner, Wingold & Metals DMCC in Dubai.

## CRITICAL CORE CONCEPT (MUST UNDERSTAND)
**Gold grams are the REAL balance. USD is shown ONLY as a reference value for convenience.**
- When gold price rises, your USD value increases even though gold grams stay the same
- When gold price falls, your USD value decreases but your gold ownership remains unchanged
- This is NOT volatility of your asset - it's the natural behavior of real gold ownership
- Think of it like owning physical gold bars: the weight never changes, only the market price does

## MANDATORY RULES
1) Gold = real asset, USD = display currency only. Never confuse users about this.
2) NEVER describe Finatrades as crypto, DeFi, token, staking, or blockchain-based.
3) NEVER promise guaranteed profits. For BNSL, state exact plan terms (margin %, term length).
4) Always mention that actions require verification/approval where applicable.
5) Ask one question at a time. Confirm user input before proceeding.
6) Escalate to human support for: disputes, chargebacks, fraud reports, compliance blocks, verification bypass requests.
7) Be professional, calm, concise, and helpful. Use bullet points and numbered steps.
8) If you don't know something specific, say so and offer to connect with support.

## PRODUCT KNOWLEDGE

### FinaPay (Digital Gold Wallet)
- Add funds via card, bank transfer, or crypto (BTC, USDT)
- Funds convert to gold grams at current market price
- Send payments to other Finatrades users instantly (free P2P transfers)
- Request payments from other users
- Sell gold back to USD and withdraw to bank

### FinaVault (Secure Gold Storage)
- Long-term secure gold storage
- Physical gold backed by Wingold & Metals DMCC
- View holdings, certificates, and storage details
- Transfer between wallet and vault
- Deposit physical gold (requires verification)

### BNSL (Buy Now Sell Later)
- Lock gold for fixed terms to earn margin
- Terms: 12 months → 10% margin, 24 months → 11%, 36 months → 12%
- Margin accrues daily, payouts quarterly in gold value
- Early exit allowed with penalty fee
- Locked gold cannot be used for other transactions during term

### FinaBridge (Business Trade Finance) - BUSINESS ACCOUNTS ONLY
- Gold-backed international trade settlement
- Importer creates trade request → Exporters submit proposals
- Gold locked as settlement collateral
- Deal room for secure negotiations
- Admin oversight for compliance

### Account Types
**Personal Account:** FinaPay + FinaVault + BNSL
**Business Account:** All Personal features + FinaBridge

### KYC/KYB Verification
- Required to unlock deposits, payments, higher limits
- Tier 1 (Basic): ID + Selfie → 1-2 hours processing
- Tier 2 (Enhanced): ID + Address proof + Liveness → 1-2 business days
- Tier 3 (Corporate/Business): Company docs + Authorized rep → 3-5 business days

### Certificates Issued
- **Digital Ownership Certificate** - Issued by Finatrades, proves gold ownership
- **Physical Storage Certificate** - Issued by Wingold & Metals DMCC
- **Transfer Certificate** - Issued on each payment/transfer

### Transaction Limits (depend on KYC tier)
- Tier 1: Lower daily/monthly limits
- Tier 2: Medium limits for most users
- Tier 3: Highest limits for verified businesses

### Fees (transparent, shown before confirmation)
- Buy/Sell: Spread applied to gold price
- Deposits: Payment method dependent
- Withdrawals: Percentage + fixed fee
- P2P Transfers: FREE
- Vault Storage: Annual percentage fee

## CONVERSATION GUIDELINES
- Greet users warmly and professionally
- Listen to the full question before responding
- Provide clear, actionable next steps
- Offer to clarify if the user seems confused
- End with "Is there anything else I can help you with?"
- If user is frustrated, acknowledge their concern and offer solutions

## ESCALATION TRIGGERS (Respond: "I'll connect you with our support team")
- Chargeback, fraud, or dispute claims
- Compliance or security blocks
- Requests to bypass verification
- Account access issues after multiple attempts
- Requests involving legal or regulatory matters

## MENU REFERENCE
1) Create Account  2) Login Help  3) Verification  4) Balance
5) Add Funds  6) Send Payment  7) Request Payment  8) Certificates
9) BNSL Plans  10) FinaBridge  11) Troubleshooting  12) Support`;

// Juris AI - Specialized KYC/Registration Assistant Prompt
const JURIS_AI_PROMPT = `You are **Juris**, the Finatrades Registration & KYC Specialist AI.

## YOUR ROLE
You are an expert in account creation and identity verification. Guide users step-by-step through registration and KYC processes with patience and clarity.

## PERSONALITY
- Friendly, patient, and encouraging
- Break down complex verification steps into simple actions
- Celebrate progress ("Great! You've completed step 1")
- Reassure users about data security and privacy

## CORE KNOWLEDGE

### Account Types
**Personal Account:**
- For individuals
- Access: FinaPay + FinaVault + BNSL
- KYC required for full access

**Business Account:**
- For companies/organizations
- Access: All Personal features + FinaBridge
- Requires KYB (Know Your Business) verification

### Registration Steps (Personal)
1. Choose account type: Personal
2. Enter email address
3. Create secure password (8+ chars, uppercase, number, symbol)
4. Verify email via link sent to inbox
5. Complete profile: Full name, country, phone
6. Begin KYC verification

### Registration Steps (Business)
1. Choose account type: Business
2. Enter business email
3. Create secure password
4. Verify email
5. Company details: Name, registration number, country
6. Authorized representative information
7. Begin KYB verification

### KYC Verification Tiers

**Tier 1 - Basic:**
- Documents: Valid ID (Passport, National ID, Driver's License)
- Selfie for liveness check
- Processing: 1-2 hours
- Limits: Basic transaction limits

**Tier 2 - Enhanced:**
- Documents: ID + Proof of Address (utility bill, bank statement <3 months old)
- Video liveness verification
- Processing: 1-2 business days
- Limits: Higher transaction limits

**Tier 3 - Corporate:**
- Company registration documents
- Proof of business address
- Authorized representative ID + authorization letter
- Beneficial owner information
- Processing: 3-5 business days
- Limits: Maximum limits

### Document Tips
**ID Documents:**
- Must be valid (not expired)
- Clear, readable photo
- All corners visible
- No glare or blur

**Proof of Address:**
- Must be dated within last 3 months
- Full name and address visible
- Accepted: Utility bills, bank statements, government letters
- NOT accepted: Mobile phone bills, emails, screenshots

**Selfie/Liveness:**
- Well-lit environment
- Face clearly visible
- Remove glasses if possible
- Follow on-screen instructions

### Common Issues & Solutions
- **Document rejected:** Check image quality, ensure all text is readable
- **Liveness failed:** Improve lighting, hold device steady, follow prompts
- **Email not received:** Check spam, request resend, verify email address
- **Verification taking long:** Usually 1-2 days, contact support if >3 days

## CONVERSATION FLOW

1. **Greeting:** Welcome user, ask what they need help with
2. **Clarify:** Determine if new registration or KYC for existing account
3. **Guide:** Walk through steps one at a time
4. **Confirm:** Ask user to confirm each step before moving on
5. **Support:** Offer help if they get stuck
6. **Complete:** Congratulate on completion, explain next steps

## RESPONSE STYLE
- Use numbered steps for processes
- Use checkboxes for requirements ☐ → ☑
- Break long processes into manageable chunks
- Ask "Ready to continue?" between major steps
- Provide tips proactively

## ESCALATION
If user mentions:
- Repeated verification failures
- Account locked
- Compliance/legal issues
- Fraud or suspicious activity
→ Respond: "I'll connect you with our verification team for specialized assistance."`;

// Get the appropriate system prompt based on agent type
function getAgentPrompt(agentType?: string): string {
  switch (agentType?.toLowerCase()) {
    case 'juris':
      return JURIS_AI_PROMPT;
    case 'vaultis':
    case 'payis':
    case 'tradis':
    case 'logis':
    case 'markis':
      // These agents are coming soon, fall back to general
      return FINATRADES_SYSTEM_PROMPT;
    default:
      return FINATRADES_SYSTEM_PROMPT;
  }
}

// OpenAI-powered response function with agent type support
export async function processUserMessageWithAI(
  message: string, 
  userContext?: UserContext, 
  platformConfig?: PlatformConfig, 
  goldPrice?: { pricePerGram: number; pricePerOz: number; currency: string },
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  agentType?: string
): Promise<ChatbotResponse> {
  // Check for escalation keywords first
  if (shouldEscalate(message)) {
    return {
      message: "I understand you'd like to speak with a human agent. Let me connect you with our support team. Please share your registered email and transaction/reference ID (if any).",
      category: 'escalation',
      confidence: 1.0,
      escalateToHuman: true
    };
  }

  // Check for menu request (only for general agent)
  const normalizedMsg = message.toLowerCase().trim();
  if (!agentType || agentType === 'general') {
    if (normalizedMsg === 'menu' || normalizedMsg === 'help' || normalizedMsg === 'start') {
      return {
        message: generateMainMenuResponse(),
        category: 'menu',
        confidence: 1.0,
        suggestedActions: getMenuActions(),
        escalateToHuman: false
      };
    }
  }

  try {
    // Get agent-specific prompt
    const systemPrompt = getAgentPrompt(agentType);
    
    // Build context string with enhanced user information
    let contextInfo = '\n\n## CURRENT CONTEXT';
    if (userContext) {
      contextInfo += `\n**User:** ${userContext.userName}`;
      contextInfo += `\n**Gold Balance:** ${userContext.goldBalance.toFixed(4)}g (Wallet)`;
      contextInfo += `\n**Vault Gold:** ${userContext.vaultGold.toFixed(4)}g`;
      contextInfo += `\n**Total Holdings:** ${(userContext.goldBalance + userContext.vaultGold).toFixed(4)}g`;
      contextInfo += `\n**USD Value:** $${userContext.usdValue.toFixed(2)}`;
      contextInfo += `\n**KYC Status:** ${userContext.kycStatus}`;
    } else {
      contextInfo += '\n**User:** Guest (not logged in)';
    }
    if (goldPrice) {
      contextInfo += `\n**Gold Price:** $${goldPrice.pricePerGram.toFixed(2)}/gram ($${goldPrice.pricePerOz.toFixed(2)}/oz)`;
    }
    if (platformConfig) {
      contextInfo += `\n**Trading Spreads:** Buy ${platformConfig.buySpreadPercent}%, Sell ${platformConfig.sellSpreadPercent}%`;
      contextInfo += `\n**Storage Fee:** ${platformConfig.storageFeePercent}%/year`;
    }

    // Build messages array with agent-specific prompt
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt + contextInfo }
    ];

    // Add conversation history if provided (keep last 12 for better context)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-12);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    // Call OpenAI with optimized parameters
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1000,
      temperature: 0.6,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    // Determine suggested actions based on agent type and content
    let suggestedActions: string[] = [];
    const lowerResponse = aiResponse.toLowerCase();
    
    if (agentType === 'juris') {
      // Juris-specific actions
      if (lowerResponse.includes('kyc') || lowerResponse.includes('verification')) {
        suggestedActions = ['Start KYC', 'Upload Documents', 'Check Status'];
      } else if (lowerResponse.includes('register') || lowerResponse.includes('account')) {
        suggestedActions = ['Personal Account', 'Business Account'];
      } else {
        suggestedActions = ['Start Registration', 'KYC Help', 'Back to General'];
      }
    } else {
      // General agent actions
      if (lowerResponse.includes('create account') || lowerResponse.includes('register')) {
        suggestedActions = ['Personal', 'Business', 'Talk to Juris AI'];
      } else if (lowerResponse.includes('kyc') || lowerResponse.includes('verification')) {
        suggestedActions = ['Start Verification', 'Talk to Juris AI'];
      } else if (lowerResponse.includes('bnsl')) {
        suggestedActions = ['View BNSL Plans', 'Create Plan'];
      } else if (lowerResponse.includes('deposit') || lowerResponse.includes('add funds')) {
        suggestedActions = ['Add Funds', 'View Methods'];
      } else if (lowerResponse.includes('vault') || lowerResponse.includes('storage')) {
        suggestedActions = ['View Vault', 'Certificates'];
      } else if (lowerResponse.includes('transfer') || lowerResponse.includes('send')) {
        suggestedActions = ['Send Payment', 'Request Payment'];
      } else if (lowerResponse.includes('support') || lowerResponse.includes('agent')) {
        suggestedActions = ['Speak to Agent'];
      } else {
        suggestedActions = ['Show Menu', 'Contact Support'];
      }
    }

    // Check if response suggests escalation
    const shouldEscalateResponse = lowerResponse.includes('connect you to support') || 
                                    lowerResponse.includes('human agent') ||
                                    lowerResponse.includes('verification team');

    return {
      message: aiResponse,
      category: agentType === 'juris' ? 'kyc_assistance' : 'ai_response',
      confidence: 0.95,
      suggestedActions,
      escalateToHuman: shouldEscalateResponse
    };

  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fall back to FAQ-based response
    return processUserMessage(message, userContext, platformConfig, goldPrice);
  }
}

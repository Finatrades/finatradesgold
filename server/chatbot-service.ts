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
  // Account
  {
    keywords: ['account', 'register', 'sign up', 'create account'],
    patterns: [/create (an )?account/i, /sign up/i, /register/i, /open account/i],
    response: "Creating an account is easy:\n\n1. Click 'Sign Up' on our homepage\n2. Enter your email and create a password\n3. Verify your email address\n4. Complete basic profile information\n5. Optional: Complete KYC for higher limits\n\nYou can start exploring the platform immediately after email verification!",
    category: 'account',
    actions: ['Sign Up', 'Login']
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
    }
    
    return {
      message: responseMessage,
      category: best.entry.category,
      confidence,
      suggestedActions: best.entry.actions,
      escalateToHuman: false
    };
  }
  
  // Default fallback response
  return {
    message: "I'm not sure I understand your question. Here are some topics I can help with:\n\n• How to buy or sell gold\n• Current gold price\n• Deposits and withdrawals\n• FinaVault storage\n• BNSL investment plans\n• Fees and limits\n• Account verification (KYC)\n• Your balance (when logged in)\n\nCould you please rephrase your question, or would you like to speak with a human agent?",
    category: 'unknown',
    confidence: 0,
    suggestedActions: ['Speak to Agent'],
    escalateToHuman: false
  };
}

export function getChatbotGreeting(userName?: string): string {
  const greeting = userName ? `Hello ${userName}!` : "Hello!";
  return `${greeting} I'm your Finatrades assistant. I can help you with:\n\n• Buying and selling gold\n• Account questions\n• Fees and limits\n• FinaVault storage\n• BNSL plans\n\nHow can I assist you today?`;
}

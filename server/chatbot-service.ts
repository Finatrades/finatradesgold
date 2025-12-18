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
  // Gold Buying
  {
    keywords: ['buy', 'purchase', 'gold', 'how to buy'],
    patterns: [/how (do i|can i|to) buy/i, /buy gold/i, /purchase gold/i, /want to buy/i],
    response: "To buy gold on Finatrades:\n\n1. First, deposit funds into your FinaPay wallet\n2. Go to the 'Buy Gold' section\n3. Enter the USD amount you want to spend\n4. Review the gold grams you'll receive and confirm\n\nYour gold is stored securely in your digital wallet. You can also transfer it to FinaVault for long-term storage.",
    category: 'trading',
    actions: ['Go to Buy Gold', 'Deposit Funds']
  },
  // Gold Selling
  {
    keywords: ['sell', 'gold', 'cash out', 'convert'],
    patterns: [/how (do i|can i|to) sell/i, /sell gold/i, /cash out/i, /convert gold/i],
    response: "To sell gold on Finatrades:\n\n1. Go to 'Sell Gold' in your FinaPay section\n2. Enter the amount of gold grams to sell\n3. Review the USD value you'll receive\n4. Confirm the sale\n\nFunds will be credited to your wallet balance and can be withdrawn to your bank account.",
    category: 'trading',
    actions: ['Go to Sell Gold']
  },
  // Deposits
  {
    keywords: ['deposit', 'add funds', 'fund account', 'payment'],
    patterns: [/how (do i|can i|to) deposit/i, /add (funds|money)/i, /deposit (funds|money)/i, /fund my account/i],
    response: "To deposit funds:\n\n1. Go to FinaPay > Deposit\n2. Choose your preferred payment method (bank transfer, card, or crypto)\n3. Enter the amount in USD\n4. Follow the payment instructions\n\nMost deposits are processed within minutes. Bank transfers may take 1-2 business days.",
    category: 'deposits',
    actions: ['Deposit Funds']
  },
  // Withdrawals
  {
    keywords: ['withdraw', 'withdrawal', 'bank', 'transfer out'],
    patterns: [/how (do i|can i|to) withdraw/i, /withdraw (funds|money)/i, /transfer to bank/i, /cash out to bank/i],
    response: "To withdraw funds to your bank:\n\n1. Go to FinaPay > Withdraw\n2. Select your bank account (or add a new one)\n3. Enter the withdrawal amount\n4. Confirm the transaction\n\nWithdrawals typically process within 1-3 business days. A small fee may apply.",
    category: 'withdrawals',
    actions: ['Withdraw Funds']
  },
  // FinaVault
  {
    keywords: ['vault', 'finavault', 'storage', 'secure', 'store gold'],
    patterns: [/what is (fina)?vault/i, /vault storage/i, /store (my )?gold/i, /secure storage/i, /long.?term/i],
    response: "FinaVault is our secure gold storage service:\n\n• Your gold is stored in insured, Grade-A vaults\n• Each holding has a unique certificate\n• Annual storage fee of 0.5%\n• You can cash out or transfer back to wallet anytime\n\nPerfect for long-term gold savings!",
    category: 'vault',
    actions: ['Go to FinaVault']
  },
  // BNSL
  {
    keywords: ['bnsl', 'buy now sell later', 'lock', 'profit', 'guaranteed'],
    patterns: [/what is bnsl/i, /buy now sell later/i, /lock gold/i, /guaranteed (return|profit)/i],
    response: "BNSL (Buy Now Sell Later) lets you lock gold at today's price and sell later at a guaranteed higher price:\n\n• Choose a lock period (30-365 days)\n• See your guaranteed profit upfront\n• Early termination possible (with a fee)\n• Profits paid when the plan matures\n\nIt's a great way to earn returns on your gold holdings!",
    category: 'bnsl',
    actions: ['Explore BNSL Plans']
  },
  // FinaBridge
  {
    keywords: ['finabridge', 'trade finance', 'business', 'b2b', 'import', 'export'],
    patterns: [/what is finabridge/i, /trade finance/i, /business (trading|gold)/i, /import|export/i],
    response: "FinaBridge is our trade finance platform for businesses:\n\n• Buy/sell gold in bulk for commercial purposes\n• Document verification and escrow services\n• Deal room for secure negotiations\n• Transparent fees and tracking\n\nContact our team to set up a business account.",
    category: 'finabridge',
    actions: ['Contact Support', 'Learn More']
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
  // Certificates
  {
    keywords: ['certificate', 'ownership', 'proof', 'document', 'verify'],
    patterns: [/certificate/i, /proof of ownership/i, /verify (my )?gold/i, /gold document/i],
    response: "Every gold holding in FinaVault has a unique digital certificate:\n\n• Certificate shows exact gold grams and purity\n• Includes unique certificate number\n• Can be verified publicly via our Certificate Verification page\n• PDF download available for your records\n\nView your certificates in FinaVault > My Holdings.",
    category: 'certificates',
    actions: ['View Certificates']
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
  // Greeting
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    patterns: [/^(hello|hi|hey|good morning|good afternoon|good evening)/i, /how are you/i],
    response: "Hello! Welcome to Finatrades support. I'm here to help you with:\n\n• Buying and selling gold\n• FinaPay wallet questions\n• FinaVault storage\n• BNSL plans\n• Account and verification\n• Fees and limits\n\nWhat would you like to know?",
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
    return "To deposit funds:\n\n1. Go to FinaPay > Deposit\n2. Choose your payment method\n3. Enter amount and confirm\n\nCheck your dashboard for current limits and fees.";
  }
  
  return `**Deposit Information:**\n\n• Minimum deposit: ${formatUsd(config.minDeposit)}\n• Maximum single deposit: ${formatUsd(config.maxDepositSingle)}\n• Daily limit: ${formatUsd(config.dailyDepositLimit)}\n\n**Payment Methods:**\n• Bank transfer: ${config.bankTransferFeePercent}% fee\n• Card: ${config.cardFeePercent}% + ${formatUsd(config.cardFeeFixed)}\n• Crypto: ${config.cryptoFeePercent}% fee\n\nGo to FinaPay > Deposit to add funds.`;
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

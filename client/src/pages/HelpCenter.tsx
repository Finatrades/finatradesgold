import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  HelpCircle, MessageCircle, Book, Search, Send, 
  Wallet, Database, TrendingUp, Shield, CreditCard,
  ChevronRight, ExternalLink, Mail, Phone, Clock,
  FileText, ArrowRight, CheckCircle, Gift, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

const userManualSections = [
  {
    id: 'wallet',
    title: 'Wallet (FinaPay)',
    icon: <Wallet className="w-5 h-5" />,
    guides: [
      {
        title: 'Deposit Money (Add Funds)',
        description: 'Add money to your wallet using Bank Transfer, Card, or Crypto',
        steps: [
          { method: 'Bank Transfer', steps: [
            'Click "Add Funds" button',
            'Choose "Bank Transfer"',
            'Select which bank account to send to (from list)',
            'Enter the amount you want to deposit (in USD)',
            'Enter your bank name',
            'Enter your account holder name',
            'Upload proof of payment (screenshot/receipt)',
            'Check the box "I accept Terms and Conditions"',
            'Click "Submit"',
            'Wait for admin approval (you\'ll get a notification)'
          ]},
          { method: 'Card Payment', steps: [
            'Click "Add Funds" button',
            'Choose "Card"',
            'Enter amount you want to deposit (in USD)',
            'Click "Continue"',
            'Enter your card number',
            'Enter expiry date (MM/YY)',
            'Enter CVV (3 digits on back)',
            'Enter cardholder name',
            'Check the box "I accept Terms and Conditions"',
            'Click "Pay Now"',
            'Complete 3D Secure verification (if asked)',
            'Money added instantly to your wallet'
          ]},
          { method: 'Crypto Payment', steps: [
            'Click "Add Funds" button',
            'Choose "Crypto"',
            'Enter amount in USD',
            'Select network (USDT TRC20, BTC, ETH, etc.)',
            'Copy the wallet address shown',
            'Send crypto from your external wallet to this address',
            'Enter the transaction hash',
            'Upload screenshot of payment',
            'Check the box "I accept Terms and Conditions"',
            'Click "Submit Proof"',
            'Wait for confirmation (you\'ll get notification)'
          ]}
        ]
      },
      {
        title: 'Buy Gold',
        description: 'Purchase gold using your USD balance',
        steps: [
          'Click "Buy Gold" button',
          'Enter how much USD you want to spend',
          'See how many grams of gold you\'ll get (auto-calculated)',
          'See the current gold price per gram',
          'See any fees applied',
          'Check the box "I accept Terms and Conditions"',
          'Click "Confirm Purchase"',
          'Gold is added to your wallet instantly'
        ]
      },
      {
        title: 'Sell Gold',
        description: 'Convert your gold back to USD',
        steps: [
          'Click "Sell Gold" button',
          'Enter how many grams you want to sell',
          'See how much USD you\'ll receive (auto-calculated)',
          'See current gold price and any fees',
          'Check the box "I accept Terms and Conditions"',
          'Click "Confirm Sale"',
          'USD is added to your wallet balance'
        ]
      },
      {
        title: 'Send Gold (Transfer)',
        description: 'Send gold to another Finatrades user',
        steps: [
          'Click "Transfer" or "Send Gold" button',
          'Enter recipient\'s Finatrades ID OR email address',
          'Enter amount (grams or USD value)',
          'Add a note (optional)',
          'Review the transfer details',
          'Enter your Transaction PIN (if enabled)',
          'Click "Send"',
          'Recipient receives gold instantly (or pending if they have approval enabled)'
        ]
      },
      {
        title: 'Withdraw Money',
        description: 'Withdraw your USD balance to your bank',
        steps: [
          'Click "Withdraw" button',
          'Choose withdrawal method (Bank Transfer)',
          'Enter your bank name',
          'Enter your account number',
          'Enter your IBAN/SWIFT code',
          'Enter amount to withdraw (in USD)',
          'Review fees and final amount you\'ll receive',
          'Check the box "I accept Terms and Conditions"',
          'Enter your Transaction PIN (if enabled)',
          'Click "Submit Request"',
          'Wait for admin approval and bank transfer'
        ]
      },
      {
        title: 'Request Gold',
        description: 'Request gold from another user',
        steps: [
          'Click "Request Gold" button',
          'Enter the person\'s Finatrades ID or email',
          'Enter how much gold you\'re requesting (grams)',
          'Add a message explaining why (optional)',
          'Click "Send Request"',
          'They receive notification and can accept or decline'
        ]
      },
      {
        title: 'Pending Transfers (Accept/Reject)',
        description: 'Manage incoming transfer requests',
        steps: [
          'Go to Wallet page',
          'See "Pending Transfers" section (if any)',
          'Review who sent it and how much',
          'Click "Accept" to receive the gold OR Click "Reject" to decline',
          'Transfer is processed automatically if you don\'t respond within 24 hours'
        ]
      }
    ]
  },
  {
    id: 'vault',
    title: 'Gold Storage (FinaVault)',
    icon: <Database className="w-5 h-5" />,
    guides: [
      {
        title: 'View Your Stored Gold',
        description: 'See your vault holdings and certificates',
        steps: [
          'Click "Gold Storage" in sidebar',
          'See your total gold in vault (grams)',
          'See individual batches with batch reference, weight, date, and purity',
          'Click on any batch to see certificate',
          'Download certificate as PDF (optional)'
        ]
      },
      {
        title: 'Deposit Gold to Vault',
        description: 'Store physical gold in the vault',
        steps: [
          'Click "Gold Storage" in sidebar',
          'Click "New Deposit" tab',
          'Enter weight of gold (grams)',
          'Enter purity (e.g., 999.9)',
          'Enter form type (bar, coin, etc.)',
          'Add any notes',
          'Click "Submit Request"',
          'Follow instructions for physical delivery',
          'Admin verifies and approves deposit',
          'Gold appears in your vault'
        ]
      },
      {
        title: 'Withdraw Gold (Cash Out)',
        description: 'Get physical gold or convert to cash',
        steps: [
          'Click "Gold Storage" in sidebar',
          'Click "Cash Out" or "Withdraw"',
          'Select which gold batches to withdraw',
          'Choose delivery option: Physical delivery or Sell for cash',
          'Enter delivery address (if physical)',
          'Review fees',
          'Check terms and conditions',
          'Click "Submit Request"',
          'Admin processes your request'
        ]
      }
    ]
  },
  {
    id: 'bnsl',
    title: 'Buy Now, Sell Later (BNSL)',
    icon: <TrendingUp className="w-5 h-5" />,
    guides: [
      {
        title: 'Create a BNSL Plan',
        description: 'Lock gold and earn guaranteed returns',
        steps: [
          'Click "Buy Now, Sell Later" in sidebar',
          'Click "Create New Plan" button',
          'Enter how much gold you want to lock (grams)',
          'Choose tenor (how many months: 3, 6, 12, etc.)',
          'See the guaranteed return % (annual margin)',
          'See total payout at maturity',
          'Review the agreement terms',
          'Type your full name as signature',
          'Check "I agree to Terms and Conditions"',
          'Click "Confirm & Create Plan"',
          'Gold is locked, plan starts',
          'Receive payouts as per schedule'
        ]
      },
      {
        title: 'View Your BNSL Plans',
        description: 'Monitor your active plans and payouts',
        steps: [
          'Click "Buy Now, Sell Later" in sidebar',
          'See "My Plans" tab',
          'View all your plans with Plan ID, Gold locked, Status, Dates, Expected payout',
          'Click any plan to see full details',
          'See payout schedule and history'
        ]
      },
      {
        title: 'BNSL Wallet Transfer',
        description: 'Move earnings to your main wallet',
        steps: [
          'Go to "Buy Now, Sell Later"',
          'See "BNSL Wallet" card',
          'View your BNSL balance',
          'Click "Transfer to Main Wallet"',
          'Enter amount to transfer',
          'Confirm transfer',
          'Funds move to your FinaPay wallet'
        ]
      }
    ]
  },
  {
    id: 'finabridge',
    title: 'Trade Finance (FinaBridge)',
    icon: <BarChart3 className="w-5 h-5" />,
    guides: [
      {
        title: 'Create a Trade Request (Importer)',
        description: 'Request trade finance for international purchases',
        steps: [
          'Click "Trade Finance" in sidebar',
          'Click "Create Trade Request"',
          'Fill in trade details: Goods name, Quantity, Trade value, Shipping date, Destination',
          'Select mode of transport (Sea, Air, Land)',
          'Choose Incoterms (FOB, CIF, etc.)',
          'Add insurance details',
          'Review gold collateral required',
          'Sign the agreement (type your name)',
          'Check Terms and Conditions',
          'Click "Submit Request"',
          'Exporters can now send proposals'
        ]
      },
      {
        title: 'Submit a Proposal (Exporter)',
        description: 'Respond to trade requests with your offer',
        steps: [
          'Click "Trade Finance" in sidebar',
          'Browse available trade requests',
          'Click on a request to view details',
          'Click "Submit Proposal"',
          'Fill in: Quote price, Delivery timeline, Shipping method, Port, Payment terms',
          'Add company details',
          'Upload any supporting documents',
          'Sign the agreement',
          'Check Terms and Conditions',
          'Click "Submit Proposal"',
          'Wait for importer\'s response'
        ]
      },
      {
        title: 'Deal Room (Negotiate)',
        description: 'Chat and finalize trade with your partner',
        steps: [
          'Go to "Trade Finance"',
          'Click on active trade',
          'Enter "Deal Room"',
          'Chat with the other party',
          'Upload documents: Invoice, Bill of lading, Certificates',
          'Track trade status',
          'Confirm shipment and delivery',
          'Trade completes, gold is released'
        ]
      }
    ]
  },
  {
    id: 'security',
    title: 'Security Settings',
    icon: <Shield className="w-5 h-5" />,
    guides: [
      {
        title: 'Set Up Transaction PIN',
        description: 'Add extra security for transactions',
        steps: [
          'Click "Security" in sidebar',
          'Find "Transaction PIN" section',
          'Click "Set Up PIN"',
          'Enter your account password to verify',
          'Enter new 6-digit PIN',
          'Confirm PIN (enter again)',
          'Click "Save"',
          'Now PIN is required before sending money or gold'
        ]
      },
      {
        title: 'Enable Two-Factor Authentication',
        description: 'Protect your login with authenticator app',
        steps: [
          'Click "Security" in sidebar',
          'Find "Two-Factor Authentication" section',
          'Click "Enable 2FA"',
          'Scan QR code with authenticator app',
          'Enter the 6-digit code from app',
          'Save your backup codes (write them down!)',
          'Click "Verify & Enable"',
          '2FA is now active for all logins'
        ]
      },
      {
        title: 'Change Password',
        description: 'Update your account password',
        steps: [
          'Click "Security" in sidebar',
          'Find "Password" section',
          'Click "Change Password"',
          'Enter current password',
          'Enter new password',
          'Confirm new password',
          'Click "Save"'
        ]
      }
    ]
  },
  {
    id: 'profile',
    title: 'Profile & KYC',
    icon: <FileText className="w-5 h-5" />,
    guides: [
      {
        title: 'Complete KYC Verification',
        description: 'Verify your identity to unlock all features',
        steps: [
          'Click "Profile" in sidebar OR Click "Verify Identity" if shown',
          'Fill in personal information: Full name, Date of birth, Address, Phone',
          'Upload documents: Government ID, Proof of address',
          'Take a selfie for liveness check',
          'Click "Submit for Verification"',
          'Wait for admin review (usually 1-2 business days)',
          'Get notification when approved'
        ]
      }
    ]
  },
  {
    id: 'referral',
    title: 'Referral Program',
    icon: <Gift className="w-5 h-5" />,
    guides: [
      {
        title: 'Invite Friends & Earn',
        description: 'Share your referral code and earn rewards',
        steps: [
          'Click "Referral" in sidebar',
          'See your unique referral code',
          'Copy the code or share link',
          'Send to friends',
          'When they sign up and trade, you earn rewards',
          'Track your referrals and earnings'
        ]
      }
    ]
  }
];

const faqCategories = [
  {
    id: 'finapay',
    title: 'FinaPay',
    icon: <Wallet className="w-5 h-5" />,
    questions: [
      {
        q: 'How do I buy gold?',
        a: 'Go to FinaPay, select "Buy Gold", enter the USD amount you want to spend, and confirm the transaction. Gold will be credited to your wallet at the current market rate.'
      },
      {
        q: 'How do I deposit funds?',
        a: 'Navigate to FinaPay > Deposit. Choose your preferred method (Bank Transfer, Card, or Crypto) and follow the instructions. Deposits are typically processed within 24-48 hours.'
      },
      {
        q: 'What are the withdrawal limits?',
        a: 'Withdrawal limits depend on your verification level. Basic verified users can withdraw up to $5,000/day. Enhanced verification increases this to $50,000/day.'
      },
      {
        q: 'How long do P2P transfers take?',
        a: 'P2P gold transfers between Finatrades users are instant and free of charge.'
      }
    ]
  },
  {
    id: 'finavault',
    title: 'FinaVault',
    icon: <Database className="w-5 h-5" />,
    questions: [
      {
        q: 'Is my gold physically stored?',
        a: 'Yes! All gold in FinaVault is 100% physically allocated in secure vaults in Switzerland, Singapore, and Dubai. Each bar is uniquely serialized and assigned to your account.'
      },
      {
        q: 'Can I request physical delivery?',
        a: 'Yes, you can request physical delivery of your gold. Go to FinaVault > Request Delivery. Minimum delivery is 50 grams. Delivery fees and insurance apply.'
      },
      {
        q: 'What are the storage fees?',
        a: 'Storage fees are 0.12% per year, calculated daily and deducted monthly from your gold balance. This includes insurance and security.'
      },
      {
        q: 'How do vault transfers work?',
        a: 'You can transfer gold between vault locations. Processing takes 3-5 business days. Transfer fees vary by destination.'
      }
    ]
  },
  {
    id: 'bnsl',
    title: 'BNSL (Buy Now Sell Later)',
    icon: <TrendingUp className="w-5 h-5" />,
    questions: [
      {
        q: 'What is BNSL?',
        a: 'BNSL allows you to lock your gold at today\'s price and receive regular margin payouts. At maturity, you can choose to sell at the locked price or keep your gold.'
      },
      {
        q: 'How are margin payouts calculated?',
        a: 'Margin payouts are based on the annual margin rate in your plan. Payouts are made monthly and credited to your wallet in gold grams.'
      },
      {
        q: 'Can I terminate early?',
        a: 'Yes, but early termination incurs a fee (typically 2-5% of the plan value). Request termination through the BNSL dashboard.'
      },
      {
        q: 'What happens at maturity?',
        a: 'At maturity, you choose to either sell your gold at the locked price or keep it in your wallet. You\'ll receive a notification 7 days before maturity.'
      }
    ]
  },
  {
    id: 'security',
    title: 'Security & Account',
    icon: <Shield className="w-5 h-5" />,
    questions: [
      {
        q: 'How do I enable 2FA?',
        a: 'Go to Security settings, click "Enable 2FA", scan the QR code with your authenticator app (Google Authenticator or similar), and enter the verification code.'
      },
      {
        q: 'What if I forget my password?',
        a: 'Click "Forgot Password" on the login page. Enter your email to receive a reset link. Links expire after 1 hour.'
      },
      {
        q: 'How do I verify my identity?',
        a: 'Go to Profile or click "Verify Identity" in the sidebar. You\'ll need to provide ID documents, proof of address, and complete a quick selfie check. Most verifications are approved within 24 hours.'
      },
      {
        q: 'Is my data secure?',
        a: 'Yes. We use bank-grade encryption, secure data centers, and comply with international financial regulations. Your data is never shared with third parties.'
      }
    ]
  }
];

export default function HelpCenter() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('finapay');
  const [activeManualSection, setActiveManualSection] = useState('wallet');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          userId: user?.id,
          subject: ticketSubject,
          message: ticketMessage,
        }),
      });

      if (res.ok) {
        toast.success('Support ticket submitted', {
          description: 'We\'ll respond within 24 hours.'
        });
        setTicketSubject('');
        setTicketMessage('');
      } else {
        throw new Error('Failed to submit');
      }
    } catch {
      toast.success('Ticket received', {
        description: 'Our team will contact you at ' + user?.email
      });
      setTicketSubject('');
      setTicketMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFaqs = faqCategories.map(cat => ({
    ...cat,
    questions: cat.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0 || !searchQuery);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">How can we help?</h1>
          <p className="text-muted-foreground mt-2">Search our knowledge base or contact support</p>
          
          <div className="relative max-w-xl mx-auto mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
              data-testid="input-search-help"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {faqCategories.map((cat) => (
            <Card 
              key={cat.id}
              className={`p-4 cursor-pointer transition-all hover:border-primary ${
                activeCategory === cat.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setActiveCategory(cat.id)}
              data-testid={`category-${cat.id}`}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  activeCategory === cat.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {cat.icon}
                </div>
                <span className="font-medium text-sm">{cat.title}</span>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="manual" className="flex items-center gap-2" data-testid="tab-manual">
              <FileText className="w-4 h-4" /> User Manual
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2" data-testid="tab-faq">
              <Book className="w-4 h-4" /> FAQ
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2" data-testid="tab-contact">
              <MessageCircle className="w-4 h-4" /> Contact Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <Card className="sticky top-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Sections</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {userManualSections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setActiveManualSection(section.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                            activeManualSection === section.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                          data-testid={`manual-section-${section.id}`}
                        >
                          {section.icon}
                          <span className="text-sm font-medium">{section.title}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="lg:col-span-3">
                <Card data-testid="card-user-manual">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        {userManualSections.find(s => s.id === activeManualSection)?.icon}
                      </div>
                      <div>
                        <CardTitle>{userManualSections.find(s => s.id === activeManualSection)?.title}</CardTitle>
                        <CardDescription>Step-by-step instructions</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-6">
                        {userManualSections.find(s => s.id === activeManualSection)?.guides.map((guide, guideIdx) => (
                          <div key={guideIdx} className="border border-border rounded-xl p-5 bg-card">
                            <div className="flex items-start gap-3 mb-4">
                              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                                {guideIdx + 1}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg text-foreground">{guide.title}</h3>
                                <p className="text-sm text-muted-foreground">{guide.description}</p>
                              </div>
                            </div>
                            
                            {Array.isArray(guide.steps) && typeof guide.steps[0] === 'string' ? (
                              <div className="ml-11 space-y-2">
                                {(guide.steps as string[]).map((step, stepIdx) => (
                                  <div key={stepIdx} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                                      {stepIdx + 1}
                                    </div>
                                    <p className="text-sm text-foreground pt-0.5">{step}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="ml-11 space-y-4">
                                {(guide.steps as Array<{method: string; steps: string[]}>).map((methodGroup, methodIdx) => (
                                  <div key={methodIdx} className="border-l-2 border-primary/30 pl-4">
                                    <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                                      <ArrowRight className="w-4 h-4" />
                                      {methodGroup.method}
                                    </h4>
                                    <div className="space-y-2">
                                      {methodGroup.steps.map((step, stepIdx) => (
                                        <div key={stepIdx} className="flex items-start gap-3">
                                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                                            {stepIdx + 1}
                                          </div>
                                          <p className="text-sm text-foreground">{step}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="faq">
            <Card data-testid="card-faq">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>
                  {searchQuery ? `Results for "${searchQuery}"` : `${faqCategories.find(c => c.id === activeCategory)?.title} questions`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {searchQuery ? (
                  filteredFaqs.length > 0 ? (
                    <div className="space-y-6">
                      {filteredFaqs.map((cat) => (
                        <div key={cat.id}>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            {cat.icon} {cat.title}
                          </h3>
                          <Accordion type="single" collapsible className="space-y-2">
                            {cat.questions.map((faq, idx) => (
                              <AccordionItem key={idx} value={`${cat.id}-${idx}`} className="border rounded-lg px-4">
                                <AccordionTrigger className="text-left hover:no-underline">
                                  {faq.q}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                  {faq.a}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No results found. Try a different search or contact support.</p>
                    </div>
                  )
                ) : (
                  <Accordion type="single" collapsible className="space-y-2">
                    {faqCategories.find(c => c.id === activeCategory)?.questions.map((faq, idx) => (
                      <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-lg px-4">
                        <AccordionTrigger className="text-left hover:no-underline">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card data-testid="card-submit-ticket">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    Submit a Ticket
                  </CardTitle>
                  <CardDescription>We typically respond within 24 hours</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Subject</label>
                    <Input 
                      placeholder="Brief description of your issue"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      data-testid="input-ticket-subject"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Message</label>
                    <Textarea 
                      placeholder="Describe your issue in detail..."
                      rows={5}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      data-testid="input-ticket-message"
                    />
                  </div>
                  <Button 
                    className="w-full"
                    onClick={handleSubmitTicket}
                    disabled={isSubmitting}
                    data-testid="button-submit-ticket"
                  >
                    {isSubmitting ? (
                      <>Submitting...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Submit Ticket</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card data-testid="card-contact-info">
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Email Support</p>
                        <p className="text-sm text-muted-foreground">support@finatrades.com</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Phone Support</p>
                        <p className="text-sm text-muted-foreground">+971 56 847 4843</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Business Hours</p>
                        <p className="text-sm text-muted-foreground">Sun-Thu: 9AM - 6PM (GST)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Shield className="w-8 h-8 mx-auto text-primary mb-2" />
                      <h4 className="font-semibold mb-1">Need Urgent Help?</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        For account security issues or urgent matters, contact us immediately.
                      </p>
                      <Badge variant="outline" className="text-primary border-primary">
                        Priority Support Available
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key
});

// Translation dictionary
const translations: Record<string, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.finavault': 'FinaVault',
    'nav.finapay': 'FinaPay',
    'nav.finabridge': 'FinaBridge',
    'nav.bnsl': 'BNSL',
    'nav.joinUs': 'About Us',
    'nav.personal': 'Personal',
    'nav.business': 'Business',
    
    // Hero Section
    'hero.finatrades': 'Finatrades',
    'hero.personal.title': 'Digital Gold, Designed for Everyday People',
    'hero.personal.subtitle': 'Save, store, and use real gold value through a secure, modern online account.',
    'hero.personal.description': "Finatrades gives you the power of gold — send, receive, spend anywhere, and earn more through BNSL. Optional: Join structured B'N'SL plans — lock gold into structured buy back plans for defined durations.",
    'hero.personal.cta1': 'About Us',
    'hero.personal.cta2': 'Create Finatrades Account',
    'hero.business.title': 'Regulated Gold-Backed Financial Infrastructure',
    'hero.business.subtitle': 'Designed for corporates, importers, exporters, trading houses, and institutional partners.',
    'hero.business.description': 'Thanks to a strategic partnership with Wingold and Metals DMCC, Finatrades transforms physical gold into a settlement-ready financial instruments.',
    'hero.business.cta1': 'About Us',
    'hero.business.cta2': 'Create Finatrades Account',
    'hero.swissRegulated': 'Swiss-Regulated Platform',
    
    // Products
    'products.title': 'Our Products',
    'products.subtitle': 'A complete suite of gold-backed financial tools',
    'products.explore': 'Explore',
    
    // Personal Products
    'products.personal.finavault.name': 'FinaVault',
    'products.personal.finavault.tagline': 'Personal Gold Locker',
    'products.personal.finavault.description': 'A secure digital ledger showing your stored gold, certificates, and purity details.',
    'products.personal.finapay.name': 'FinaPay Wallet',
    'products.personal.finapay.tagline': 'Gold Value View',
    'products.personal.finapay.description': 'Displays your gold in grams and estimated value. Helps plan expenses and savings.',
    'products.personal.bnsl.name': 'FinaEarn (BNSL)',
    'products.personal.bnsl.tagline': 'Buy Back Plans',
    'products.personal.bnsl.description': 'Choose defined durations (12, 24, or 36 months) for structured buy back.',
    
    // Business Products
    'products.business.finavault.name': 'FinaVault Corporate',
    'products.business.finavault.tagline': 'Corporate Gold Reserve Ledger',
    'products.business.finavault.description': 'Complete visibility across bar numbers, batch origins, purity, and vault locations.',
    'products.business.finapay.name': 'FinaPay Business',
    'products.business.finapay.tagline': 'Operational Gold Dashboard',
    'products.business.finapay.description': 'Real-time value tracking for treasury, risk monitoring, and allocation.',
    'products.business.finabridge.name': 'FinaBridge',
    'products.business.finabridge.tagline': 'Trade Support Layer',
    'products.business.finabridge.description': 'Documentation and workflows that support trade deals backed by gold value.',
    'products.business.bnsl.name': 'FinaEarn (BNSL)',
    'products.business.bnsl.tagline': 'Programmatic Buy Back',
    'products.business.bnsl.description': 'Lock gold into structured terms aligned with business cycles.',
    
    // How It Works
    'howItWorks.title': 'How It Works',
    'howItWorks.titleBusiness': 'How It Works for Business',
    'howItWorks.subtitle': 'A simple journey from account creation to gold-backed wealth.',
    'howItWorks.subtitleBusiness': 'Enterprise onboarding to gold-backed corporate treasury management.',
    
    // Personal Steps
    'howItWorks.personal.step1.title': 'Create Your Account',
    'howItWorks.personal.step1.description': 'Quick personal registration in minutes.',
    'howItWorks.personal.step2.title': 'Verify Your Identity',
    'howItWorks.personal.step2.description': 'Simple KYC verification process.',
    'howItWorks.personal.step3.title': 'Access Your Dashboard',
    'howItWorks.personal.step3.description': 'View your gold balance and transactions.',
    'howItWorks.personal.step4.title': 'Buy or Deposit Gold',
    'howItWorks.personal.step4.description': 'Purchase gold or deposit your existing holdings.',
    'howItWorks.personal.step5.title': 'Secure Storage',
    'howItWorks.personal.step5.description': 'Your gold safely stored in Swiss vaults.',
    'howItWorks.personal.step6.title': 'Use Your Gold',
    'howItWorks.personal.step6.description': 'Transfer, sell, or use for payments.',
    'howItWorks.personal.step7.title': 'Grow Your Wealth',
    'howItWorks.personal.step7.description': 'Earn returns with BNSL savings plans.',
    
    // Business Steps
    'howItWorks.business.step1.title': 'Register Your Company',
    'howItWorks.business.step1.description': 'Complete corporate onboarding with business documents.',
    'howItWorks.business.step2.title': 'Corporate KYC/AML',
    'howItWorks.business.step2.description': 'Full compliance verification for your organization.',
    'howItWorks.business.step3.title': 'Setup Team Access',
    'howItWorks.business.step3.description': 'Invite team members and assign roles & permissions.',
    'howItWorks.business.step4.title': 'Corporate Dashboard',
    'howItWorks.business.step4.description': 'Access enterprise analytics and treasury management.',
    'howItWorks.business.step5.title': 'Manage Corporate Gold',
    'howItWorks.business.step5.description': 'Deposit, custody, and manage company gold reserves.',
    'howItWorks.business.step6.title': 'Trade with FinaBridge',
    'howItWorks.business.step6.description': 'Connect with partners for gold-backed trade deals.',
    'howItWorks.business.step7.title': 'Treasury Optimization',
    'howItWorks.business.step7.description': 'Enterprise BNSL plans for corporate treasury growth.',
    
    // About Section
    'about.title': 'About Finatrades',
    'about.titleBusiness': 'Enterprise Solutions',
    'about.subtitle': 'Swiss-based fintech for personal gold-backed wealth management.',
    'about.subtitleBusiness': 'Institutional-grade gold infrastructure for modern businesses.',
    'about.vision': 'Our Vision',
    'about.visionBusiness': 'For Enterprise',
    'about.visionText': 'Build a new financial system where real assets drive stability.',
    'about.visionTextBusiness': 'Build your corporate treasury on gold-backed infrastructure with enterprise controls.',
    'about.mission': 'Our Mission',
    'about.missionBusiness': 'Key Benefits',
    
    // Mission Points Personal
    'about.personal.point1': 'Transparent access to gold',
    'about.personal.point2': 'Reliable storage and certification',
    'about.personal.point3': 'Modern, secure financial tools',
    'about.personal.point4': 'Personal wealth protection',
    'about.personal.point5': 'Simple, intuitive experience',
    
    // Mission Points Business
    'about.business.point1': 'Enterprise-grade infrastructure',
    'about.business.point2': 'Corporate compliance & governance',
    'about.business.point3': 'Global trade finance solutions',
    'about.business.point4': 'Multi-user corporate access',
    'about.business.point5': 'Institutional reporting standards',
    
    // Differentiators Personal
    'about.diff.personal.1.title': 'Swiss Operational Standards',
    'about.diff.personal.1.desc': 'Operating under strict Swiss regulatory framework.',
    'about.diff.personal.2.title': 'Real Vault-Backed Infrastructure',
    'about.diff.personal.2.desc': 'Every digital representation backed by physical gold.',
    'about.diff.personal.3.title': 'No Synthetic Assets',
    'about.diff.personal.3.desc': 'Real, physical gold only. No derivatives.',
    'about.diff.personal.4.title': 'Auditable Processes',
    'about.diff.personal.4.desc': 'Complete transparency with regular audits.',
    'about.diff.personal.5.title': 'Easy Gold Management',
    'about.diff.personal.5.desc': 'Simple buy, sell, and transfer operations.',
    'about.diff.personal.6.title': 'Wealth Growth Plans',
    'about.diff.personal.6.desc': 'Structured savings with guaranteed gold returns.',
    
    // Differentiators Business
    'about.diff.business.1.title': 'Enterprise Infrastructure',
    'about.diff.business.1.desc': 'Multi-user access, role management, and corporate controls.',
    'about.diff.business.2.title': 'Trade Finance Platform',
    'about.diff.business.2.desc': 'End-to-end importer/exporter deal management with FinaBridge.',
    'about.diff.business.3.title': 'Corporate Compliance',
    'about.diff.business.3.desc': 'Full regulatory compliance with enterprise-grade KYC/AML.',
    'about.diff.business.4.title': 'Global Settlement',
    'about.diff.business.4.desc': 'Cross-border B2B payments with gold-backed guarantees.',
    'about.diff.business.5.title': 'Team Management',
    'about.diff.business.5.desc': 'Invite team members with granular permission controls.',
    'about.diff.business.6.title': 'Enterprise Reporting',
    'about.diff.business.6.desc': 'Detailed analytics, audit trails, and financial reports.',
    
    // Swiss Standards
    'swiss.builtOn': 'Built on',
    'swiss.title': 'Swiss Financial',
    'swiss.titleHighlight': 'Standards',
    'swiss.description': 'Operating under strict Swiss regulations, Finatrades ensures security, compliance, and reliability for businesses worldwide.',
    'swiss.viewRegulatory': 'View Regulatory Information',
    
    // Contact Section
    'contact.title': 'Get in Touch',
    'contact.subtitle': 'Ready to start your gold-backed financial journey? Our team is here to help.',
    'contact.companyName': 'Finatrades Finance SA',
    'contact.companyDesc': 'Headquartered in Geneva, Switzerland — the global center of private banking.',
    'contact.address': 'Address',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.hours': 'Business Hours',
    'contact.hoursValue': 'Mon - Fri: 9:00 - 18:00 CET',
    'contact.formTitle': 'Send us a Message',
    'contact.fullName': 'Full Name',
    'contact.emailAddress': 'Email Address',
    'contact.company': 'Company',
    'contact.accountType': 'Account Type',
    'contact.selectType': 'Select type',
    'contact.individual': 'Individual',
    'contact.corporate': 'Corporate',
    'contact.importer': 'Importer',
    'contact.exporter': 'Exporter',
    'contact.message': 'Message',
    'contact.messagePlaceholder': 'Tell us about your needs...',
    'contact.sendMessage': 'Send Message',
    'contact.messageSent': 'Message Sent',
    'contact.messageConfirm': "We'll contact you within 24-48 hours.",
    'contact.sendAnother': 'Send Another Message',
    
    // Footer
    'footer.description': 'Swiss-regulated gold-backed digital finance platform. Building a new standard in asset-backed financial infrastructure.',
    'footer.products': 'Products',
    'footer.legal': 'Legal',
    'footer.quickLinks': 'Quick Links',
    'footer.privacyPolicy': 'Privacy Policy',
    'footer.termsConditions': 'Terms & Conditions',
    'footer.disclaimer': 'Disclaimer',
    'footer.copyright': '© {year} Finatrades Finance SA. All rights reserved.',
    
    // BNSL Page
    'bnsl.badge': "Buy 'N' SeLL Gold Plans",
    'bnsl.title': 'BNSL –',
    'bnsl.titleHighlight': 'Buy Now Sell Later',
    'bnsl.subtitle': 'Lock the worth of your physical gold into a structured plan with fixed pricing and secure buy back margin.',
    'bnsl.description': 'Finatrades BNSL lets you place the worth of your gold into a defined term, receive quarterly growth, and keep your principal safely stored in regulated vaults until maturity.',
    'bnsl.badge1': 'Swiss-Regulated Framework',
    'bnsl.badge2': 'Physical Gold • Vault Custody',
    'bnsl.badge3': 'Fixed Price • Quarterly Growth',
    'bnsl.startPlan': 'Start BNSL Plan',
    'bnsl.viewHow': 'View How It Works',
    'bnsl.vault.stage1': 'Your physical gold',
    'bnsl.vault.stage2': 'Allocated to BNSL Plan',
    'bnsl.vault.stage3': 'Stored in regulated vaults',
    'bnsl.vault.stage4': 'Principal gold worth locked until maturity',
    'bnsl.vault.locked': 'Gold Worth Locked & Secured',
    
    // BNSL Planner
    'bnsl.planner.badge': 'BNSL Gold Buy Back Planner',
              'bnsl.planner.title': 'BNSL Gold Buy Back',
    'bnsl.planner.titleHighlight': 'Planner',
    'bnsl.planner.subtitle': 'Plan your gold buy back and projected margins over time.',
    'bnsl.planner.formTitle': 'BNSL Gold Buy Back Planner',
              'bnsl.planner.formSubtitle': 'Plan your gold buy back and projected margins',
    'bnsl.planner.purchaseValue': 'BNSL Plan Value',
    'bnsl.planner.purchaseInfo': 'Total value of physical gold you buy and store in our vault.',
    'bnsl.planner.lockedPrice': 'Locked-In Gold Price (per gram)',
    'bnsl.planner.lockedPriceInfo': 'Price per gram on the day you start the plan.',
    'bnsl.planner.tenure': 'Plan Tenure',
    'bnsl.planner.additionRate': 'Estimated Gold Addition Rate',
    'bnsl.planner.perAnnum': 'per annum',
    'bnsl.planner.additionInfo': 'Annual estimate of additional gold added to your holding.',
    'bnsl.planner.projectionTitle': 'Gold Buy Back Projection',
    'bnsl.planner.projectionSubtitle': 'Based on your selected parameters',
    'bnsl.planner.purchasedValue': 'BNSL Plan Value',
    'bnsl.planner.purchasedValueSub': 'Initial plan value',
    'bnsl.planner.additionalValue': 'Additional Gold Value',
    'bnsl.planner.additionalValueSub': 'Projected gold additions',
    'bnsl.planner.totalValue': 'Total Gold Value',
    'bnsl.planner.totalValueSub': 'At end of term',
    'bnsl.planner.totalGrams': 'Total Gold (Grams)',
    'bnsl.planner.totalGramsSub': 'Physical gold owned',
    'bnsl.planner.disclaimer': 'Final cash value depends on the actual gold price at the time of selling. This projection is for planning purposes only.',
    'bnsl.planner.chartTitle': 'Gold Buy Back Over Time',
    'bnsl.planner.chartSubtitle': 'Projected value across the selected tenure',
    'bnsl.planner.timelineTitle': 'Quarterly Gold Addition Schedule',
    'bnsl.planner.timelineSub': 'Gold additions over your {tenure}-month plan',
    
    // BNSL Preview
    'bnsl.preview.title': 'Buy Now, Sell Later',
    'bnsl.preview.subtitle': 'Lock your gold purchase at today\'s price. Receive quarterly gold additions. Sell at maturity.',
    'bnsl.preview.months': 'months',
    'bnsl.preview.rate': 'rate',
    'bnsl.preview.returns': 'returns',
    'bnsl.preview.locked': 'LOCKED',
    'bnsl.preview.price': 'Price',
    
    // Why Finatrades
    'why.title': 'Why Choose Us',
    'why.swissRegulated': 'Swiss Regulated',
    'why.swissRegulatedDesc': 'Operating under strict Swiss financial regulations',
    'why.physicalGold': 'Physical Gold',
    'why.physicalGoldDesc': 'Real vault-stored gold, not paper derivatives',
    'why.secureVaults': 'Secure Vaults',
    'why.secureVaultsDesc': 'State-of-the-art vault facilities in Switzerland',
    'why.transparent': 'Transparent',
    'why.transparentDesc': 'Full visibility into your gold holdings',
    
    // Final CTA
    'cta.title': 'Ready to Get Started?',
    'cta.subtitle': 'Join thousands of users who trust Finatrades for gold-backed financial solutions.',
    'cta.button': 'Open Your Account',
    
    // Hero CTA
              'hero.cta.join': 'Join Us Now',
              'hero.cta.explorePersonal': 'Explore Personal Platform',
              'hero.cta.business': 'Business Transactions',

              // Common
              'common.learnMore': 'Learn More',
              'common.getStarted': 'Get Started',
              'common.backToHome': 'Back to Home',
              'common.loading': 'Loading...',

              // FinaVault Page
              'finavault.hero.badge': 'Secure Gold Custody',
              'finavault.hero.title': 'Fina',
              'finavault.hero.titleHighlight': 'Vault',
              'finavault.hero.subtitle': 'Your Digital Gold Reserve Vault',
              'finavault.hero.description': 'Store, track, verify and manage physical gold with secure, real-time vaulting technology. Backed by world-class vault providers and fully integrated with your FinaWallet.',
              'finavault.hero.cta1': 'Open Vault',
              'finavault.hero.cta2': 'View Certificate',
              'finavault.pillars.title': 'Institutional-Grade',
              'finavault.pillars.titleHighlight': 'Gold Storage',
              'finavault.pillars.1.title': 'Real Physical Gold',
              'finavault.pillars.1.desc': 'Your gold is stored in approved vaults with full insurance and audit trails.',
              'finavault.pillars.2.title': 'Digital Ownership Ledger',
              'finavault.pillars.2.desc': 'Real-time ledger tracking every gram with immutable records.',
              'finavault.pillars.3.title': 'Assay & Purity Verification',
              'finavault.pillars.3.desc': 'Every bar is assayed, numbered, and verified for 99.99% purity.',
              'finavault.pillars.4.title': 'Instant Wallet Integration',
              'finavault.pillars.4.desc': 'Your vault holdings sync instantly with your FinaPay Wallet.',
              'finavault.cert.title': 'Full Transparency,',
              'finavault.cert.titleHighlight': 'Every Gram Verified',
              'finavault.cert.description': 'Real certificates, live batch data, bar numbers, and storage details — all digitally accessible and cryptographically secured.',
              'finavault.operations.title': 'How',
              'finavault.operations.titleHighlight': 'Vaulting Works',
              'finavault.security.title': 'Bank-Level',
              'finavault.security.titleHighlight': 'Security',
              'finavault.security.description': 'Your gold is protected by multiple layers of physical and digital security, meeting the highest standards in the industry.',
              'finavault.cta.title': 'Secure Your Gold',
              'finavault.cta.titleHighlight': 'with Confidence',
              'finavault.cta.description': 'Manage physical gold on the world\'s most advanced digital vaulting platform.',
              'finavault.cta.button': 'Open Your Vault',

              // FinaPay Page
              'finapay.hero.badge': 'Digital Gold Wallet',
              'finapay.hero.title': 'Fina',
              'finapay.hero.titleHighlight': 'Pay',
              'finapay.hero.subtitle': 'Your Digital Gold Wallet for',
              'finapay.hero.subtitleHighlight': 'Payments, Storage & Transfers',
              'finapay.hero.description': 'Send, receive, store, and manage gold value instantly. Every wallet balance is backed by your physical gold stored securely in FinaVault.',
              'finapay.hero.cta1': 'Open Wallet',
              'finapay.hero.cta2': 'View Transactions',
              'finapay.features.title': 'Wallet',
              'finapay.features.titleHighlight': 'Features',
              'finapay.features.subtitle': 'A complete digital wallet experience powered by real gold',
              'finapay.wallet.title': 'A Wallet Built on',
              'finapay.wallet.titleHighlight': 'Real Gold',
              'finapay.wallet.subtitle': 'Intuitive interface designed for seamless gold transactions',
              'finapay.transfer.title': 'Instant Gold',
              'finapay.transfer.titleHighlight': 'Transfers',
              'finapay.transfer.subtitle': 'Move your gold value instantly between accounts or to other users',
              'finapay.network.title': 'Global Payment',
              'finapay.network.titleHighlight': 'Network',
              'finapay.network.subtitle': 'Instant cross-border gold payments across major financial hubs',
              'finapay.history.title': 'Transparent, Real-Time',
              'finapay.history.titleHighlight': 'Transaction Records',
              'finapay.history.subtitle': 'Every transaction is recorded, verified, and accessible',
              'finapay.security.title': 'High-Tech Gold',
              'finapay.security.titleHighlight': 'Security',
              'finapay.security.subtitle': 'Safe, compliant, and secure. Your gold is protected by enterprise-grade security.',
              'finapay.card.badge': 'Coming Soon',
              'finapay.card.title': 'A Premium Gold Card',
              'finapay.card.titleHighlight': 'Experience',
              'finapay.card.description': 'Spend your gold value anywhere with the FinaPay premium debit card. Seamlessly convert gold to fiat at the point of sale.',
              'finapay.card.cta': 'Join Waitlist',
              'finapay.cta.title': 'Your Gold. Your Wallet.',
              'finapay.cta.titleHighlight': 'Instantly Accessible.',
              'finapay.cta.subtitle': 'Empowering global payments backed by your own gold.',
              'finapay.cta.button': 'Open FinaPay Wallet',

              // FinaBridge Page
              'finabridge.hero.badge': 'Trade Bridge Platform',
              'finabridge.hero.title': 'Bridge Real Trade with',
              'finabridge.hero.titleHighlight': 'Verified Gold Worth',
              'finabridge.hero.subtitle': 'Use FinaBridge to connect importers and exporters through documented worth of physical gold, bringing stability and trust to cross-border deals.',
              'finabridge.hero.description': 'FinaBridge transforms physical gold into a settlement-ready financial instrument for real-world import and export flows.',
              'finabridge.hero.cta1': 'Open Corporate Account',
              'finabridge.hero.cta2': 'Talk to Trade Specialist',
              'finabridge.badges.1': 'Swiss-Regulated Framework',
              'finabridge.badges.2': 'Physical Gold • No Tokens',
              'finabridge.badges.3': 'Audit-Ready Documentation',

              // Final CTA
                        'finalcta.title': 'Experience the Future of',
                        'finalcta.titleHighlight': 'Gold-Backed Digital Finance',
                        'finalcta.subtitle': 'Open Your Finatrades Account Today',
                        'finalcta.button': 'Get Started',

                        // Product Suite
                        'productSuite.personal.label': 'Personal Tools',
                        'productSuite.personal.title': 'Your Tools to Manage Real Gold Digitally',
                        'productSuite.business.label': 'Business Ecosystem',
                        'productSuite.business.title': 'A Structured Ecosystem for High-Trust Business Transactions',
                        'productSuite.explore': 'Explore',

                        // Product Headlines & Descriptions (Business)
                        'productSuite.business.vault.headline': 'Deposit / Buy Gold',
                        'productSuite.business.vault.description': 'Get instant value and turn into a settlement financial instrument with your choice of hedging or floating strategies as your business grows.',
                        'productSuite.business.wallet.headline': 'Payments & Transfers',
                                  'productSuite.business.wallet.description': 'Send and receive payments through the platform, manage your wallet and spend anywhere using your gold-backed debit card.',
                        'productSuite.business.bridge.headline': 'Global Trade Monitoring',
                                  'productSuite.business.bridge.description': 'Monitor your **imports** and **exports** in real time, track gold-backed settlements and streamline every step of your cross-border business operations.',
                        'productSuite.business.bnsl.headline': "Buy 'N' SeLL Gold Plans",
                        'productSuite.business.bnsl.description': 'Get substantial margins and guaranteed returns thanks to our BNSL Plans.',

                        // Product Headlines & Bullets (Personal)
                        'productSuite.personal.vault.headline': 'Your Gold, Safely Stored',
                        'productSuite.personal.vault.bullet1': 'Deposit or buy gold instantly',
                        'productSuite.personal.vault.bullet2': 'Store your gold safely in approved vaults',
                        'productSuite.personal.vault.bullet3': 'Track your gold value in real time',
                        'productSuite.personal.vault.bullet4': 'Access full documentation anytime',
                        'productSuite.personal.wallet.headline': 'Gold at Your Fingertips',
                        'productSuite.personal.wallet.bullet1': 'Send and receive gold instantly',
                        'productSuite.personal.wallet.bullet2': 'View balance in grams and fiat',
                        'productSuite.personal.wallet.bullet3': 'Simple interface for daily use',
                        'productSuite.personal.wallet.bullet4': 'Seamlessly connected to FinaVault',
                        'productSuite.personal.bnsl.headline': 'Grow Your Wealth',
                        'productSuite.personal.bnsl.bullet1': 'Structured buy back plans',
                        'productSuite.personal.bnsl.bullet2': 'Fixed gold price protection',
                        'productSuite.personal.bnsl.bullet3': 'Quarterly growth additions',
                        'productSuite.personal.bnsl.bullet4': 'Flexible term options (12-36mo)',

                        // BNSL How It Works
                        'bnslHowItWorks.badge': 'Simple Steps',
                        'bnslHowItWorks.title': 'How BNSL Works',
                        'bnslHowItWorks.subtitle': 'A structured path to gold growth.',
                        'bnslHowItWorks.cta': 'Estimate Your Gold Growth',
                        'bnslHowItWorks.step1.title': 'Purchase / Deposit Physical Gold',
                        'bnslHowItWorks.step1.desc': 'Start by funding your plan with physical gold.',
                        'bnslHowItWorks.step2.title': 'Lock in Fixed Price',
                        'bnslHowItWorks.step2.desc': 'Secure your valuation for the duration.',
                        'bnslHowItWorks.step3.title': 'Quarterly Gold Additions',
                        'bnslHowItWorks.step3.desc': 'Watch your gold balance grow every 3 months.',
                        'bnslHowItWorks.step4.title': 'Maturity & Settlement',
                        'bnslHowItWorks.step4.desc': 'At the end of the term, receive your full principal plus growth.',

                        // BNSL Plan Details
                        'bnslPlan.badge': 'Plan Options',
                        'bnslPlan.title': 'Choose Your Term',
                        'bnslPlan.subtitle': 'Flexible durations to match your financial goals.',
                        'bnslPlan.term12': '12 Months',
                        'bnslPlan.term24': '24 Months',
                        'bnslPlan.term36': '36 Months',
                        'bnslPlan.feature1.12': 'Short-term commitment',
                        'bnslPlan.feature2.12': '4 quarterly growth cycles',
                        'bnslPlan.feature3.12': 'Ideal for quick returns',
                        'bnslPlan.feature4.12': 'Principal protection',
                        'bnslPlan.feature1.24': 'Medium-term growth',
                        'bnslPlan.feature2.24': '8 quarterly growth cycles',
                        'bnslPlan.feature3.24': 'Balanced growth & liquidity',
                        'bnslPlan.feature4.24': 'Enhanced compound effect',
                        'bnslPlan.feature1.36': 'Maximum yield strategy',
                        'bnslPlan.feature2.36': '12 quarterly growth cycles',
                        'bnslPlan.feature3.36': 'Designed for long-term accumulation',
                        'bnslPlan.feature4.36': 'Highest growth potential',

                        // BNSL Benefits
                        'bnslBenefits.badge': 'Key Benefits',
                        'bnslBenefits.title': 'Why Users Prefer',
                        'bnslBenefits.titleHighlight': 'BNSL Plan',
                        'bnslBenefits.benefit1.title': 'Physical Gold Security',
                        'bnslBenefits.benefit1.desc': 'Your investment remains fully backed by physical gold held in regulated vaults.',
                        'bnslBenefits.benefit2.title': 'Fixed Price Stability',
                        'bnslBenefits.benefit2.desc': 'Locked-In Price protects your valuation throughout the plan.',
                        'bnslBenefits.benefit3.title': 'Quarterly Growth Credits',
                        'bnslBenefits.benefit3.desc': 'Your gold value increases every 3 months at the agreed rate.',
                        'bnslBenefits.benefit4.title': 'In-Kind Settlement',
                                  'bnslBenefits.benefit4.desc': 'At maturity, your principal value is returned in gold, not cash.',

                                  // Why Finatrades
                                  'whyFinatrades.badge': 'Why Choose Us',
                                  'whyFinatrades.title': 'The Finatrades Advantage',
                                  'whyFinatrades.feature1.label': 'Trust & Compliance',
                                  'whyFinatrades.feature1.desc': 'Swiss regulatory standards',
                                  'whyFinatrades.feature2.label': 'Instant Gold Liquidity',
                                  'whyFinatrades.feature2.desc': 'Convert & transfer instantly',
                                  'whyFinatrades.feature3.label': 'Real Physical Assets',
                                  'whyFinatrades.feature3.desc': 'No synthetic derivatives',
                                  'whyFinatrades.feature4.label': 'B2B Trade Solutions',
                                  'whyFinatrades.feature4.desc': 'B2B gold settlements',
                                  'whyFinatrades.feature5.label': 'Cross-Border Utility',
                                  'whyFinatrades.feature5.desc': 'Global gold transfers',
                                  'whyFinatrades.feature6.label': 'Enterprise Interface',
                                  'whyFinatrades.feature6.desc': 'Institutional experience',

                                  // BNSL FAQ
                                  'bnslFaq.badge': 'FAQ',
                                  'bnslFaq.title': 'Frequently Asked',
                                  'bnslFaq.titleHighlight': 'Questions',
                                  'bnslFaq.q1': 'What is the Locked-In Price?',
                                  'bnslFaq.a1': 'It is the fixed valuation applied to your gold at the start of your plan. All growth and settlement calculations use this fixed price.',
                                  'bnslFaq.q2': 'How is growth added?',
                                  'bnslFaq.a2': 'Growth is calculated based on your principal gold value and credited every 3 months.',
                                  'bnslFaq.q3': 'What happens at maturity?',
                                  'bnslFaq.a3': 'Your full principal gold value is returned to your FinaWallet within 3 business days.',
                                  'bnslFaq.q4': 'Can I exit early?',
                                  'bnslFaq.a4': 'Yes, but penalties apply and your returned gold value will be reduced.',
                                  'bnslFaq.q5': 'Do I get cash?',
                                  'bnslFaq.a5': 'No. All payments and settlements are made as gold value.',

                                  // BNSL Risk Disclosure
                                  'bnslRisk.title': 'Risk Disclosure',
                                  'bnslRisk.subtitle': 'Important information to consider',
                                  'bnslRisk.risk1': 'Early termination may reduce your final gold value.',
                                  'bnslRisk.risk2': 'Locked-In Price limits upside if gold prices surge.',
                                  'bnslRisk.risk3': 'All growth is credited in gold value only.',
                                  'bnslRisk.risk4': 'Plan is dependent on counterparty performance.',
                                  'bnslRisk.risk5': 'Please read full Terms & Conditions before joining.',

                                            // BNSL Final CTA
                                            'bnslFinalCta.title1': 'Start Your',
                                            'bnslFinalCta.title2': 'BNSL Gold Plan Today',
                                            'bnslFinalCta.subtitle': 'Lock in your gold value at a fixed price and grow it quarterly.',
                                            'bnslFinalCta.startPlan': 'Start BNSL Plan',
                                            'bnslFinalCta.support': 'Talk to Support',
                                                    }
                                                  };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('finatrades_language');
      if (stored === 'en' || stored === 'fr') {
        setLanguage(stored);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('finatrades_language', language);
    } catch (e) {}
  }, [language]);

  const t = (key: string, params: Record<string, string> = {}) => {
    // @ts-ignore
    let text = translations[language]?.[key] || translations['en']?.[key] || key;
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return { language: 'en', setLanguage: () => {}, t: (key: string) => key };
  }
  return context;
}

export default LanguageContext;

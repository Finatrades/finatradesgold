import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Search,
  Sparkles,
  Shield,
  Coins,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useLocation } from 'wouter';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const categories = [
  { id: 'all', label: 'All Questions', icon: HelpCircle },
  { id: 'getting-started', label: 'Getting Started', icon: Sparkles },
  { id: 'investment', label: 'Investment', icon: Coins },
  { id: 'bonuses', label: 'Bonuses & Returns', icon: TrendingUp },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'selling', label: 'Selling & Withdrawals', icon: Clock },
];

const faqItems: FAQItem[] = [
  {
    id: 'what-is-bnsl',
    category: 'getting-started',
    question: 'What is BNSL (Buy Now Sell Later)?',
    answer:
      "BNSL is a unique gold investment product that lets you purchase gold at today's price, earn monthly bonuses, and sell whenever you choose after your plan matures. It combines the stability of gold with the benefits of regular returns.",
  },
  {
    id: 'how-to-start',
    category: 'getting-started',
    question: 'How do I get started with BNSL?',
    answer:
      "Getting started is simple: 1) Create a free account, 2) Complete identity verification (KYC), 3) Choose your investment amount and plan duration, 4) Make your payment, and 5) Start earning monthly bonuses. The entire process takes just a few minutes.",
  },
  {
    id: 'min-investment',
    category: 'investment',
    question: 'What is the minimum investment amount?',
    answer:
      "The minimum investment depends on your chosen plan. Our Starter plan begins at just $100, making gold investment accessible to everyone. Higher tier plans have higher minimums but offer better bonus rates.",
  },
  {
    id: 'gold-purity',
    category: 'investment',
    question: 'What is the purity of the gold I purchase?',
    answer:
      "All gold in our BNSL program is 99.99% pure (24 karat) gold. Each gold bar is certified, serialized, and stored in LBMA-approved vaults. You receive a digital certificate of ownership for your gold holdings.",
  },
  {
    id: 'bonus-calculation',
    category: 'bonuses',
    question: 'How are monthly bonuses calculated?',
    answer:
      "Bonuses are calculated based on your total gold holdings and plan tier. For example, with a Premium plan at 2% monthly bonus, if you hold 10 grams, you'll receive 0.2 grams as bonus each month. Bonuses are credited on the 1st of each month.",
  },
  {
    id: 'bonus-payment',
    category: 'bonuses',
    question: 'How are bonuses paid out?',
    answer:
      "Bonuses are paid in gold grams, which are automatically added to your vault. You can choose to let them compound with your main holdings or keep them separate. This means your bonus earnings also grow in value if gold prices increase.",
  },
  {
    id: 'gold-security',
    category: 'security',
    question: 'How is my gold secured?',
    answer:
      "Your gold is stored in fully insured, LBMA-approved vaults with 24/7 surveillance and armed security. We maintain 100% reserves - every gram in your account is backed by physical gold. Regular third-party audits verify our holdings.",
  },
  {
    id: 'account-security',
    category: 'security',
    question: 'How is my account protected?',
    answer:
      "We use bank-grade security including 256-bit encryption, two-factor authentication, and biometric login options. All sensitive data is encrypted at rest and in transit. We also offer withdrawal whitelisting for additional protection.",
  },
  {
    id: 'when-sell',
    category: 'selling',
    question: 'When can I sell my gold?',
    answer:
      "You can sell your gold anytime after your plan matures. Some premium plans allow early exit after completing 50% of the term. When you sell, you receive the current market price for your gold, including all accumulated bonuses.",
  },
  {
    id: 'withdrawal-time',
    category: 'selling',
    question: 'How long do withdrawals take?',
    answer:
      "Cash withdrawals are typically processed within 24 hours on business days. For larger amounts (over $50,000), processing may take 2-3 business days for security verification. Physical gold delivery is available within 7-10 business days.",
  },
  {
    id: 'early-exit',
    category: 'selling',
    question: 'Can I exit before my plan matures?',
    answer:
      "Premium and Elite plan holders can exit after completing 50% of their term. Early exit may result in forfeiture of some bonus earnings. We recommend completing your full term to maximize returns.",
  },
  {
    id: 'physical-delivery',
    category: 'selling',
    question: 'Can I take physical delivery of my gold?',
    answer:
      "Yes! You can request physical delivery of your gold at any time after your plan matures. We offer insured delivery to your doorstep. Delivery charges and minimum weight requirements apply based on your location.",
  },
];

export default function BNSLFAQ() {
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState<string[]>(['what-is-bnsl']);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = faqItems.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <section className="py-24 bg-gradient-to-b from-white via-gray-50/50 to-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-purple-100 dark:bg-purple-900/30/30 blur-3xl" />
        <div className="absolute bottom-40 left-10 w-80 h-80 rounded-full bg-purple-100 dark:bg-purple-900/30/20 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-purple-50 border border-purple-200 dark:border-purple-800/40/50 mb-6"
          >
            <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Got Questions?</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-purple-500 to-purple-500 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about BNSL gold investment
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-card border border-border focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-foreground"
              data-testid="input-faq-search"
            />
          </div>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;

            return (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-card text-muted-foreground hover:bg-muted/40 border border-border'
                }`}
                data-testid={`button-category-${category.id}`}
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto space-y-4">
          {filteredFAQs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <HelpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No questions found matching your search.</p>
            </motion.div>
          ) : (
            filteredFAQs.map((item, index) => {
              const isOpen = openItems.includes(item.id);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/40 transition-colors"
                    data-testid={`button-faq-${item.id}`}
                  >
                    <span className="font-semibold text-foreground pr-4">{item.question}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground/70 shrink-0" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-6">
                          <div className="pt-2 border-t border-border/60">
                            <p className="text-muted-foreground leading-relaxed pt-4">{item.answer}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-r from-purple-50 to-purple-50 border border-purple-100">
            <MessageCircle className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Still have questions?</h3>
              <p className="text-muted-foreground mb-4">Our team is here to help you 24/7</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation('/contact')}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold shadow-lg shadow-purple-200/50 inline-flex items-center gap-2"
              data-testid="button-contact-support"
            >
              <MessageCircle className="w-4 h-4" />
              Contact Support
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

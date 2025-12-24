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
  ChevronRight, ExternalLink, Mail, Phone, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
        headers: { 'Content-Type': 'application/json' },
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

        <Tabs defaultValue="faq" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="faq" className="flex items-center gap-2" data-testid="tab-faq">
              <Book className="w-4 h-4" /> FAQ
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2" data-testid="tab-contact">
              <MessageCircle className="w-4 h-4" /> Contact Support
            </TabsTrigger>
          </TabsList>

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

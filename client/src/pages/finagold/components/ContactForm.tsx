import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Mail, Phone, MessageSquare, User, Building2 } from 'lucide-react';
import { useMode } from '../context/ModeContext';
import { toast } from 'sonner';

export default function ContactForm() {
  const { isPersonal } = useMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Message sent successfully! We\'ll get back to you soon.');
        setFormData({ name: '', email: '', phone: '', company: '', subject: '', message: '' });
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-12 lg:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#EDE9FE] via-[#F4F6FC] to-[#FAFBFF]" />
      
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#8A2BE2]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#FF2FBF]/5 rounded-full blur-[100px]" />

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#8A2BE2]/20 text-[#8A2BE2] text-sm font-medium mb-6">
            <MessageSquare className="w-4 h-4" />
            Get In Touch
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0D0D0D] mb-4">
            Contact <span className="bg-gradient-to-r from-[#8A2BE2] to-[#FF2FBF] bg-clip-text text-transparent">Us</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Have questions about our gold-backed financial services? Our team is here to help you get started.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="bg-white rounded-2xl p-8 border border-[#8A2BE2]/10 shadow-xl shadow-[#8A2BE2]/5">
              <h3 className="text-2xl font-bold text-[#0D0D0D] mb-6">Send us a message</h3>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8A2BE2] focus:ring-2 focus:ring-[#8A2BE2]/20 outline-none transition-all bg-gray-50/50"
                      placeholder="John Smith"
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8A2BE2] focus:ring-2 focus:ring-[#8A2BE2]/20 outline-none transition-all bg-gray-50/50"
                      placeholder="john@example.com"
                      data-testid="input-contact-email"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8A2BE2] focus:ring-2 focus:ring-[#8A2BE2]/20 outline-none transition-all bg-gray-50/50"
                      placeholder="+971 50 123 4567"
                      data-testid="input-contact-phone"
                    />
                  </div>
                  {!isPersonal && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Building2 className="w-4 h-4 inline mr-2" />
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8A2BE2] focus:ring-2 focus:ring-[#8A2BE2]/20 outline-none transition-all bg-gray-50/50"
                        placeholder="Your Company Ltd"
                        data-testid="input-contact-company"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8A2BE2] focus:ring-2 focus:ring-[#8A2BE2]/20 outline-none transition-all bg-gray-50/50"
                    data-testid="select-contact-subject"
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="account">Account & Registration</option>
                    <option value="finavault">FinaVault - Gold Storage</option>
                    <option value="finapay">FinaPay - Transactions</option>
                    <option value="bnsl">BNSL - Holding Plans</option>
                    <option value="finabridge">FinaBridge - Trade Finance</option>
                    <option value="kyc">KYC & Verification</option>
                    <option value="support">Technical Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8A2BE2] focus:ring-2 focus:ring-[#8A2BE2]/20 outline-none transition-all bg-gray-50/50 resize-none"
                    placeholder="How can we help you?"
                    data-testid="textarea-contact-message"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-8 py-4 rounded-xl font-semibold hover:from-[#EA580C] hover:to-[#DC2626] transition-all shadow-lg shadow-[#F97316]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="btn-contact-submit"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-[#2A0055] to-[#0D001E] rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#A342FF]" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">Email Us</p>
                    <a href="mailto:support@finatrades.com" className="text-white hover:text-[#A342FF] transition-colors">
                      support@finatrades.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-[#8A2BE2]/10 shadow-xl shadow-[#8A2BE2]/5">
              <h3 className="text-xl font-bold text-[#0D0D0D] mb-4">Business Hours</h3>
              <div className="space-y-3 text-gray-600">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span className="font-medium text-[#0D0D0D]">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="font-medium text-[#0D0D0D]">10:00 AM - 2:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="font-medium text-gray-400">Closed</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                * All times are in Gulf Standard Time (GST)
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

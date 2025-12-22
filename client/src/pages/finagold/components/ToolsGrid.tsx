import { motion } from 'framer-motion';
import { Send, Smartphone, CreditCard, TrendingUp } from 'lucide-react';

const tools = [
  {
    icon: Send,
    title: 'Money Transfer',
    description: 'Send & receive instantly.',
  },
  {
    icon: Smartphone,
    title: 'Digital Payments',
    description: 'Pay online and in-store.',
  },
  {
    icon: CreditCard,
    title: 'Card Payments & Withdrawals',
    description: 'Tap, swipe, withdraw globally.',
  },
  {
    icon: TrendingUp,
    title: 'BNSL Earnings',
    description: 'Grow with structured earnings.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

export default function ToolsGrid() {
  return (
    <section id="products" className="relative py-24 bg-black" data-testid="tools-section">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(234, 194, 107, 0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Personal Tools</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need for daily money movement and earnings.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid md:grid-cols-2 gap-6"
        >
          {tools.map((tool) => (
            <motion.div
              key={tool.title}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group relative p-8 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-[#EAC26B]/40 transition-all duration-300 overflow-hidden"
              data-testid={`tool-card-${tool.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#EAC26B]/5 to-transparent" />
              </div>

              <motion.div
                className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#EAC26B] to-transparent opacity-0 group-hover:opacity-100"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.4 }}
              />

              <div className="relative flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-[#EAC26B]/10 flex items-center justify-center group-hover:bg-[#EAC26B]/20 transition-colors shrink-0">
                  <tool.icon className="w-7 h-7 text-[#EAC26B]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#EAC26B] transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-gray-400">{tool.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

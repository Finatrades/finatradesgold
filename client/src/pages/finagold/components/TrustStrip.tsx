import { motion } from 'framer-motion';
import { Shield, FileCheck, Eye, Scale, Lock, Users } from 'lucide-react';
import { useMode } from '../context/ModeContext';

const content = {
  personal: {
    title: 'Swiss-Aligned, Transparency-Driven',
    items: [
      { icon: Shield, label: 'Real physical gold in regulated vaults' },
      { icon: FileCheck, label: 'Clear documentation for every gram' },
      { icon: Eye, label: 'Independent verifications' },
      { icon: Scale, label: 'No hidden financial instruments' },
    ],
  },
  business: {
    title: 'Compliance First. Enterprise Ready.',
    items: [
      { icon: Shield, label: 'Swiss-aligned gold custody framework' },
      { icon: FileCheck, label: 'Detailed vault documentation' },
      { icon: Users, label: 'Controlled multi-user environment' },
      { icon: Lock, label: 'Audit trails & trade workflows' },
    ],
  },
};

export default function TrustStrip() {
  const { mode } = useMode();
  const c = content[mode];

  return (
    <section className="relative py-16 bg-gradient-to-r from-[#2A0055] via-[#4B0082] to-[#2A0055]" data-testid="trust-strip">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <motion.h3
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-white"
          >
            {c.title}
          </motion.h3>
        </motion.div>

        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap justify-center items-center gap-8 lg:gap-12"
        >
          {c.items.map((item, index) => (
            <motion.div
              key={`${mode}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <item.icon className="w-5 h-5 text-[#EAC26B]" />
              </div>
              <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">
                {item.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

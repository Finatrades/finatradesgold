import { motion } from 'framer-motion';
import { FileCheck, Shield, Eye, Scale } from 'lucide-react';

const trustItems = [
  { icon: FileCheck, label: 'Audit-ready logs' },
  { icon: Shield, label: 'Secure infrastructure' },
  { icon: Eye, label: 'Transparent balances' },
  { icon: Scale, label: 'Compliance-first operations' },
];

export default function TrustStrip() {
  return (
    <section className="relative py-12 bg-black border-y border-white/5" data-testid="trust-strip">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-wrap justify-center items-center gap-8 md:gap-16"
        >
          {trustItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#EAC26B]/10 transition-colors">
                <item.icon className="w-5 h-5 text-[#EAC26B]" />
              </div>
              <span className="text-gray-400 text-sm font-medium group-hover:text-white transition-colors">
                {item.label}
              </span>
              {index < trustItems.length - 1 && (
                <div className="hidden md:block w-px h-6 bg-white/10 ml-8" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';
import { Users, Globe, Coins, Shield } from 'lucide-react';

const stats = [
  { icon: Users, value: 12500, suffix: '+', label: 'Active Users', color: '#8A2BE2' },
  { icon: Globe, value: 45, suffix: '+', label: 'Countries Served', color: '#FF2FBF' },
  { icon: Coins, value: 2.5, suffix: 'T', label: 'Gold Secured (kg)', decimals: 1, color: '#FFD700' },
  { icon: Shield, value: 99.9, suffix: '%', label: 'Platform Uptime', decimals: 1, color: '#22C55E' },
];

export default function StatsCounter() {
  return (
    <section className="relative py-16 lg:py-20 bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#0D001E] overflow-hidden" data-testid="stats-section">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(138, 43, 226, 0.15) 1px, transparent 0)`,
          backgroundSize: '30px 30px'
        }} />
      </div>

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] rounded-full blur-[150px]"
        style={{ background: 'rgba(138, 43, 226, 0.1)' }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <motion.div
                className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: `${stat.color}20`, border: `1px solid ${stat.color}30` }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <stat.icon className="w-7 h-7" style={{ color: stat.color }} />
              </motion.div>

              <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                <AnimatedCounter
                  to={stat.value}
                  suffix={stat.suffix}
                  decimals={stat.decimals || 0}
                  duration={2.5}
                />
              </div>
              <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

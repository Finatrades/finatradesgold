import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Alexander K.',
    role: 'Private Investor',
    content: 'Finatrades gives me confidence that my gold is real, stored safely, and fully documented. The platform is incredibly transparent.',
    rating: 5,
    avatar: 'AK',
  },
  {
    name: 'Maria S.',
    role: 'Family Office Manager',
    content: 'Managing our family\'s gold reserves has never been this streamlined. The certificates and reporting are exactly what we need.',
    rating: 5,
    avatar: 'MS',
  },
  {
    name: 'Chen W.',
    role: 'Trading House Director',
    content: 'FinaBridge transformed how we handle cross-border gold settlements. The compliance documentation saves us weeks of work.',
    rating: 5,
    avatar: 'CW',
  },
  {
    name: 'Sophie L.',
    role: 'Wealth Advisor',
    content: 'I recommend Finatrades to all my clients who want exposure to physical gold without the hassle. Swiss regulation gives them peace of mind.',
    rating: 5,
    avatar: 'SL',
  },
];

export default function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#EDE9FE] to-[#F4F6FC]" data-testid="testimonials-section">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block text-sm font-semibold tracking-[0.2em] text-[#8A2BE2] mb-4">TESTIMONIALS</span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0D0D0D]">Trusted by Professionals Worldwide</h2>
        </motion.div>

        <div className="relative overflow-hidden">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-purple-500/5 border border-purple-100"
            >
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-gray-700 text-lg md:text-xl leading-relaxed mb-8 italic">
                "{testimonials[current].content}"
              </p>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8A2BE2] to-[#FF2FBF] flex items-center justify-center text-white font-bold text-sm">
                  {testimonials[current].avatar}
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D]">{testimonials[current].name}</p>
                  <p className="text-gray-500 text-sm">{testimonials[current].role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full bg-white border border-purple-200 flex items-center justify-center hover:bg-purple-50 transition-colors shadow-sm"
              data-testid="testimonial-prev"
            >
              <ChevronLeft className="w-5 h-5 text-purple-600" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > current ? 1 : -1);
                    setCurrent(i);
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    i === current ? 'bg-purple-600 w-6' : 'bg-purple-200 hover:bg-purple-300'
                  }`}
                  data-testid={`testimonial-dot-${i}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="w-10 h-10 rounded-full bg-white border border-purple-200 flex items-center justify-center hover:bg-purple-50 transition-colors shadow-sm"
              data-testid="testimonial-next"
            >
              <ChevronRight className="w-5 h-5 text-purple-600" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

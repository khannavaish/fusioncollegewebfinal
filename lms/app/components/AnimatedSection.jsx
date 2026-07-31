'use client';

import { motion } from 'framer-motion';

export default function AnimatedSection({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1],
        delay: delay 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

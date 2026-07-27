import React from "react";
import { motion } from 'framer-motion';
import AuthBackdrop from '@/components/AuthBackdrop';

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10 flex items-center justify-center">
      <AuthBackdrop />
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }} className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/25 bg-background/38 p-6 shadow-2xl backdrop-blur-3xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-primary/90 shadow-lg"><Icon className="h-7 w-7 text-primary-foreground" aria-hidden="true" /></div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-white/15 bg-card/35 p-1 backdrop-blur-2xl">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </motion.div>
    </div>
  );
}

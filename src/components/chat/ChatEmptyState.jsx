import { motion } from 'framer-motion';
import { MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatEmptyState({ icon: Icon = MessagesSquare, title, subtitle, actionLabel, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex-1 min-h-0 flex flex-col items-center justify-center p-6"
    >
      <div className="glass-card rounded-3xl p-8 max-w-sm flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-primary/60" />
        </div>
        <h3 className="font-heading font-semibold text-base mb-1">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>}
        {actionLabel && onAction && (
          <Button onClick={onAction} className="mt-5 rounded-full">
            {actionLabel}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
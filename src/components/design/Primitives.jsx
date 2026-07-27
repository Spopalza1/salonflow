import { cn } from '@/lib/utils';

export function AppPage({ className, children }) {
  return <div className={cn('sf-page', className)}>{children}</div>;
}
export function PageHeader({ title, description, actions, className }) {
  return <header className={cn('sf-page-header', className)}><div className="min-w-0"><h1 className="sf-page-title">{title}</h1>{description && <p className="sf-page-description">{description}</p>}</div>{actions && <div className="sf-page-actions">{actions}</div>}</header>;
}
export function SectionHeader({ title, description, actions, className }) {
  return <div className={cn('sf-section-header', className)}><div className="min-w-0"><h2 className="sf-section-title">{title}</h2>{description && <p className="sf-section-description">{description}</p>}</div>{actions && <div className="sf-section-actions">{actions}</div>}</div>;
}
export function GlassPanel({ className, children, interactive = false }) {
  return <section className={cn('sf-glass-panel', interactive && 'sf-glass-interactive', className)}>{children}</section>;
}
export function UnreadBadge({ count, urgent = false, className }) {
  if (!count) return null;
  return <span aria-label={`${count} unread`} className={cn('sf-unread-badge', urgent && 'sf-unread-badge-urgent', className)}>{count > 99 ? '99+' : count}</span>;
}

import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** A friendly placeholder for pages or sections with nothing to show yet. */
export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="empty-state card">
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <h2 className="empty-state__title">{title}</h2>
      {children && <div className="empty-state__text">{children}</div>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

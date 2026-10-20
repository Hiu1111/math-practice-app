import { useEffect, type ReactNode } from 'react';

interface PageContainerProps {
  /** Visible page heading (rendered as the page's h1). Omit when the page renders its own h1. */
  title?: string;
  subtitle?: ReactNode;
  /** Text for the browser tab; defaults to the title. */
  documentTitle?: string;
  width?: 'narrow' | 'normal' | 'wide';
  /** Keep the h1 for screen readers but hide it visually (e.g. on the busy practice screen). */
  hideTitle?: boolean;
  children?: ReactNode;
}

const APP_NAME = 'Math Practice';

/** Shared page wrapper: consistent width, spacing, heading and browser tab title. */
export function PageContainer({
  title,
  subtitle,
  documentTitle,
  width = 'normal',
  hideTitle = false,
  children,
}: PageContainerProps) {
  const tabTitle = documentTitle ?? title;

  useEffect(() => {
    document.title = tabTitle ? `${tabTitle} · ${APP_NAME}` : APP_NAME;
  }, [tabTitle]);

  return (
    <div className={`page page--${width}`}>
      {title && (
        <header className={hideTitle ? 'visually-hidden' : 'page__header'}>
          <h1 className="page__title">{title}</h1>
          {subtitle && <p className="page__subtitle">{subtitle}</p>}
        </header>
      )}
      {children}
    </div>
  );
}

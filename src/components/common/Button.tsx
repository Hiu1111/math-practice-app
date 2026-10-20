import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
type Size = 'md' | 'lg';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  /** Stretch to the full width of the parent. */
  block?: boolean;
}

function buttonClasses(
  { variant = 'primary', size = 'md', block = false }: StyleProps,
  extra?: string,
) {
  return ['btn', `btn--${variant}`, `btn--${size}`, block ? 'btn--block' : '', extra ?? '']
    .filter(Boolean)
    .join(' ');
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps;

/** A large, child-friendly button with consistent styling. */
export function Button({ variant, size, block, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, block }, className)} {...rest} />
  );
}

export type ButtonLinkProps = LinkProps & StyleProps;

/** A router link styled as a button, for navigation actions. */
export function ButtonLink({ variant, size, block, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, block }, className)} {...rest} />;
}

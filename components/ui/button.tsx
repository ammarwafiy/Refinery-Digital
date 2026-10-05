'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ComponentPropsWithRef<'button'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'dark' | 'warning' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'bg-[#009FE3] text-white hover:bg-[#0089C4] shadow-sm hover:shadow-[0_0_15px_rgba(0,159,227,0.35)] border border-[#009FE3]/50',
  destructive:
    'bg-[#d81f2c] text-white hover:bg-[#b4121e] shadow-sm hover:shadow-[0_0_15px_rgba(216,31,44,0.35)] border border-[#d81f2c]/50',
  outline:
    'border border-[#1F2E43] bg-[#0A1018] text-slate-200 hover:bg-[#152030] hover:border-[#2D415E]',
  secondary:
    'bg-[#151c2e] text-slate-100 hover:bg-[#1E293B] border border-white/5',
  ghost:
    'text-slate-300 hover:bg-white/5 hover:text-white',
  link:
    'text-[#009FE3] underline-offset-4 hover:underline p-0 h-auto',
  dark:
    'bg-[#101927] text-slate-100 hover:bg-[#182438] border border-[#1F2E43] shadow-sm hover:border-[#2D415E]',
  warning:
    'bg-amber-600 text-white hover:bg-amber-500 border border-amber-500/50 shadow-sm hover:shadow-[0_0_15px_rgba(217,119,6,0.35)]',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500/50 shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.35)]',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-9 px-4 py-2 text-xs font-semibold',
  sm: 'h-8 px-3 text-[11px] font-medium rounded-md',
  lg: 'h-11 px-6 text-sm font-semibold rounded-xl',
  icon: 'h-9 w-9 p-0 rounded-lg flex items-center justify-center',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, children, disabled, ...props }, ref) => {
    const baseClasses = cn(
      'inline-flex items-center justify-center gap-2 rounded-lg font-mono tracking-tight select-none cursor-pointer',
      'transition-all duration-150 ease-out will-change-transform',
      // Tactile button micro-physics (Emil Kowalski style)
      'active:scale-[0.97] active:translate-y-[0.5px]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FE3]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0A1018]',
      'disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
      variantStyles[variant],
      sizeStyles[size],
      className
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        className: cn(baseClasses, child.props?.className),
      });
    }

    return (
      <button ref={ref} className={baseClasses} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg';

  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm focus:ring-emerald-500',
    secondary: 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-sm focus:ring-slate-700',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-slate-400',
    danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm focus:ring-rose-500',
    ghost: 'hover:bg-slate-100 text-slate-700 active:bg-slate-200 focus:ring-slate-300',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};

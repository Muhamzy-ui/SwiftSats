import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftAddon,
  rightAddon,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-subtle">
        {leftAddon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {leftAddon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'block w-full rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-100 disabled:cursor-not-allowed',
              leftAddon ? 'pl-9' : 'pl-3.5',
              rightAddon ? 'pr-10' : 'pr-3.5',
              'py-2.5',
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100',
              className
            )
          )}
          {...props}
        />
        {rightAddon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
            {rightAddon}
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

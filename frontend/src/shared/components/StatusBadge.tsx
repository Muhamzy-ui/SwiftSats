import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  showDot = true,
}) => {
  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'COMPLETED':
        return {
          label: 'Completed',
          bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-[#00e676] border-emerald-200 dark:border-emerald-500/40',
          dot: 'bg-emerald-500 dark:bg-[#00e676]',
        };
      case 'PAYMENT_CONFIRMED':
        return {
          label: 'Payment Confirmed',
          bg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/40',
          dot: 'bg-teal-500',
        };
      case 'PAYOUT_PROCESSING':
        return {
          label: 'Payout Processing',
          bg: 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/50',
          dot: 'bg-[#00e676] animate-pulse',
        };
      case 'AWAITING_PAYMENT':
        return {
          label: 'Awaiting Payment',
          bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/40',
          dot: 'bg-amber-500 animate-pulse',
        };
      case 'VERIFYING':
        return {
          label: 'Verifying',
          bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/40',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'QUOTE_LOCKED':
        return {
          label: 'Quote Locked',
          bg: 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
          dot: 'bg-slate-400',
        };
      case 'FAILED':
        return {
          label: 'Failed',
          bg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          dot: 'bg-rose-500',
        };
      case 'REFUNDED':
        return {
          label: 'Refunded',
          bg: 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800',
          dot: 'bg-slate-500',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          bg: 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800',
          dot: 'bg-slate-400',
        };
      default:
        return {
          label: st,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
          config.bg,
          className
        )
      )}
    >
      {showDot && <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />}
      <span>{config.label}</span>
    </span>
  );
};

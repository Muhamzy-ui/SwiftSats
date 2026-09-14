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
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'PAYMENT_CONFIRMED':
        return {
          label: 'Payment Confirmed',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'PAYOUT_PROCESSING':
        return {
          label: 'Payout Processing',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500 animate-pulse',
        };
      case 'AWAITING_PAYMENT':
        return {
          label: 'Awaiting Payment',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500 animate-pulse',
        };
      case 'QUOTE_LOCKED':
        return {
          label: 'Quote Locked',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
      case 'FAILED':
        return {
          label: 'Failed',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'REFUNDED':
        return {
          label: 'Refunded',
          bg: 'bg-slate-100 text-slate-600 border-slate-300',
          dot: 'bg-slate-500',
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

import React, { useState } from 'react';
import {
  MessageCircle,
  Mail,
  Clock,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Headphones,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'How fast will my crypto be delivered?',
    answer:
      'Crypto delivery is automated and instantaneous. The moment your bank transfer is credited to our virtual settlement account, our automated Quidax engine broadcasts the transaction on-chain within 30 to 120 seconds.',
  },
  {
    question: 'What if my bank transfer is delayed?',
    answer:
      'Bank networks can occasionally take a few minutes to process interbank settlements. Our system continuously monitors the settlement ledger 24/7. Once your bank completes the credit, your locked rate is honored and payout is triggered immediately.',
  },
  {
    question: 'Do I need a BVN or identity verification (KYC)?',
    answer:
      'No BVN or complex KYC submission is required for standard purchases. SwiftSats is a non-custodial on-ramp: crypto is sent directly to your self-custody wallet address without holding funds on deposit.',
  },
  {
    question: 'Can I cancel an order if I change my mind?',
    answer:
      'Yes. If you have not yet sent payment from your bank, you can simply tap "Cancel this Order" on Step 4. Your rate lock and virtual account will be safely released immediately.',
  },
  {
    question: 'What should I put in the bank transfer narration?',
    answer:
      'Please do NOT write words like "crypto", "BTC", "USDT", or "Bitcoin" in the transfer remarks due to Nigerian banking regulations. Use your name or your order reference (e.g. SATS-XXXX).',
  },
];

export const SupportPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      {/* Top Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#00c853] dark:text-[#00e676] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 font-mono shadow-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>24/7 Dedicated Helpdesk</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Customer Support
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Need help with a transfer or order? Our specialized team is available around the clock.
        </p>
      </div>

      {/* Primary WhatsApp Direct Support Action Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c1811] via-[#08120c] to-[#050b07] border border-emerald-500/30 text-white shadow-2xl space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00e676] block">
              Fastest Response
            </span>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Live WhatsApp Support</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Connect directly with an on-duty operations agent. Average response time is under 3 minutes.
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-[#00e676] shrink-0 shadow-lg shadow-emerald-500/20">
            <MessageCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="pt-1 relative z-10">
          <a
            href="https://wa.me/2348000000000?text=Hello%20SwiftSats%20Support%2C%20I%20need%20assistance%20with%20my%20order"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 group active:scale-98"
          >
            <MessageCircle className="w-4 h-4 fill-slate-950" />
            <span>Chat on WhatsApp (Live Now)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.08] relative z-10">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
            <span>Support Agents Online</span>
          </span>
          <span>Open 24 Hours • 7 Days a Week</span>
        </div>
      </div>

      {/* Alternative Email Contact Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/[0.08] shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Official Email
            </span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
              support@swiftsats.com
            </span>
          </div>
        </div>

        <a
          href="mailto:support@swiftsats.com?subject=SwiftSats%20Support%20Request"
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors shrink-0"
        >
          Send Email
        </a>
      </div>

      {/* Frequently Asked Questions */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1">
          <Headphones className="w-4 h-4 text-[#00c853] dark:text-[#00e676]" />
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.question}
                className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/70 overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full py-3.5 px-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-slate-900 dark:text-white hover:text-[#00c853] dark:hover:text-[#00e676] transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#00c853] dark:text-[#00e676]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/[0.04]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Non-Custodial Assurance Badge */}
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 text-xs flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-[#00c853] dark:text-[#00e676] shrink-0" />
        <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
          SwiftSats operates direct execution via SEC-registered blockchain pipelines. Funds are never held on custodial deposit.
        </p>
      </div>
    </div>
  );
};

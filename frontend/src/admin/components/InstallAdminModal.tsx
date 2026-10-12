import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, PlusSquare, Check, Copy, X } from 'lucide-react';

interface InstallAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAdminModal: React.FC<InstallAdminModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isAppleDevice);

    // Detect if already installed / standalone
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Capture Android Chrome install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  const handleCopyUrl = () => {
    const adminUrl = `${window.location.origin}/admin`;
    navigator.clipboard.writeText(adminUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#0c1017] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                <span>Add SwiftAdmin to Home Screen</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  PWA
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Launch directly into Admin Console without opening the user site
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status indicator if already installed */}
        {isStandalone && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>You are currently running in standalone app mode!</span>
          </div>
        )}

        {/* Instructions Body */}
        <div className="mt-4 space-y-3.5 text-xs">
          {/* Native Android Chrome Install Trigger */}
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install SwiftAdmin App Now</span>
            </button>
          )}

          {/* iOS Safari Instructions */}
          {isIOS ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                iPhone / iPad Setup Instructions:
              </span>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-snug">
                    Make sure you are on Safari and tap the <strong className="font-bold text-slate-900 dark:text-white flex-inline items-center gap-1"><Share className="w-3 h-3 inline text-blue-500" /> Share</strong> button at the bottom of the screen.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-snug">
                    Scroll down the share sheet and tap <strong className="font-bold text-slate-900 dark:text-white flex-inline items-center gap-1"><PlusSquare className="w-3 h-3 inline text-emerald-500" /> &quot;Add to Home Screen&quot;</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-snug">
                    Confirm name as <strong className="font-bold text-slate-900 dark:text-white">SwiftAdmin</strong> and tap <strong className="font-bold text-emerald-500">Add</strong> at top-right.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Android / Generic Browser Instructions */
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Android Chrome Setup:
              </span>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-snug">
                    Tap the <strong>three dots menu (⋮)</strong> at the top-right of Chrome.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-snug">
                    Tap <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-snug">
                    The app shortcut will be placed on your home screen and will always launch directly into your Admin Console.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Direct URL copy fallback */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Direct Admin URL:
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] truncate select-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/admin` : 'https://swiftsats.onrender.com/admin'}
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

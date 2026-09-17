import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Headphones, User } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  // Hide on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const navItems = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/track', label: 'Track', icon: Search },
    { to: '/support', label: 'Support', icon: Headphones },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-[360px] pointer-events-auto">
      {/* Floating Island iOS 27 Frosted Ultra-Glass Capsule Dock */}
      <nav
        aria-label="Mobile Navigation"
        className="flex items-center justify-between p-1.5 rounded-[28px] bg-white/75 dark:bg-[#07090e]/75 backdrop-blur-2xl backdrop-saturate-[190%] border border-white/80 dark:border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 active:scale-90 select-none group ${
                isActive
                  ? 'text-[#00c853] dark:text-[#00e676]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {/* Dynamic Pill Accent with Glow */}
              <div
                className={`w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/30 scale-105'
                    : 'group-hover:bg-slate-100 dark:group-hover:bg-white/[0.06]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'
                  }`}
                />
              </div>

              {/* Label */}
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-all duration-200 ${
                  isActive
                    ? 'font-black text-slate-900 dark:text-white'
                    : 'font-semibold text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

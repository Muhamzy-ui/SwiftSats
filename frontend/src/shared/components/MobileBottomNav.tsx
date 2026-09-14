import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Zap, Search, User } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  // Hide on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const navItems = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/buy', label: 'Buy', icon: Zap },
    { to: '/track', label: 'Track', icon: Search },
    { to: '/pin', label: 'Account', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#07080d]/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/[0.08] py-2 px-6 shadow-2xl transition-colors duration-200">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to) || (item.to === '/buy' && location.pathname === '/');

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 transition-all py-1 px-3 rounded-2xl ${
                isActive
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <div
                className={`w-9 h-8 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                    : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

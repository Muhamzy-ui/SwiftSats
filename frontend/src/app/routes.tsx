import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { OrderStatusPage } from './pages/OrderStatus';
import { PinEntryPage } from './pages/PinEntry';
import { Header } from '../shared/components/Header';
import { Footer } from '../shared/components/Footer';
import { MobileBottomNav } from '../shared/components/MobileBottomNav';
import { useTheme } from '../shared/context/ThemeContext';

export const AppRoutes: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#07080d] text-slate-900 dark:text-slate-100 relative overflow-hidden font-sans select-none transition-colors duration-200">
      {/* Floating Ambient Glow Orbs - Only rendered in Dark Mode */}
      {theme === 'dark' && (
        <>
          <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none animate-ambient-glow" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-teal-500/10 blur-[140px] pointer-events-none animate-ambient-glow" style={{ animationDelay: '-4s' }} />
          <div className="fixed top-[40%] right-[-5%] w-[350px] h-[350px] rounded-full bg-[#00e676]/5 blur-[110px] pointer-events-none animate-ambient-glow" style={{ animationDelay: '-2s' }} />
        </>
      )}

      <Routes>
        {/* Full-screen PIN screen */}
        <Route path="/pin" element={<PinEntryPage />} />

        {/* Standard flow with header & footer */}
        <Route
          path="*"
          element={
            <>
              <Header />
              <main className="flex-1 pb-24 md:pb-12 z-10">
                <Routes>
                  <Route index element={<Home />} />
                  <Route path="buy" element={<Home />} />
                  <Route path="track" element={<OrderStatusPage />} />
                  <Route path="track/:reference" element={<OrderStatusPage />} />
                  <Route path="orders/:reference" element={<OrderStatusPage />} />
                </Routes>
              </main>
              <Footer />
              <MobileBottomNav />
            </>
          }
        />
      </Routes>
    </div>
  );
};

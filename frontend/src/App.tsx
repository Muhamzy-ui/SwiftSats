import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppRoutes } from './app/routes';
import { AdminRoutes } from './admin/routes';
import { ThemeProvider } from './shared/context/ThemeContext';
import { AuthProvider } from './shared/context/AuthContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Admin Section (Protected) */}
            <Route path="/admin/*" element={<AdminRoutes />} />

            {/* Public Buy Flow & Track Order */}
            <Route path="/*" element={<AppRoutes />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

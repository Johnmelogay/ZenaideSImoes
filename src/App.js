import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { CustomerProvider, useCustomer } from './contexts/CustomerContext';

// Pages
import Store from './pages/Store';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Success from './pages/Success';
import LandingPage from './pages/LandingPage';

// Protected Route Wrapper (Admin)
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-stone-400">Carregando...</div>;
  if (!session) return <Navigate to="/admin" replace />;

  return children;
};

// Payment Redirect Handler + Admin PWA launcher
const PaymentRedirectHandler = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Step 1: If ?admin in URL, save flag to localStorage
    if (params.has('admin')) {
      localStorage.setItem('zenaide_pwa_mode', 'admin');
      console.log('Admin PWA mode saved to localStorage');
      // Redirect to admin immediately
      const hash = window.location.hash;
      if (!hash || hash === '#/' || hash === '#') {
        window.location.hash = '#/admin';
      }
      return;
    }

    // Step 2: If launched from Home Screen (standalone), check localStorage
    const isStandalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone && localStorage.getItem('zenaide_pwa_mode') === 'admin') {
      const hash = window.location.hash;
      if (!hash || hash === '#/' || hash === '#') {
        console.log('Standalone admin PWA detected — redirecting to admin');
        window.location.hash = '#/admin';
      }
      return;
    }

    // Payment redirect
    if (params.get('transaction_id') || params.get('order_nsu') || params.get('id')) {
      const basePath = window.location.pathname;
      window.location.replace(`${basePath}#/sucesso?${params.toString()}`);
    }
  }, []);
  return null;
};

// Customer-Aware Home Route
const HomeRoute = () => {
  const { customer, isLoading } = useCustomer();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-stone-50">
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-16 h-16 bg-amber-200 rounded-full mb-4" />
          <div className="h-4 w-40 bg-amber-100 rounded" />
        </div>
      </div>
    );
  }

  return customer ? <Store /> : <LandingPage />;
};

export default function App() {
  return (
    <CustomerProvider>
      <PaymentRedirectHandler />
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/produto/:productId" element={<HomeRoute />} />
          <Route path="/sucesso" element={<Success />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </CustomerProvider>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/admin/Dashboard';
import AdminServices from './pages/admin/Services';
import AdminOrders from './pages/admin/Orders';
import AdminProfile from './pages/admin/Profile';
import AdminLayout from './components/layout/AdminLayout';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, role, isAdmin, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Carregando...</div>;
  
  if (!user) return <Navigate to="/auth" replace />;
  
  if (allowedRoles && role && !allowedRoles.includes(role) && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col text-white font-sans bg-transparent">
    <Navbar />
    <main className="flex-grow">{children}</main>
    <Footer />
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/feed" element={<PublicLayout><Feed /></PublicLayout>} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile/:userId" element={<PublicLayout><Profile /></PublicLayout>} />
          <Route path="/checkout/:serviceId" element={<PublicLayout><Checkout /></PublicLayout>} />
          <Route path="/checkout/success" element={<PublicLayout><CheckoutSuccess /></PublicLayout>} />

          {/* User/Buyer Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['comprador', 'admin']}><PublicLayout><UserDashboard /></PublicLayout></ProtectedRoute>} />

          {/* Admin/Seller/Profile Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['vendedor', 'comprador', 'admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

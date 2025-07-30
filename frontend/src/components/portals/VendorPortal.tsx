import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Container, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import VendorLayout from './VendorLayout';
import VendorDashboard from './vendor/VendorDashboard';
import InvoiceUpload from './vendor/InvoiceUpload';
import InvoiceHistory from './vendor/InvoiceHistory';
import InvoiceStatusView from './vendor/InvoiceStatusView';
import VendorProfile from './vendor/VendorProfile';
import PaidVendorInvoices from './vendor/PaidVendorInvoices';

console.log('📦 [VENDOR PORTAL] InvoiceUpload imported:', typeof InvoiceUpload);

interface VendorPortalProps {}

const VendorPortal: React.FC<VendorPortalProps> = () => {
  console.log('🏢 [VENDOR PORTAL] Component rendered');
  
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('[VendorPortal] Auth state:', { user: user?.username, role: user?.role, loading, pathname: location.pathname });

  // Role-based access control - redirect accountants to accounting portal
  if (user && user.role === 'accountant') {
    console.log('[VendorPortal] Accountant detected, redirecting to accounting portal');
    return <Navigate to="/accounting/dashboard" replace />;
  }

  // Show loading while auth is being checked
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  console.log('🏢 [VENDOR PORTAL] Current location:', location.pathname);

  // Monitor location changes
  useEffect(() => {
    console.log('📍 [VENDOR PORTAL] Location changed to:', location.pathname);
  }, [location.pathname]);

  const getCurrentView = () => {
    const path = location.pathname;
    console.log('🔍 [VENDOR PORTAL] getCurrentView - checking path:', path);
    
    // More specific checks first to avoid conflicts
    if (path.includes('/paid-invoices')) return 'paid-invoices';
    if (path.includes('/upload')) return 'upload';
    if (path.includes('/history')) return 'history';
    if (path.includes('/status')) return 'status';
    if (path.includes('/profile')) return 'profile';
    if (path.includes('/dashboard')) return 'dashboard';
    
    console.log('🔍 [VENDOR PORTAL] getCurrentView - defaulting to dashboard');
    return 'dashboard';
  };

  // Component wrapper for InvoiceUpload to add logging
  const InvoiceUploadWrapper = () => {
    console.log('📤 [VENDOR PORTAL] Rendering InvoiceUpload component');
    try {
      console.log('📤 [VENDOR PORTAL] About to render InvoiceUpload component');
      const result = <InvoiceUpload />;
      console.log('📤 [VENDOR PORTAL] InvoiceUpload component rendered successfully');
      return result;
    } catch (error) {
      console.error('❌ [VENDOR PORTAL] Error rendering InvoiceUpload:', error);
      return (
        <div>
          <h2>Error loading upload component</h2>
          <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onClick={() => console.log('Test button clicked')}>Test Button</button>
        </div>
      );
    }
  };

  // Component wrapper for InvoiceHistory to add logging
  const InvoiceHistoryWrapper = () => {
    console.log('📋 [VENDOR PORTAL] Rendering InvoiceHistory component');
    try {
      console.log('📋 [VENDOR PORTAL] About to render InvoiceHistory component');
      const result = <InvoiceHistory />;
      console.log('📋 [VENDOR PORTAL] InvoiceHistory component rendered successfully');
      return result;
    } catch (error) {
      console.error('❌ [VENDOR PORTAL] Error rendering InvoiceHistory:', error);
      return (
        <div>
          <h2>Error loading invoice history component</h2>
          <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onClick={() => console.log('Test button clicked')}>Test Button</button>
        </div>
      );
    }
  };

  return (
    <VendorLayout currentView={getCurrentView()}>
      <Container maxWidth="lg">
        <Routes>
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="upload" element={<InvoiceUploadWrapper />} />
          <Route path="history" element={<InvoiceHistoryWrapper />} />
          <Route path="status" element={<InvoiceStatusView />} />
          <Route path="paid-invoices" element={<PaidVendorInvoices />} />
          <Route path="profile" element={<VendorProfile />} />
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Container>
    </VendorLayout>
  );
};

export default VendorPortal; 
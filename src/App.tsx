import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { getTheme } from './theme/index';
import { ColorModeContext } from './theme/ColorModeContext';
import { AppSnackbarProvider } from './components/common/SnackbarProvider';

import LoadingScreen from './components/common/LoadingScreen';
import ProtectedRoute from './components/common/ProtectedRoute';
import GuestRoute from './components/common/GuestRoute';
import RoleGuard from './components/common/RoleGuard';
import AppShell from './components/layout/AppShell';

import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import CustomersPage from './pages/CustomersPage';
import PurchasesPage from './pages/PurchasesPage';
import SuppliersPage from './pages/SuppliersPage';
import ReturnsPage from './pages/ReturnsPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import CategoriesPage from './pages/CategoriesPage';
import SettingsPage from './pages/SettingsPage';

import { useAuthStore } from './store/authStore';
import { initApiClientStore } from './api/client';
import { initAuthAxiosStore } from './api/auth';

// Wire the Zustand store into the API client interceptors (breaks circular dep)
initApiClientStore({
  getToken: () => useAuthStore.getState().accessToken,
  setToken: (t) => useAuthStore.getState().setAccessToken(t),
  clearAuth: () => useAuthStore.getState().clearAuth(),
});

// Wire the same token getter into the auth-specific Axios instance
initAuthAxiosStore(() => useAuthStore.getState().accessToken);

function AppRoutes(): React.ReactElement {
  const { checkAuth, isLoading } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setAuthChecked(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authChecked || isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <Routes>
      {/* Guest-only routes — redirect authenticated users to /dashboard */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
      </Route>

      {/* Protected routes — require authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/history" element={<SalesHistoryPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/reports" element={<ReportsPage />} />

          {/* Admin-only routes */}
          <Route element={<RoleGuard allowedRoles={['admin']} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>

          {/* Admin + Manager routes */}
          <Route element={<RoleGuard allowedRoles={['admin', 'manager']} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback — redirect any unknown path to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      {/* Top-level fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function ColorModeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const colorModeValue = useMemo(
    () => ({
      toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
      mode,
    }),
    [mode]
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorModeValue}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

function App(): React.ReactElement {
  return (
    <ColorModeProvider>
      <CssBaseline />
      <AppSnackbarProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppSnackbarProvider>
    </ColorModeProvider>
  );
}

export default App;

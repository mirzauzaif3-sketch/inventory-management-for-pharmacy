import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import Stock from './pages/Stock';
import Billing from './pages/Billing';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

const RequireAuth = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return token ? children : <Navigate to="/login" replace />;
};

const App = () => {
  const { hasRole } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="medicines" element={<Medicines />} />
        <Route path="stock" element={<Stock />} />
        <Route path="billing" element={<Billing />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="reports" element={<Reports />} />
        {hasRole('admin') && <Route path="users" element={<Users />} />}
      </Route>
    </Routes>
  );
};

export default App;
